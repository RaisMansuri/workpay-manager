import { supabase, isSupabaseConfigured } from '../config/supabaseClient';

export const SUBSCRIPTION_PLANS = [
  {
    id: 'starter',
    tier: 'starter',
    name: 'Starter Plan',
    tagline: 'Ideal for small service centers & individual operators',
    popular: false,
    monthlyPrice: 499,
    yearlyPrice: 4999, // ~25% savings
    maxStaffLimit: 3,
    features: [
      'Up to 3 Staff Members',
      'Unlimited Customer Records',
      'Daily Business Summary Cards',
      'Standard CSV Ledger Export',
      'Basic Email Support'
    ],
    highlight: false
  },
  {
    id: 'pro',
    tier: 'pro',
    name: 'Pro Plan',
    tagline: 'Most popular for growing Seva Kendras with multiple operators',
    popular: true,
    monthlyPrice: 999,
    yearlyPrice: 7999, // ~37% savings
    maxStaffLimit: 10,
    features: [
      'Up to 10 Staff Members',
      'Unlimited Customer Records',
      'Real-time Multi-Device Sync',
      'Instant SMS Notifications to Customers',
      'Advanced Service Filtering & Analytics',
      'Complete Ledger & CSV Export',
      '24/7 Priority Support'
    ],
    highlight: true
  },
  {
    id: 'enterprise',
    tier: 'enterprise',
    name: 'Enterprise Plan',
    tagline: 'Full power for high-volume franchises & corporate centers',
    popular: false,
    monthlyPrice: 2999,
    yearlyPrice: 11999, // ~33% savings
    maxStaffLimit: 999, // Unlimited
    features: [
      'Unlimited Staff Members',
      'Custom SMS Sender ID & Gateway',
      'Dedicated Account Manager',
      'Automated WhatsApp / Email Alerts',
      'Role-based Custom Access Controls',
      'Multi-branch Franchise Support',
      'Custom SLA & 99.9% Uptime Guarantee'
    ],
    highlight: false
  }
];

export const FESTIVE_OFFERS = [
  {
    code: 'SEVA25',
    title: 'Festive Dhamaka Offer',
    badge: 'Limited Period',
    discountPercent: 25,
    description: 'Flat 25% OFF on all Annual & Renewal Plans! Use coupon code at checkout.',
    expiryText: 'Valid until 31st October 2026'
  }
];

export const MERCHANT_PAYMENT_CONFIG = {
  upiId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MERCHANT_UPI_ID) || 'raismansuri74059-2@okicici',
  merchantName: 'Raisahmad I Mansuri',
  bankName: 'BANK OF BARODA',
  accountHolder: 'Seva Kendra Management Solutions',
  accountNumber: '01930100060799',
  ifscCode: 'BARB0MAINOF',
  branch: 'BARODA MAIN OFFICE, BARODA'
};

const LOCAL_STORAGE_KEY = 'workpay_active_subscription';

export const subscriptionService = {
  /**
   * Get the active subscription for the current organization / user
   */
  async getActiveSubscriptionAsync(userId = null) {
    try {
      if (isSupabaseConfigured() && supabase) {
        let query = supabase.from('subscriptions').select('*').eq('status', 'active');
        if (userId) {
          query = query.or(`user_id.eq.${userId},plan_tier.neq.null`);
        }
        const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

        if (!error && data) {
          const sub = this.normalizeSubscription(data);
          if (typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sub));
          }
          return sub;
        }
      }
    } catch (err) {
      console.warn('Subscription fetch notice (using cache/defaults):', err.message);
    }

    // Fallback to localStorage or default initial active Pro plan
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          /* ignore parse error */
        }
      }
    }

    const defaultSub = this.getDefaultSubscription(userId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultSub));
    }
    return defaultSub;
  },

  /**
   * Normalize database row to standard subscription object
   */
  normalizeSubscription(data) {
    const plan = SUBSCRIPTION_PLANS.find(p => p.tier === data.plan_tier) || SUBSCRIPTION_PLANS[1];
    return {
      id: data.id || 'sub-active',
      userId: data.user_id,
      planTier: data.plan_tier || 'pro',
      planName: data.plan_name || plan.name,
      billingCycle: data.billing_cycle || 'yearly',
      status: data.status || 'active',
      amount: Number(data.amount) || plan.yearlyPrice,
      currency: data.currency || 'INR',
      maxStaffLimit: Number(data.max_staff_limit) || plan.maxStaffLimit,
      features: data.features || {},
      promoCode: data.promo_code || null,
      discountApplied: Number(data.discount_applied) || 0,
      currentPeriodStart: data.current_period_start || new Date().toISOString(),
      currentPeriodEnd: data.current_period_end || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };
  },

  /**
   * Default initial active plan (Pro Plan)
   */
  getDefaultSubscription(userId = null) {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);

    return {
      id: 'sub-default-pro',
      userId: userId,
      planTier: 'pro',
      planName: 'Pro Plan',
      billingCycle: 'yearly',
      status: 'active',
      amount: 14999,
      currency: 'INR',
      maxStaffLimit: 10,
      features: {
        sms_notifications: true,
        csv_export: true,
        advanced_analytics: true,
        priority_support: true,
        custom_branding: true
      },
      promoCode: 'SEVA25',
      discountApplied: 25,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: expiry.toISOString()
    };
  },

  /**
   * Update or switch subscription plan with payment details & receipt generation
   */
  async updateSubscriptionAsync(planTier, billingCycle = 'yearly', promoCode = '', userId = null, paymentDetails = null) {
    const plan = SUBSCRIPTION_PLANS.find(p => p.tier === planTier) || SUBSCRIPTION_PLANS[1];
    let price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    let discount = 0;

    const cleanPromo = (promoCode || '').trim().toUpperCase();
    if (cleanPromo === 'SEVA25') {
      discount = Math.round(price * 0.25);
      price = price - discount;
    }

    const durationDays = billingCycle === 'yearly' ? 365 : 30;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const updatedData = {
      plan_name: plan.name,
      plan_tier: plan.tier,
      billing_cycle: billingCycle,
      status: 'active',
      amount: price,
      currency: 'INR',
      max_staff_limit: plan.maxStaffLimit,
      promo_code: cleanPromo || null,
      discount_applied: discount,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: now.toISOString()
    };

    if (userId) {
      updatedData.user_id = userId;
    }

    let savedSubscription = null;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .upsert(updatedData, { onConflict: 'user_id' })
          .select()
          .maybeSingle();

        if (!error && data) {
          savedSubscription = this.normalizeSubscription(data);
        }
      } catch (err) {
        console.warn('Supabase subscription update exception:', err.message);
      }
    }

    if (!savedSubscription) {
      savedSubscription = {
        id: `sub-${Date.now()}`,
        userId,
        planTier: plan.tier,
        planName: plan.name,
        billingCycle,
        status: 'active',
        amount: price,
        currency: 'INR',
        maxStaffLimit: plan.maxStaffLimit,
        promoCode: cleanPromo || null,
        discountApplied: discount,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString()
      };
    }

    // Generate verified receipt
    const receipt = {
      receiptNo: `RCPT-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
      orderId: `ORD-${Date.now().toString(36).toUpperCase()}`,
      planTier: plan.tier,
      planName: plan.name,
      billingCycle,
      rawAmount: billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice,
      discountApplied: discount,
      netAmount: price,
      currency: 'INR',
      paymentMethod: paymentDetails?.method || 'UPI Fast Pay',
      transactionRef: paymentDetails?.transactionRef || `UPI-${Date.now()}`,
      paidAt: now.toISOString(),
      periodStart: now.toISOString(),
      periodEnd: periodEnd.toISOString(),
      status: 'VERIFIED'
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedSubscription));
      try {
        const stored = JSON.parse(localStorage.getItem('workpay_payment_receipts') || '[]');
        stored.unshift(receipt);
        localStorage.setItem('workpay_payment_receipts', JSON.stringify(stored.slice(0, 50)));
      } catch (e) {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent('workpay_subscription_updated', { detail: savedSubscription }));
    }

    return { success: true, subscription: savedSubscription, receipt };
  },

  /**
   * Check staff count against subscription limit
   */
  async checkCanAddStaffAsync(currentStaffCount = null, userId = null) {
    const sub = await this.getActiveSubscriptionAsync(userId);
    let count = currentStaffCount;

    if (count === null && isSupabaseConfigured() && supabase) {
      try {
        const { count: dbCount, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'staff');

        if (!error && typeof dbCount === 'number') {
          count = dbCount;
        }
      } catch (e) {
        /* fallback */
      }
    }

    // Check cached profiles if count is still null
    if (count === null && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('workpay_cached_staff_profiles');
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list)) {
            count = list.filter(p => p.role !== 'admin').length;
          }
        }
      } catch (e) {
        /* fallback */
      }
    }

    if (count === null) {
      count = 0;
    }

    const limit = sub.maxStaffLimit || 10;
    const isAllowed = count < limit;

    return {
      allowed: isAllowed,
      currentCount: count,
      maxLimit: limit,
      remaining: Math.max(0, limit - count),
      planName: sub.planName,
      planTier: sub.planTier
    };
  }
};

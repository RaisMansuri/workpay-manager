import React, { useState, useEffect } from 'react';
import {
  Sparkles, Check, X, Shield, Calendar, Users,
  Tag, ArrowRight, Loader2, Award, Zap, AlertCircle, CheckCircle2,
  QrCode, CreditCard, Landmark, Smartphone, Copy, Printer, ArrowLeft,
  ShieldCheck, Lock, ExternalLink, HelpCircle, Clock, RefreshCw
} from 'lucide-react';
import {
  SUBSCRIPTION_PLANS,
  FESTIVE_OFFERS,
  subscriptionService,
  MERCHANT_PAYMENT_CONFIG
} from '../services/subscriptionService';
import { formatDateOnly, formatDateTime } from '../utils/formatters';

export const SubscriptionModal = ({
  isOpen,
  onClose,
  activeSubscription,
  onSubscriptionUpdated,
  staffCount = 0,
  profile = null
}) => {
  // Modal navigation step: 'plans' | 'checkout' | 'receipt'
  const [modalView, setModalView] = useState('plans');
  const [checkoutPlan, setCheckoutPlan] = useState(null);

  // Billing & Promo state
  const [billingCycle, setBillingCycle] = useState('yearly');
  const [selectedPlanTier, setSelectedPlanTier] = useState('pro');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi' | 'razorpay' | 'bank'
  const [utrNumber, setUtrNumber] = useState('');
  const [isCopiedUpi, setIsCopiedUpi] = useState(false);
  const [isCopiedBankAcc, setIsCopiedBankAcc] = useState(false);
  const [isCopiedBankIfsc, setIsCopiedBankIfsc] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [completedReceipt, setCompletedReceipt] = useState(null);

  // 1-Minute Timer & Session for Dynamic UPI QR Code
  const [qrTimer, setQrTimer] = useState(60);
  const [qrSessionId, setQrSessionId] = useState(() => Date.now());

  // Reset & start 1-minute countdown when checkout opens or qrSessionId changes
  useEffect(() => {
    if (!isOpen || modalView !== 'checkout') return;

    setQrTimer(60);

    const interval = setInterval(() => {
      setQrTimer((prev) => {
        if (prev <= 1) {
          return 0; // Expired after 1 minute (60 seconds)
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, modalView, qrSessionId]);

  const handleRegenerateQr = () => {
    setQrSessionId(Date.now());
    setQrTimer(60);
    setPaymentError('');
  };

  useEffect(() => {
    if (activeSubscription) {
      setSelectedPlanTier(activeSubscription.planTier || 'pro');
      setBillingCycle(activeSubscription.billingCycle || 'yearly');
      if (activeSubscription.promoCode) {
        setAppliedPromo(activeSubscription.promoCode);
        setPromoCodeInput(activeSubscription.promoCode);
      }
    }
  }, [activeSubscription, isOpen]);

  // Reset modal view on close
  const handleCloseModal = () => {
    setModalView('plans');
    setCheckoutPlan(null);
    setPaymentError('');
    setUtrNumber('');
    setCompletedReceipt(null);
    setQrTimer(60);
    onClose();
  };

  if (!isOpen) return null;

  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.tier === (activeSubscription?.planTier || 'pro')) || SUBSCRIPTION_PLANS[1];
  const maxStaff = activeSubscription?.maxStaffLimit || currentPlan.maxStaffLimit;
  const staffUsagePercent = Math.min(100, Math.round((staffCount / maxStaff) * 100));

  const handleApplyPromo = () => {
    setPromoError('');
    const clean = promoCodeInput.trim().toUpperCase();
    if (!clean) {
      setPromoError('Please enter a coupon code.');
      return;
    }
    const matched = FESTIVE_OFFERS.find(o => o.code === clean);
    if (matched) {
      setAppliedPromo(clean);
      setSuccessMessage(`Coupon ${clean} applied! 25% festive discount activated.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setPromoError('Invalid coupon code. Try SEVA25 for 25% discount.');
    }
  };

  // Pricing helper
  const getPlanPricing = (plan) => {
    if (!plan) return { rawPrice: 0, discount: 0, finalPrice: 0 };
    const raw = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    let disc = 0;
    let final = raw;
    if (appliedPromo === 'SEVA25') {
      disc = Math.round(raw * 0.25);
      final = raw - disc;
    }
    return { rawPrice: raw, discount: disc, finalPrice: final };
  };

  // Launch Checkout Step
  const handleStartCheckout = (plan) => {
    setCheckoutPlan(plan);
    setPaymentError('');
    setUtrNumber('');
    setQrSessionId(Date.now());
    setQrTimer(60);
    setModalView('checkout');
  };

  // Complete Payment & Activate Plan
  const handleConfirmPayment = async (method = paymentMethod, customRef = null) => {
    if (!checkoutPlan) return;

    let finalRef = customRef;
    if (!finalRef) {
      if (method === 'upi' || method === 'bank') {
        const cleanUtr = (utrNumber || '').trim();
        if (!cleanUtr) {
          setPaymentError('Please enter the 12-digit UPI / UTR Transaction Reference Number.');
          return;
        }
        if (cleanUtr.length < 6) {
          setPaymentError('Please enter a valid Transaction Reference / UTR Number.');
          return;
        }
        finalRef = cleanUtr;
      } else {
        finalRef = `RZP-${Date.now().toString(36).toUpperCase()}`;
      }
    }

    setIsUpgrading(true);
    setPaymentError('');
    try {
      const res = await subscriptionService.updateSubscriptionAsync(
        checkoutPlan.tier,
        billingCycle,
        appliedPromo || promoCodeInput,
        activeSubscription?.userId || profile?.id,
        {
          method: method === 'upi' ? 'Instant UPI Fast Pay' : method === 'razorpay' ? 'Razorpay Online Gateway' : 'Bank NEFT/IMPS',
          transactionRef: finalRef
        }
      );

      if (res.success) {
        setSelectedPlanTier(checkoutPlan.tier);
        if (onSubscriptionUpdated) {
          onSubscriptionUpdated(res.subscription);
        }
        setCompletedReceipt(res.receipt);
        setModalView('receipt');
      } else {
        setPaymentError(res.error || 'Payment verification failed. Please try again.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setPaymentError(err.message || 'Payment processing failed.');
    } finally {
      setIsUpgrading(false);
    }
  };

  // Razorpay Gateway Flow
  const handleRazorpayPayment = () => {
    setIsUpgrading(true);
    setPaymentError('');
    const pricing = getPlanPricing(checkoutPlan);
    const rzpKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_RAZORPAY_KEY_ID;

    if (rzpKey && typeof window !== 'undefined') {
      const loadScript = () => {
        return new Promise((resolve) => {
          if (window.Razorpay) return resolve(true);
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      loadScript().then((loaded) => {
        if (!loaded || !window.Razorpay) {
          setIsUpgrading(false);
          setPaymentError('Razorpay script could not be loaded. Please use Instant UPI.');
          return;
        }

        const options = {
          key: rzpKey,
          amount: pricing.finalPrice * 100,
          currency: 'INR',
          name: 'Seva Kendra Portal',
          description: `${checkoutPlan.name} (${billingCycle === 'yearly' ? 'Annual' : 'Monthly'})`,
          prefill: {
            name: profile?.full_name || 'Admin',
            email: profile?.email || 'admin@sevakendra.com',
            contact: profile?.mobile || '9876543210'
          },
          theme: { color: '#2563eb' },
          handler: function (response) {
            handleConfirmPayment('razorpay', response.razorpay_payment_id || `RZP-${Date.now()}`);
          },
          modal: {
            ondismiss: function () {
              setIsUpgrading(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      });
    } else {
      // Instant Gateway Simulation
      setTimeout(() => {
        const mockPayId = `pay_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        handleConfirmPayment('razorpay', mockPayId);
      }, 900);
    }
  };

  // Demo UPI Simulation (for quick test without actual transfer)
  const handleSimulateDemoUpi = () => {
    const mockUtr = `${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    setUtrNumber(mockUtr);
    handleConfirmPayment('upi', mockUtr);
  };

  // Copy helpers
  const copyToClipboard = (text, type) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'upi') {
        setIsCopiedUpi(true);
        setTimeout(() => setIsCopiedUpi(false), 2000);
      } else if (type === 'acc') {
        setIsCopiedBankAcc(true);
        setTimeout(() => setIsCopiedBankAcc(false), 2000);
      } else if (type === 'ifsc') {
        setIsCopiedBankIfsc(true);
        setTimeout(() => setIsCopiedBankIfsc(false), 2000);
      }
    }
  };

  // Print Invoice
  const handlePrintReceipt = () => {
    window.print();
  };

  const currentCheckoutPricing = checkoutPlan ? getPlanPricing(checkoutPlan) : { rawPrice: 0, discount: 0, finalPrice: 0 };
  const merchantUpi = MERCHANT_PAYMENT_CONFIG.upiId;
  const merchantName = MERCHANT_PAYMENT_CONFIG.merchantName;
  const upiIntentUrl = `upi://pay?pa=${merchantUpi}&pn=${encodeURIComponent(merchantName)}&am=${currentCheckoutPricing.finalPrice}&cu=INR&tr=SKMS${qrSessionId}&tn=${encodeURIComponent(`${checkoutPlan?.name || 'Plan'} License`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiIntentUrl)}&margin=8`;

  return (
    <div className="modal-overlay animate-fade-in" onClick={handleCloseModal}>
      <div
        className="modal-container subscription-modal-box animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge bg-primary-light text-primary">
              <Sparkles className="icon-md" />
            </div>
            <div>
              <div className="modal-title-with-badge">
                <h3 className="modal-title">
                  {modalView === 'checkout'
                    ? 'Secure Subscription Checkout'
                    : modalView === 'receipt'
                      ? 'Payment Receipt & Tax Invoice'
                      : 'Subscription & Entitlements'}
                </h3>
                <span className="badge badge-active-plan">
                  <Award className="icon-xs mr-1" />
                  {activeSubscription?.status === 'active' ? 'Active Subscription' : 'Trial'}
                </span>
              </div>
              <p className="modal-subtitle">
                {modalView === 'checkout'
                  ? 'Complete your payment using Instant UPI QR, Google Pay, PhonePe, or Paytm'
                  : modalView === 'receipt'
                    ? 'Your payment has been verified and license is activated'
                    : 'Manage your Seva Kendra service center license, staff seats, and renewal'}
              </p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={handleCloseModal} aria-label="Close modal">
            <X className="icon-sm" />
          </button>
        </div>

        <div className="subscription-modal-content">
          {/* ========================================================================= */}
          {/* STEP 1: PLANS OVERVIEW VIEW */}
          {/* ========================================================================= */}
          {modalView === 'plans' && (
            <>
              {/* Active Plan Snapshot Card */}
              <div className="active-sub-card">
                <div className="active-sub-main-info">
                  <div className="active-sub-badge-row">
                    <span className="active-sub-pill">CURRENT ACTIVE LICENSE</span>
                    <span className="active-sub-tag">
                      {activeSubscription?.billingCycle === 'yearly' ? 'Annual Billing' : 'Monthly Billing'}
                    </span>
                  </div>
                  <h3 className="active-plan-title">{activeSubscription?.planName || 'Pro Plan'}</h3>
                  <p className="active-plan-expiry">
                    <Calendar className="icon-xs mr-1 text-primary" />
                    Renewal / Expiry Date: <strong>{formatDateOnly(activeSubscription?.currentPeriodEnd)}</strong>
                  </p>
                </div>

                {/* Staff Usage Meter */}
                <div className="staff-seat-meter-container">
                  <div className="meter-header">
                    <span className="meter-label">
                      <Users className="icon-xs mr-1 text-muted" /> Staff Seats Used
                    </span>
                    <span className="meter-count font-bold">
                      {staffCount} <span className="font-normal text-muted">/ {maxStaff >= 900 ? 'Unlimited' : maxStaff} seats</span>
                    </span>
                  </div>
                  <div className="meter-progress-track">
                    <div
                      className={`meter-progress-bar ${staffUsagePercent >= 90 ? 'danger' : staffUsagePercent >= 70 ? 'warning' : 'healthy'}`}
                      style={{ width: `${maxStaff >= 900 ? 25 : staffUsagePercent}%` }}
                    />
                  </div>
                  <p className="meter-caption">
                    {maxStaff >= 900
                      ? 'Unlimited staff operators enabled for your enterprise'
                      : `${Math.max(0, maxStaff - staffCount)} additional staff seats available`}
                  </p>
                </div>
              </div>

              {/* Festive Dhamaka Banner */}
              <div className="festive-offer-banner">
                <div className="festive-banner-glow"></div>
                <div className="festive-banner-left">
                  <span className="festive-banner-tag">🎉 FESTIVE DHAMAKA 2026</span>
                  <h4 className="festive-banner-title">Flat 25% OFF on All Annual Plans!</h4>
                  <p className="festive-banner-desc">
                    Limited-time festive celebration discount. Use promo code: <strong className="festive-code-pill">SEVA25</strong>
                  </p>
                </div>
                <div className="festive-banner-right">
                  {appliedPromo === 'SEVA25' ? (
                    <span className="badge badge-promo-applied">
                      <Check className="icon-xs mr-1" /> Code Applied (25% OFF)
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn-apply-festive"
                      onClick={() => {
                        setPromoCodeInput('SEVA25');
                        setAppliedPromo('SEVA25');
                        setSuccessMessage('Festive 25% discount activated!');
                      }}
                    >
                      <Tag className="icon-xs mr-1" />
                      Apply SEVA25
                    </button>
                  )}
                </div>
              </div>

              {/* Success / Error alerts */}
              {successMessage && (
                <div className="alert-box alert-success animate-fade-in mt-3">
                  <CheckCircle2 className="icon-sm flex-shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {promoError && (
                <div className="alert-box alert-danger animate-shake mt-3">
                  <AlertCircle className="icon-sm flex-shrink-0" />
                  <span>{promoError}</span>
                </div>
              )}

              {/* Billing Interval Toggle (Monthly / Yearly) */}
              <div className="billing-cycle-switcher-wrapper">
                <div className="billing-cycle-switcher">
                  <button
                    type="button"
                    className={`cycle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                    onClick={() => setBillingCycle('monthly')}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    className={`cycle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
                    onClick={() => setBillingCycle('yearly')}
                  >
                    <span>Annual Billing</span>
                    <span className="cycle-discount-badge">Save up to 37%</span>
                  </button>
                </div>
              </div>

              {/* Available Plans Grid */}
              <div className="plans-cards-grid">
                {SUBSCRIPTION_PLANS.map((plan) => {
                  const isCurrent = activeSubscription?.planTier === plan.tier;
                  const { rawPrice, finalPrice } = getPlanPricing(plan);

                  return (
                    <div
                      key={plan.id}
                      className={`plan-pricing-card ${plan.popular ? 'popular' : ''} ${isCurrent ? 'current-active' : ''}`}
                    >
                      {plan.popular && <div className="plan-badge-popular">MOST POPULAR</div>}
                      {isCurrent && <div className="plan-badge-current">CURRENT PLAN</div>}

                      <div className="plan-card-header">
                        <h4 className="plan-tier-name">{plan.name}</h4>
                        <p className="plan-tagline">{plan.tagline}</p>
                      </div>

                      <div className="plan-price-block">
                        {appliedPromo && (
                          <span className="plan-original-price">
                            ₹{rawPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                        <div className="plan-price-row">
                          <span className="price-currency">₹</span>
                          <span className="price-number">{finalPrice.toLocaleString('en-IN')}</span>
                          <span className="price-period">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                        </div>
                        {billingCycle === 'yearly' && (
                          <span className="price-equivalent">
                            (₹{Math.round(finalPrice / 12).toLocaleString('en-IN')}/month billed annually)
                          </span>
                        )}
                      </div>

                      <div className="plan-staff-highlight">
                        <Users className="icon-xs text-primary mr-1.5" />
                        <strong>{plan.maxStaffLimit >= 900 ? 'Unlimited' : plan.maxStaffLimit} Staff Members</strong>
                      </div>

                      <ul className="plan-features-list">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="plan-feature-item">
                            <Check className="feature-check-icon" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="plan-card-action">
                        <button
                          type="button"
                          className={`btn-plan-action ${isCurrent ? 'btn-plan-active' : plan.popular ? 'btn-plan-primary' : 'btn-plan-secondary'}`}
                          onClick={() => handleStartCheckout(plan)}
                        >
                          {isCurrent ? (
                            <>
                              <Check className="icon-xs mr-1.5" />
                              <span>Current Plan (Renew & Pay)</span>
                            </>
                          ) : (
                            <>
                              <span>Pay & Switch to {plan.name}</span>
                              <ArrowRight className="icon-xs ml-1.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Input Box */}
              <div className="promo-input-section">
                <div className="promo-input-group">
                  <Tag className="promo-input-icon" />
                  <input
                    type="text"
                    placeholder="Enter Promo Code (e.g. SEVA25)"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    className="promo-text-field"
                  />
                  <button
                    type="button"
                    className="btn-apply-promo-code"
                    onClick={handleApplyPromo}
                  >
                    Apply Coupon
                  </button>
                </div>
                {appliedPromo && (
                  <span className="text-xs text-green font-medium mt-1 block">
                    ✓ Active coupon <strong>{appliedPromo}</strong> applied to all calculations.
                  </span>
                )}
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: CHECKOUT & PAYMENT VIEW */}
          {/* ========================================================================= */}
          {modalView === 'checkout' && checkoutPlan && (
            <div className="checkout-view-wrapper">
              {/* Back Bar & Security Header */}
              <div className="checkout-nav-bar">
                <button
                  type="button"
                  className="btn-checkout-back"
                  onClick={() => setModalView('plans')}
                >
                  <ArrowLeft className="icon-xs" />
                  <span>Back to Plans</span>
                </button>

                <div className="checkout-security-pill">
                  <Lock className="icon-xs" />
                  <span>256-bit Secure NPCI / RBI Compliant</span>
                </div>
              </div>

              {paymentError && (
                <div className="alert-box alert-danger animate-shake mb-3">
                  <AlertCircle className="icon-sm flex-shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Main 2-Column Checkout Layout */}
              <div className="checkout-main-grid">
                {/* Left Side: Payment Method Options */}
                <div>
                  {/* Payment Method Switcher Tabs (Only UPI enabled; other options commented out for now) */}
                  <div className="payment-tabs-bar">
                    <button
                      type="button"
                      className={`payment-tab-btn ${paymentMethod === 'upi' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('upi')}
                    >
                      <QrCode className="icon-xs" />
                      <span>Instant UPI / QR Code</span>
                      <span className="payment-tab-badge">Active</span>
                    </button>

                    {/* <button
                      type="button"
                      className={`payment-tab-btn ${paymentMethod === 'razorpay' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('razorpay')}
                    >
                      <CreditCard className="icon-xs" />
                      <span>Cards / Gateway</span>
                    </button>

                    <button
                      type="button"
                      className={`payment-tab-btn ${paymentMethod === 'bank' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('bank')}
                    >
                      <Landmark className="icon-xs" />
                      <span>Bank NEFT</span>
                    </button> */}
                  </div>

                  {/* TAB 1: INSTANT UPI QR (Recommended & Most Popular in India) */}
                  {paymentMethod === 'upi' && (
                    <div className="payment-method-panel">
                      <div className="upi-qr-card-layout">
                        {/* Dynamic Scannable QR Code with 1-Minute Expiry & Regeneration */}
                        <div className="upi-qr-frame">
                          {qrTimer === 0 ? (
                            <div className="upi-qr-expired-overlay animate-scale-up">
                              <div className="expired-icon-circle">
                                <Clock className="icon-md text-amber" />
                              </div>
                              <h4 className="expired-title">QR Code Expired</h4>
                              <p className="expired-subtext">Session expired (1 min limit). Click below to generate a new QR.</p>
                              <button
                                type="button"
                                className="btn-regenerate-qr"
                                onClick={handleRegenerateQr}
                              >
                                <RefreshCw className="icon-xs" />
                                <span>Generate New QR</span>
                              </button>
                            </div>
                          ) : (
                            <>
                              <img
                                src={qrCodeUrl}
                                alt="Scan UPI QR Code to Pay"
                                className="upi-qr-img"
                              />
                              <div className="upi-amount-tag">
                                ₹{currentCheckoutPricing.finalPrice.toLocaleString('en-IN')}
                              </div>
                            </>
                          )}

                          {/* 1-Minute Live Countdown Timer Badge & Progress */}
                          <div className="upi-timer-container">
                            {qrTimer > 0 ? (
                              <div className={`upi-countdown-badge ${qrTimer <= 15 ? 'timer-urgent' : ''}`}>
                                <Clock className={`icon-xs timer-icon ${qrTimer <= 15 ? 'pulse-fast text-danger' : 'text-primary'}`} />
                                <span>
                                  Valid for: <strong>00:{String(qrTimer).padStart(2, '0')}</strong>
                                </span>
                                <button
                                  type="button"
                                  className="btn-qr-quick-refresh"
                                  onClick={handleRegenerateQr}
                                  title="Generate fresh QR code now"
                                  aria-label="Regenerate QR Code"
                                >
                                  <RefreshCw className="icon-xs" />
                                </button>
                              </div>
                            ) : (
                              <div className="upi-countdown-badge timer-expired">
                                <AlertCircle className="icon-xs text-danger" />
                                <span>Expired (00:00)</span>
                              </div>
                            )}

                            {qrTimer > 0 && (
                              <div className="upi-timer-progress-track">
                                <div
                                  className={`upi-timer-progress-bar ${qrTimer <= 15 ? 'bg-danger' : 'bg-primary'}`}
                                  style={{ width: `${(qrTimer / 60) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Instructions & UPI Details */}
                        <div className="upi-instructions-side">
                          <h4 className="font-bold text-dark text-sm mb-1">
                            Scan with any UPI App on your phone
                          </h4>
                          <p className="text-xs text-muted leading-relaxed">
                            Open <strong>PhonePe, Google Pay, Paytm, BHIM</strong>, or CRED, scan the QR code and approve payment.
                          </p>

                          {/* UPI ID with Copy Button */}
                          <div className="upi-id-box">
                            <div>
                              <span className="text-xs text-muted block">Direct UPI ID:</span>
                              <span className="upi-id-text">{merchantUpi}</span>
                            </div>
                            <button
                              type="button"
                              className="btn-copy-mini"
                              onClick={() => copyToClipboard(merchantUpi, 'upi')}
                            >
                              {isCopiedUpi ? <Check className="icon-xs text-green" /> : <Copy className="icon-xs" />}
                              <span>{isCopiedUpi ? 'Copied!' : 'Copy'}</span>
                            </button>
                          </div>

                          {/* Mobile 1-Tap App Deep-links */}
                          <div>
                            <span className="text-xs font-semibold text-slate-600 block mb-1">
                              Pay directly via installed UPI app:
                            </span>
                            <div className="upi-apps-row">
                              <a href={`phonepe://pay?pa=${merchantUpi}&pn=${encodeURIComponent(merchantName)}&am=${currentCheckoutPricing.finalPrice}&cu=INR&tr=SKMS${qrSessionId}`} className="btn-upi-app phonepe">
                                PhonePe
                              </a>
                              <a href={`tez://upi/pay?pa=${merchantUpi}&pn=${encodeURIComponent(merchantName)}&am=${currentCheckoutPricing.finalPrice}&cu=INR&tr=SKMS${qrSessionId}`} className="btn-upi-app gpay">
                                Google Pay
                              </a>
                              <a href={`paytmmp://pay?pa=${merchantUpi}&pn=${encodeURIComponent(merchantName)}&am=${currentCheckoutPricing.finalPrice}&cu=INR&tr=SKMS${qrSessionId}`} className="btn-upi-app paytm">
                                Paytm
                              </a>
                              <a href={upiIntentUrl} className="btn-upi-app gpay">
                                <ExternalLink className="icon-xs" /> Other App
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* UTR Reference Verification Section */}
                      <div className="utr-verify-block">
                        <label className="utr-label">
                          Enter 12-Digit UTR / UPI Reference No. after payment:
                        </label>
                        <div className="utr-input-group">
                          <input
                            type="text"
                            maxLength={16}
                            placeholder="e.g. 428710928371 (12 digits)"
                            className="utr-text-input"
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                          />
                          <button
                            type="button"
                            className="btn-verify-activate"
                            onClick={() => handleConfirmPayment('upi')}
                            disabled={isUpgrading}
                          >
                            {isUpgrading ? (
                              <>
                                <Loader2 className="icon-xs spin-slow" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="icon-xs" />
                                <span>Verify & Activate</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-xs text-muted flex items-center gap-1">
                            <HelpCircle className="icon-xs" />
                            Find UTR in your PhonePe / GPay payment history receipt.
                          </span>

                          {/* Quick test simulation button for instant evaluation */}
                          <button
                            type="button"
                            className="btn-demo-simulate"
                            onClick={handleSimulateDemoUpi}
                            title="Auto-generates test UTR and activates plan instantly"
                          >
                            <Zap className="icon-xs" />
                            <span>Instant Test Mode (Demo Pay)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: RAZORPAY ONLINE GATEWAY (Cards, NetBanking, Wallets) - Commented out for now */}
                  {/* {paymentMethod === 'razorpay' && (
                    <div className="payment-method-panel">
                      <div className="gateway-card-panel">
                        <div>
                          <h4 className="font-bold text-dark text-sm mb-1">
                            Debit Cards, Credit Cards & NetBanking
                          </h4>
                          <p className="text-xs text-muted">
                            Fast and secure checkout supporting all Indian credit/debit cards, 50+ netbanking banks, and wallets.
                          </p>
                        </div>

                        <div className="gateway-brands-row">
                          <span className="brand-pill">Visa</span>
                          <span className="brand-pill">Mastercard</span>
                          <span className="brand-pill">RuPay</span>
                          <span className="brand-pill">SBI NetBanking</span>
                          <span className="brand-pill">HDFC</span>
                          <span className="brand-pill">ICICI</span>
                        </div>

                        <button
                          type="button"
                          className="btn-verify-activate"
                          style={{ width: '100%', justifyContent: 'center', height: '44px' }}
                          onClick={handleRazorpayPayment}
                          disabled={isUpgrading}
                        >
                          {isUpgrading ? (
                            <>
                              <Loader2 className="icon-xs spin-slow" />
                              <span>Opening Gateway...</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="icon-sm" />
                              <span>Pay ₹{currentCheckoutPricing.finalPrice.toLocaleString('en-IN')} with Razorpay Gateway</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )} */}

                  {/* TAB 3: DIRECT BANK TRANSFER (NEFT / IMPS) - Commented out for now */}
                  {/* {paymentMethod === 'bank' && (
                    <div className="payment-method-panel">
                      <h4 className="font-bold text-dark text-sm mb-1">
                        Direct Bank Account Transfer (NEFT / IMPS)
                      </h4>
                      <p className="text-xs text-muted mb-2">
                        Transfer the amount to the company bank account and submit your transaction UTR reference below.
                      </p>

                      <div className="bank-details-grid">
                        <div className="bank-row">
                          <span className="bank-row-label">Bank Name:</span>
                          <span className="bank-row-val">{MERCHANT_PAYMENT_CONFIG.bankName}</span>
                        </div>
                        <div className="bank-row">
                          <span className="bank-row-label">Beneficiary:</span>
                          <span className="bank-row-val">{MERCHANT_PAYMENT_CONFIG.accountHolder}</span>
                        </div>
                        <div className="bank-row">
                          <span className="bank-row-label">Account No:</span>
                          <span className="bank-row-val">
                            <code>{MERCHANT_PAYMENT_CONFIG.accountNumber}</code>
                            <button 
                              type="button" 
                              className="btn-copy-mini"
                              onClick={() => copyToClipboard(MERCHANT_PAYMENT_CONFIG.accountNumber, 'acc')}
                            >
                              {isCopiedBankAcc ? <Check className="icon-xs text-green" /> : <Copy className="icon-xs" />}
                            </button>
                          </span>
                        </div>
                        <div className="bank-row">
                          <span className="bank-row-label">IFSC Code:</span>
                          <span className="bank-row-val">
                            <code>{MERCHANT_PAYMENT_CONFIG.ifscCode}</code>
                            <button 
                              type="button" 
                              className="btn-copy-mini"
                              onClick={() => copyToClipboard(MERCHANT_PAYMENT_CONFIG.ifscCode, 'ifsc')}
                            >
                              {isCopiedBankIfsc ? <Check className="icon-xs text-green" /> : <Copy className="icon-xs" />}
                            </button>
                          </span>
                        </div>
                      </div>

                      <div className="utr-input-group">
                        <input
                          type="text"
                          placeholder="Enter NEFT / IMPS Reference UTR"
                          className="utr-text-input"
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn-verify-activate"
                          onClick={() => handleConfirmPayment('bank')}
                          disabled={isUpgrading}
                        >
                          Submit & Activate
                        </button>
                      </div>
                    </div>
                  )} */}
                </div>

                {/* Right Side: Order Summary Card */}
                <div className="order-summary-sidebar">
                  <h4 className="summary-card-title">Order Summary</h4>

                  <div className="summary-plan-badge">
                    <h5 className="summary-plan-name">{checkoutPlan.name}</h5>
                    <p className="summary-plan-cycle">
                      {billingCycle === 'yearly' ? 'Annual License (12 Months)' : 'Monthly License (30 Days)'}
                    </p>
                    <ul className="summary-features-mini">
                      <li>✓ {checkoutPlan.maxStaffLimit >= 900 ? 'Unlimited' : checkoutPlan.maxStaffLimit} Staff Members</li>
                      <li>✓ Unlimited Customer Database</li>
                      <li>✓ Multi-Device Real-Time Sync</li>
                      <li>✓ 24/7 Priority Support</li>
                    </ul>
                  </div>

                  {/* Price Breakdown */}
                  <div className="summary-price-breakdown">
                    <div className="price-break-row">
                      <span>Base Plan Price:</span>
                      <span>₹{currentCheckoutPricing.rawPrice.toLocaleString('en-IN')}</span>
                    </div>

                    {appliedPromo && (
                      <div className="price-break-row discount">
                        <span>Festive Discount ({appliedPromo}):</span>
                        <span>-₹{currentCheckoutPricing.discount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className="price-break-total">
                      <span>Total Payable:</span>
                      <span className="total-green-val">
                        ₹{currentCheckoutPricing.finalPrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted leading-relaxed">
                    <p className="mb-1 font-semibold text-slate-700">✓ Instant Automatic Activation</p>
                    <p>License will be linked to your admin profile and renewed immediately upon payment verification.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: PAYMENT RECEIPT & INVOICE VIEW */}
          {/* ========================================================================= */}
          {modalView === 'receipt' && completedReceipt && (
            <div className="receipt-view-wrapper">
              <div className="receipt-success-header">
                <div className="receipt-success-icon">
                  <Check className="icon-lg text-green" />
                </div>
                <h3 className="receipt-title">Payment Verified & License Activated!</h3>
                <p className="receipt-subtitle">
                  Your Seva Kendra license for <strong>{completedReceipt.planName}</strong> is now live.
                </p>
              </div>

              {/* Printable Tax Invoice Box */}
              <div className="printable-invoice-box" id="tax-invoice-receipt">
                <div className="invoice-header-row">
                  <div>
                    <h4 className="invoice-brand-title">Seva Kendra Management</h4>
                    <p className="invoice-brand-sub">Customer & Service Portal License Receipt</p>
                  </div>
                  <div className="invoice-meta-side">
                    <div>Receipt No: <span className="invoice-meta-num">{completedReceipt.receiptNo}</span></div>
                    <div>Date: {formatDateTime(completedReceipt.paidAt)}</div>
                    <div>Status: <span className="invoice-stamp-badge">PAID & VERIFIED</span></div>
                  </div>
                </div>

                <div className="mb-3 text-xs text-slate-600">
                  <strong>Billed To:</strong> {profile?.full_name || 'Admin'} ({profile?.email || 'admin@sevakendra.com'})
                </div>

                <div className="invoice-table-wrapper">
                  <table className="invoice-details-table">
                    <thead>
                      <tr>
                        <th>Plan Description</th>
                        <th>Billing Cycle</th>
                        <th>Staff Seats</th>
                        <th>Valid Till</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-bold">{completedReceipt.planName}</td>
                        <td>{completedReceipt.billingCycle === 'yearly' ? 'Annual (365 Days)' : 'Monthly (30 Days)'}</td>
                        <td>{checkoutPlan?.maxStaffLimit >= 900 ? 'Unlimited' : checkoutPlan?.maxStaffLimit || 10} Seats</td>
                        <td>{formatDateOnly(completedReceipt.periodEnd)}</td>
                        <td className="text-right font-bold">₹{completedReceipt.rawAmount.toLocaleString('en-IN')}</td>
                      </tr>
                      {completedReceipt.discountApplied > 0 && (
                        <tr>
                          <td colSpan="4" className="text-green font-medium">Festive Coupon Discount ({appliedPromo || 'SEVA25'})</td>
                          <td className="text-right text-green font-bold">-₹{completedReceipt.discountApplied.toLocaleString('en-IN')}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="invoice-total-row">
                  <div>
                    <span className="text-xs font-normal text-muted block">Payment Method & Reference:</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {completedReceipt.paymentMethod} • Ref: {completedReceipt.transactionRef}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-normal text-muted block">Total Paid (INR):</span>
                    <span>₹{completedReceipt.netAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Receipt Action Buttons */}
              <div className="receipt-actions-bar">
                <button
                  type="button"
                  className="btn-print-receipt"
                  onClick={handlePrintReceipt}
                >
                  <Printer className="icon-xs" />
                  <span>Print / Save Receipt</span>
                </button>

                <button
                  type="button"
                  className="btn-done-dashboard"
                  onClick={handleCloseModal}
                >
                  <Check className="icon-xs" />
                  <span>Go to Dashboard</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (for Plans View) */}
        {modalView === 'plans' && (
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-cancel-modal"
              onClick={handleCloseModal}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionModal;

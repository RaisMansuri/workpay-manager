import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Check, X, Shield, Calendar, Users, 
  Tag, ArrowRight, Loader2, Award, Zap, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { 
  SUBSCRIPTION_PLANS, 
  FESTIVE_OFFERS, 
  subscriptionService 
} from '../services/subscriptionService';
import { formatDateOnly } from '../utils/formatters';

export const SubscriptionModal = ({ isOpen, onClose, activeSubscription, onSubscriptionUpdated, staffCount = 0 }) => {
  const [billingCycle, setBillingCycle] = useState('yearly');
  const [selectedPlanTier, setSelectedPlanTier] = useState('pro');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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

  const handleSwitchPlan = async (targetTier) => {
    setIsUpgrading(true);
    setPromoError('');
    try {
      const res = await subscriptionService.updateSubscriptionAsync(
        targetTier, 
        billingCycle, 
        appliedPromo || promoCodeInput, 
        activeSubscription?.userId
      );

      if (res.success) {
        setSelectedPlanTier(targetTier);
        if (onSubscriptionUpdated) {
          onSubscriptionUpdated(res.subscription);
        }
        setSuccessMessage(`Successfully switched to ${res.subscription.planName}!`);
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Plan update error:', err);
      setPromoError(err.message || 'Failed to update subscription.');
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
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
                <h3 className="modal-title">Subscription & Entitlements</h3>
                <span className="badge badge-active-plan">
                  <Award className="icon-xs mr-1" />
                  {activeSubscription?.status === 'active' ? 'Active Subscription' : 'Trial'}
                </span>
              </div>
              <p className="modal-subtitle">
                Manage your Seva Kendra service center license, staff seats, and renewal
              </p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            <X className="icon-sm" />
          </button>
        </div>

        <div className="subscription-modal-content">
          {/* Active Plan Snapshot Card */}
          <div className="active-sub-card">
            <div className="active-sub-main-info">
              <div className="active-sub-badge-row">
                <span className="active-sub-pill">CURRENT ACTIVE LICENSE</span>
                <span className="active-sub-tag">{activeSubscription?.billingCycle === 'yearly' ? 'Annual Billing' : 'Monthly Billing'}</span>
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
              let rawPrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
              let finalPrice = rawPrice;

              if (appliedPromo === 'SEVA25') {
                finalPrice = Math.round(rawPrice * 0.75);
              }

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
                      disabled={isUpgrading}
                      onClick={() => handleSwitchPlan(plan.tier)}
                    >
                      {isUpgrading ? (
                        <>
                          <Loader2 className="icon-xs spin-slow mr-1.5" />
                          Processing...
                        </>
                      ) : isCurrent ? (
                        <>
                          <Check className="icon-xs mr-1.5" />
                          Current Plan (Renew)
                        </>
                      ) : (
                        <>
                          <span>Switch to {plan.name}</span>
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
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-cancel-modal"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;

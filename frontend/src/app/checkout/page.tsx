'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore, useCartStore } from '../../store';
import { useCart } from '../../hooks/useCart';
import { SafeImage } from '../../components/SafeImage';
import { CartCrossSells } from '../../components/recommendations';
import {
  useCreateOrderMutation,
  useCreatePaymentIntentMutation,
} from '../../hooks/useOrders';
import { CreditCard, Lock, ShieldCheck, CheckCircle, Loader2 } from 'lucide-react';
import { useCurrency, CurrencyCode } from '../../providers/CurrencyProvider';
import { useTranslation } from '../../providers/I18nProvider';
import { apiClient } from '../../lib/api-client';
import { loadStripe } from '@stripe/stripe-js';

export default function CheckoutPage() {
  const router = useRouter();
  const isSubmittingRef = useRef(false);
  const { locale, t } = useTranslation();
  
  // Zustand State
  const currentUser = useAuthStore((state) => state.currentUser);
  const promoCode = useCartStore((state) => state.promoCode);

  // Global Commerce context
  const { 
    currency, 
    country: globalCountry, 
    setCountry: globalSetCountry, 
    formatPrice, 
    usdToActive,
    convert
  } = useCurrency();

  // Dynamic API Hooks
  const { items: cartItems, getTotals, clearCart } = useCart();
  const createOrderMutation = useCreateOrderMutation();
  const createPaymentIntentMutation = useCreatePaymentIntentMutation();

  // Local Flow States
  const [step, setStep] = useState(1); // 1: Info, 2: Shipping, 3: Payment, 4: Success
  const [confirmedOrderId, setConfirmedOrderId] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState(currentUser?.email || '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState(globalCountry || 'US');
  const [postalCode, setPostalCode] = useState('');

  // Stripe Elements States
  const [publishableKey, setPublishableKey] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);
  const [paymentElement, setPaymentElement] = useState<any>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const paymentElementRef = useRef<HTMLDivElement>(null);

  // Regional Tax and Shipping dynamic calculations
  const [shippingCost, setShippingCost] = useState(10.0);
  const [taxRate, setTaxRate] = useState(0.08);

  // Fetch publishable key on mount
  useEffect(() => {
    const fetchKey = async () => {
      try {
        const response = await apiClient.get('/payments/publishable-key');
        if (response.data?.publishableKey) {
          setPublishableKey(response.data.publishableKey);
        }
      } catch (err) {
        console.error('Failed to fetch publishable key:', err);
      }
    };
    fetchKey();
  }, []);

  // Initialize Stripe SDK
  useEffect(() => {
    if (!publishableKey) return;
    let active = true;
    const initStripe = async () => {
      const stripeInstance = await loadStripe(publishableKey);
      if (active) {
        setStripe(stripeInstance);
      }
    };
    initStripe();
    return () => {
      active = false;
    };
  }, [publishableKey]);

  // Handle redirect callback (such as 3D Secure)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectStatus = params.get('redirect_status');
    const orderIdParam = params.get('orderId');

    if (redirectStatus === 'succeeded' && orderIdParam) {
      console.log(`[Checkout Flow] Detected successful payment redirect for Order: ${orderIdParam}`);
      setConfirmedOrderId(orderIdParam);
      clearCart();
      setStep(4);
      router.replace('/checkout');
    }
  }, [clearCart, router]);

  // Mount payment element dynamically inside step 3
  useEffect(() => {
    if (step !== 3 || !stripe || !clientSecret || !paymentElementRef.current) return;

    paymentElementRef.current.innerHTML = '';

    const elementsInstance = stripe.elements({
      clientSecret,
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#add500',
          colorBackground: '#121212',
          colorText: '#ffffff',
          colorDanger: '#ff4d4d',
          fontFamily: 'Inter, system-ui, sans-serif',
          spacingUnit: '4px',
          borderRadius: '8px',
        },
      },
    });

    const paymentElementInstance = elementsInstance.create('payment');
    paymentElementInstance.mount(paymentElementRef.current);

    setElements(elementsInstance);
    setPaymentElement(paymentElementInstance);

    return () => {
      paymentElementInstance.destroy();
    };
  }, [step, stripe, clientSecret]);

  // Synchronize country selection from Navbar context if updated
  useEffect(() => {
    if (globalCountry) {
      setCountry(globalCountry);
    }
  }, [globalCountry]);

  // Fetch country rules when user selects country
  useEffect(() => {
    const fetchRegionDetails = async () => {
      try {
        const res = await apiClient.get(`/region/rates/${country}`);
        if (res.data) {
          const rates = res.data.shippingRates;
          const taxObj = res.data.tax;
          if (rates && rates.length > 0) {
            setShippingCost(rates[0].baseCost);
          } else {
            setShippingCost(10.0);
          }
          if (taxObj) {
            setTaxRate(taxObj.taxRate);
          } else {
            setTaxRate(0.0);
          }
        }
      } catch (err) {
        console.warn('Failed to load region details.', err);
      }
    };
    fetchRegionDetails();
  }, [country]);

  const { subtotal, discount } = getTotals();

  // Compute values dynamically in the current currency
  const activeSubtotal = usdToActive(subtotal);
  const activeDiscount = usdToActive(discount);
  const activeShipping = usdToActive(shippingCost);
  const activeTaxable = Math.max(0, activeSubtotal - activeDiscount);
  const activeTax = activeTaxable * taxRate;
  const activeTotal = activeTaxable + activeTax + activeShipping;

  // If cart is empty and we are not in success state, direct them back to shop.
  if (cartItems.length === 0 && step !== 4 && !paymentLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-md text-center px-6">
        <h3 className="font-headline-lg text-balance text-lg text-white uppercase">{t('checkout.vacant')}</h3>
        <p className="text-on-surface-variant text-sm font-sans normal-case text-pretty leading-relaxed">{t('checkout.vacantDesc')}</p>
        <button 
          onClick={() => router.push('/shop')}
          className="px-8 py-4 bg-white text-black font-button text-xs uppercase rounded hover:bg-tertiary transition-colors"
        >
          {t('checkout.browse')}
        </button>
      </div>
    );
  }

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setStep(2);
    }
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (firstName && lastName && address && city && postalCode) {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setPaymentLoading(true);

      try {
        console.log('[Checkout Flow] Step 1: Requesting order creation on backend...');
        const order = await createOrderMutation.mutateAsync({
          address: `${address}${apartment ? ', ' + apartment : ''}`,
          city,
          country,
          postalCode,
          phone: '+41 44 123 4567',
          couponCode: promoCode || undefined,
        });

        console.log('[Checkout Flow] Step 2: Requesting payment intent client secret...');
        const paymentDetails = await createPaymentIntentMutation.mutateAsync(order.id);

        setClientSecret(paymentDetails.clientSecret);
        setConfirmedOrderId(order.orderNumber || order.id);
        setStep(3);
      } catch (err) {
        console.error('[Checkout Flow] Error preparing checkout session:', err);
      } finally {
        isSubmittingRef.current = false;
        setPaymentLoading(false);
      }
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      console.warn('[Checkout Flow] Stripe SDK not fully loaded.');
      return;
    }

    if (isSubmittingRef.current) {
      console.warn('[Checkout Flow] Blocked duplicate submission attempt.');
      return;
    }

    isSubmittingRef.current = true;
    setPaymentLoading(true);
    setStripeError(null);

    try {
      console.log('[Checkout Flow] Step 3: Confirming payment intent with Stripe...');
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout?orderId=${confirmedOrderId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('[Checkout Flow] Stripe payment confirmation error:', error);
        setStripeError(error.message || 'Payment confirmation failed.');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('[Checkout Flow] Stripe payment succeeded locally!');
        clearCart();
        setStep(4);
      } else {
        console.log('[Checkout Flow] Payment requires redirect or has another status:', paymentIntent?.status);
      }
    } catch (err: any) {
      console.error('[Checkout Flow] ConfirmPayment error:', err);
      setStripeError(err.message || 'An unexpected error occurred.');
    } finally {
      isSubmittingRef.current = false;
      setPaymentLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen pb-xxl">
      
      {/* Distraction-Free Header */}
      <header className="w-full h-20 bg-background/80 backdrop-blur-xl border-b border-white/5 flex items-center px-6 md:px-margin-desktop">
        <Link href="/" className="font-display-lg text-headline-lg tracking-tighter text-white hover:text-tertiary transition-colors">
          APEX LUXE
        </Link>
      </header>

      <main className="max-w-container-max mx-auto px-6 md:px-margin-desktop flex flex-col lg:flex-row gap-xxl pt-8">
        
        {/* Checkout Flow Container (Left) */}
        <div className="flex-1 py-xl">
          
          {/* Progress Indicator (only visible when not in success page) */}
          {step < 4 && (
            <nav aria-label="Checkout Progress" className="flex flex-wrap items-center gap-md mb-xl">
              <div 
                onClick={() => step > 1 && setStep(1)}
                className={`flex items-center gap-sm cursor-pointer transition-opacity ${step === 1 ? 'text-white' : 'text-on-surface-variant/40'}`}
              >
                <span className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-label-caps ${
                  step > 1 ? 'bg-tertiary border-tertiary text-black' : step === 1 ? 'border-tertiary text-tertiary' : 'border-white/10'
                }`}>
                  {step > 1 ? '✓' : '01'}
                </span>
                <span className="font-label-caps text-xs">{t('checkout.stepInfo')}</span>
              </div>
              <div className="h-px w-8 bg-white/10"></div>
              
              <div 
                onClick={() => step > 2 && setStep(2)}
                className={`flex items-center gap-sm cursor-pointer transition-opacity ${step === 2 ? 'text-white' : 'text-on-surface-variant/40'}`}
              >
                <span className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-label-caps ${
                  step > 2 ? 'bg-tertiary border-tertiary text-black' : step === 2 ? 'border-tertiary text-tertiary' : 'border-white/10'
                }`}>
                  {step > 2 ? '✓' : '02'}
                </span>
                <span className="font-label-caps text-xs">{t('checkout.stepShipping')}</span>
              </div>
              <div className="h-px w-8 bg-white/10"></div>

              <div className={`flex items-center gap-sm transition-opacity ${step === 3 ? 'text-white' : 'text-on-surface-variant/40'}`}>
                <span className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-label-caps ${
                  step === 3 ? 'border-tertiary text-tertiary' : 'border-white/10'
                }`}>
                  03
                </span>
                <span className="font-label-caps text-xs">{t('checkout.stepPayment')}</span>
              </div>
            </nav>
          )}

          {/* Step 1: Information */}
          {step === 1 && (
            <section className="space-y-xl">
              <div className="space-y-md">
                <h2 className="font-headline-lg text-balance text-xl text-white uppercase">{t('checkout.express')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <button 
                    onClick={() => { setFirstName('Alex'); setLastName('Mercer'); setAddress('1600 Amphitheatre Pkwy'); setCity('Mountain View'); setCountry('US'); globalSetCountry('US'); setPostalCode('94043'); setStep(3); }}
                    className="flex items-center justify-center gap-sm bg-white text-black py-4 rounded-lg font-button text-xs uppercase hover:bg-white/90 transition-all active:scale-95"
                  >
                    <CreditCard className="h-5 w-5" />
                    {t('checkout.applePay')}
                  </button>
                  <button 
                    onClick={() => { setFirstName('Alex'); setLastName('Mercer'); setAddress('1600 Amphitheatre Pkwy'); setCity('Mountain View'); setCountry('US'); globalSetCountry('US'); setPostalCode('94043'); setStep(3); }}
                    className="flex items-center justify-center gap-sm bg-[#4285F4] text-white py-4 rounded-lg font-button text-xs uppercase hover:opacity-90 transition-all active:scale-95"
                  >
                    <CreditCard className="h-5 w-5" />
                    {t('checkout.googlePay')}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-md py-md">
                <div className="h-px flex-1 bg-white/10"></div>
                <span className="font-label-caps text-[9px] text-outline text-on-surface-variant/40">{t('checkout.or')}</span>
                <div className="h-px flex-1 bg-white/10"></div>
              </div>

              <form onSubmit={handleInfoSubmit} className="space-y-lg">
                <div className="space-y-sm">
                  <label className="font-label-caps text-xs text-white">{t('checkout.contact')}</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-lowest border border-white/10 focus:border-tertiary focus:ring-0 outline-none px-md py-4 text-white rounded-lg transition-all text-sm font-sans" 
                    placeholder={t('checkout.emailAddress')}
                    required 
                  />
                </div>
                <div className="flex items-center gap-sm">
                  <input 
                    type="checkbox" 
                    id="newsletter" 
                    defaultChecked
                    className="rounded bg-surface-lowest border-white/10 text-tertiary focus:ring-0 w-4 h-4 cursor-pointer" 
                  />
                  <label htmlFor="newsletter" className="text-xs text-on-surface-variant font-sans cursor-pointer">
                    {t('checkout.newsletter')}
                  </label>
                </div>
                <button 
                  type="submit"
                  className="w-full py-5 bg-tertiary text-on-tertiary font-button text-xs uppercase tracking-widest rounded-lg hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  {t('checkout.continueShipping')}
                </button>
              </form>
            </section>
          )}

          {/* Step 2: Shipping */}
          {step === 2 && (
            <section className="space-y-xl">
              <h2 className="font-headline-lg text-balance text-xl text-white uppercase">{t('checkout.shippingAddress')}</h2>
              <form onSubmit={handleShippingSubmit} className="space-y-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <input 
                    type="text" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-surface-lowest border border-white/10 focus:border-tertiary focus:ring-0 outline-none px-md py-4 text-white rounded-lg text-sm font-sans" 
                    placeholder={t('checkout.firstName')}
                    required 
                  />
                  <input 
                    type="text" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-surface-lowest border border-white/10 focus:border-tertiary focus:ring-0 outline-none px-md py-4 text-white rounded-lg text-sm font-sans" 
                    placeholder={t('checkout.lastName')}
                    required 
                  />
                </div>
                
                <input 
                  type="text" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-surface-lowest border border-white/10 focus:border-tertiary focus:ring-0 outline-none px-md py-4 text-white rounded-lg text-sm font-sans" 
                  placeholder={t('checkout.address')}
                  required 
                />
                
                <input 
                  type="text" 
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  className="w-full bg-surface-lowest border border-white/10 focus:border-tertiary focus:ring-0 outline-none px-md py-4 text-white rounded-lg text-sm font-sans" 
                  placeholder={t('checkout.apartment')}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                  <input 
                    type="text" 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-surface-lowest border border-white/10 focus:border-tertiary focus:ring-0 outline-none px-md py-4 text-white rounded-lg text-sm font-sans" 
                    placeholder={t('checkout.city')}
                    required 
                  />
                  
                  {/* Select Country linked to Global Commerce configuration */}
                  <select 
                    value={country}
                    onChange={(e) => {
                      const newCountry = e.target.value;
                      setCountry(newCountry);
                      globalSetCountry(newCountry);
                    }}
                    className="bg-surface-lowest border border-white/10 focus:border-tertiary focus:ring-0 outline-none px-md py-4 text-white rounded-lg text-sm font-sans cursor-pointer" 
                    required 
                  >
                    <option value="US">United States (US)</option>
                    <option value="GB">United Kingdom (GB)</option>
                    <option value="AE">United Arab Emirates (AE)</option>
                    <option value="SA">Saudi Arabia (SA)</option>
                    <option value="EG">Egypt (EG)</option>
                    <option value="FR">France (FR)</option>
                    <option value="DE">Germany (DE)</option>
                    <option value="ES">Spain (ES)</option>
                    <option value="IT">Italy (IT)</option>
                  </select>

                  <input 
                    type="text" 
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="bg-surface-lowest border border-white/10 focus:border-tertiary focus:ring-0 outline-none px-md py-4 text-white rounded-lg text-sm font-sans" 
                    placeholder={t('checkout.postalCode')}
                    required 
                  />
                </div>

                <div className="flex gap-md pt-md">
                  <button 
                    type="button" 
                    onClick={() => setStep(1)}
                    className="flex-1 py-5 border border-white/10 text-white font-button text-xs uppercase rounded-lg hover:bg-white/5 transition-all"
                  >
                    {t('checkout.returnInfo')}
                  </button>
                  <button 
                    type="submit" 
                    disabled={paymentLoading}
                    className="flex-[2] py-5 bg-tertiary text-on-tertiary font-button text-xs uppercase tracking-widest rounded-lg hover:brightness-105 transition-all flex items-center justify-center gap-xs disabled:opacity-50"
                  >
                    {paymentLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-black" />
                        {t('checkout.processingPayment')}
                      </>
                    ) : (
                      t('checkout.continuePayment')
                    )}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <section className="space-y-xl">
              <h2 className="font-headline-lg text-balance text-xl text-white uppercase">{t('checkout.paymentMethod')}</h2>
              <div className="p-lg bg-surface-low rounded-xl border border-white/5 space-y-lg">
                <div className="flex justify-between items-center border-b border-white/5 pb-sm">
                  <span className="font-label-caps text-xs text-white">{t('checkout.creditCard')}</span>
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                
                <form onSubmit={handlePaymentSubmit} className="space-y-md">
                  <div ref={paymentElementRef} id="payment-element" className="min-h-[250px] p-2 bg-background/50 rounded-lg"></div>

                  {stripeError && (
                    <div className="text-red-500 text-xs mt-sm font-sans">
                      {stripeError}
                    </div>
                  )}
                  
                  <div className="flex gap-md pt-md">
                    <button 
                      type="button" 
                      onClick={() => setStep(2)}
                      className="flex-1 py-5 border border-white/10 text-white font-button text-xs uppercase rounded-lg hover:bg-white/5 transition-all"
                    >
                      {t('checkout.returnShipping')}
                    </button>
                    <button 
                      type="submit" 
                      disabled={paymentLoading || !stripe || !elements}
                      className="flex-[2] py-5 bg-tertiary text-on-tertiary font-button text-xs uppercase tracking-widest rounded-lg hover:brightness-105 active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(173,213,0,0.1)] flex items-center justify-center gap-xs disabled:opacity-50"
                    >
                      {paymentLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-black" />
                          {t('checkout.processingPayment')}
                        </>
                      ) : (
                        t('checkout.complete')
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          )}

          {/* Success State */}
          {step === 4 && (
            <section className="flex flex-col items-center justify-center py-xxl text-center space-y-lg animate-fade-in">
              <div className="w-24 h-24 rounded-full bg-tertiary flex items-center justify-center text-black mb-md shadow-2xl">
                <CheckCircle className="h-14 w-14" />
              </div>
              <h1 className="font-display-lg text-balance text-3xl md:text-5xl text-white uppercase">{t('checkout.successTitle')}</h1>
              <p className="text-sm text-pretty text-on-surface-variant max-w-md leading-relaxed">
                {t('checkout.successDesc').replace('{email}', email).replace('{id}', confirmedOrderId)}
              </p>
              
              <div className="flex flex-wrap gap-md justify-center pt-md">
                <button 
                  onClick={() => router.push(`/tracking/${confirmedOrderId}`)}
                  className="px-8 py-4 bg-tertiary text-black font-button text-xs uppercase rounded hover:brightness-105 transition-all"
                >
                  {t('checkout.track')}
                </button>
                <button 
                  onClick={() => router.push('/')}
                  className="px-8 py-4 border border-white/20 hover:bg-white/5 text-white font-button text-xs uppercase rounded transition-all"
                >
                  {t('checkout.returnHome')}
                </button>
              </div>
            </section>
          )}

          {/* AI Recommended Upgrades for Checkout */}
          {step < 4 && cartItems.length > 0 && (
            <div className="border-t border-white/10 pt-xl mt-xxl">
              <CartCrossSells firstProductId={cartItems[0]?.product?.id} />
            </div>
          )}
 
        </div>

        {/* Sidebar Summary (Right) */}
        {step < 4 && (
          <aside className="w-full lg:w-[400px] py-xl lg:border-s lg:border-white/5 lg:ps-xl">
            <div className="sticky top-24 space-y-xl">
              <h2 className="font-label-caps text-xs text-white border-b border-white/5 pb-2">{t('checkout.orderSummary')}</h2>
              
              <div className="space-y-lg max-h-[400px] overflow-y-auto pr-sm no-scrollbar">
                {cartItems.map((item) => (
                  <div key={`${item.product.id}-${item.size}-${item.color}`} className="flex gap-md">
                    <div className="w-20 h-24 bg-surface-low rounded-lg overflow-hidden relative shrink-0 border border-white/5">
                      <SafeImage className="w-full h-full object-cover" src={item.product.images[0]} alt={item.product.name} />
                      <span className="absolute -top-2 -right-2 w-6 h-6 bg-tertiary text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 py-1 min-w-0">
                      <h3 className="font-button text-xs text-white uppercase break-normal text-pretty">{item.product.name}</h3>
                      <p className="text-[10px] text-on-surface-variant/60 font-sans normal-case mt-0.5">
                        {t('cart.sizeLabel')} {item.size} / {t('cart.colorLabel')} {item.color}
                      </p>
                    </div>
                    <div className="py-1 font-label-caps text-xs text-white">
                      {formatPrice(usdToActive(item.product.price * item.quantity))}
                    </div>
                  </div>
                ))}
              </div>
 
              {/* Price Breakdown */}
              <div className="pt-lg border-t border-white/5 space-y-md text-sm font-sans normal-case text-on-surface-variant">
                <div className="flex justify-between">
                  <span>{t('cart.subtotal')}</span>
                  <span className="text-white">{formatPrice(activeSubtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-tertiary">
                    <span>{t('checkout.discount')}</span>
                    <span>-{formatPrice(activeDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{t('cart.shipping')}</span>
                  <span className="text-white font-label-caps text-xs">
                    {activeShipping === 0 ? t('cart.free') : formatPrice(activeShipping)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-md">
                  <span>{t('checkout.estimatedTax')}</span>
                  <span className="text-white">{formatPrice(activeTax)}</span>
                </div>
 
                <div className="flex justify-between items-end pt-sm">
                  <span className="font-headline-lg text-lg text-white uppercase">{t('cart.total')}</span>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-label-caps text-outline mb-0.5">{currency}</span>
                    <span className="font-headline-lg text-2xl text-tertiary">{formatPrice(activeTotal)}</span>
                  </div>
                </div>
              </div>
 
              {/* Encryption Seal */}
              <div className="bg-surface-low p-md rounded-lg border border-white/5 mt-xl">
                <div className="flex gap-sm items-center">
                  <ShieldCheck className="h-5 w-5 text-tertiary" />
                  <p className="text-[11px] text-on-surface-variant font-sans normal-case leading-relaxed text-pretty">
                    {t('checkout.encryptionSeal')}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        )}
 
      </main>
    </div>
  );
}

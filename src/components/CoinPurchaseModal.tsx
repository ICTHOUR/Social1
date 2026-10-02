import React, { useState, useEffect } from 'react';
import {
  X,
  Coins,
  Sparkles,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  ArrowRight,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { CoinPackage, PaymentTransactionRecord } from '../types';
import { useAuth } from '../context/AuthContext';

interface CoinPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

interface GatewayOption {
  id: string;
  name: string;
  logo: string;
  badge: string;
  color: string;
  description: string;
}

const GATEWAYS: GatewayOption[] = [
  {
    id: 'paystation',
    name: 'PayStation Gateway',
    logo: 'PayStation',
    badge: 'Official Gateway',
    color: 'from-emerald-600 to-teal-800 border-emerald-500/40 text-emerald-300',
    description: 'Instant checkout with bKash, Nagad, Rocket, Cards & Cards API',
  },
  {
    id: 'bkash',
    name: 'bKash (বিকাশ)',
    logo: 'বিকাশ',
    badge: 'Instant Auto-Credit',
    color: 'from-pink-600 to-rose-700 border-pink-500/40 text-pink-300',
    description: 'Pay directly via bKash App or USSD *247#',
  },
  {
    id: 'nagad',
    name: 'Nagad (নগদ)',
    logo: 'নগদ',
    badge: 'Popular',
    color: 'from-orange-600 to-amber-700 border-orange-500/40 text-orange-300',
    description: 'Instant checkout with Nagad Digital Wallet',
  },
  {
    id: 'rocket',
    name: 'DBBL Rocket (রকেট)',
    logo: 'রকেট',
    badge: 'DBBL Mobile',
    color: 'from-purple-700 to-indigo-800 border-purple-500/40 text-purple-300',
    description: 'Dutch-Bangla Bank Rocket mobile banking',
  },
  {
    id: 'sslcommerz',
    name: 'SSLCommerz Gateway',
    logo: 'Cards / Net Banking',
    badge: 'Multi-Channel',
    color: 'from-blue-600 to-cyan-800 border-blue-500/40 text-blue-300',
    description: 'Visa, Mastercard, NexusPay, and 30+ Banks',
  },
  {
    id: 'stripe',
    name: 'International Card',
    logo: 'Visa/MC',
    badge: 'Global USD',
    color: 'from-slate-700 to-indigo-950 border-slate-600 text-slate-300',
    description: 'Worldwide Credit or Debit Cards (USD/BDT)',
  },
];

export const CoinPurchaseModal: React.FC<CoinPurchaseModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, token, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'packages' | 'history'>('packages');
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<CoinPackage | null>(null);
  const [customCoins, setCustomCoins] = useState<number>(2000);
  const [selectedGateway, setSelectedGateway] = useState<string>('paystation');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Intent & Checkout step
  const [checkoutStep, setCheckoutStep] = useState<'select' | 'payment_intent' | 'verified_success'>('select');
  const [activeIntent, setActiveIntent] = useState<any | null>(null);
  const [payerAccount, setPayerAccount] = useState<string>('');
  const [simulationAction, setSimulationAction] = useState<'success' | 'fail'>('success');

  // Payment history
  const [paymentHistory, setPaymentHistory] = useState<PaymentTransactionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchPackages();
      fetchHistory();
      setCheckoutStep('select');
      setActiveIntent(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/coin-packages');
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages || []);
        if (data.packages?.length > 0 && !selectedPkg) {
          // Default to popular 1000 coins package or first
          const popular = data.packages.find((p: CoinPackage) => p.coinAmount === 1000) || data.packages[0];
          setSelectedPkg(popular);
        }
      }
    } catch (e) {
      console.error('Failed to load coin packages', e);
    }
  };

  const fetchHistory = async () => {
    if (!token) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/payments/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPaymentHistory(data.payments || []);
      }
    } catch (e) {
      console.error('Failed to load payment history', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const calculateCustomPriceBdt = (coins: number) => {
    // 1000 coins = ~115 BDT
    return Math.round(coins * 0.12 * 100) / 100;
  };

  const handleCreateIntent = async () => {
    if (!selectedPkg || !token) return;
    setIsLoading(true);
    setErrorMessage(null);

    const isCustom = selectedPkg.isCustom || selectedPkg.id === 'pkg_custom';

    try {
      const res = await fetch('/api/payments/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          packageId: selectedPkg.id,
          customCoinAmount: isCustom ? customCoins : undefined,
          gatewayId: selectedGateway,
          customerDetails: {
            name: user?.fullName || user?.username || 'Nixo Member',
            phone: user?.phone || '01711223344',
            email: user?.email,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      setActiveIntent(data);
      setCheckoutStep('payment_intent');
      setPayerAccount(user?.phone || '01712345678');
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment intent could not be generated.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!activeIntent || !token) return;
    setIsLoading(true);
    setErrorMessage(null);

    if (simulationAction === 'fail') {
      // Simulate gateway payment decline
      try {
        await fetch('/api/payments/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            transactionId: activeIntent.transactionId,
            payload: {
              status: 'failed',
              failureReason: 'User cancelled or insufficient gateway balance.',
            },
          }),
        });
      } catch {}
      setErrorMessage('Payment failed: Transaction was declined by the payment gateway or bank.');
      setIsLoading(false);
      fetchHistory();
      return;
    }

    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionId: activeIntent.transactionId,
          payload: {
            payerAccount,
            amount: activeIntent.amountBdt,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment verification failed');
      }

      setCheckoutStep('verified_success');
      refreshUser();
      fetchHistory();
      onSuccess(data.newBalance);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/35 dark:bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-amber-500/10 via-purple-600/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
              <Coins className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Nixo Coin Shop
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-400/30">
                  Instant Top-Up
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Bangladesh-friendly local payments & international checkout</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-white/10 px-6 bg-slate-50 dark:bg-slate-950/40">
          <button
            onClick={() => {
              setActiveTab('packages');
              setCheckoutStep('select');
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'packages'
                ? 'border-amber-500 text-amber-700 dark:text-amber-300'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Purchase Packages
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-700 dark:text-amber-300'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" /> Payment History & Status
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'history' ? (
            /* Payment History Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Past Orders & Verification Records</span>
                <button
                  onClick={fetchHistory}
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingHistory ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              {paymentHistory.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-white/5 bg-slate-950/30 text-slate-400 text-xs">
                  No payment transactions found on this account yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {paymentHistory.map((tx) => (
                    <div
                      key={tx.id || tx.transactionId}
                      className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white tracking-wide">
                            +{tx.totalCoins.toLocaleString()} Coins
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 uppercase font-mono">
                            {tx.gatewayId}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              tx.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : tx.status === 'refunded'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : tx.status === 'failed'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                          <span>Ref: {tx.transactionId}</span>
                          <span>•</span>
                          <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                        </div>
                        {tx.failureReason && (
                          <div className="text-[10px] text-rose-400">Reason: {tx.failureReason}</div>
                        )}
                        {tx.refundReason && (
                          <div className="text-[10px] text-purple-400">Refund: {tx.refundReason}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-200">
                          {tx.amountBdt.toFixed(2)} BDT
                        </div>
                        {tx.amountUsd && (
                          <div className="text-[10px] text-slate-500">${tx.amountUsd.toFixed(2)} USD</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : checkoutStep === 'select' ? (
            /* Stage 1: Select Package & Gateway */
            <div className="space-y-6">
              {/* Package Selection Grid */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">
                  1. Choose Coin Bundle
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {packages.map((pkg) => {
                    const isSelected = selectedPkg?.id === pkg.id;
                    const isCustom = pkg.isCustom || pkg.id === 'pkg_custom';

                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPkg(pkg)}
                        className={`relative cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/20 shadow-lg shadow-amber-500/10'
                            : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
                        }`}
                      >
                        {pkg.badgeText && (
                          <span className="absolute -top-2.5 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 uppercase tracking-wider shadow">
                            {pkg.badgeText}
                          </span>
                        )}

                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-slate-300">{pkg.name}</div>
                          {isCustom ? (
                            <div className="text-lg font-black text-amber-300">Custom Coins</div>
                          ) : (
                            <div className="text-xl font-black text-white flex items-center gap-1.5">
                              {pkg.coinAmount.toLocaleString()}
                              <span className="text-xs text-amber-400 font-bold">Coins</span>
                            </div>
                          )}

                          {pkg.bonusCoins > 0 && (
                            <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> +{pkg.bonusCoins.toLocaleString()} Free Bonus
                            </div>
                          )}

                          <div className="pt-2 text-xs font-bold text-amber-200">
                            {isCustom
                              ? `${calculateCustomPriceBdt(customCoins)} BDT`
                              : `${pkg.priceBdt} BDT`}
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                              ({isCustom ? `$${(calculateCustomPriceBdt(customCoins) / 120).toFixed(2)}` : `$${pkg.priceUsd}`})
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Coin Input if selected */}
              {(selectedPkg?.isCustom || selectedPkg?.id === 'pkg_custom') && (
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">Enter Desired Coin Amount</span>
                    <span className="text-amber-300 font-bold">{customCoins.toLocaleString()} Coins</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="50000"
                    step="100"
                    value={customCoins}
                    onChange={(e) => setCustomCoins(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Min: 200</span>
                    <span className="text-amber-400 font-mono font-bold">
                      Price: {calculateCustomPriceBdt(customCoins)} BDT
                    </span>
                    <span>Max: 50,000</span>
                  </div>
                </div>
              )}

              {/* Gateway Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">
                  2. Select Payment Method (Bangladesh & Global)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {GATEWAYS.map((gw) => {
                    const isSelected = selectedGateway === gw.id;
                    return (
                      <div
                        key={gw.id}
                        onClick={() => setSelectedGateway(gw.id)}
                        className={`cursor-pointer p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? `bg-white/10 ring-2 ring-white/30 ${gw.color}`
                            : 'bg-white/5 border-white/10 hover:bg-white/[0.08] text-slate-300'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{gw.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 font-medium">
                              {gw.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">{gw.description}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-amber-400 bg-amber-400 text-slate-950' : 'border-slate-600'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Security & Action */}
              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>256-bit SSL encrypted • Server-side verified</span>
                </div>
                <button
                  onClick={handleCreateIntent}
                  disabled={isLoading || !selectedPkg}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs hover:from-amber-400 hover:to-amber-300 transition shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Preparing Intent...
                    </>
                  ) : (
                    <>
                      Proceed to Pay <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : checkoutStep === 'payment_intent' ? (
            /* Stage 2: Gateway Verification & Checkout Simulation */
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">Invoice #{activeIntent?.transactionId}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase">
                    Payment Intent Ready
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Total Coins to Credit:</span>
                  <span className="font-extrabold text-white text-base">
                    +{activeIntent?.totalCoins?.toLocaleString()} Coins
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm border-t border-white/5 pt-2">
                  <span className="text-slate-300">Amount Due:</span>
                  <span className="font-black text-amber-400 text-lg">
                    {activeIntent?.amountBdt?.toFixed(2)} BDT
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 bg-white/5 p-2 rounded-xl">
                  {activeIntent?.instructions || `Authorize via ${selectedGateway.toUpperCase()}`}
                </div>
              </div>

              {/* Checkout Interactive Form */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <label className="text-xs font-bold text-slate-300 block">
                  {selectedGateway === 'stripe' ? 'Card / Account Identifier' : `${selectedGateway.toUpperCase()} Wallet Number`}
                </label>
                <input
                  type="text"
                  value={payerAccount}
                  onChange={(e) => setPayerAccount(e.target.value)}
                  placeholder="e.g. 01712345678"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/20 rounded-xl text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                />

                {/* Developer Simulation Controls */}
                <div className="pt-2 border-t border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">
                    Gateway Sandbox Outcome Simulation:
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSimulationAction('success')}
                      className={`py-2 px-3 rounded-xl border text-center transition font-semibold ${
                        simulationAction === 'success'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      Simulate Success
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulationAction('fail')}
                      className={`py-2 px-3 rounded-xl border text-center transition font-semibold ${
                        simulationAction === 'fail'
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      Simulate Failure
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCheckoutStep('select')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel & Change Plan
                </button>
                <button
                  onClick={handleVerifyPayment}
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs hover:from-emerald-400 hover:to-teal-300 transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying with Gateway...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Confirm & Verify Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Stage 3: Celebration & Coin Credit Confirmation */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">Payment Successfully Verified!</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                +{activeIntent?.totalCoins?.toLocaleString()} Coins have been credited to your balance. You are ready to gift creators, participate in VIP livestreams, and unlock perks!
              </p>
              <div className="pt-4 flex justify-center">
                <button
                  onClick={onClose}
                  className="px-8 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs hover:from-amber-400 hover:to-amber-300 transition shadow"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

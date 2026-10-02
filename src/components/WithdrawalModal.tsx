import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Coins,
  Building,
  Smartphone,
  Info,
} from 'lucide-react';
import { WithdrawalSettingsConfig } from '../types';
import { useAuth } from '../context/AuthContext';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAvailableCoins: number;
  onSuccess: () => void;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  userAvailableCoins,
  onSuccess,
}) => {
  const { token, refreshUser } = useAuth();

  const [settings, setSettings] = useState<WithdrawalSettingsConfig | null>(null);
  const [eligibility, setEligibility] = useState<any | null>(null);
  const [coinsInput, setCoinsInput] = useState<number>(1000);
  const [payoutMethod, setPayoutMethod] = useState<string>('bkash');
  const [accountDetails, setAccountDetails] = useState({
    accountNumber: '',
    accountHolderName: '',
    bankName: '',
    branchName: '',
    routingNumber: '',
  });

  const [calculation, setCalculation] = useState<{
    coins: number;
    grossAmountBdt: number;
    feeBdt: number;
    netPayoutBdt: number;
  } | null>(null);

  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [confirmedRisk, setConfirmedRisk] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      setIsSuccess(false);
      setErrorMessage(null);
      setConfirmedRisk(false);
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/withdrawals/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setEligibility(data.eligibility);
        if (data.settings?.minWithdrawalCoins) {
          setCoinsInput(Math.max(data.settings.minWithdrawalCoins, 1000));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Recalculate server-side preview whenever coin input changes
  useEffect(() => {
    if (!token || !coinsInput || coinsInput <= 0) return;

    const timer = setTimeout(async () => {
      setIsCalculating(true);
      try {
        const res = await fetch('/api/withdrawals/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ coins: coinsInput }),
        });
        if (res.ok) {
          const data = await res.json();
          setCalculation(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsCalculating(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [coinsInput, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (coinsInput > userAvailableCoins) {
      setErrorMessage(`Insufficient balance. You currently have ${userAvailableCoins.toLocaleString()} coins.`);
      return;
    }

    if (settings && coinsInput < settings.minWithdrawalCoins) {
      setErrorMessage(`Minimum withdrawal is ${settings.minWithdrawalCoins} coins.`);
      return;
    }

    if (settings && coinsInput > settings.maxWithdrawalCoins) {
      setErrorMessage(`Maximum withdrawal is ${settings.maxWithdrawalCoins} coins.`);
      return;
    }

    if (!accountDetails.accountNumber && !accountDetails.accountHolderName) {
      setErrorMessage('Please provide valid destination account/phone details.');
      return;
    }

    if (!confirmedRisk) {
      setErrorMessage('Please acknowledge the balance deduction confirmation below.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/withdrawals/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          coins: coinsInput,
          payoutMethod,
          accountDetails,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit withdrawal request.');
      }

      setIsSuccess(true);
      refreshUser();
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error submitting withdrawal request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/35 dark:bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-purple-600/10 via-amber-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Withdraw Earnings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Direct mobile banking & bank wire payout in Bangladesh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {eligibility && !eligibility.isEligible && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-bold">Verification Requirement Notice: </span>
                {eligibility.reason}
              </div>
            </div>
          )}

          {isSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">Withdrawal Request Submitted!</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Your coins have been securely reserved into pending status. Our finance team will review and disburse your funds within 2-24 hours.
              </p>
              <div className="pt-4 flex justify-center">
                <button
                  onClick={onClose}
                  className="px-8 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs hover:opacity-90 transition shadow"
                >
                  View in Wallet
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Dynamic Rate Banner & Combined Coins Note */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span>কনভার্সন রেট:</span>
                  </div>
                  <div className="font-mono font-bold text-amber-300">
                    {settings?.conversionRateCoins || 1000} Coins = {settings?.conversionRateBdt || 120} BDT
                  </div>
                </div>
                <p className="text-[11px] text-cyan-300 font-medium">
                  💡 আপনি প্রাপ্ত গিফট কয়েন ও ফ্রি আর্ন করা কয়েন যেকোনো পরিমাণ একসাথে ক্যাশআউট/উইথড্র করতে পারবেন।
                </p>
              </div>

              {/* Coins Input & Quick Select */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-300">Coins to Withdraw</label>
                  <span className="text-slate-400">
                    Available: <b className="text-white">{userAvailableCoins.toLocaleString()}</b>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={settings?.minWithdrawalCoins || 500}
                    max={Math.min(userAvailableCoins, settings?.maxWithdrawalCoins || 50000)}
                    value={coinsInput}
                    onChange={(e) => setCoinsInput(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-950 border border-white/20 rounded-2xl text-white font-mono text-sm focus:border-purple-400 focus:outline-none"
                    placeholder="Enter coin amount"
                    required
                  />
                  <div className="absolute right-3 top-3 text-xs text-amber-400 font-bold">COINS</div>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex gap-2 pt-1">
                  {[500, 1000, 2500, 5000, userAvailableCoins].map((val, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCoinsInput(val)}
                      className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 border border-white/10 transition font-mono"
                    >
                      {idx === 4 ? 'MAX' : val.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payout Method Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">Select Payout Method</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { id: 'bkash', name: 'bKash (বিকাশ)', icon: Smartphone },
                    { id: 'nagad', name: 'Nagad (নগদ)', icon: Smartphone },
                    { id: 'rocket', name: 'Rocket (রকেট)', icon: Smartphone },
                    { id: 'upay', name: 'Upay (উপায়)', icon: Smartphone },
                    { id: 'bank_transfer', name: 'Bank Transfer', icon: Building },
                  ].map((m) => {
                    const isSelected = payoutMethod === m.id;
                    const Icon = m.icon;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setPayoutMethod(m.id)}
                        className={`cursor-pointer p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? 'bg-purple-600/20 border-purple-400 text-white font-bold ring-1 ring-purple-400'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px]">{m.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Destination Account Details */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                {payoutMethod === 'bank_transfer' ? (
                  <>
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                        Bank Name & Branch
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. City Bank, Gulshan Branch"
                        value={accountDetails.bankName}
                        onChange={(e) =>
                          setAccountDetails({ ...accountDetails, bankName: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-white/20 rounded-xl text-white text-xs focus:border-purple-400 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                        Account Holder Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Tanvir Ahmed"
                        value={accountDetails.accountHolderName}
                        onChange={(e) =>
                          setAccountDetails({ ...accountDetails, accountHolderName: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-white/20 rounded-xl text-white text-xs focus:border-purple-400 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 110293847501"
                        value={accountDetails.accountNumber}
                        onChange={(e) =>
                          setAccountDetails({ ...accountDetails, accountNumber: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-white/20 rounded-xl text-white text-xs font-mono focus:border-purple-400 focus:outline-none"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                        {payoutMethod.toUpperCase()} Personal / Agent Wallet Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 01712345678"
                        value={accountDetails.accountNumber}
                        onChange={(e) =>
                          setAccountDetails({ ...accountDetails, accountNumber: e.target.value })
                        }
                        className="w-full px-3 py-2.5 bg-slate-950 border border-white/20 rounded-xl text-white text-xs font-mono focus:border-purple-400 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                        Account Holder Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Nixo Creator"
                        value={accountDetails.accountHolderName}
                        onChange={(e) =>
                          setAccountDetails({ ...accountDetails, accountHolderName: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-white/20 rounded-xl text-white text-xs focus:border-purple-400 focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Server-Side Calculated Financial Breakdown */}
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Gross Conversion:</span>
                  <span className="font-mono text-white">
                    {calculation ? `${calculation.grossAmountBdt.toFixed(2)} BDT` : '...'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Platform Fee ({settings?.processingFeePercent || 2.5}% + {settings?.processingFeeFixedBdt || 5} BDT):</span>
                  <span className="font-mono text-rose-300">
                    {calculation ? `-${calculation.feeBdt.toFixed(2)} BDT` : '...'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold border-t border-purple-500/20 pt-2 text-white">
                  <span>Net Payout You Receive:</span>
                  <span className="font-mono text-emerald-400 text-base">
                    {calculation ? `${calculation.netPayoutBdt.toFixed(2)} BDT` : '...'}
                  </span>
                </div>
              </div>

              {/* Risk Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-slate-300">
                <input
                  type="checkbox"
                  checked={confirmedRisk}
                  onChange={(e) => setConfirmedRisk(e.target.checked)}
                  className="mt-0.5 rounded accent-purple-500"
                />
                <span>
                  I confirm that {coinsInput.toLocaleString()} coins will be locked immediately and disbursed to the provided {payoutMethod.toUpperCase()} account upon review.
                </span>
              </label>

              {/* Action */}
              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !confirmedRisk || (eligibility && !eligibility.isEligible)}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs hover:from-purple-500 hover:to-indigo-500 transition shadow-lg shadow-purple-600/30 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Submitting Request...
                    </>
                  ) : (
                    <>
                      Confirm & Submit <ArrowUpRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Calendar,
  Eye,
  EyeOff,
  AtSign,
  Shield,
  Globe,
  Lock as LockIcon,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isStandalone?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, isStandalone = false }) => {
  const { login, register } = useAuth();
  const { language, t } = useLanguage();
  const isBn = language === 'bn';

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  
  // Registration fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [dobPrivacy, setDobPrivacy] = useState<'public' | 'only_me'>('public');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'unspecified'>('male');
  const [genderPrivacy, setGenderPrivacy] = useState<'public' | 'only_me'>('public');

  // Login field
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Recovery fields
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Status
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        if (!fullName.trim() || !username.trim() || !email.trim() || !phone.trim() || !password) {
          throw new Error(isBn ? 'দয়া করে পূর্ণ নাম, ইউজারনেম, ইমেইল, মোবাইল নম্বর এবং পাসওয়ার্ড পূরণ করুন' : 'Please fill all required fields including Mobile Number');
        }

        if (password.length < 6) {
          throw new Error(isBn ? 'পাসওয়ার্ডটি ন্যূনতম ৬ অক্ষর বা মোবাইল নম্বর হতে হবে' : 'Password must be at least 6 characters or mobile number');
        }

        if (password !== confirmPassword) {
          throw new Error(isBn ? 'পাসওয়ার্ড দুটি মেলেনি! অনুগ্রহ করে পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মিলিয়ে লিখুন।' : 'Passwords do not match! Please verify your password confirmation.');
        }

        await register(username.trim(), email.trim(), phone.trim(), password, fullName.trim(), {
          birthdate: birthdate || undefined,
          gender,
          dobPrivacy,
          genderPrivacy,
        });
        setSuccessMessage(
          isBn
            ? 'আপনার অ্যাকাউন্ট সফলভাবে সম্পন্ন হয়েছে। অনুগ্রহ করে আপনার ইউজার আইডি এবং পাসওয়ার্ড দিয়ে লগইন করুন।'
            : 'Your account created successfully. Please login with your credentials.'
        );
        setMode('login');
        setLoginIdentifier(username.trim());
      } else if (mode === 'login') {
        if (!loginIdentifier.trim() || !loginPassword) {
          throw new Error(isBn ? 'ইউজার ID (জিমেইল / ইমেইল / মোবাইল নং) এবং পাসওয়ার্ড দিন' : 'Please enter User ID (Email/Mobile/Username) and password');
        }
        await login(loginIdentifier.trim(), loginPassword);
        if (!isStandalone) {
          onClose();
        }
      } else if (mode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginIdentifier.trim() }),
        });
        const data = await res.json();
        if (res.ok) {
          setSuccessMessage(
            data.message ||
              (isBn
                ? 'পাসওয়ার্ড রিসেট কোড তৈরি হয়েছে। নিচের টোকেনটি দেখুন।'
                : 'Password reset code generated. Check token below.')
          );
          if (data.resetToken) setResetToken(data.resetToken);
          setMode('reset');
        } else {
          setError(data.error || (isBn ? 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে' : 'Failed to request reset'));
        }
      } else if (mode === 'reset') {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken.trim(), newPassword }),
        });
        const data = await res.json();
        if (res.ok) {
          setSuccessMessage(
            isBn
              ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! এখন লগইন করুন।'
              : 'Password successfully updated! You can now sign in.'
          );
          setMode('login');
        } else {
          setError(data.error || (isBn ? 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে' : 'Failed to reset password'));
        }
      }
    } catch (err: any) {
      setError(err.message || (isBn ? 'প্রক্রিয়াটি সম্পন্ন হতে ব্যর্থ হয়েছে' : 'Authentication failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={isStandalone ? undefined : onClose}
      className={
        isStandalone
          ? "w-full max-w-lg mx-auto my-auto p-1 z-20 relative"
          : "fixed inset-0 z-50 bg-slate-950/35 dark:bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      }
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-[#0c1222] text-slate-900 dark:text-white border border-slate-200 dark:border-cyan-500/20 rounded-[32px] p-5 sm:p-7 shadow-2xl relative animate-in zoom-in-95 my-auto max-h-[92vh] overflow-y-auto"
      >
        {/* Glow corner accent */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-cyan-500/15 via-purple-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-44 h-44 bg-gradient-to-tr from-pink-500/15 via-purple-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-pink-500 p-[1px] flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                {mode === 'register'
                  ? isBn ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'Create Your Account'
                  : mode === 'forgot'
                  ? isBn ? 'পাসওয়ার্ড উদ্ধার' : 'Password Recovery'
                  : mode === 'reset'
                  ? isBn ? 'পাসওয়ার্ড পরিবর্তন' : 'Set New Password'
                  : isBn ? 'স্বাগতম নিক্সো সোশ্যাল প্ল্যাটফর্মে' : 'Welcome to Nixo Social'}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                {mode === 'register'
                  ? isBn ? 'নিরাপদ, সুরক্ষিত এবং আধুনিক নিক্সো সোশ্যাল প্ল্যাটফর্ম' : 'Join the next-generation Nixo social web'
                  : isBn ? 'আপনার প্রোফাইলে প্রবেশ করতে জিমেইল/মোবাইল নং দিয়ে লগইন করুন' : 'Sign in with your Gmail or Mobile No to continue'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => {
                const newLang = isBn ? 'en' : 'bn';
                window.dispatchEvent(new CustomEvent('app-change-language', { detail: newLang }));
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300 text-[11px] font-bold border border-slate-200 dark:border-white/10 transition-all cursor-pointer flex items-center gap-1"
            >
              <Globe className="w-3 h-3 text-cyan-500" />
              <span>{isBn ? 'EN' : 'বাং'}</span>
            </button>

            {!isStandalone && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/15 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Toggle Mode Switcher (Login vs Register) */}
        {(mode === 'login' || mode === 'register') && (
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl mb-4 relative z-10">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {isBn ? 'লগইন করুন' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {isBn ? 'সাইন আপ' : 'Sign Up'}
            </button>
          </div>
        )}

        {/* Error / Success Notifications */}
        {error && (
          <div className="mb-3.5 p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-xs text-rose-700 dark:text-rose-200 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span className="flex-1 font-medium">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-3.5 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-xs text-emerald-700 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="flex-1 font-medium">{successMessage}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-3 relative z-10">
          
          {/* ================= REGISTER FIELDS ================= */}
          {mode === 'register' && (
            <>
              {/* Full Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {isBn ? 'পূর্ণ নাম (Full Name) *' : 'Full Name *'}
                  </label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={isBn ? 'যেমন: তানভীর আহমেদ' : 'e.g. Alex Vance'}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/15 focus:border-cyan-500 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {isBn ? 'ইউজারনেম (Username) *' : 'Username *'}
                  </label>
                  <div className="relative">
                    <AtSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. alex_vance"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/15 focus:border-cyan-500 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Email & Mobile Phone (Mandatory) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {isBn ? 'ইমেইল অ্যাড্রেস (Gmail / Email) *' : 'Email Address (Gmail / Email) *'}
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@gmail.com"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/15 focus:border-cyan-500 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {isBn ? 'মোবাইল নম্বর (Mobile No) *' : 'Mobile Number (Required) *'}
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={isBn ? 'যেমন: 01700000000' : 'e.g. +8801700000000'}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/15 focus:border-cyan-500 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Confirm Password (2 times input with real-time matching) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {isBn ? 'পাসওয়ার্ড (Password) *' : 'Password *'}
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/15 focus:border-cyan-500 rounded-xl pl-8 pr-9 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-cyan-600 dark:text-cyan-400 mt-1">
                    {isBn ? '💡 মোবাইল নম্বরও পাসওয়ার্ড হিসেবে দিতে পারেন (নূন্যতম ৬ অক্ষর/সংখ্যা)' : '💡 Mobile number can also be used as password (min 6 digits)'}
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {isBn ? 'পাসওয়ার্ড নিশ্চিত করুন (আবার লিখুন) *' : 'Confirm Password (Type again) *'}
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full bg-slate-50 dark:bg-white/5 border rounded-xl pl-8 pr-9 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all ${
                        confirmPassword
                          ? password === confirmPassword
                            ? 'border-emerald-500 focus:border-emerald-500 ring-1 ring-emerald-500/30'
                            : 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                          : 'border-slate-200 dark:border-white/15 focus:border-cyan-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {/* Real-time Match Indicator */}
                  {confirmPassword && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold">
                      {password === confirmPassword ? (
                        <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isBn ? 'পাসওয়ার্ড দুটি মিলেছে ✓' : 'Passwords match ✓'}</span>
                        </span>
                      ) : (
                        <span className="text-rose-500 dark:text-rose-400 flex items-center gap-1">
                          <X className="w-3.5 h-3.5" />
                          <span>{isBn ? 'পাসওয়ার্ড দুটি মেলেনি ✗' : 'Passwords do not match ✗'}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Date of Birth & Privacy Setting */}
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>{isBn ? 'জন্ম তারিখ (Date of Birth)' : 'Date of Birth'}</span>
                  </label>
                  
                  {/* Privacy Selector for DOB */}
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-slate-500 dark:text-slate-400">{isBn ? 'প্রাইভেসি:' : 'Privacy:'}</span>
                    <button
                      type="button"
                      onClick={() => setDobPrivacy(dobPrivacy === 'public' ? 'only_me' : 'public')}
                      className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                        dobPrivacy === 'public'
                          ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40'
                          : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {dobPrivacy === 'public' ? (
                        <>
                          <Globe className="w-2.5 h-2.5" />
                          <span>{isBn ? 'পাবলিক' : 'Public'}</span>
                        </>
                      ) : (
                        <>
                          <LockIcon className="w-2.5 h-2.5" />
                          <span>{isBn ? 'অনলি মি' : 'Only Me'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <input
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none transition-all"
                />
              </div>

              {/* Gender & Privacy Setting */}
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400" />
                    <span>{isBn ? 'জেন্ডার / লিঙ্গ (Gender)' : 'Gender'}</span>
                  </label>

                  {/* Privacy Selector for Gender */}
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-slate-500 dark:text-slate-400">{isBn ? 'প্রাইভেসি:' : 'Privacy:'}</span>
                    <button
                      type="button"
                      onClick={() => setGenderPrivacy(genderPrivacy === 'public' ? 'only_me' : 'public')}
                      className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                        genderPrivacy === 'public'
                          ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40'
                          : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {genderPrivacy === 'public' ? (
                        <>
                          <Globe className="w-2.5 h-2.5" />
                          <span>{isBn ? 'পাবলিক' : 'Public'}</span>
                        </>
                      ) : (
                        <>
                          <LockIcon className="w-2.5 h-2.5" />
                          <span>{isBn ? 'অনলি মি' : 'Only Me'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'male', labelEn: 'Male', labelBn: 'পুরুষ' },
                    { id: 'female', labelEn: 'Female', labelBn: 'মহিলা' },
                    { id: 'other', labelEn: 'Other', labelBn: 'অন্যান্য' },
                    { id: 'unspecified', labelEn: 'Hidden', labelBn: 'গোপন' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGender(g.id as any)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                        gender === g.id
                          ? 'border-pink-500 bg-pink-500/20 text-pink-700 dark:text-white ring-1 ring-pink-500/40'
                          : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {isBn ? g.labelBn : g.labelEn}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ================= LOGIN FIELDS ================= */}
          {mode === 'login' && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {isBn ? 'ইউজার ID (জিমেইল / ইমেইল / মোবাইল নং / ইউজারনেম)' : 'User ID (Gmail / Email / Mobile No / Username)'}
                </label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder={isBn ? 'আপনার ইমেইল/জিমেইল, মোবাইল নং বা ইউজার ID দিন' : 'Enter your Gmail, Mobile No, or Username'}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/15 focus:border-cyan-500 rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    {isBn ? 'পাসওয়ার্ড' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                    }}
                    className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer font-bold"
                  >
                    {isBn ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/15 focus:border-cyan-500 rounded-xl pl-8 pr-9 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ================= FORGOT / RESET FIELDS ================= */}
          {mode === 'forgot' && (
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {isBn ? 'আপনার নিবন্ধিত ইমেইল অ্যাড্রেস' : 'Your Registered Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="your-email@nixo.io"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/15 focus:border-cyan-500 rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {isBn ? 'রিসেট টোকেন / কোড' : 'Reset Token / Code'}
                </label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Paste reset token here"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/15 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-mono text-cyan-600 dark:text-cyan-300 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {isBn ? 'নতুন শক্তিশালী পাসওয়ার্ড' : 'New Strong Password'}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/15 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none transition-all"
                />
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 mt-3 rounded-2xl font-extrabold text-xs text-white bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 hover:opacity-95 transition-all shadow-lg shadow-purple-500/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{isBn ? 'অপেক্ষা করুন...' : 'Processing...'}</span>
              </span>
            ) : mode === 'register' ? (
              <>
                <span>{isBn ? 'রেজিস্ট্রেশন সম্পন্ন করুন' : 'Complete Registration'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            ) : mode === 'forgot' ? (
              <span>{isBn ? 'রিসেট কোড পাঠান' : 'Send Reset Code'}</span>
            ) : mode === 'reset' ? (
              <span>{isBn ? 'পাসওয়ার্ড আপডেট করুন' : 'Update Password'}</span>
            ) : (
              <>
                <span>{isBn ? 'লগইন করুন' : 'Sign In to Nixo'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 text-center text-[10px] text-slate-500 dark:text-slate-400 relative z-10">
          {mode === 'login' ? (
            <p>
              {isBn ? 'অ্যাকাউন্ট নেই?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className="text-cyan-600 dark:text-cyan-400 hover:underline font-bold ml-1 cursor-pointer"
              >
                {isBn ? 'এখানে ক্লিক করে সাইন আপ করুন' : 'Sign Up here'}
              </button>
            </p>
          ) : mode === 'register' ? (
            <p>
              {isBn ? 'ইতিমধ্যে অ্যাকাউন্ট আছে?' : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-pink-600 dark:text-pink-400 hover:underline font-bold ml-1 cursor-pointer"
              >
                {isBn ? 'লগইন করুন' : 'Sign In'}
              </button>
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline cursor-pointer font-medium"
            >
              {isBn ? '← লগইনে ফিরে যান' : '← Back to Sign In'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Globe,
  Lock,
  Sparkles,
  GraduationCap,
  Briefcase,
  Heart,
  Activity,
  Smile,
  Calendar,
  Check,
  Edit2,
} from 'lucide-react';
import { User } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface ProfileDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onProfileUpdated: (updatedUser: User) => void;
  token: string | null;
}

export const ProfileDetailsModal: React.FC<ProfileDetailsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
  token,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Active section tab in modal
  const [activeSection, setActiveSection] = useState<
    'bio' | 'basic' | 'interests' | 'activities' | 'hobbies' | 'education' | 'work'
  >('bio');

  // Fields
  const [bio, setBio] = useState(currentUser.bio || '');
  const [birthdate, setBirthdate] = useState(currentUser.birthdate || '');
  const [dobPrivacy, setDobPrivacy] = useState<'public' | 'only_me'>(currentUser.dobPrivacy || 'public');
  const [gender, setGender] = useState(currentUser.gender || 'unspecified');
  const [genderPrivacy, setGenderPrivacy] = useState<'public' | 'only_me'>(currentUser.genderPrivacy || 'public');

  // Interests
  const [interests, setInterests] = useState<string[]>(currentUser.interests || []);
  const [newInterestInput, setNewInterestInput] = useState('');
  const [interestsPrivacy, setInterestsPrivacy] = useState<'public' | 'only_me'>(currentUser.interestsPrivacy || 'public');

  // Activities
  const [activities, setActivities] = useState<string[]>(currentUser.activities || []);
  const [newActivityInput, setNewActivityInput] = useState('');
  const [activitiesPrivacy, setActivitiesPrivacy] = useState<'public' | 'only_me'>(currentUser.activitiesPrivacy || 'public');

  // Hobbies
  const [hobbies, setHobbies] = useState<string[]>(currentUser.hobbies || []);
  const [newHobbyInput, setNewHobbyInput] = useState('');
  const [hobbiesPrivacy, setHobbiesPrivacy] = useState<'public' | 'only_me'>(currentUser.hobbiesPrivacy || 'public');

  // Education
  const [education, setEducation] = useState(currentUser.education || '');
  const [educationPrivacy, setEducationPrivacy] = useState<'public' | 'only_me'>(currentUser.educationPrivacy || 'public');

  // Work & Job
  const [workingDetails, setWorkingDetails] = useState(currentUser.workingDetails || currentUser.occupation || '');
  const [workPrivacy, setWorkPrivacy] = useState<'public' | 'only_me'>(currentUser.workPrivacy || 'public');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Add handlers
  const handleAddInterest = () => {
    if (!newInterestInput.trim()) return;
    if (!interests.includes(newInterestInput.trim())) {
      setInterests([...interests, newInterestInput.trim()]);
    }
    setNewInterestInput('');
  };

  const handleRemoveInterest = (item: string) => {
    setInterests(interests.filter((i) => i !== item));
  };

  const handleAddActivity = () => {
    if (!newActivityInput.trim()) return;
    if (!activities.includes(newActivityInput.trim())) {
      setActivities([...activities, newActivityInput.trim()]);
    }
    setNewActivityInput('');
  };

  const handleRemoveActivity = (item: string) => {
    setActivities(activities.filter((a) => a !== item));
  };

  const handleAddHobby = () => {
    if (!newHobbyInput.trim()) return;
    if (!hobbies.includes(newHobbyInput.trim())) {
      setHobbies([...hobbies, newHobbyInput.trim()]);
    }
    setNewHobbyInput('');
  };

  const handleRemoveHobby = (item: string) => {
    setHobbies(hobbies.filter((h) => h !== item));
  };

  const handleSaveAll = async () => {
    if (!token) return;
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        bio: bio.trim(),
        birthdate: birthdate || null,
        dobPrivacy,
        gender,
        genderPrivacy,
        interests,
        interestsPrivacy,
        activities,
        activitiesPrivacy,
        hobbies,
        hobbiesPrivacy,
        education: education.trim() || null,
        educationPrivacy,
        occupation: workingDetails.trim() || null,
        workingDetails: workingDetails.trim() || null,
        workPrivacy,
      };

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update profile');
      }

      const data = await res.json();
      if (data.user) {
        onProfileUpdated(data.user);
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 800);
    } catch (e: any) {
      setError(e.message || 'Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-white/20 rounded-[32px] p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                {isBn ? 'প্রোফাইল বিবরণ ও সেটিংস এডিট' : 'Edit Profile Details & Information'}
              </h3>
              <p className="text-[10px] text-slate-400">
                {isBn
                  ? 'আপনার বায়ো, পছন্দ, চাকরি, শিক্ষা ও শখের বিবরণ যোগ বা পরিবর্তন করুন'
                  : 'Customize your bio, interests, hobbies, education, and career details'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Navigation Tabs (Horizontal Scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0 border-b border-white/5">
          {[
            { id: 'bio', labelBn: 'বায়ো', labelEn: 'Bio', icon: Sparkles },
            { id: 'basic', labelBn: 'জন্ম ও জেন্ডার', labelEn: 'DOB & Gender', icon: Calendar },
            { id: 'interests', labelBn: 'ইন্টারেস্ট', labelEn: 'Interests', icon: Heart },
            { id: 'activities', labelBn: 'অ্যাক্টিভিটিস', labelEn: 'Activities', icon: Activity },
            { id: 'hobbies', labelBn: 'হবি', labelEn: 'Hobbies', icon: Smile },
            { id: 'education', labelBn: 'এডুকেশন', labelEn: 'Education', icon: GraduationCap },
            { id: 'work', labelBn: 'জব ও ওয়ার্কিং', labelEn: 'Job & Work', icon: Briefcase },
          ].map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{isBn ? sec.labelBn : sec.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* Messages */}
        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs shrink-0">
            {error}
          </div>
        )}
        {saveSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shrink-0">
            <Check className="w-4 h-4" />
            <span>{isBn ? 'সফলভাবে সংরক্ষিত হয়েছে!' : 'Changes saved successfully!'}</span>
          </div>
        )}

        {/* Dynamic Section Form Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          
          {/* SECTION 1: BIO */}
          {activeSection === 'bio' && (
            <div className="space-y-3 p-1">
              <label className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>{isBn ? 'বায়ো লিখুন (Bio Description)' : 'Bio / Short Biography'}</span>
              </label>
              <textarea
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={300}
                placeholder={
                  isBn
                    ? 'আপনার ব্যক্তিত্ব, ক্যারিয়ার ও সোশ্যাল ভাইব সম্পর্কে আকর্ষণীয় কিছু লিখুন...'
                    : 'Write a compelling bio about yourself, hobbies, or passion...'
                }
                className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 outline-none resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{isBn ? 'সর্বোচ্চ ৩০০ অক্ষর' : 'Max 300 characters'}</span>
                <span className="font-mono">{bio.length}/300</span>
              </div>
            </div>
          )}

          {/* SECTION 2: DOB & GENDER */}
          {activeSection === 'basic' && (
            <div className="space-y-4 p-1">
              {/* DOB */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span>{isBn ? 'জন্ম তারিখ (Date of Birth)' : 'Date of Birth'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setDobPrivacy(dobPrivacy === 'public' ? 'only_me' : 'public')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                      dobPrivacy === 'public'
                        ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                        : 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {dobPrivacy === 'public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    <span>{dobPrivacy === 'public' ? (isBn ? 'পাবলিক' : 'Public') : (isBn ? 'অনলি মি' : 'Only Me')}</span>
                  </button>
                </div>
                <input
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              {/* Gender */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white">
                    {isBn ? 'জেন্ডার / লিঙ্গ' : 'Gender'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setGenderPrivacy(genderPrivacy === 'public' ? 'only_me' : 'public')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                      genderPrivacy === 'public'
                        ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                        : 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {genderPrivacy === 'public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    <span>{genderPrivacy === 'public' ? (isBn ? 'পাবলিক' : 'Public') : (isBn ? 'অনলি মি' : 'Only Me')}</span>
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'male', bn: 'পুরুষ', en: 'Male' },
                    { id: 'female', bn: 'মহিলা', en: 'Female' },
                    { id: 'other', bn: 'অন্যান্য', en: 'Other' },
                    { id: 'unspecified', bn: 'গোপন', en: 'Hidden' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGender(g.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                        gender === g.id
                          ? 'border-pink-500 bg-pink-500/20 text-white ring-1 ring-pink-500/50'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isBn ? g.bn : g.en}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: INTERESTS */}
          {activeSection === 'interests' && (
            <div className="space-y-3 p-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span>{isBn ? 'পছন্দসমূহ ও ক্ষেত্র (Interests)' : 'Interests & Topics'}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setInterestsPrivacy(interestsPrivacy === 'public' ? 'only_me' : 'public')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    interestsPrivacy === 'public'
                      ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                      : 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {interestsPrivacy === 'public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>{interestsPrivacy === 'public' ? (isBn ? 'পাবলিক' : 'Public') : (isBn ? 'অনলি মি' : 'Only Me')}</span>
                </button>
              </div>

              {/* Add Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newInterestInput}
                  onChange={(e) => setNewInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInterest();
                    }
                  }}
                  placeholder={isBn ? 'যেমন: কৃত্রিম বুদ্ধিমত্তা, ফটোগ্রাফি, গ্রাফিক্স ডিজাইন...' : 'e.g. Artificial Intelligence, Photography, UI/UX Design...'}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={handleAddInterest}
                  className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isBn ? 'যোগ করুন' : 'Add'}</span>
                </button>
              </div>

              {/* Tags Cloud */}
              <div className="flex flex-wrap gap-2 pt-2">
                {interests.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">{isBn ? 'এখনও কোনো ইন্টারেস্ট যোগ করা হয়নি।' : 'No interests added yet.'}</p>
                ) : (
                  interests.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span>#{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInterest(item)}
                        className="hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: ACTIVITIES */}
          {activeSection === 'activities' && (
            <div className="space-y-3 p-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>{isBn ? 'অ্যাক্টিভিটিস ও কার্যক্রম (Activities)' : 'Activities & Pursuits'}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setActivitiesPrivacy(activitiesPrivacy === 'public' ? 'only_me' : 'public')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    activitiesPrivacy === 'public'
                      ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                      : 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {activitiesPrivacy === 'public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>{activitiesPrivacy === 'public' ? (isBn ? 'পাবলিক' : 'Public') : (isBn ? 'অনলি মি' : 'Only Me')}</span>
                </button>
              </div>

              {/* Add Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newActivityInput}
                  onChange={(e) => setNewActivityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddActivity();
                    }
                  }}
                  placeholder={isBn ? 'যেমন: সকালে জগিং, ওপেন সোর্স কোডিং, রক্তদান কার্যক্রম...' : 'e.g. Morning jogging, Open-source coding, Community meetup...'}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={handleAddActivity}
                  className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isBn ? 'যোগ করুন' : 'Add'}</span>
                </button>
              </div>

              {/* Activity List */}
              <div className="space-y-1.5 pt-2">
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">{isBn ? 'এখনও কোনো অ্যাক্টিভিটি যোগ করা হয়নি।' : 'No activities added yet.'}</p>
                ) : (
                  activities.map((act, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs text-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>{act}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveActivity(act)}
                        className="text-slate-400 hover:text-rose-400 cursor-pointer p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SECTION 5: HOBBIES */}
          {activeSection === 'hobbies' && (
            <div className="space-y-3 p-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-2">
                  <Smile className="w-4 h-4 text-amber-400" />
                  <span>{isBn ? 'শখ ও প্রিয় কাজ (Hobbies)' : 'Hobbies & Leisure'}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setHobbiesPrivacy(hobbiesPrivacy === 'public' ? 'only_me' : 'public')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    hobbiesPrivacy === 'public'
                      ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                      : 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {hobbiesPrivacy === 'public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>{hobbiesPrivacy === 'public' ? (isBn ? 'পাবলিক' : 'Public') : (isBn ? 'অনলি মি' : 'Only Me')}</span>
                </button>
              </div>

              {/* Add Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newHobbyInput}
                  onChange={(e) => setNewHobbyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddHobby();
                    }
                  }}
                  placeholder={isBn ? 'যেমন: বই পড়া, গিটার বাজানো, ভ্রমণ করা, বাগান তৈরি...' : 'e.g. Reading Sci-Fi, Guitar, Gaming, Traveling...'}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={handleAddHobby}
                  className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isBn ? 'যোগ করুন' : 'Add'}</span>
                </button>
              </div>

              {/* Hobbies Grid */}
              <div className="flex flex-wrap gap-2 pt-2">
                {hobbies.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">{isBn ? 'এখনও কোনো শখ যোগ করা হয়নি।' : 'No hobbies added yet.'}</p>
                ) : (
                  hobbies.map((h, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-semibold flex items-center gap-2"
                    >
                      <span>🎯 {h}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveHobby(h)}
                        className="hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SECTION 6: EDUCATION */}
          {activeSection === 'education' && (
            <div className="space-y-3 p-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-purple-400" />
                  <span>{isBn ? 'এডুকেশন ডিটেইলস (Education Details)' : 'Education Details'}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setEducationPrivacy(educationPrivacy === 'public' ? 'only_me' : 'public')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    educationPrivacy === 'public'
                      ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                      : 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {educationPrivacy === 'public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>{educationPrivacy === 'public' ? (isBn ? 'পাবলিক' : 'Public') : (isBn ? 'অনলি মি' : 'Only Me')}</span>
                </button>
              </div>

              <textarea
                rows={4}
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder={
                  isBn
                    ? 'আপনার স্কুল, কলেজ, বিশ্ববিদ্যালয় ও ডিগ্রি সংক্রান্ত তথ্য উল্লেখ করুন (যেমন: ঢাকা বিশ্ববিদ্যালয়, বিএসসি ইন সিএসই, ২০২১-২০২৫)...'
                    : 'e.g. University of Dhaka, B.Sc. in Computer Science & Engineering (2021-2025)...'
                }
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 resize-none leading-relaxed"
              />
            </div>
          )}

          {/* SECTION 7: WORK & JOB */}
          {activeSection === 'work' && (
            <div className="space-y-3 p-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-400" />
                  <span>{isBn ? 'ওয়ার্কিং ও জব ডিটেইলস (Work & Job Details)' : 'Work & Career Experience'}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setWorkPrivacy(workPrivacy === 'public' ? 'only_me' : 'public')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    workPrivacy === 'public'
                      ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                      : 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {workPrivacy === 'public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>{workPrivacy === 'public' ? (isBn ? 'পাবলিক' : 'Public') : (isBn ? 'অনলি মি' : 'Only Me')}</span>
                </button>
              </div>

              <textarea
                rows={4}
                value={workingDetails}
                onChange={(e) => setWorkingDetails(e.target.value)}
                placeholder={
                  isBn
                    ? 'আপনার বর্তমান বা পূর্বের পদবি, প্রতিষ্ঠান ও কাজের অভিজ্ঞতা লিখুন (যেমন: সিনিয়র সফটওয়্যার ইঞ্জিনিয়ার at টেক গ্লোবাল)...'
                    : 'e.g. Senior Software Engineer at Tech Solutions (Full-time, 2022 - Present)...'
                }
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 resize-none leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 shrink-0">
          <p className="text-[10px] text-slate-400">
            {isBn ? 'সকল পরিবর্তন অ্যাকাউন্টে সংরক্ষিত হবে' : 'Updates are synced securely to your profile'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:opacity-90 shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <span>{isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isBn ? 'সব তথ্য সংরক্ষণ করুন' : 'Save All Details'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

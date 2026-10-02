import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'bn';

interface LanguageContextType {
  language: Language;
  isBn: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  translateContent: (text: string) => string;
}

// Built-in translations dictionary for seeded and common social contents
const CONTENT_TRANSLATIONS: Record<string, string> = {
  // Elena Rostova posts
  'Unveiling the new Liquid Glass UI architecture for Nixo! Built with translucent depth, backdrop blur, and custom real-time audio/visual streams. What do you think? 💎✨':
    'এথার (Nixo)-এর নতুন লিকুইড গ্লাস UI আর্কিটেকচার উন্মোচন করছি! ট্রান্সলুসেন্ট গভীরতা, ব্যাকড্রপ ব্লার এবং কাস্টম রিয়েল-টাইম অডিও/ভিজুয়াল স্ট্রিমে তৈরি। আপনাদের কেমন লাগছে? 💎✨',
  'Lossless 48kHz audio snippet recorded live with my analog modular synth rack. Listen to the resonance filters in spatial stereo 🎧':
    'আমার অ্যানালগ মডুলার সিন্থেসাইজার র্যাক দিয়ে লাইভ রেকর্ড করা লসলেস ৪৮kHz অডিও ক্লিপ। স্প্যাশিয়াল স্টেরিওতে রেজোন্যান্স ফিল্টার শুনুন 🎧',
  
  // Marcus Vance posts
  'Just completed the transaction-safe coin ledger integration in MySQL/SQLite. Instant transfers with zero risk of negative balance or double spend!':
    'MySQL/SQLite-এ ট্রানজেকশন-নিরাপদ কয়েন লেজার ইন্টিগ্রেশন সম্পন্ন হলো। নেগেটিভ ব্যালেন্স বা ডাবল স্পেন্ডের কোনো ঝুঁকি ছাড়াই তাৎক্ষণিক ট্রান্সফার!',
  'Real-time ray-traced caustics simulated on 60fps WebGL canvas. Check out the liquid transmission shader demo live on GitHub!':
    '৬০fps WebGL ক্যানভাসে রিয়েল-টাইম রে-ট্রেসড কস্টিকস সিমুলেশন। GitHub-এ লাইভ লিকুইড ট্রান্সমিশন শেডার ডেমো দেখে নিন!',

  // Sophia Chen posts
  'Which generative liquid visual style should we integrate into the Nixo dynamic backdrop engine?':
    'এথার ডায়নামিক ব্যাকড্রপ ইঞ্জিনে কোন জেনারেটিভ লিকুইড ভিজ্যুয়াল স্টাইল যুক্ত করা উচিত?',
  'Pure reactive liquid geometry in perpetual motion. Mesmerizing fluid aesthetics.':
    'চিরন্তন গতিময়তায় বিশুদ্ধ রিঅ্যাক্টিভ লিকুইড জ্যামিতি। চোখ জুড়ানো তরল নান্দনিকতা।',

  // Feelings
  'Euphoric ✨': 'উদ্বেলিত ✨',
  'Ambient Wave 🎛️': 'অ্যাম্বিয়েন্ট তরঙ্গ 🎛️',
  'Milestone 🚀': 'মাইলফলক 🚀',
  'Hypnotized 🌀': 'সম্মোহিত 🌀',
  'Creative 🎨': 'সৃজনশীল 🎨',
  'Inspired 💡': 'অনুপ্রাণিত 💡',
  'Productive ⚡': 'ফলপ্রসূ ⚡',
  'Happy 😊': 'আনন্দিত 😊',

  // Locations
  'Kyoto Creative District': 'কিয়োটো ক্রিয়েটিভ জেলা',
  'San Francisco Fintech Center': 'সান ফ্রান্সিসকো ফিনটেক সেন্টার',
  'Geneva Research Lab': 'জেনেভা রিসার্চ ল্যাব',
  'Studio Prism One': 'স্টুডিও প্রিজম ওয়ান',

  // Common Bios
  'Digital Artist & Motion UI Designer crafting Liquid Glass experiences.':
    'ডিজিটাল শিল্পী এবং মোশন UI ডিজাইনার, লিকুইড গ্লাস অভিজ্ঞতা তৈরিতে নিয়োজিত।',
  'Full-stack Architect & Web3 Monetization enthusiast.':
    'ফুল-স্ট্যাক আর্কিটেক্ট এবং ওয়েব৩ মনেটাইজেশন উৎসাহী।',
  'AI Researcher & Generative Graphics Explorer.':
    'এআই গবেষক এবং জেনারেটিভ গ্রাফিক্স এক্সপ্লোরার।',
  'Official Nixo Platform Network & Core System Admin.':
    'অফিসিয়াল এথার প্ল্যাটফর্ম নেটওয়ার্ক ও কোর সিস্টেম অ্যাডমিন।',
  'Creative technologist & shader wizard building spatial audio interfaces.':
    'ক্রিয়েটিভ টেকনোলজিস্ট ও শেডার উইজার্ড, স্প্যাশিয়াল অডিও ইন্টারফেস নির্মাতা।',
  'Sound designer, ambient modular synth producer, and visual artist.':
    'সাউন্ড ডিজাইনার, অ্যাম্বিয়েন্ট মডুলার সিন্থ প্রযোজক এবং ভিজ্যুয়াল আর্টিস্ট।',
  'Spatial computing & WebXR enthusiast exploring transparent 3D glass.':
    'স্প্যাশিয়াল কম্পিউটিং ও WebXR গবেষক, ট্রান্সপারেন্ট 3D গ্লাস নিয়ে কাজ করছেন।',
  'Minimalist graphic artist & typography lover.':
    'মিনিমালিস্ট গ্রাফিক ডিজাইনার ও টাইপোগ্রাফি অনুরাগী।'
};

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Brand & General
    'brand.name': 'NIXO',
    'brand.tagline': 'Nixo Social',
    'common.search': 'Search...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.update': 'Update',
    'common.loading': 'Loading...',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.online': 'Online',
    'common.offline': 'Offline',
    'common.viewAll': 'View All',
    'common.verified': 'Verified',
    'common.topUp': 'Top Up',
    'common.coins': 'Coins',

    // Nav
    'nav.feed': 'Feed',
    'nav.home': 'Home',
    'nav.explore': 'Explore',
    'nav.feels': 'FEELS',
    'nav.videos': 'Videos',
    'nav.messenger': 'Messenger',
    'nav.friends': 'Friends',
    'nav.notifications': 'Notifications',
    'nav.profile': 'Profile',
    'nav.dashboardPro': 'Dashboard Pro',
    'nav.saved': 'Saved Posts',
    'nav.settings': 'Settings',
    'nav.wallet': 'Wallet & Coins',
    'nav.admin': 'Admin Control',
    'nav.groups': 'Groups / Communities',
    'nav.pages': 'Pages',
    'nav.events': 'Events',
    'nav.support': 'Help & Support',
    'nav.login': 'Sign In',
    'nav.register': 'Sign Up',
    'nav.menu': 'Navigation Menu',

    // Feed Tabs
    'feed.recent': 'Recent Feeds',
    'feed.forYou': 'For You',
    'feed.following': 'Following',
    'feed.allTransmissions': 'All Transmissions',
    'feed.noPosts': 'No posts available yet. Be the first to publish!',
    'feed.whatsOnMind': "What's on your mind? Share your vibe...",
    'feed.photoVideo': 'Photo / Video',
    'feed.feeling': 'Feeling / Activity',
    'feed.liveStory': 'Live Story',
    'feed.poll': 'Interactive Poll',
    'feed.aiCaption': 'AI Caption',

    // Post Actions & Card
    'post.create': 'Create Post',
    'post.publish': 'Publish Post',
    'post.chooseBg': 'Choose Background',
    'post.fontStyle': 'Font Style',
    'post.alignment': 'Alignment',
    'post.media': 'Photo / Video',
    'post.public': 'Public',
    'post.friends': 'Friends Only',
    'post.onlyMe': 'Only Me',
    'post.edit': 'Edit Post',
    'post.delete': 'Delete Post',
    'post.save': 'Save Post',
    'post.saved': 'Saved',
    'post.share': 'Share / Repost',
    'post.copyLink': 'Copy Link',
    'post.hide': 'Hide Post',
    'post.report': 'Report Post',
    'post.follow': '+ Follow',
    'post.following': 'Following',
    'post.like': 'Like',
    'post.comment': 'Comment',
    'post.comments': 'Comments',
    'post.gift': 'Send Gift',
    'post.translate': 'Translate Post',
    'post.showOriginal': 'Show Original',
    'post.writeComment': 'Write a comment...',
    'post.postComment': 'Reply',

    // Sponsor & Sidebar
    'sponsor.title': 'Sponsor & Partners',
    'sponsor.official': 'Official',
    'sponsor.visit': 'Visit Partner',
    'sponsor.activeCreators': 'Active Realm Creators',
    'sponsor.topUp': 'Top Up',
    'sponsor.wallet': 'Nixo Wallet',

    // Stories
    'stories.yourStory': 'Your Story',
    'stories.create': 'Create Story',
    'stories.live': 'LIVE',

    // Auth
    'auth.welcome': 'Welcome to NIXO Realm',
    'auth.createAccount': 'Create Your Account',
    'auth.fullName': 'Full Name',
    'auth.username': 'Username',
    'auth.email': 'Email Address',
    'auth.password': 'Password',
    'auth.dob': 'Date of Birth',
    'auth.gender': 'Gender',
    'auth.male': 'Male',
    'auth.female': 'Female',
    'auth.other': 'Other',
    'auth.preferNotToSay': 'Prefer not to say',
    'auth.privacyPublic': 'Public',
    'auth.privacyOnlyMe': 'Only Me',
    'auth.submitRegister': 'Complete Registration',
    'auth.submitLogin': 'Sign In to Account',
    'auth.noAccount': "Don't have an account? Sign up",
    'auth.haveAccount': 'Already have an account? Sign in',
    'auth.quickDemo': 'Quick Persona Demo Login',

    // Profile
    'profile.editProfile': 'Edit Profile',
    'profile.bio': 'Bio',
    'profile.bioPlaceholder': 'Write a compelling bio about yourself...',
    'profile.interests': 'Interests',
    'profile.activities': 'Activities',
    'profile.hobbies': 'Hobbies',
    'profile.education': 'Education Details',
    'profile.work': 'Work & Job Details',
    'profile.aboutMe': 'About & Highlights',
    'profile.posts': 'Posts',
    'profile.media': 'Media & Photos',
    'profile.changeAvatar': 'Change Profile Photo',
    'profile.changeCover': 'Change Cover Photo',
    'profile.cropPhoto': 'Crop & Adjust Photo',
    'profile.save': 'Save Changes',
    'profile.cancel': 'Cancel',
    'profile.delete': 'Delete',
    'profile.add': 'Add New',
    'profile.update': 'Update Details',
    'profile.wallet': 'Wallet & Earnings',
    'profile.language': 'Language',
    'profile.theme': 'Theme Mode',
    'profile.signOut': 'Sign Out',
    'profile.dashboardProHub': 'Dashboard Pro Hub',
    'profile.followers': 'Followers',
    'profile.following': 'Following',

    // FEELS
    'feels.upload': 'Upload FEELS',
    'feels.publish': 'Publish FEELS',
    'feels.sound': 'Sound / Music',
    'feels.caption': 'Caption',

    // Chat / Messenger
    'chat.type': 'Type a message...',
    'chat.send': 'Send',
    'chat.attach': 'Attach File or Video',
    'chat.search': 'Search chats...',
    'chat.noMessages': 'No conversation selected yet.',
    'chat.online': 'Online',
  },
  bn: {
    // Brand & General
    'brand.name': 'নিক্সো (NIXO)',
    'brand.tagline': 'লিকুইড গ্লাস সোশ্যাল',
    'common.search': 'অনুসন্ধান করুন...',
    'common.save': 'সংরক্ষণ',
    'common.cancel': 'বাতিল',
    'common.delete': 'মুছুন',
    'common.edit': 'সম্পাদনা',
    'common.update': 'আপডেট',
    'common.loading': 'লোড হচ্ছে...',
    'common.close': 'বন্ধ করুন',
    'common.confirm': 'নিশ্চিত করুন',
    'common.online': 'সক্রিয়',
    'common.offline': 'অফলাইন',
    'common.viewAll': 'সবগুলো দেখুন',
    'common.verified': 'ভেরিফাইড',
    'common.topUp': 'রিচার্জ',
    'common.coins': 'কয়েন',

    // Nav
    'nav.feed': 'ফিড',
    'nav.home': 'হোম',
    'nav.explore': 'এক্সপ্লোর',
    'nav.feels': 'ফেইলস (FEELS)',
    'nav.videos': 'ভিডিও',
    'nav.messenger': 'মেসেঞ্জার',
    'nav.friends': 'বন্ধুরা',
    'nav.notifications': 'নোটিফিকেশন',
    'nav.profile': 'প্রোফাইল',
    'nav.dashboardPro': 'ড্যাশবোর্ড প্রো',
    'nav.saved': 'সংরক্ষিত পোস্টসমূহ',
    'nav.settings': 'সেটিংস',
    'nav.wallet': 'ওয়ালেট ও কয়েন',
    'nav.admin': 'অ্যাডমিন কন্ট্রোল',
    'nav.groups': 'গ্রুপ ও কমিউনিটি',
    'nav.pages': 'পেইজসমূহ',
    'nav.events': 'ইভেন্টসমূহ',
    'nav.support': 'সাহায্য ও সাপোর্ট',
    'nav.login': 'লগইন',
    'nav.register': 'সাইন আপ',
    'nav.menu': 'নেভিগেশন মেন্যু',

    // Feed Tabs
    'feed.recent': 'সাম্প্রতিক ফিড',
    'feed.forYou': 'আপনার জন্য (For You)',
    'feed.following': 'ফলো করা হচ্ছে',
    'feed.allTransmissions': 'সকল পোস্ট ও আপডেট',
    'feed.noPosts': 'এখনো কোনো পোস্ট নেই। প্রথম পোস্টটি আপনিই করুন!',
    'feed.whatsOnMind': 'আপনার মনে কী আছে? শেয়ার করুন...',
    'feed.photoVideo': 'ছবি / ভিডিও',
    'feed.feeling': 'অনুভূতি / অ্যাক্টিভিটি',
    'feed.liveStory': 'লাইভ স্টোরি',
    'feed.poll': 'পোল তৈরি করুন',
    'feed.aiCaption': 'এআই ক্যাপশন',

    // Post Actions & Card
    'post.create': 'নতুন পোস্ট তৈরি করুন',
    'post.publish': 'পোস্ট প্রকাশ করুন',
    'post.chooseBg': 'ব্যাকগ্রাউন্ড নির্বাচন',
    'post.fontStyle': 'ফন্ট স্টাইল',
    'post.alignment': 'অ্যালাইনমেন্ট',
    'post.media': 'ছবি / ভিডিও',
    'post.public': 'পাবলিক (সবার জন্য)',
    'post.friends': 'শুধুমাত্র বন্ধুরা',
    'post.onlyMe': 'অনলি মি (ব্যক্তিগত)',
    'post.edit': 'পোস্ট সম্পাদনা করুন',
    'post.delete': 'পোস্ট মুছে ফেলুন',
    'post.save': 'পোস্ট সেভ করুন',
    'post.saved': 'সংরক্ষিত',
    'post.share': 'শেয়ার / রিপোস্ট',
    'post.copyLink': 'লিঙ্ক কপি করুন',
    'post.hide': 'পোস্ট লুকান',
    'post.report': 'রিপোর্ট করুন',
    'post.follow': '+ ফলো করুন',
    'post.following': 'ফলো করা হচ্ছে',
    'post.like': 'লাইক',
    'post.comment': 'মন্তব্য',
    'post.comments': 'মন্তব্যসমূহ',
    'post.gift': 'উপহার পাঠান',
    'post.translate': 'বাংলায় অনুবাদ করুন',
    'post.showOriginal': 'মূল লেখা দেখুন',
    'post.writeComment': 'একটি সুন্দর মন্তব্য লিখুন...',
    'post.postComment': 'মন্তব্য করুন',

    // Sponsor & Sidebar
    'sponsor.title': 'স্পন্সর ও পার্টনারবৃন্দ',
    'sponsor.official': 'অফিসিয়াল',
    'sponsor.visit': 'পার্টনার ভিজিট',
    'sponsor.activeCreators': 'সক্রিয় ক্রিয়েটরগণ',
    'sponsor.topUp': 'টপ আপ',
    'sponsor.wallet': 'নিক্সো ওয়ালেট',

    // Stories
    'stories.yourStory': 'আপনার স্টোরি',
    'stories.create': 'স্টোরি তৈরি',
    'stories.live': 'লাইভ',

    // Auth
    'auth.welcome': 'স্বাগতম নিক্সো (NIXO) রিয়েলমে',
    'auth.createAccount': 'নতুন অ্যাকাউন্ট তৈরি করুন',
    'auth.fullName': 'সম্পূর্ণ নাম (Full Name)',
    'auth.username': 'ইউজারনেম (Username)',
    'auth.email': 'ইমেইল অ্যাড্রেস (Email Address)',
    'auth.password': 'পাসওয়ার্ড (Password)',
    'auth.dob': 'জন্ম তারিখ (Date of Birth)',
    'auth.gender': 'জেন্ডার / লিঙ্গ',
    'auth.male': 'পুরুষ (Male)',
    'auth.female': 'মহিলা (Female)',
    'auth.other': 'অন্যান্য (Other)',
    'auth.preferNotToSay': 'প্রকাশে অনিচ্ছুক',
    'auth.privacyPublic': 'পাবলিক',
    'auth.privacyOnlyMe': 'অনলি মি',
    'auth.submitRegister': 'রেজিস্ট্রেশন সম্পন্ন করুন',
    'auth.submitLogin': 'লগইন করুন',
    'auth.noAccount': 'অ্যাকাউন্ট নেই? সাইন আপ করুন',
    'auth.haveAccount': 'আগে থেকেই অ্যাকাউন্ট আছে? লগইন করুন',
    'auth.quickDemo': 'কুইক ডেমো লগইন',

    // Profile
    'profile.editProfile': 'প্রোফাইল এডিট করুন',
    'profile.bio': 'বায়ো (Bio)',
    'profile.bioPlaceholder': 'আপনার সম্পর্কে কিছু লিখুন...',
    'profile.interests': 'ইন্টারেস্ট (Interests)',
    'profile.activities': 'অ্যাক্টিভিটিস (Activities)',
    'profile.hobbies': 'হবি (Hobbies)',
    'profile.education': 'এডুকেশন ডিটেইলস (Education)',
    'profile.work': 'ওয়ার্কিং ও জব ডিটেইলস (Job & Work)',
    'profile.aboutMe': 'জীবনবৃত্তান্ত ও অন্যান্য বিবরণ',
    'profile.posts': 'পোস্টসমূহ',
    'profile.media': 'মিডিয়া ও ছবিসমূহ',
    'profile.changeAvatar': 'প্রোফাইল ছবি পরিবর্তন',
    'profile.changeCover': 'কভার ছবি পরিবর্তন',
    'profile.cropPhoto': 'ছবি ক্রপ ও অ্যাডজাস্ট করুন',
    'profile.save': 'সংরক্ষণ করুন',
    'profile.cancel': 'বাতিল',
    'profile.delete': 'মুছুন',
    'profile.add': 'নতুন যোগ করুন',
    'profile.update': 'আপডেট করুন',
    'profile.wallet': 'ওয়ালেট ও ব্যালেন্স',
    'profile.language': 'ভাষা (Language)',
    'profile.theme': 'থিম মোড (Theme)',
    'profile.signOut': 'লগআউট / সাইন আউট',
    'profile.dashboardProHub': 'ড্যাশবোর্ড প্রো হাব',
    'profile.followers': 'অনুসারী (Followers)',
    'profile.following': 'ফলো করছেন (Following)',

    // FEELS
    'feels.upload': 'ফেইলস আপলোড',
    'feels.publish': 'ফেইলস প্রকাশ করুন',
    'feels.sound': 'মিউজিক / অডিও',
    'feels.caption': 'ক্যাপশন',

    // Chat / Messenger
    'chat.type': 'একটি বার্তা লিখুন...',
    'chat.send': 'পাঠান',
    'chat.attach': 'ফাইল বা ভিডিও যুক্ত করুন',
    'chat.search': 'চ্যাট অনুসন্ধান করুন...',
    'chat.noMessages': 'এখনো কোনো চ্যাট নির্বাচন করা হয়নি।',
    'chat.online': 'সক্রিয়',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  isBn: false,
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
  translateContent: (text: string) => text,
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('nixo_language');
      if (saved === 'bn' || saved === 'en') return saved;
    } catch (e) {}
    return 'en';
  });

  const isBn = language === 'bn';

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('nixo_language', lang);
    } catch (e) {}
  };

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'bn' : 'en';
    setLanguage(nextLang);
  };

  const t = (key: string, fallback?: string): string => {
    return translations[language]?.[key] || translations['en']?.[key] || fallback || key;
  };

  const translateContent = (text: string): string => {
    if (!text) return '';
    if (language === 'bn') {
      if (CONTENT_TRANSLATIONS[text]) {
        return CONTENT_TRANSLATIONS[text];
      }
      // Check partial match for feelings / phrases
      for (const [enText, bnText] of Object.entries(CONTENT_TRANSLATIONS)) {
        if (text.includes(enText)) {
          return text.replace(enText, bnText);
        }
      }
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, isBn, setLanguage, toggleLanguage, t, translateContent }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);


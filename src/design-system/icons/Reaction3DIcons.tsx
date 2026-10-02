import React from 'react';

export interface Reaction3DIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  animated?: boolean;
}

// 1. LIKE: Facebook Blue Thumbs Up 👍
export const Icon3DLike: React.FC<Reaction3DIconProps> = ({ size = 32, className = '', animated = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${animated ? 'hover:scale-115' : ''} ${className}`}
    {...props}
  >
    <defs>
      <radialGradient id="fb_like_bg" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#2D88FF" />
        <stop offset="60%" stopColor="#1877F2" />
        <stop offset="100%" stopColor="#0B56C7" />
      </radialGradient>
      <linearGradient id="fb_like_sheen" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>
      <filter id="fb_like_shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0B56C7" floodOpacity="0.3" />
      </filter>
    </defs>

    {/* Drop Shadow */}
    <ellipse cx="32" cy="58" rx="20" ry="4" fill="#0B56C7" fillOpacity="0.3" />

    {/* Blue Sphere */}
    <circle cx="32" cy="32" r="26" fill="url(#fb_like_bg)" />
    <ellipse cx="32" cy="20" rx="20" ry="12" fill="url(#fb_like_sheen)" />

    {/* Classic Facebook 3D White Thumbs Up */}
    <g filter="url(#fb_like_shadow)" transform="translate(16, 15)">
      {/* Thumb Base Cuff */}
      <rect x="2" y="14" width="6" height="17" rx="3" fill="#FFFFFF" />
      {/* Hand Body & Fingers */}
      <path
        d="M9 15C9 13.5 10.5 13 12 13H24C26.5 13 28 14.5 28 17C28 18.2 27.2 19.3 26 19.8C27.5 20.2 28.2 21.6 28 23C27.7 24.5 26.5 25.2 25.2 25.5C26.2 26 26.6 27.2 26.2 28.3C25.7 29.8 24.2 30.5 22.5 30.5H12C10.3 30.5 9 29.2 9 27.5V15Z"
        fill="#FFFFFF"
      />
      {/* Upright Thumb */}
      <path
        d="M10 14V7C10 3.8 12.5 1 15 1C17.2 1 18 2.8 17.6 5.5L16 13H10Z"
        fill="#FFFFFF"
      />
      {/* Thumb Highlight Lines */}
      <path d="M11 16H23" stroke="#E2E8F0" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11 21H24" stroke="#E2E8F0" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11 26H22" stroke="#E2E8F0" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  </svg>
);

// 2. LOVE: Facebook Heart ❤️
export const Icon3DLove: React.FC<Reaction3DIconProps> = ({ size = 32, className = '', animated = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${animated ? 'hover:scale-115' : ''} ${className}`}
    {...props}
  >
    <defs>
      <radialGradient id="fb_love_bg" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FF4B63" />
        <stop offset="55%" stopColor="#F82A45" />
        <stop offset="100%" stopColor="#D90E2C" />
      </radialGradient>
      <linearGradient id="fb_love_sheen" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>
      <filter id="fb_love_shadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#D90E2C" floodOpacity="0.35" />
      </filter>
    </defs>

    {/* Shadow */}
    <ellipse cx="32" cy="58" rx="20" ry="4" fill="#990017" fillOpacity="0.3" />

    {/* Red Circle */}
    <circle cx="32" cy="32" r="26" fill="url(#fb_love_bg)" />
    <ellipse cx="32" cy="20" rx="20" ry="12" fill="url(#fb_love_sheen)" />

    {/* 3D Gleaming White Heart */}
    <g filter="url(#fb_love_shadow)">
      <path
        d="M32 47.5C32 47.5 16 36.5 16 25C16 19 20.8 15 26 15C29 15 31.2 16.8 32 18C32.8 16.8 35 15 38 15C43.2 15 48 19 48 25C48 36.5 32 47.5 32 47.5Z"
        fill="#FFFFFF"
      />
      {/* Specular Highlight Lobe */}
      <path
        d="M26 17C22 17 18.5 20 18.5 24.5C18.5 27.5 20.5 31.5 25 35C24 30.5 22.5 25 25 20.5C25.5 19 26 18 26 17Z"
        fill="#FFE4E6"
      />
    </g>
  </svg>
);

// 3. CARE: Facebook Care Hugging Heart 🥰
export const Icon3DSupport: React.FC<Reaction3DIconProps> = ({ size = 32, className = '', animated = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${animated ? 'hover:scale-115' : ''} ${className}`}
    {...props}
  >
    <defs>
      <radialGradient id="fb_care_bg" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FFE066" />
        <stop offset="55%" stopColor="#F7B125" />
        <stop offset="100%" stopColor="#E69500" />
      </radialGradient>
      <radialGradient id="fb_care_heart" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FF4B63" />
        <stop offset="60%" stopColor="#F82A45" />
        <stop offset="100%" stopColor="#D90E2C" />
      </radialGradient>
      <linearGradient id="fb_care_hands" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFE066" />
        <stop offset="100%" stopColor="#F7B125" />
      </linearGradient>
    </defs>

    {/* Shadow */}
    <ellipse cx="32" cy="58" rx="20" ry="4" fill="#B36B00" fillOpacity="0.3" />

    {/* Yellow Emoji Sphere */}
    <circle cx="32" cy="32" r="26" fill="url(#fb_care_bg)" />

    {/* Smiling Care Closed Eyes */}
    <path d="M20 22C21.5 19 25 19 26.5 22" stroke="#5C3B00" strokeWidth="3" strokeLinecap="round" />
    <path d="M37.5 22C39 19 42.5 19 44 22" stroke="#5C3B00" strokeWidth="3" strokeLinecap="round" />

    {/* Rosy Cheeks */}
    <circle cx="18" cy="27" r="4.5" fill="#FF7875" fillOpacity="0.5" />
    <circle cx="46" cy="27" r="4.5" fill="#FF7875" fillOpacity="0.5" />

    {/* Gentle Smiling Mouth */}
    <path d="M28 27C29.5 29.5 34.5 29.5 36 27" stroke="#5C3B00" strokeWidth="2.5" strokeLinecap="round" />

    {/* Hugged Glowing Red Heart */}
    <path
      d="M32 50C32 50 20 41 20 32C20 27.5 23.5 24.5 27.5 24.5C29.8 24.5 31.4 26 32 27C32.6 26 34.2 24.5 36.5 24.5C40.5 24.5 44 27.5 44 32C44 41 32 50 32 50Z"
      fill="url(#fb_care_heart)"
    />
    <ellipse cx="26" cy="28" rx="3.5" ry="2" fill="#FFA39E" fillOpacity="0.6" />

    {/* Hugging Arms & Hands */}
    {/* Left Arm */}
    <path
      d="M10 38C12 33 18 31 24 35C26 36.5 27 39 25 41C23 43 17 43 13 41C11.5 40 10.5 39 10 38Z"
      fill="url(#fb_care_hands)"
      stroke="#D48806"
      strokeWidth="1.2"
    />
    {/* Right Arm */}
    <path
      d="M54 38C52 33 46 31 40 35C38 36.5 37 39 39 41C41 43 47 43 51 41C52.5 40 53.5 39 54 38Z"
      fill="url(#fb_care_hands)"
      stroke="#D48806"
      strokeWidth="1.2"
    />
  </svg>
);

// 4. HAHA: Facebook Laughing Haha 😆
export const Icon3DHaha: React.FC<Reaction3DIconProps> = ({ size = 32, className = '', animated = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${animated ? 'hover:rotate-6' : ''} ${className}`}
    {...props}
  >
    <defs>
      <radialGradient id="fb_haha_bg" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FFE066" />
        <stop offset="55%" stopColor="#F7B125" />
        <stop offset="100%" stopColor="#E69500" />
      </radialGradient>
      <linearGradient id="fb_haha_mouth" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#5C3B00" />
        <stop offset="100%" stopColor="#381E00" />
      </linearGradient>
    </defs>

    {/* Shadow */}
    <ellipse cx="32" cy="58" rx="20" ry="4" fill="#B36B00" fillOpacity="0.3" />

    {/* Yellow Emoji Sphere */}
    <circle cx="32" cy="32" r="26" fill="url(#fb_haha_bg)" />

    {/* Squinting Laughing Eyes (>< arcs) */}
    <path d="M16 24L26 21L17 28" stroke="#5C3B00" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M48 24L38 21L47 28" stroke="#5C3B00" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />

    {/* Wide Laughing Mouth */}
    <path
      d="M17 33C17 45 23 51 32 51C41 51 47 45 47 33H17Z"
      fill="url(#fb_haha_mouth)"
    />

    {/* Upper Teeth Strip */}
    <path d="M19 33H45C44 37 39 38 32 38C25 38 20 37 19 33Z" fill="#FFFFFF" />

    {/* Pink Tongue */}
    <path
      d="M26 47C28 43 36 43 38 47C35 50 29 50 26 47Z"
      fill="#FF4D4F"
    />
  </svg>
);

// 5. WOW: Facebook Wow 😮
export const Icon3DWow: React.FC<Reaction3DIconProps> = ({ size = 32, className = '', animated = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${animated ? 'hover:scale-115' : ''} ${className}`}
    {...props}
  >
    <defs>
      <radialGradient id="fb_wow_bg" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FFE066" />
        <stop offset="55%" stopColor="#F7B125" />
        <stop offset="100%" stopColor="#E69500" />
      </radialGradient>
    </defs>

    {/* Shadow */}
    <ellipse cx="32" cy="58" rx="20" ry="4" fill="#B36B00" fillOpacity="0.3" />

    {/* Yellow Emoji Sphere */}
    <circle cx="32" cy="32" r="26" fill="url(#fb_wow_bg)" />

    {/* Raised Wow Eyebrows */}
    <path d="M18 16C20 13 25 13 27 15" stroke="#5C3B00" strokeWidth="2.8" strokeLinecap="round" />
    <path d="M37 15C39 13 44 13 46 16" stroke="#5C3B00" strokeWidth="2.8" strokeLinecap="round" />

    {/* Wonder Eyes */}
    <ellipse cx="23" cy="24" rx="4.5" ry="6" fill="#381E00" />
    <ellipse cx="41" cy="24" rx="4.5" ry="6" fill="#381E00" />
    <circle cx="21.5" cy="22" r="2" fill="#FFFFFF" />
    <circle cx="39.5" cy="22" r="2" fill="#FFFFFF" />

    {/* Open O Mouth */}
    <ellipse cx="32" cy="41" rx="8" ry="10.5" fill="#381E00" />
    <ellipse cx="32" cy="40" rx="5.5" ry="7.5" fill="#1F1200" />
  </svg>
);

// 6. SAD: Facebook Sad / Crying 😢
export const Icon3DSad: React.FC<Reaction3DIconProps> = ({ size = 32, className = '', animated = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${animated ? 'hover:-translate-y-1' : ''} ${className}`}
    {...props}
  >
    <defs>
      <radialGradient id="fb_sad_bg" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FFE066" />
        <stop offset="55%" stopColor="#F7B125" />
        <stop offset="100%" stopColor="#E69500" />
      </radialGradient>
      <linearGradient id="fb_sad_tear" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#40A9FF" />
        <stop offset="100%" stopColor="#096DD9" />
      </linearGradient>
    </defs>

    {/* Shadow */}
    <ellipse cx="32" cy="58" rx="20" ry="4" fill="#B36B00" fillOpacity="0.3" />

    {/* Yellow Emoji Sphere */}
    <circle cx="32" cy="32" r="26" fill="url(#fb_sad_bg)" />

    {/* Sad Angled Eyebrows */}
    <path d="M18 19C21 21 25 23 28 22" stroke="#5C3B00" strokeWidth="2.8" strokeLinecap="round" />
    <path d="M46 19C43 21 39 23 36 22" stroke="#5C3B00" strokeWidth="2.8" strokeLinecap="round" />

    {/* Downcast Eyes */}
    <ellipse cx="24" cy="27" rx="4" ry="5" fill="#381E00" />
    <ellipse cx="40" cy="27" rx="4" ry="5" fill="#381E00" />
    <circle cx="22.5" cy="25" r="1.8" fill="#FFFFFF" />
    <circle cx="38.5" cy="25" r="1.8" fill="#FFFFFF" />

    {/* Down-turned Mouth */}
    <path d="M25 43C28 39 36 39 39 43" stroke="#381E00" strokeWidth="3.2" strokeLinecap="round" />

    {/* Big Falling Blue Tear */}
    <g transform="translate(39, 31)">
      <path
        d="M5 0C5 0 10 7 10 10.5C10 13.5 7.8 16 5 16C2.2 16 0 13.5 0 10.5C0 7 5 0 5 0Z"
        fill="url(#fb_sad_tear)"
      />
      <circle cx="3.5" cy="9" r="1.5" fill="#BAE7FF" />
    </g>
  </svg>
);

// 7. ANGRY: Facebook Angry 😡
export const Icon3DAngry: React.FC<Reaction3DIconProps> = ({ size = 32, className = '', animated = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${animated ? 'hover:rotate-6' : ''} ${className}`}
    {...props}
  >
    <defs>
      <radialGradient id="fb_angry_bg" cx="40%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FF7875" />
        <stop offset="35%" stopColor="#F5222D" />
        <stop offset="75%" stopColor="#CF1322" />
        <stop offset="100%" stopColor="#820014" />
      </radialGradient>
      <linearGradient id="fb_angry_brow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#430000" />
        <stop offset="100%" stopColor="#2A0000" />
      </linearGradient>
    </defs>

    {/* Shadow */}
    <ellipse cx="32" cy="58" rx="20" ry="4" fill="#820014" fillOpacity="0.35" />

    {/* Red/Orange Fiery Sphere */}
    <circle cx="32" cy="32" r="26" fill="url(#fb_angry_bg)" />

    {/* Heavy Furrowed Eyebrows */}
    <path d="M15 19L29 25" stroke="url(#fb_angry_brow)" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M49 19L35 25" stroke="url(#fb_angry_brow)" strokeWidth="4.5" strokeLinecap="round" />

    {/* Glaring Eyes */}
    <ellipse cx="23" cy="29" rx="4" ry="4.5" fill="#FFFFFF" />
    <ellipse cx="41" cy="29" rx="4" ry="4.5" fill="#FFFFFF" />
    <circle cx="24" cy="29" r="2.5" fill="#2A0000" />
    <circle cx="40" cy="29" r="2.5" fill="#2A0000" />

    {/* Downward Angry Frowning Mouth */}
    <path
      d="M23 45C26 40 38 40 41 45"
      stroke="#2A0000"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
  </svg>
);

// 8. CELEBRATE: Facebook Party / Celebrate 🎉
export const Icon3DCelebrate: React.FC<Reaction3DIconProps> = ({ size = 32, className = '', animated = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${animated ? 'hover:scale-115' : ''} ${className}`}
    {...props}
  >
    <defs>
      <radialGradient id="fb_celeb_bg" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FFE066" />
        <stop offset="55%" stopColor="#F7B125" />
        <stop offset="100%" stopColor="#E69500" />
      </radialGradient>
    </defs>

    <ellipse cx="32" cy="58" rx="20" ry="4" fill="#B36B00" fillOpacity="0.3" />
    <circle cx="32" cy="34" r="24" fill="url(#fb_celeb_bg)" />

    {/* Joy Eyes */}
    <path d="M20 33C21.5 30 24.5 30 26 33" stroke="#5C3B00" strokeWidth="2.8" strokeLinecap="round" />
    <path d="M38 33C39.5 30 42.5 30 44 33" stroke="#5C3B00" strokeWidth="2.8" strokeLinecap="round" />

    {/* Smile */}
    <path d="M24 38C24 44 28 47 32 47C36 47 40 44 40 38H24Z" fill="#5C3B00" />
    <path d="M28 44C30 42 34 42 36 44" stroke="#FF4D4F" strokeWidth="3" strokeLinecap="round" />

    {/* Party Hat */}
    <g transform="translate(18, 2)">
      <polygon points="14,0 4,22 24,22" fill="#722ED1" stroke="#B37FEB" strokeWidth="1.2" />
      <line x1="7" y1="16" x2="21" y2="16" stroke="#F759AB" strokeWidth="2.5" />
      <line x1="10" y1="9" x2="18" y2="9" stroke="#FFC53D" strokeWidth="2.5" />
      <circle cx="14" cy="1" r="2.5" fill="#FFC53D" />
    </g>

    {/* Confetti */}
    <circle cx="10" cy="18" r="2" fill="#F759AB" />
    <rect x="49" y="14" width="3" height="3" transform="rotate(25 49 14)" fill="#FFC53D" />
    <circle cx="53" cy="28" r="2.2" fill="#13C2C2" />
  </svg>
);

// Reaction Definition Record (Facebook exact order: Like, Love, Care, Haha, Wow, Sad, Angry)
export const REACTION_DEFINITIONS: {
  type: string;
  label: string;
  labelBn: string;
  color: string;
  textColor: string;
  component: React.FC<Reaction3DIconProps>;
}[] = [
  {
    type: 'like',
    label: 'Like',
    labelBn: 'লাইক',
    color: '#1877F2',
    textColor: 'text-blue-600',
    component: Icon3DLike,
  },
  {
    type: 'love',
    label: 'Love',
    labelBn: 'লাভ',
    color: '#F82A45',
    textColor: 'text-rose-600',
    component: Icon3DLove,
  },
  {
    type: 'support',
    label: 'Care',
    labelBn: 'কেয়ার',
    color: '#F7B125',
    textColor: 'text-amber-500',
    component: Icon3DSupport,
  },
  {
    type: 'haha',
    label: 'Haha',
    labelBn: 'হাহা',
    color: '#F7B125',
    textColor: 'text-amber-500',
    component: Icon3DHaha,
  },
  {
    type: 'wow',
    label: 'Wow',
    labelBn: 'ওয়াও',
    color: '#F7B125',
    textColor: 'text-amber-500',
    component: Icon3DWow,
  },
  {
    type: 'sad',
    label: 'Sad',
    labelBn: 'স্যাড',
    color: '#F7B125',
    textColor: 'text-amber-600',
    component: Icon3DSad,
  },
  {
    type: 'angry',
    label: 'Angry',
    labelBn: 'এংগ্রি',
    color: '#F5222D',
    textColor: 'text-red-600',
    component: Icon3DAngry,
  },
];

export const getReactionIconComponent = (type?: string) => {
  const match = REACTION_DEFINITIONS.find((r) => r.type === type?.toLowerCase());
  return match?.component || Icon3DLike;
};

export const getReactionLabel = (type?: string, lang?: string) => {
  const match = REACTION_DEFINITIONS.find((r) => r.type === type?.toLowerCase());
  if (!match) return 'Like';
  return lang === 'bn' ? match.labelBn : match.label;
};

export const getReactionColor = (type?: string) => {
  const match = REACTION_DEFINITIONS.find((r) => r.type === type?.toLowerCase());
  return match?.textColor || 'text-blue-600';
};

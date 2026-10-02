import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  glow?: boolean;
}

// 1. Home - Prism Hearth / Spatial Nexus
export const IconHome: React.FC<IconProps> = ({ size = 20, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${glow ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : ''} ${className}`}
    {...props}
  >
    <path
      d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H15C14.4477 21 14 20.5523 14 20V15C14 13.8954 13.1046 13 12 13C10.8954 13 10 13.8954 10 15V20C10 20.5523 9.55228 21 9 21H4C3.44772 21 3 20.5523 3 20V10.5Z"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 3.5L12 6L15 3.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity="0.6"
    />
  </svg>
);

// 2. Friends - Dual Orbit Nodes / Synergy Link
export const IconFriends: React.FC<IconProps> = ({ size = 20, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${glow ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]' : ''} ${className}`}
    {...props}
  >
    <circle cx="8" cy="8" r="4" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M2 19C2 15.6863 4.68629 13 8 13C11.3137 13 14 15.6863 14 19"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <circle cx="16.5" cy="7.5" r="3" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M14.5 13.5C15.8 13.2 17.2 13.5 18.5 14.5C20.2 15.8 21 17.5 21 19"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// 3. Explore - Astrolabe Compass / Prism Dial
export const IconExplore: React.FC<IconProps> = ({ size = 20, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${glow ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : ''} ${className}`}
    {...props}
  >
    <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.8" />
    <polygon
      points="15.5,8.5 13.5,13.5 8.5,15.5 10.5,10.5"
      fill="currentColor"
      fillOpacity="0.45"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

// 4. Videos - Glass Projector Frame
export const IconVideos: React.FC<IconProps> = ({ size = 20, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${glow ? 'drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]' : ''} ${className}`}
    {...props}
  >
    <rect x="3" y="4" width="18" height="16" rx="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.8" />
    <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <line x1="3" y1="8" x2="21" y2="8" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
  </svg>
);

// 5. Reels - Dynamic Liquid Loop / Stream Ribbon
export const IconReels: React.FC<IconProps> = ({ size = 20, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${glow ? 'drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]' : ''} ${className}`}
    {...props}
  >
    <rect x="4" y="3" width="16" height="18" rx="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M11 10.5L14 12L11 13.5V10.5Z" fill="currentColor" />
    <line x1="4" y1="7" x2="8" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="16" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="4" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="16" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// 6. Messages - Liquid Wave Capsule / Thought Aurora
export const IconMessages: React.FC<IconProps> = ({ size = 20, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${glow ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : ''} ${className}`}
    {...props}
  >
    <path
      d="M21 11.5C21 16.1944 16.9706 20 12 20C10.4 20 8.9 19.6 7.6 18.9L3 20L4.3 16.2C3.5 14.8 3 13.2 3 11.5C3 6.80558 7.02944 3 12 3C16.9706 3 21 6.80558 21 11.5Z"
      fill="currentColor"
      fillOpacity="0.16"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="8.5" cy="11.5" r="1.2" fill="currentColor" />
    <circle cx="12" cy="11.5" r="1.2" fill="currentColor" />
    <circle cx="15.5" cy="11.5" r="1.2" fill="currentColor" />
  </svg>
);

// 7. Notifications - Resonant Crystal Bell
export const IconNotifications: React.FC<IconProps> = ({ size = 20, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${glow ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : ''} ${className}`}
    {...props}
  >
    <path
      d="M18 16V10C18 6.68629 15.3137 4 12 4C8.68629 4 6 6.68629 6 10V16L4 18H20L18 16Z"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 19C10 20.1046 10.8954 21 12 21C13.1046 21 14 20.1046 14 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="3" r="1" fill="currentColor" />
  </svg>
);

// 8. Groups - Hexagonal Guild / Constellation
export const IconGroups: React.FC<IconProps> = ({ size = 20, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${glow ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''} ${className}`}
    {...props}
  >
    <polygon
      points="12,2 20.5,7 20.5,17 12,22 3.5,17 3.5,7"
      fill="currentColor"
      fillOpacity="0.14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7.5 16C8.5 14 10.2 13 12 13C13.8 13 15.5 14 16.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// 9. Pages - Holographic Slate / Creator Broadcast
export const IconPages: React.FC<IconProps> = ({ size = 20, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${glow ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]' : ''} ${className}`}
    {...props}
  >
    <path
      d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6Z"
      fill="currentColor"
      fillOpacity="0.15"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path d="M8 8H16M8 12H16M8 16H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="16.5" cy="16" r="1.5" fill="currentColor" />
  </svg>
);

// 10. Events - Solar Chronometer / Orbit Calendar
export const IconEvents: React.FC<IconProps> = ({ size = 20, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${glow ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]' : ''} ${className}`}
    {...props}
  >
    <rect x="3" y="5" width="18" height="16" rx="3.5" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.8" />
    <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 2.5V6M16 2.5V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="8" cy="15" r="1.2" fill="currentColor" />
    <circle cx="12" cy="15" r="1.2" fill="currentColor" />
    <circle cx="16" cy="15" r="1.2" fill="currentColor" />
  </svg>
);

// 11. Profile - Persona Sphere / Identity Core
export const IconProfile: React.FC<IconProps> = ({ size = 20, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${glow ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : ''} ${className}`}
    {...props}
  >
    <circle cx="12" cy="12" r="9.5" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="9" r="3.2" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M6.5 18C7.5 15.5 9.5 14 12 14C14.5 14 16.5 15.5 17.5 18"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

// 12. Settings - Kinetic Gear Wheel
export const IconSettings: React.FC<IconProps> = ({ size = 20, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${glow ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]' : ''} ${className}`}
    {...props}
  >
    <circle cx="12" cy="12" r="3.5" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M19.4 15A1.65 1.65 0 0 0 19.7 16.8L20 17.2A2 2 0 0 1 18.2 20.2L17.7 19.9A1.65 1.65 0 0 0 15.9 20.2V21A2 2 0 0 1 13.9 23H10.1A2 2 0 0 1 8.1 21V20.2A1.65 1.65 0 0 0 6.3 19.9L5.8 20.2A2 2 0 0 1 4 17.2L4.3 16.8A1.65 1.65 0 0 0 4.6 15A1.65 1.65 0 0 0 4.3 13.2L4 12.8A2 2 0 0 1 5.8 9.8L6.3 10.1A1.65 1.65 0 0 0 8.1 9.8V9A2 2 0 0 1 10.1 7H13.9A2 2 0 0 1 15.9 9V9.8A1.65 1.65 0 0 0 17.7 10.1L18.2 9.8A2 2 0 0 1 20 12.8L19.7 13.2A1.65 1.65 0 0 0 19.4 15Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 13. Admin Shield
export const IconAdmin: React.FC<IconProps> = ({ size = 20, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${glow ? 'drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]' : ''} ${className}`}
    {...props}
  >
    <path
      d="M12 2L4 5.5V11.5C4 16.5 7.5 21 12 22C16.5 21 20 16.5 20 11.5V5.5L12 2Z"
      fill="currentColor"
      fillOpacity="0.2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 14. Coin / Nixo Crystal Token
export const IconCoin: React.FC<IconProps> = ({ size = 20, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${glow ? 'drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]' : ''} ${className}`}
    {...props}
  >
    <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" />
    <polygon points="12,6 16,10 12,18 8,10" fill="currentColor" fillOpacity="0.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <line x1="8" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

// 15. Camera Story - Optical Aperture Capsule
export const IconCameraStory: React.FC<IconProps> = ({ size = 20, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 transition-transform ${glow ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : ''} ${className}`}
    {...props}
  >
    <path
      d="M23 19C23 20.1 22.1 21 21 21H3C1.9 21 1 20.1 1 19V8C1 6.9 1.9 6 3 6H7L9 3H15L17 6H21C22.1 6 23 6.9 23 8V19Z"
      fill="currentColor"
      fillOpacity="0.16"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="13" r="4" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="13" r="1.5" fill="currentColor" />
  </svg>
);

// 16. Sparkles / Light Ray
export const IconSparkles: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block shrink-0 ${className}`} {...props}>
    <path
      d="M12 2L14.2 8.3C14.6 9.4 15.6 10.4 16.7 10.8L23 13L16.7 15.2C15.6 15.6 14.6 16.6 14.2 17.7L12 24L9.8 17.7C9.4 16.6 8.4 15.6 7.3 15.2L1 13L7.3 10.8C8.4 10.4 9.4 9.4 9.8 8.3L12 2Z"
      fill="currentColor"
      fillOpacity="0.4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

// 17. Search - Prism Magnifier
export const IconSearch: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block shrink-0 ${className}`} {...props}>
    <circle cx="11" cy="11" r="7.5" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.8" />
    <path d="M16.5 16.5L21.5 21.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 18. Plus / Create
export const IconPlus: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block shrink-0 ${className}`} {...props}>
    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 19. Reactions
export const IconReactionLove: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block shrink-0 ${className}`} {...props}>
    <path
      d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z"
      fill="#F43F5E"
      stroke="#FDA4AF"
      strokeWidth="1.5"
    />
  </svg>
);

export const IconReactionFire: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block shrink-0 ${className}`} {...props}>
    <path
      d="M12 2C9.5 6 7 8.5 7 13C7 16.5 9.5 19.5 13 19.5C16.5 19.5 19 16.5 19 13C19 9.5 16.5 7 15 5C15 7.5 13.5 9 12 10.5C11.5 8 12.5 5 12 2Z"
      fill="#F97316"
      stroke="#FDBA74"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconReactionGem: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block shrink-0 ${className}`} {...props}>
    <polygon points="6,3 18,3 22,9 12,21 2,9" fill="#06B6D4" stroke="#67E8F9" strokeWidth="1.5" strokeLinejoin="round" />
    <line x1="2" y1="9" x2="22" y2="9" stroke="#E0F2FE" strokeWidth="1" />
    <line x1="12" y1="21" x2="6" y2="3" stroke="#E0F2FE" strokeWidth="1" />
    <line x1="12" y1="21" x2="18" y2="3" stroke="#E0F2FE" strokeWidth="1" />
  </svg>
);

export const IconReactionCelebrate: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block shrink-0 ${className}`} {...props}>
    <path d="M4 21L14 11L13 10L3 20L4 21Z" fill="#F59E0B" stroke="#FDE68A" strokeWidth="1.5" />
    <path d="M14 11L18 7L17 6L13 10L14 11Z" fill="#8B5CF6" />
    <circle cx="18" cy="4" r="1.5" fill="#EC4899" />
    <circle cx="21" cy="9" r="1.5" fill="#10B981" />
    <circle cx="12" cy="3" r="1.5" fill="#06B6D4" />
    <circle cx="21" cy="15" r="1.2" fill="#F59E0B" />
  </svg>
);

export const IconReactionMindblown: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block shrink-0 ${className}`} {...props}>
    <circle cx="12" cy="12" r="9" fill="#8B5CF6" stroke="#C4B5FD" strokeWidth="1.5" />
    <ellipse cx="9" cy="10" rx="1.5" ry="2" fill="#FFFFFF" />
    <ellipse cx="15" cy="10" rx="1.5" ry="2" fill="#FFFFFF" />
    <circle cx="12" cy="16" r="2.5" fill="#FFFFFF" />
    <path d="M7 6L5 4M17 6L19 4M12 3V1" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconReactionHeartbreak: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block shrink-0 ${className}`} {...props}>
    <path
      d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z"
      fill="#64748B"
      stroke="#94A3B8"
      strokeWidth="1.5"
    />
    <path d="M12 5L10.5 9.5L13.5 13L11.5 17L12 21" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// 20. Utility Icons
export const IconSun: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block shrink-0 ${className}`} {...props}>
    <circle cx="12" cy="12" r="4.5" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 2V4M12 20V22M4 12H2M22 12H20M5.64 5.64L7.05 7.05M16.95 16.95L18.36 18.36M5.64 18.36L7.05 16.95M16.95 7.05L18.36 5.64" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const IconMoon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block shrink-0 ${className}`} {...props}>
    <path
      d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79Z"
      fill="currentColor"
      fillOpacity="0.2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconRefresh: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block shrink-0 ${className}`} {...props}>
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 16h5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconCheck: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block shrink-0 ${className}`} {...props}>
    <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconShieldAlert: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block shrink-0 ${className}`} {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconVerifiedBadge: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 text-cyan-400 ${className}`}
    {...props}
  >
    <path d="M12 2L14.6 4.3L18.1 4.5L19.2 7.8L22.2 9.6L21.7 13.1L23.2 16.3L20.2 18.2L19.5 21.6L16 22L13.8 24.5L10.7 23.1L7.7 24.6L5.8 21.8L2.4 21.1L2 17.6L0 15L1 11.6L0 8.2L2.8 6.4L3.3 2.9L6.8 3L8.8 1.1L12 2Z" fill="currentColor" fillOpacity="0.2" />
    <path d="M12 2L14.6 4.3L18.1 4.5L19.2 7.8L22.2 9.6L21.7 13.1L23.2 16.3L20.2 18.2L19.5 21.6L16 22L13.8 24.5L10.7 23.1L7.7 24.6L5.8 21.8L2.4 21.1L2 17.6L0 15L1 11.6L0 8.2L2.8 6.4L3.3 2.9L6.8 3L8.8 1.1L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M8.5 12.5L11 15L15.5 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconSend: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 ${className}`}
    {...props}
  >
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconLock: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 ${className}`}
    {...props}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconMoreHorizontal: React.FC<IconProps> = ({ size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 ${className}`}
    {...props}
  >
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

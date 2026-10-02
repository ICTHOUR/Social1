import React from 'react';

interface NixLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  floating?: boolean;
  showBorder?: boolean;
  onClick?: () => void;
}

export const NixLogo: React.FC<NixLogoProps> = ({
  size = 'sm',
  className = '',
  floating = false,
  showBorder = true,
  onClick,
}) => {
  // Dimensions mapping - aligned with 32-36px header action icons
  let dimensionPx = 34; // Matches header action icon buttons
  if (typeof size === 'number') {
    dimensionPx = size;
  } else {
    switch (size) {
      case 'xs':
        dimensionPx = 26;
        break;
      case 'sm':
        dimensionPx = 32;
        break;
      case 'md':
        dimensionPx = 34;
        break;
      case 'lg':
        dimensionPx = 44;
        break;
      case 'xl':
        dimensionPx = 60;
        break;
    }
  }

  return (
    <div
      onClick={onClick}
      style={{ width: dimensionPx, height: dimensionPx }}
      className={`relative shrink-0 select-none rounded-full transition-all duration-300 shadow-[0_3px_10px_rgba(6,182,212,0.2)] hover:shadow-[0_5px_15px_rgba(6,182,212,0.35)] ${
        showBorder
          ? 'p-[1px] bg-gradient-to-br from-cyan-400 via-teal-400 to-pink-500 dark:from-cyan-400 dark:via-fuchsia-500 dark:to-purple-600'
          : ''
      } ${floating ? 'animate-float-logo' : ''} ${className}`}
      title="NIX Social"
      role="img"
      aria-label="Nix Logo"
    >
      {/* Outer subtle ambient glow halo for genuine floating perception without physical movement */}
      <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-cyan-500/25 to-pink-500/25 blur-[3px] -z-10 pointer-events-none" />

      {/* Circular Mask Container with inner black background and glass rim */}
      <div className="w-full h-full rounded-full overflow-hidden bg-[#03060f] relative flex items-center justify-center ring-1 ring-white/20 shadow-inner">
        {/* Crisp Vector SVG Emblem */}
        <svg
          viewBox="0 0 512 512"
          className="w-full h-full object-cover scale-[1.08] transition-transform duration-300 group-hover:scale-115"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="nixInnerDark" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#0e172a" />
              <stop offset="65%" stopColor="#040711" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>

            <linearGradient id="ribbonLeftGrad" x1="10%" y1="90%" x2="60%" y2="10%">
              <stop offset="0%" stopColor="#9d174d" />
              <stop offset="25%" stopColor="#db2777" />
              <stop offset="60%" stopColor="#f43f5e" />
              <stop offset="90%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#fda4af" />
            </linearGradient>

            <linearGradient id="ribbonMidFold" x1="20%" y1="15%" x2="80%" y2="85%">
              <stop offset="0%" stopColor="#e11d48" />
              <stop offset="25%" stopColor="#c026d3" />
              <stop offset="55%" stopColor="#7c3aed" />
              <stop offset="85%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            <linearGradient id="ribbonRightGrad" x1="15%" y1="85%" x2="85%" y2="10%">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="30%" stopColor="#0284c7" />
              <stop offset="65%" stopColor="#06b6d4" />
              <stop offset="90%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#bae6fd" />
            </linearGradient>

            <linearGradient id="glossSweep" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="metallicLetters" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#f8fafc" />
              <stop offset="80%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            <linearGradient id="goldCoinRim" x1="20%" y1="10%" x2="80%" y2="90%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            <radialGradient id="goldCoinCenter" cx="42%" cy="40%" r="58%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="45%" stopColor="#f59e0b" />
              <stop offset="90%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </radialGradient>

            <linearGradient id="dollarSignGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#92400e" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>

            <filter id="vectorDropGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#06b6d4" floodOpacity="0.4" />
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#ec4899" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Deep dark circular canvas fill */}
          <circle cx="256" cy="256" r="256" fill="url(#nixInnerDark)" />

          {/* Subtle Ambient Radial Highlight inside */}
          <circle cx="256" cy="180" r="160" fill="#38bdf8" fillOpacity="0.08" filter="blur(30px)" />

          {/* ==================================================== */}
          {/* 1. THE 3D FOLDED RIBBON "N"                          */}
          {/* ==================================================== */}
          <g filter="url(#vectorDropGlow)">
            {/* Deep Underfold Cavity Shadow */}
            <path
              d="M 185 225 C 215 265, 245 305, 305 285 C 270 285, 225 265, 185 225 Z"
              fill="#0f172a"
              opacity="0.7"
            />

            {/* Left Vertical/Curved Ribbon Segment (Magenta/Pink) */}
            <path
              d="M 124 290
                 C 120 270, 126 195, 160 145
                 C 185 110, 225 115, 238 150
                 C 246 172, 235 200, 215 218
                 C 190 240, 150 255, 124 290 Z"
              fill="url(#ribbonLeftGrad)"
            />

            {/* Gloss Highlight on Left Ribbon */}
            <path
              d="M 132 280
                 C 130 250, 140 180, 168 140
                 C 188 115, 218 120, 228 145
                 C 215 130, 185 130, 160 160
                 C 140 185, 134 240, 132 280 Z"
              fill="url(#glossSweep)"
              opacity="0.75"
            />

            {/* Diagonal Ribbon Loop Across (Violet to Blue) */}
            <path
              d="M 238 150
                 C 215 190, 175 250, 185 285
                 C 195 315, 240 320, 280 295
                 C 320 270, 345 220, 365 175
                 C 345 205, 315 250, 275 270
                 C 245 285, 215 275, 210 255
                 C 205 230, 225 185, 238 150 Z"
              fill="url(#ribbonMidFold)"
            />

            {/* Right Ascending Ribbon & Wave (Cyan / Electric Sky Blue) */}
            <path
              d="M 270 285
                 C 305 270, 335 230, 355 180
                 C 370 140, 372 135, 366 160
                 C 358 195, 335 245, 298 285
                 C 285 298, 275 295, 270 285 Z"
              fill="url(#ribbonRightGrad)"
            />

            <path
              d="M 285 285
                 C 315 265, 345 220, 362 170
                 C 372 140, 365 130, 352 155
                 C 340 180, 318 230, 285 285 Z"
              fill="url(#glossSweep)"
              opacity="0.65"
            />

            {/* Top Right Orbital Droplets */}
            {/* 1. Magenta Droplet */}
            <circle cx="325" cy="120" r="14" fill="#f43f5e" />
            <circle cx="322" cy="116" r="5" fill="#ffffff" opacity="0.85" />

            {/* 2. Cyan Droplet with trail */}
            <circle cx="368" cy="130" r="20" fill="#06b6d4" />
            <circle cx="363" cy="124" r="7" fill="#ffffff" opacity="0.9" />
            <path d="M 374 146 C 378 156, 385 166, 380 170 C 375 174, 370 162, 366 150 Z" fill="#38bdf8" />
          </g>

          {/* ==================================================== */}
          {/* 2. METALLIC TYPOGRAPHY "N I X"                       */}
          {/* ==================================================== */}
          <g fill="url(#metallicLetters)">
            {/* N */}
            <path d="M 120 405 L 120 330 L 146 330 L 176 380 L 176 330 L 198 330 L 198 405 L 172 405 L 142 355 L 142 405 Z" />

            {/* I */}
            <path d="M 218 405 L 218 330 L 242 330 L 242 405 Z" />

            {/* X */}
            <path d="M 262 405 L 285 368 L 264 330 L 290 330 L 302 352 L 314 330 L 340 330 L 318 368 L 342 405 L 316 405 L 302 381 L 288 405 Z" />
          </g>

          {/* ==================================================== */}
          {/* 3. GLEAMING 3D GOLDEN COIN ($)                       */}
          {/* ==================================================== */}
          <g id="goldCoinEmblem">
            {/* Outer Coin Shadow */}
            <circle cx="390" cy="368" r="46" fill="#000000" opacity="0.55" />

            {/* Outer Bevel Rim */}
            <circle cx="388" cy="365" r="44" fill="url(#goldCoinRim)" stroke="#fef08a" strokeWidth="1.5" />

            {/* Inner Recessed Groove */}
            <circle cx="388" cy="365" r="39" fill="none" stroke="#78350f" strokeWidth="1.5" opacity="0.85" />

            {/* Coin Face */}
            <circle cx="388" cy="365" r="37" fill="url(#goldCoinCenter)" />

            {/* Embossed Dollar Sign ($) */}
            <line x1="388" y1="344" x2="388" y2="386" stroke="url(#dollarSignGrad)" strokeWidth="4.5" strokeLinecap="round" />
            <path
              d="M 397 353
                 C 397 348, 380 347, 380 355
                 C 380 363, 396 364, 396 373
                 C 396 382, 378 382, 378 376"
              fill="none"
              stroke="url(#dollarSignGrad)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Specular Edge Crescent Highlight */}
            <path
              d="M 360 348 C 370 335, 395 330, 412 342"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.75"
            />

            {/* Brilliant 4-Point Specular Flare */}
            <g transform="translate(418, 335)">
              <path d="M 0 -13 Q 0 0 13 0 Q 0 0 0 13 Q 0 0 -13 0 Q 0 0 0 -13 Z" fill="#ffffff" />
              <circle cx="0" cy="0" r="3.5" fill="#fef08a" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';

export interface Gift3DPreviewProps {
  image3d?: string;
  animation?: string;
  iconType?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  isInteractive?: boolean;
}

export const Gift3DPreview: React.FC<Gift3DPreviewProps> = ({
  image3d = 'crystal_prism',
  animation = 'orbital_float',
  size = 'md',
  isInteractive = true,
}) => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isInteractive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotateX(-y * 0.18);
    setRotateY(x * 0.18);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  // Dimensions based on size
  const sizeClasses = {
    sm: 'w-14 h-14',
    md: 'w-24 h-24',
    lg: 'w-40 h-40',
    hero: 'w-64 h-64',
  }[size];

  // Render original vector 3D models with holographic caustics & lighting
  const render3DModel = () => {
    switch (image3d) {
      // 100 COINS: Nixo Crystal Prism
      case 'crystal_prism':
        return (
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_10px_20px_rgba(6,182,212,0.6)]">
            <defs>
              <linearGradient id="prismGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
              <linearGradient id="prismGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="prismCore" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            {/* Ambient Aura Ring */}
            <circle cx="60" cy="60" r="48" fill="none" stroke="url(#prismGrad1)" strokeWidth="1.5" strokeDasharray="6 4" className="animate-spin" style={{ animationDuration: '14s' }} opacity="0.6" />
            {/* Outer Diamond Hexagon Facets */}
            <polygon points="60,14 96,38 96,82 60,106 24,82 24,38" fill="url(#prismGrad1)" opacity="0.35" />
            {/* Front 3D Crystal Pyramids */}
            <polygon points="60,14 60,60 96,38" fill="url(#prismGrad2)" />
            <polygon points="96,38 60,60 96,82" fill="url(#prismGrad1)" opacity="0.8" />
            <polygon points="96,82 60,60 60,106" fill="url(#prismGrad2)" opacity="0.9" />
            <polygon points="60,106 60,60 24,82" fill="url(#prismGrad1)" opacity="0.75" />
            <polygon points="24,82 60,60 24,38" fill="url(#prismGrad2)" opacity="0.85" />
            <polygon points="24,38 60,60 60,14" fill="#cffafe" opacity="0.95" />
            {/* Luminous Inner Core Point */}
            <circle cx="60" cy="60" r="5" fill="url(#prismCore)" className="animate-ping" style={{ animationDuration: '3s' }} />
            <circle cx="60" cy="60" r="3.5" fill="#ffffff" />
          </svg>
        );

      // 200 COINS: Neon Cyber Lotus
      case 'cyber_lotus':
        return (
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_10px_25px_rgba(217,70,239,0.7)]">
            <defs>
              <linearGradient id="lotusGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#f472b6" />
              </linearGradient>
              <linearGradient id="petalGlow" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#fdf4ff" />
                <stop offset="100%" stopColor="#d946ef" />
              </linearGradient>
            </defs>
            {/* Orbit Glow Ring */}
            <ellipse cx="60" cy="80" rx="44" ry="16" fill="none" stroke="url(#lotusGrad)" strokeWidth="1.5" opacity="0.5" />
            {/* Outer Petals */}
            <path d="M60 84 C40 84 20 60 30 40 C45 50 55 70 60 84 Z" fill="url(#lotusGrad)" opacity="0.7" />
            <path d="M60 84 C80 84 100 60 90 40 C75 50 65 70 60 84 Z" fill="url(#lotusGrad)" opacity="0.7" />
            {/* Mid Petals */}
            <path d="M60 86 C48 76 34 50 48 30 C58 46 58 68 60 86 Z" fill="url(#petalGlow)" opacity="0.85" />
            <path d="M60 86 C72 76 86 50 72 30 C62 46 62 68 60 86 Z" fill="url(#petalGlow)" opacity="0.85" />
            {/* Central Spire Petal */}
            <path d="M60 88 C54 68 50 36 60 18 C70 36 66 68 60 88 Z" fill="#ffffff" />
            <circle cx="60" cy="58" r="4" fill="#fbbf24" className="animate-pulse" />
          </svg>
        );

      // 300 COINS: Liquid Gold Chalice
      case 'gold_chalice':
        return (
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_10px_25px_rgba(245,158,11,0.7)]">
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#f59e0b" />
                <stop offset="80%" stopColor="#b45309" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>
              <linearGradient id="liquidGold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef9c3" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            {/* Radiating Base Platform */}
            <ellipse cx="60" cy="100" rx="34" ry="10" fill="url(#goldGrad)" />
            <rect x="56" y="66" width="8" height="34" rx="4" fill="url(#goldGrad)" />
            {/* Chalice Stem Knots */}
            <circle cx="60" cy="80" r="7" fill="#fde047" stroke="#b45309" strokeWidth="2" />
            {/* Cup Bowl */}
            <path d="M30 30 C30 64 90 64 90 30 Z" fill="url(#goldGrad)" />
            <ellipse cx="60" cy="30" rx="30" ry="9" fill="#92400e" stroke="#fde047" strokeWidth="2" />
            {/* Overflowing Liquid Pool */}
            <ellipse cx="60" cy="30" rx="26" ry="7" fill="url(#liquidGold)" />
            {/* Liquid Droplets Rising */}
            <circle cx="52" cy="18" r="2.5" fill="#fef08a" className="animate-bounce" />
            <circle cx="68" cy="14" r="3" fill="#fef08a" className="animate-bounce" style={{ animationDelay: '0.2s' }} />
            <circle cx="60" cy="8" r="2" fill="#ffffff" className="animate-pulse" />
          </svg>
        );

      // 500 COINS: Celestial Nova Orb
      case 'nova_orb':
        return (
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_12px_28px_rgba(99,102,241,0.8)]">
            <defs>
              <radialGradient id="novaRadial" cx="45%" cy="45%" r="55%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="30%" stopColor="#818cf8" />
                <stop offset="70%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#1e1b4b" />
              </radialGradient>
              <linearGradient id="orbRing" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c7d2fe" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            {/* Tilted Planetary Ring Back */}
            <ellipse cx="60" cy="60" rx="52" ry="14" fill="none" stroke="url(#orbRing)" strokeWidth="3" transform="rotate(-28 60 60)" opacity="0.6" />
            {/* Deep Glowing Core Sphere */}
            <circle cx="60" cy="60" r="32" fill="url(#novaRadial)" />
            {/* Front Planetary Ring */}
            <path d="M12 76 A52 14 0 0 0 108 44" fill="none" stroke="url(#orbRing)" strokeWidth="3.5" transform="rotate(-28 60 60)" strokeLinecap="round" />
            {/* Orbiting Satellites */}
            <circle cx="34" cy="40" r="4" fill="#a5f3fc" className="animate-ping" style={{ animationDuration: '2.5s' }} />
            <circle cx="86" cy="80" r="3" fill="#f472b6" />
            <circle cx="60" cy="60" r="8" fill="#ffffff" opacity="0.3" className="animate-pulse" />
          </svg>
        );

      // 1000 COINS: Quantum Phoenix Crown
      case 'phoenix_crown':
        return (
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_12px_32px_rgba(249,115,22,0.85)]">
            <defs>
              <linearGradient id="crownGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ea580c" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fef08a" />
              </linearGradient>
              <linearGradient id="crownJewel" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
            {/* Lower Diadem Ring */}
            <ellipse cx="60" cy="92" rx="42" ry="12" fill="url(#crownGrad)" stroke="#7c2d12" strokeWidth="2" />
            {/* Crown Spikes & Flames */}
            <path
              d="M18 90 L26 44 L38 72 L60 22 L82 72 L94 44 L102 90 Z"
              fill="url(#crownGrad)"
              stroke="#7c2d12"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Front Arch */}
            <path d="M18 90 Q60 106 102 90 Q60 98 18 90 Z" fill="#ca8a04" />
            {/* Scepter Jewels */}
            <circle cx="60" cy="22" r="5" fill="url(#crownJewel)" stroke="#ffffff" strokeWidth="1.5" className="animate-pulse" />
            <circle cx="26" cy="44" r="3.5" fill="url(#crownJewel)" stroke="#ffffff" strokeWidth="1" />
            <circle cx="94" cy="44" r="3.5" fill="url(#crownJewel)" stroke="#ffffff" strokeWidth="1" />
            <polygon points="60,65 65,75 60,85 55,75" fill="#ffffff" />
          </svg>
        );

      // 2500 COINS: Hypercube Chrono Relic
      case 'hypercube_relic':
        return (
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_12px_32px_rgba(168,85,247,0.85)]">
            <defs>
              <linearGradient id="cubeOuter" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#6b21a8" />
              </linearGradient>
              <linearGradient id="cubeInner" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            {/* Outer Hex/Cube Vertices */}
            <polygon points="60,16 98,38 98,82 60,104 22,82 22,38" fill="none" stroke="url(#cubeOuter)" strokeWidth="3" />
            {/* Inner Tesseract Cube */}
            <polygon points="60,36 82,48 82,72 60,84 38,72 38,48" fill="url(#cubeInner)" opacity="0.75" />
            {/* 4D Connecting Beams */}
            <line x1="60" y1="16" x2="60" y2="36" stroke="#e9d5ff" strokeWidth="2" strokeDasharray="3 3" />
            <line x1="98" y1="38" x2="82" y2="48" stroke="#e9d5ff" strokeWidth="2" strokeDasharray="3 3" />
            <line x1="98" y1="82" x2="82" y2="72" stroke="#e9d5ff" strokeWidth="2" strokeDasharray="3 3" />
            <line x1="60" y1="104" x2="60" y2="84" stroke="#e9d5ff" strokeWidth="2" strokeDasharray="3 3" />
            <line x1="22" y1="82" x2="38" y2="72" stroke="#e9d5ff" strokeWidth="2" strokeDasharray="3 3" />
            <line x1="22" y1="38" x2="38" y2="48" stroke="#e9d5ff" strokeWidth="2" strokeDasharray="3 3" />
            <circle cx="60" cy="60" r="6" fill="#ffffff" className="animate-ping" style={{ animationDuration: '2s' }} />
          </svg>
        );

      // 5000 COINS: Imperial Astral Dragon
      case 'astral_dragon':
        return (
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_14px_38px_rgba(236,72,153,0.9)]">
            <defs>
              <linearGradient id="dragonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="35%" stopColor="#8b5cf6" />
                <stop offset="70%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
              <radialGradient id="dragonPearl" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#fef08a" />
                <stop offset="100%" stopColor="#d97706" />
              </radialGradient>
            </defs>
            {/* Serpentine Coil */}
            <path
              d="M32 94 C12 70 20 40 44 26 C68 12 96 24 100 50 C104 76 78 96 56 86 C40 78 44 58 58 54 C72 50 78 64 70 72"
              fill="none"
              stroke="url(#dragonGrad)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Spinal Crest Scales */}
            <path
              d="M40 28 L42 20 L48 24 L56 16 L60 22 L72 14 L74 22 L86 18"
              fill="none"
              stroke="#fef08a"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Dragon Head */}
            <polygon points="26,30 10,22 18,38 32,38" fill="#f43f5e" />
            <circle cx="20" cy="30" r="2.5" fill="#fde047" />
            {/* Celestial Mystic Pearl held by Dragon */}
            <circle cx="68" cy="66" r="9" fill="url(#dragonPearl)" className="animate-pulse" />
            <circle cx="68" cy="66" r="14" fill="none" stroke="#fef08a" strokeWidth="1" strokeDasharray="3 3" className="animate-spin" />
          </svg>
        );

      // Default: Cosmic Spark
      default:
        return (
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_10px_20px_rgba(251,191,36,0.6)]">
            <defs>
              <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            <polygon points="60,10 68,46 104,54 68,62 60,98 52,62 16,54 52,46" fill="url(#sparkGrad)" />
            <circle cx="60" cy="54" r="7" fill="#ffffff" className="animate-ping" style={{ animationDuration: '2.5s' }} />
          </svg>
        );
    }
  };

  // Animation variants
  const getAnimationProps = () => {
    switch (animation) {
      case 'crystal_burst':
        return {
          animate: { y: [0, -6, 0], scale: isHovered ? 1.15 : [1, 1.04, 1] },
          transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' as const },
        };
      case 'cosmic_pulse':
        return {
          animate: { scale: isHovered ? 1.18 : [1, 1.08, 1], rotate: [0, 3, -3, 0] },
          transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' as const },
        };
      case 'golden_rain':
        return {
          animate: { y: [0, -8, 0], rotate: [0, -4, 4, 0] },
          transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' as const },
        };
      case 'quantum_flare':
        return {
          animate: { rotate: [0, 8, -8, 0], scale: isHovered ? 1.2 : [1, 1.06, 1] },
          transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
        };
      case 'astral_surge':
        return {
          animate: { y: [0, -10, 0], rotate: [0, 6, -6, 0], scale: [1, 1.08, 1] },
          transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' as const },
        };
      case 'orbital_float':
      default:
        return {
          animate: { y: [0, -6, 0] },
          transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
        };
    }
  };

  const animProps = getAnimationProps();

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`relative flex items-center justify-center select-none ${sizeClasses}`}
      style={{
        perspective: '800px',
      }}
    >
      <motion.div
        animate={animProps.animate}
        transition={animProps.transition}
        style={{
          transformStyle: 'preserve-3d',
          transform: isInteractive ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg)` : undefined,
          transition: isHovered ? 'none' : 'transform 0.5s ease',
        }}
        className="w-full h-full flex items-center justify-center relative cursor-pointer"
      >
        {render3DModel()}
      </motion.div>
    </div>
  );
};

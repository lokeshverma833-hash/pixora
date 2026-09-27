import React from 'react';

interface PixoraLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  showText?: boolean;
  variant?: 'icon' | 'badge' | 'full';
  className?: string;
  textClassName?: string;
}

export const PixoraLogo: React.FC<PixoraLogoProps> = ({
  size = 'md',
  showText = false,
  variant = 'badge',
  className = '',
  textClassName = '',
}) => {
  // Dimension mapping
  const getDimensions = () => {
    if (typeof size === 'number') {
      return { container: size, icon: Math.round(size * 0.6) };
    }
    switch (size) {
      case 'xs':
        return { container: 24, icon: 14 };
      case 'sm':
        return { container: 32, icon: 19 };
      case 'md':
        return { container: 40, icon: 24 };
      case 'lg':
        return { container: 52, icon: 30 };
      case 'xl':
        return { container: 72, icon: 42 };
      default:
        return { container: 40, icon: 24 };
    }
  };

  const { container } = getDimensions();

  // Unique IDs for SVG gradients to prevent DOM collisions
  const idPrefix = 'pixora-logo';

  const markSvg = (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full transition-transform duration-300 group-hover:scale-105"
      style={{ filter: 'drop-shadow(0 2px 8px rgba(99, 102, 241, 0.25))' }}
    >
      <defs>
        {/* Badge Background Gradient */}
        <linearGradient id={`${idPrefix}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E1B4B" />
          <stop offset="50%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>

        {/* Outer Ribbon Gradient: Vibrant Indigo to Electric Cyan */}
        <linearGradient id={`${idPrefix}-grad1`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="45%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        {/* Inner Loop Gradient: Violet to Fuchsia Pink */}
        <linearGradient id={`${idPrefix}-grad2`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="60%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>

        {/* AI Sparkle Gradient */}
        <linearGradient id={`${idPrefix}-spark`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>

        {/* Subtle border highlight */}
        <linearGradient id={`${idPrefix}-border`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#6366F1" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#C084FC" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Rounded Squircle Container */}
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        rx="13"
        fill={`url(#${idPrefix}-bg)`}
        stroke={`url(#${idPrefix}-border)`}
        strokeWidth="1.5"
      />

      {/* Ambient Inner Glow Ring */}
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="11.5"
        stroke="white"
        strokeOpacity="0.08"
        strokeWidth="1"
      />

      {/* Stylized Modern 'P' Glyph + Camera Aperture + Dynamic Ribbon */}
      <g transform="translate(2, 2)">
        {/* Stem of the P (Layered Prism Pillar) */}
        <path
          d="M12 11C12 9.89543 12.8954 9 14 9H17C18.1046 9 19 9.89543 19 11V33C19 34.1046 18.1046 35 17 35H14C12.8954 35 12 34.1046 12 33V11Z"
          fill={`url(#${idPrefix}-grad1)`}
        />

        {/* Curved Upper Loop of P (Smooth folded ribbon) */}
        <path
          d="M17 9H25C29.4183 9 33 12.5817 33 17C33 21.4183 29.4183 25 25 25H17V9Z"
          fill={`url(#${idPrefix}-grad2)`}
          fillOpacity="0.92"
        />

        {/* Aperture Center Core (Dark Negative Space with Glowing Rim) */}
        <circle
          cx="24"
          cy="17"
          r="4"
          fill="#0F172A"
          stroke={`url(#${idPrefix}-grad1)`}
          strokeWidth="1.5"
        />

        {/* Core Focal Dot */}
        <circle
          cx="24"
          cy="17"
          r="1.5"
          fill="#38BDF8"
        />

        {/* Lower Dynamic Overlap (Gives depth and 3D ribbon fold) */}
        <path
          d="M19 21L25 25C21.5 25 19 23.5 19 21Z"
          fill="#1E1B4B"
          fillOpacity="0.6"
        />

        {/* 4-Point AI Sparkle / Lens Flare in Top-Right */}
        <path
          d="M33 7C33 9.2 34.8 11 37 11C34.8 11 33 12.8 33 15C33 12.8 31.2 11 29 11C31.2 11 33 9.2 33 7Z"
          fill={`url(#${idPrefix}-spark)`}
        />
      </g>
    </svg>
  );

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className="relative shrink-0 flex items-center justify-center select-none"
        style={{ width: container, height: container }}
      >
        {markSvg}
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center">
            <span
              className={`font-display font-extrabold tracking-tight text-slate-900 dark:text-white leading-none ${
                size === 'xs'
                  ? 'text-sm'
                  : size === 'sm'
                  ? 'text-base'
                  : size === 'lg'
                  ? 'text-2xl'
                  : size === 'xl'
                  ? 'text-3xl'
                  : 'text-xl'
              } ${textClassName}`}
            >
              Pixora
            </span>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 ml-0.5 animate-pulse" />
          </div>
          {(size === 'lg' || size === 'xl') && (
            <span className="text-[10px] tracking-wider uppercase font-semibold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
              Tools Suite
            </span>
          )}
        </div>
      )}
    </div>
  );
};

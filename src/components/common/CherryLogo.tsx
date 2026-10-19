import React from 'react';

interface CherryLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const CherryLogo: React.FC<CherryLogoProps> = ({
  size = 'md',
  showText = true,
  className = ''
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className={`relative ${iconSizes[size]} flex items-center justify-center`}>
        {/* Stylized Cherry & Chat Bubble Icon */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-sm transition-transform hover:scale-105 duration-300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Stems */}
          <path
            d="M38 48 C 38 25, 45 15, 60 12 C 55 22, 64 35, 68 50"
            stroke="#4A7C38"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          {/* Stem leaf */}
          <path
            d="M58 13 C 68 8, 76 12, 74 20 C 66 22, 58 18, 58 13 Z"
            fill="#5D9945"
          />
          
          {/* Left Cherry (Chat bubble shape with tail) */}
          <g>
            <circle cx="36" cy="62" r="24" fill="url(#cherryGrad1)" />
            {/* Bubble shine */}
            <ellipse cx="28" cy="54" rx="6" ry="10" transform="rotate(-30 28 54)" fill="white" opacity="0.45" />
            {/* Connected speech tail */}
            <path d="M22 72 Q 14 80 16 84 Q 24 81 28 76 Z" fill="#8F1238" />
          </g>

          {/* Right Cherry (Secondary connected bubble) */}
          <g>
            <circle cx="68" cy="64" r="22" fill="url(#cherryGrad2)" />
            {/* Bubble shine */}
            <ellipse cx="62" cy="56" rx="5" ry="8" transform="rotate(-25 62 56)" fill="white" opacity="0.4" />
          </g>

          <defs>
            <linearGradient id="cherryGrad1" x1="20" y1="40" x2="55" y2="85" gradientUnits="userSpaceOnUse">
              <stop stopColor="#E04D71" />
              <stop offset="0.4" stopColor="#C52B50" />
              <stop offset="1" stopColor="#8F1238" />
            </linearGradient>
            <linearGradient id="cherryGrad2" x1="50" y1="45" x2="85" y2="85" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F76B8A" />
              <stop offset="0.5" stopColor="#C52B50" />
              <stop offset="1" stopColor="#5C102A" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-extrabold tracking-tight text-[#8F1238] dark:text-[#F7DCE3] leading-none ${textSizes[size]}`} style={{ fontFamily: 'Outfit, sans-serif' }}>
            Convera
          </span>
          {size === 'lg' || size === 'xl' ? (
            <span className="text-xs font-medium text-[#C52B50] dark:text-[#E04D71] tracking-wide mt-1">
              Your people, your place.
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
};

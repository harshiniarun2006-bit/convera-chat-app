import React, { useId } from 'react';

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
  const id = useId();
  const grad1Id = `converaGrad1_${id.replace(/[:]/g, '')}`;
  const grad2Id = `converaGrad2_${id.replace(/[:]/g, '')}`;

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
      <div className={`relative ${iconSizes[size]} flex items-center justify-center shrink-0`}>
        {/* Convera 'C' Chat Monogram */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-sm transition-transform hover:scale-105 duration-300 pointer-events-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={grad1Id} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF527B" />
              <stop offset="55%" stopColor="#D92253" />
              <stop offset="100%" stopColor="#8F1238" />
            </linearGradient>
            <linearGradient id={grad2Id} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFA4B8" />
              <stop offset="100%" stopColor="#FF4B72" />
            </linearGradient>
          </defs>

          {/* 'C' Lettermark with Integrated Dialogue Bubble Tail */}
          <path
            d="M72 26 C 60 14, 40 14, 26 26 C 14 38, 14 62, 26 74 L 16 84 L 34 80 C 44 86, 60 86, 72 74"
            stroke={`url(#${grad1Id})`}
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Inner Real-time Conversation Presence Node */}
          <circle cx="49" cy="50" r="6" fill={`url(#${grad2Id})`} />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-extrabold tracking-tight text-[#8F1238] dark:text-[#F7DCE3] leading-none ${textSizes[size]}`}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
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


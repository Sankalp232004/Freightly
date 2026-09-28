import React from 'react';

export type IconName =
  | 'truck'
  | 'train'
  | 'plane'
  | 'ship'
  | 'check'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-right'
  | 'trash'
  | 'bookmark'
  | 'bookmark-fill'
  | 'user'
  | 'lock'
  | 'search'
  | 'print'
  | 'alert'
  | 'share'
  | 'refresh'
  | 'plus'
  | 'scale'
  | 'leaf';

interface IconProps {
  name: IconName;
  size?: 16 | 18 | 20;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 16, className = '' }) => {
  const pixelSize = `${size}px`;

  const renderPath = () => {
    switch (name) {
      case 'truck':
        return (
          <path
            d="M1 3h14v10H1V3zm14 3h5l3 4v4h-8V6zm-9 9a2 2 0 100 4 2 2 0 000-4zm11 0a2 2 0 100 4 2 2 0 000-4z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        );
      case 'train':
        return (
          <path
            d="M4 2h16v14H4V2zm0 8h16M7 6h2M15 6h2M6 18l-3 4M18 18l3 4M8 18h8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        );
      case 'plane':
        return (
          <path
            d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
            fill="currentColor"
          />
        );
      case 'ship':
        return (
          <path
            d="M2 17l2 4h16l2-4H2zm4-6h12v3H6v-3zm6-7v7M9 7h6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        );
      case 'check':
        return (
          <path
            d="M4 12l5 5L20 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        );
      case 'chevron-down':
        return (
          <path
            d="M6 9l6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
          />
        );
      case 'chevron-up':
        return (
          <path
            d="M18 15l-6-6-6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
          />
        );
      case 'chevron-right':
        return (
          <path
            d="M9 18l6-6-6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
          />
        );
      case 'trash':
        return (
          <path
            d="M3 6h18M8 6V4h8v2M19 6v14H5V6h14zm-9 4v6M14 10v6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="square"
          />
        );
      case 'bookmark':
        return (
          <path
            d="M5 3h14v18l-7-5-7 5V3z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        );
      case 'bookmark-fill':
        return (
          <path
            d="M5 3h14v18l-7-5-7 5V3z"
            fill="currentColor"
          />
        );
      case 'user':
        return (
          <path
            d="M12 12a4 4 0 100-8 4 4 0 000 8zm-8 9v-2a6 6 0 0112 0v2H4z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="square"
          />
        );
      case 'lock':
        return (
          <path
            d="M5 11h14v10H5V11zm3 0V7a4 4 0 018 0v4M12 15v2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="square"
          />
        );
      case 'search':
        return (
          <path
            d="M11 19a8 8 0 100-16 8 8 0 000 16zm10 2l-4.35-4.35"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="square"
          />
        );
      case 'print':
        return (
          <path
            d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-12 0v4h12v-4H6z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="square"
          />
        );
      case 'alert':
        return (
          <path
            d="M12 2L1 21h22L12 2zm0 7v6m0 3v1"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
          />
        );
      case 'share':
        return (
          <path
            d="M4 12v7h16v-7m-8-9v12m0-12l-4 4m4-4l4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="square"
          />
        );
      case 'refresh':
        return (
          <path
            d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="square"
          />
        );
      case 'plus':
        return (
          <path
            d="M12 5v14m-7-7h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
          />
        );
      case 'scale':
        return (
          <path
            d="M12 3v18M5 6l7-2 7 2M2 13l3-7 3 7a3 3 0 01-6 0zm14 0l3-7 3 7a3 3 0 01-6 0z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="square"
          />
        );
      case 'leaf':
        return (
          <path
            d="M11 20A7 7 0 014 13C4 7 12 3 20 3c0 8-4 16-11 16zm-7-7c7 0 11-4 11-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="square"
          />
        );
      default:
        return null;
    }
  };

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 24 24"
      className={`inline-block flex-shrink-0 ${className}`}
      aria-hidden="true"
    >
      {renderPath()}
    </svg>
  );
};

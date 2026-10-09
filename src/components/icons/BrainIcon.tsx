import React from 'react';

interface BrainIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Standard Brain Icon styled to match GitHub Primer Octicons.
 * Scalable vector with currentColor stroke and fill.
 */
export const BrainIcon: React.FC<BrainIconProps> = ({
  size = 16,
  className,
  style,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {/* Left hemisphere */}
      <path d="M9.5 2A4.5 4.5 0 0 0 5 6.5a4.4 4.4 0 0 0 .5 2 4.5 4.5 0 0 0-2.5 4 4.5 4.5 0 0 0 3 4.24V17a4 4 0 0 0 4 4h.5" />
      {/* Right hemisphere */}
      <path d="M14.5 2A4.5 4.5 0 0 1 19 6.5a4.4 4.4 0 0 1-.5 2 4.5 4.5 0 0 1 2.5 4 4.5 4.5 0 0 1-3 4.24V17a4 4 0 0 1-4 4h-.5" />
      {/* Central division & cerebral sulci */}
      <path d="M12 2v19" />
      <path d="M5 12.5a3.5 3.5 0 0 1 3.5-3.5H12" />
      <path d="M19 12.5a3.5 3.5 0 0 0-3.5-3.5H12" />
      <path d="M6 16.5a3.5 3.5 0 0 1 3.5-3.5H12" />
      <path d="M18 16.5a3.5 3.5 0 0 0-3.5-3.5H12" />
    </svg>
  );
};

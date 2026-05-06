import React from 'react';

const ZelligePattern = ({ opacity = 0.05, className }) => (
  <svg
    width="100%"
    height="100%"
    className={className}
    style={{ opacity }}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern
        id="zellige"
        x="0"
        y="0"
        width="100"
        height="100"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M50 0L100 50L50 100L0 50Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M0 0L20 20M80 80L100 100M100 0L80 20M20 80L0 100" stroke="currentColor" strokeWidth="1" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#zellige)" />
  </svg>
);

export default ZelligePattern;

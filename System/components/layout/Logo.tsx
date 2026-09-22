import React from 'react';

export function Logo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Circle Green Border */}
      <circle cx="100" cy="100" r="94" fill="#064E3B" stroke="#047857" strokeWidth="4" />
      <circle cx="100" cy="100" r="86" fill="#15803D" />
      <circle cx="100" cy="100" r="80" fill="#ECFDF5" />
      
      {/* Inner Green Ring */}
      <circle cx="100" cy="100" r="74" fill="#047857" />
      <circle cx="100" cy="100" r="70" fill="#F0FDF4" />

      {/* Rice Sheaves / Leaves left & right */}
      <path d="M 45 130 C 35 100 45 70 65 60 C 55 80 55 110 65 135 Z" fill="#15803D" />
      <path d="M 155 130 C 165 100 155 70 135 60 C 145 80 145 110 135 135 Z" fill="#15803D" />

      {/* Mountain & Sun Background */}
      <path d="M 60 110 L 100 70 L 140 110 Z" fill="#059669" />
      <path d="M 85 110 L 115 80 L 145 110 Z" fill="#10B981" opacity="0.7" />
      <circle cx="100" cy="65" r="14" fill="#F59E0B" />

      {/* River / Water Stream */}
      <path d="M 100 90 C 85 110 115 130 100 150 C 90 130 110 110 100 90 Z" fill="#0284C7" />

      {/* Book & Gear Icon / Agriculture Symbol */}
      <path d="M 70 145 Q 100 135 100 148 Q 100 135 130 145 L 130 158 Q 100 148 100 160 Q 100 148 70 158 Z" fill="#047857" />

      {/* Top Banner Text Curve */}
      <path id="textArcTop" d="M 25 100 A 75 75 0 0 1 175 100" fill="none" />
      <text fill="#FFFFFF" fontSize="10.5" fontWeight="bold" letterSpacing="0.8">
        <textPath href="#textArcTop" startOffset="50%" textAnchor="middle">
          NANGURISAN LAYA FARMERS IRRIGATORS ASSOC.
        </textPath>
      </text>

      {/* Bottom Banner Text Curve */}
      <path id="textArcBottom" d="M 175 100 A 75 75 0 0 1 25 100" fill="none" />
      <text fill="#FFFFFF" fontSize="11" fontWeight="bold" letterSpacing="1">
        <textPath href="#textArcBottom" startOffset="50%" textAnchor="middle">
          INC. • EST. 2023 • IARMS
        </textPath>
      </text>
    </svg>
  );
}

export default Logo;

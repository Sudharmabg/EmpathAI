import React from 'react'

/**
 * Lightweight inline SVG icon set for the Study Buddy Tools UI.
 * Kept dependency-free (no lucide-react in package.json) so nothing
 * new needs to be installed — just drop this file in and import.
 */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const BookOpenIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 6.5c-1.6-1.3-3.7-2-6.5-2C4.7 4.5 4 5.2 4 6v11.5c0 .8.7 1.3 1.5 1.2 2.4-.3 4.3.3 6.5 2 2.2-1.7 4.1-2.3 6.5-2 .8.1 1.5-.4 1.5-1.2V6c0-.8-.7-1.5-1.5-1.5-2.8 0-4.9.7-6.5 2Z" />
    <path d="M12 6.5V19" />
  </svg>
)

export const LayersIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="M3 12l9 5 9-5" />
    <path d="M3 16l9 5 9-5" />
  </svg>
)

export const BrainIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M9.5 4a2.5 2.5 0 0 0-2.5 2.5v.2A2.5 2.5 0 0 0 5 9v1a2.5 2.5 0 0 0-1 2v.5A2.5 2.5 0 0 0 6.3 15a3 3 0 0 0 2.9 3.5H10V6.2A2.2 2.2 0 0 0 9.5 4Z" />
    <path d="M14.5 4a2.5 2.5 0 0 1 2.5 2.5v.2A2.5 2.5 0 0 1 19 9v1a2.5 2.5 0 0 1 1 2v.5a2.5 2.5 0 0 1-2.3 2.5 3 3 0 0 1-2.9 3.5H14V6.2A2.2 2.2 0 0 1 14.5 4Z" />
    <path d="M10 8.5h1M10 12h1.5M10 15.5h1.5M13 8.5h1M12.5 12H14M12.5 15.5H14" />
  </svg>
)

export const ClipboardCheckIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="5" y="4.5" width="14" height="16" rx="2.2" />
    <path d="M9 4.5V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v.5" />
    <path d="m9 13.2 2 2 4-4.4" />
  </svg>
)

export const ChevronDownIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const SparklesIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M11 2.5 12.6 8l5.4 1.6-5.4 1.6L11 16.7 9.4 11.2 4 9.6l5.4-1.6L11 2.5Z" />
    <path d="M18.5 14.5 19.4 17l2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.5Z" />
  </svg>
)

export const TargetIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="12" cy="12" r="0.6" fill="currentColor" />
  </svg>
)

export const CheckIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M5 13l4 4L19 7" />
  </svg>
)

export const AlertIcon = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 9v4.5" />
    <path d="M12 16.2v.1" />
    <path d="M10.3 4.4 2.9 17.5a1.8 1.8 0 0 0 1.6 2.7h15a1.8 1.8 0 0 0 1.6-2.7L13.7 4.4a1.8 1.8 0 0 0-3.4 0Z" />
  </svg>
)

export const ClockIcon = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)

export const RefreshIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.6" />
    <path d="M4 4v4.6h4.6" />
    <path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.4" />
    <path d="M20 20v-4.6h-4.6" />
  </svg>
)

/** Friendly "open box" illustration used for empty / no-tools states. */
export const OpenBoxIllustration = ({ className = 'w-40 h-40' }) => (
  <svg viewBox="0 0 200 170" className={className}>
    <defs>
      <linearGradient id="obx-lid" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#C8A8E9" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
      <linearGradient id="obx-box" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#EDEBFB" />
        <stop offset="100%" stopColor="#D8CFF5" />
      </linearGradient>
    </defs>

    {/* floating cards */}
    <g opacity="0.95">
      <rect x="34" y="30" width="30" height="24" rx="5" fill="#F3EBFB" stroke="#C8A8E9" strokeWidth="1.5" transform="rotate(-10 49 42)" />
      <circle cx="43" cy="41" r="4.5" fill="#8B5CF6" opacity="0.55" transform="rotate(-10 49 42)" />
      <rect x="82" y="14" width="34" height="26" rx="5" fill="#FFFFFF" stroke="#C8A8E9" strokeWidth="1.5" />
      <path d="M90 24h18M90 30h12" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
      <rect x="132" y="32" width="30" height="26" rx="5" fill="#F3EBFB" stroke="#C8A8E9" strokeWidth="1.5" transform="rotate(9 147 45)" />
      <text x="140" y="50" fontSize="14" fill="#8B5CF6" fontWeight="700" transform="rotate(9 147 45)">?</text>
    </g>

    {/* sparkles */}
    <path d="M24 66l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="#C8A8E9" opacity="0.8" />
    <path d="M172 62l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6 1.6-4Z" fill="#8B5CF6" opacity="0.6" />
    <path d="M158 8l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2 1.2-3Z" fill="#C8A8E9" opacity="0.7" />

    {/* box */}
    <path d="M40 92l60-18 60 18-60 20-60-20Z" fill="url(#obx-lid)" />
    <path d="M40 92v10l60 20v-10L40 92Z" fill="#7C4FE0" />
    <path d="M160 92v10l-60 20v-10l60-20Z" fill="#9B6BEB" />
    <path d="M52 118v34l48 16v-34l-48-16Z" fill="url(#obx-box)" />
    <path d="M148 118v34l-48 16v-34l48-16Z" fill="#E3DBF7" />
  </svg>
)
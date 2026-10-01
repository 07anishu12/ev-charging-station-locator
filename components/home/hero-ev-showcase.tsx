import React from "react";

interface HeroEvShowcaseProps {
  className?: string;
}

export function HeroEvShowcase({ className = "" }: HeroEvShowcaseProps) {
  return (
    <div
      className={`relative w-full max-w-xl mx-auto my-4 select-none overflow-hidden rounded-3xl bg-gradient-to-b from-[#eafbf3]/50 via-white to-transparent p-2 sm:p-4 ${className}`}
      aria-label="Illustration of modern electric car charging at a FastCharger green energy hub"
      role="img"
    >
      <svg
        viewBox="0 0 640 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-sm overflow-visible"
      >
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="300" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#eafbf3" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="carBodyGrad" x1="120" y1="120" x2="380" y2="240" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f3fbf6" />
            <stop offset="100%" stopColor="#dce8e1" />
          </linearGradient>

          <linearGradient id="windowGrad" x1="180" y1="130" x2="300" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1a382c" />
            <stop offset="100%" stopColor="#073b2a" />
          </linearGradient>

          <linearGradient id="chargerGrad" x1="470" y1="90" x2="520" y2="270" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#16c784" />
            <stop offset="50%" stopColor="#0f6b45" />
            <stop offset="100%" stopColor="#073b2a" />
          </linearGradient>

          <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Sky & Soft Horizon Glow */}
        <ellipse cx="320" cy="180" rx="280" ry="120" fill="url(#skyGrad)" />

        {/* Subtle Modern Urban Skyline Backdrop */}
        <g opacity="0.15" fill="#073b2a">
          {/* Distant Skyscrapers */}
          <rect x="60" y="80" width="30" height="140" rx="3" />
          <rect x="100" y="50" width="40" height="170" rx="3" />
          <rect x="150" y="90" width="35" height="130" rx="3" />
          <rect x="195" y="110" width="45" height="110" rx="3" />
          <rect x="360" y="70" width="35" height="150" rx="3" />
          <rect x="405" y="40" width="45" height="180" rx="3" />
          <rect x="460" y="85" width="30" height="135" rx="3" />
          <polygon points="120,30 115,50 125,50" />
          <polygon points="427,20 422,40 432,40" />
        </g>

        {/* Clean Energy Wind Turbines in distant background */}
        <g opacity="0.25" stroke="#16c784" strokeWidth="1.5" strokeLinecap="round">
          {/* Turbine 1 */}
          <line x1="280" y1="120" x2="280" y2="180" />
          <circle cx="280" cy="120" r="2" fill="#16c784" />
          <line x1="280" y1="120" x2="270" y2="105" />
          <line x1="280" y1="120" x2="295" y2="115" />
          <line x1="280" y1="120" x2="275" y2="135" />

          {/* Turbine 2 */}
          <line x1="330" y1="100" x2="330" y2="180" />
          <circle cx="330" cy="100" r="2" fill="#16c784" />
          <line x1="330" y1="100" x2="318" y2="85" />
          <line x1="330" y1="100" x2="348" y2="92" />
          <line x1="330" y1="100" x2="324" y2="116" />
        </g>

        {/* Greenery / Foliage behind car and charger */}
        <g opacity="0.85">
          {/* Left Foliage */}
          <ellipse cx="60" cy="230" rx="40" ry="30" fill="#a7f3d0" />
          <ellipse cx="90" cy="225" rx="35" ry="35" fill="#34d399" />
          <ellipse cx="120" cy="235" rx="30" ry="25" fill="#10b981" />
          {/* Right Foliage behind charger */}
          <ellipse cx="530" cy="220" rx="45" ry="40" fill="#34d399" />
          <ellipse cx="565" cy="230" rx="35" ry="30" fill="#10b981" />
          <ellipse cx="500" cy="235" rx="30" ry="25" fill="#059669" />
        </g>

        {/* Ground Surface / Clean Road */}
        <path
          d="M 20 250 Q 320 255 620 250 L 620 290 Q 320 295 20 290 Z"
          fill="#eafbf3"
        />
        <line x1="40" y1="250" x2="600" y2="250" stroke="#dce8e1" strokeWidth="2" strokeDasharray="8 8" />

        {/* --- ELECTRIC VEHICLE (Car) --- */}
        <g id="ev-car" transform="translate(15, 5)">
          {/* Car Shadow */}
          <ellipse cx="250" cy="248" rx="160" ry="14" fill="#073b2a" opacity="0.12" />

          {/* Aerodynamic Car Body */}
          <path
            d="M 120 215 
               C 120 185, 140 180, 170 170 
               C 195 160, 220 135, 260 130 
               C 320 125, 360 130, 395 165 
               C 420 175, 435 190, 440 210 
               C 445 228, 435 235, 420 235 
               L 135 235 
               C 125 235, 120 228, 120 215 Z"
            fill="url(#carBodyGrad)"
            stroke="#a7f3d0"
            strokeWidth="1.5"
          />

          {/* Cabin Glass / Windows */}
          <path
            d="M 210 170 
               C 225 145, 250 136, 290 134 
               C 340 134, 370 145, 385 170 
               Z"
            fill="url(#windowGrad)"
          />
          {/* Glass Pillar Divider */}
          <line x1="295" y1="135" x2="300" y2="170" stroke="#dce8e1" strokeWidth="2" />

          {/* Modern Headlight / Taillight Sleek Strips */}
          <path
            d="M 425 185 Q 438 192 435 205"
            stroke="#16c784"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#glowGreen)"
          />
          <path
            d="M 122 195 Q 120 205 125 212"
            stroke="#e5484d"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Front EV Charge Port Flap (Glowing green circle when charging) */}
          <circle cx="410" cy="195" r="7" fill="#073b2a" stroke="#16c784" strokeWidth="2" />
          <circle cx="410" cy="195" r="3.5" fill="#16c784" className="animate-ping" style={{ animationDuration: "2s" }} />

          {/* Front Wheel */}
          <g transform="translate(370, 230)">
            <circle cx="0" cy="0" r="26" fill="#10201a" />
            <circle cx="0" cy="0" r="19" fill="#374151" />
            <circle cx="0" cy="0" r="14" fill="#f3fbf6" stroke="#16c784" strokeWidth="2" />
            {/* Aero Spokes */}
            <circle cx="0" cy="0" r="5" fill="#10201a" />
          </g>

          {/* Rear Wheel */}
          <g transform="translate(180, 230)">
            <circle cx="0" cy="0" r="26" fill="#10201a" />
            <circle cx="0" cy="0" r="19" fill="#374151" />
            <circle cx="0" cy="0" r="14" fill="#f3fbf6" stroke="#16c784" strokeWidth="2" />
            <circle cx="0" cy="0" r="5" fill="#10201a" />
          </g>
        </g>

        {/* --- FASTCHARGER CHARGING PILLAR / STATION --- */}
        <g id="charger-post" transform="translate(470, 75)">
          {/* Charger Base & Pillar */}
          <rect x="0" y="20" width="46" height="150" rx="10" fill="url(#chargerGrad)" stroke="#16c784" strokeWidth="1.5" />
          <rect x="-4" y="165" width="54" height="10" rx="3" fill="#073b2a" />

          {/* Digital Screen on Charger */}
          <rect x="8" y="42" width="30" height="38" rx="4" fill="#073b2a" />
          {/* Screen Content: Live Power Status & Lightning Icon */}
          <path
            d="M 24 48 L 19 60 L 25 60 L 22 72 L 31 58 L 25 58 Z"
            fill="#16c784"
            filter="url(#glowGreen)"
          />

          {/* Status Indicator Bar */}
          <rect x="12" y="86" width="22" height="4" rx="2" fill="#16c784" className="animate-pulse" />

          {/* FastCharger Brand Leaf Accent */}
          <circle cx="23" cy="115" r="9" fill="white" opacity="0.2" />
          <text x="23" y="119" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="sans-serif">
            ⚡
          </text>

          {/* Charging Cable Holster / Plug Origin */}
          <rect x="42" y="125" width="8" height="12" rx="2" fill="#10201a" />
        </g>

        {/* --- CHARGING CABLE CONNECTING CHARGER TO CAR --- */}
        <g id="charging-cable">
          {/* Outer Cable Line */}
          <path
            d="M 515 205 
               C 500 240, 460 250, 425 200"
            fill="none"
            stroke="#073b2a"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Inner Glowing Electric Pulse Stream */}
          <path
            d="M 515 205 
               C 500 240, 460 250, 425 200"
            fill="none"
            stroke="#16c784"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="12 18"
            style={{ animation: "electricity-flow 1.5s linear infinite" }}
          />

          {/* Cable Connector Plug inserted into car socket */}
          <rect x="420" y="195" width="8" height="8" rx="2" fill="#16c784" />
        </g>

        {/* Eco Accent: Small Green Leaf floating near charger */}
        <path
          d="M 535 90 C 545 80, 555 90, 550 100 C 540 105, 530 95, 535 90 Z"
          fill="#34d399"
          className="animate-leaf-sway-slow"
        />
      </svg>
    </div>
  );
}

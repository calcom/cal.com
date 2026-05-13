"use client";

import { useEffect, useState } from "react";

export function ChristmasEasterEgg() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ background: "linear-gradient(to bottom, #0a0a2e 0%, #1a1a4e 60%, #0d0d3a 100%)" }}>
      <style>{`
        @keyframes sleighRide {
          from { transform: translateX(110%); }
          to   { transform: translateX(-30%); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }
        @keyframes snowfall {
          0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0.4; }
        }
        @keyframes giftFall {
          0%   { transform: translateY(-80px) rotate(-10deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translateY(60vh) rotate(15deg); opacity: 0.8; }
        }
        .sleigh { animation: sleighRide 4s linear forwards; }
        .gift-1 { animation: giftFall 2.2s ease-in 0.8s both; }
        .gift-2 { animation: giftFall 2.0s ease-in 1.4s both; }
        .gift-3 { animation: giftFall 1.8s ease-in 1.9s both; }
      `}</style>

      {/* Stars */}
      {STARS.map((s, i) => (
        <svg
          key={i}
          className="absolute"
          style={{
            left: s.x,
            top: s.y,
            animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
          width="4"
          height="4"
          viewBox="0 0 4 4">
          <circle cx="2" cy="2" r="2" fill="white" />
        </svg>
      ))}

      {/* Snowflakes */}
      {SNOWFLAKES.map((f, i) => (
        <svg
          key={i}
          className="absolute"
          style={{
            left: f.x,
            top: "-12px",
            animation: `snowfall ${f.dur}s linear ${f.delay}s infinite`,
          }}
          width="8"
          height="8"
          viewBox="0 0 8 8">
          <circle cx="4" cy="4" r="3" fill="white" opacity="0.8" />
        </svg>
      ))}

      {/* Falling gifts (independent of sleigh position) */}
      <div className="gift-1 absolute" style={{ left: "55%" }}>
        <Gift color="#e63946" ribbonColor="#ffd700" />
      </div>
      <div className="gift-2 absolute" style={{ left: "45%" }}>
        <Gift color="#2dc653" ribbonColor="#ff6b6b" />
      </div>
      <div className="gift-3 absolute" style={{ left: "62%" }}>
        <Gift color="#ffd700" ribbonColor="#e63946" />
      </div>

      {/* Sleigh + Santa (animates across screen) */}
      <div className="sleigh absolute" style={{ top: "30%", width: "320px" }}>
        <SleighWithSanta />
      </div>
    </div>
  );
}

function Gift({ color, ribbonColor }: { color: string; ribbonColor: string }) {
  return (
    <svg width="32" height="36" viewBox="0 0 32 36">
      {/* Box */}
      <rect x="2" y="10" width="28" height="24" rx="2" fill={color} />
      {/* Lid */}
      <rect x="0" y="6" width="32" height="7" rx="2" fill={ribbonColor} opacity="0.9" />
      {/* Vertical ribbon */}
      <rect x="13" y="6" width="6" height="28" fill={ribbonColor} />
      {/* Horizontal ribbon */}
      <rect x="0" y="17" width="32" height="6" fill={ribbonColor} />
      {/* Bow left */}
      <ellipse cx="10" cy="6" rx="7" ry="4" fill={ribbonColor} opacity="0.8" />
      {/* Bow right */}
      <ellipse cx="22" cy="6" rx="7" ry="4" fill={ribbonColor} opacity="0.8" />
      {/* Bow center */}
      <circle cx="16" cy="6" r="4" fill={color} />
    </svg>
  );
}

function SleighWithSanta() {
  return (
    <svg width="320" height="120" viewBox="0 0 320 120" fill="none">
      {/* Reindeer traces */}
      <line x1="50" y1="55" x2="10" y2="50" stroke="#8B6914" strokeWidth="1.5" />
      <line x1="50" y1="55" x2="10" y2="60" stroke="#8B6914" strokeWidth="1.5" />

      {/* Reindeer 1 */}
      <Reindeer x={0} y={38} />
      {/* Reindeer 2 */}
      <Reindeer x={20} y={44} />

      {/* Sleigh body */}
      <rect x="80" y="50" width="90" height="45" rx="6" fill="#c0392b" />
      {/* Sleigh front curve */}
      <path d="M80 95 Q70 95 68 80 Q66 65 80 55" fill="#c0392b" />
      {/* Sleigh gold trim */}
      <rect x="80" y="50" width="90" height="6" rx="2" fill="#f39c12" />
      <rect x="80" y="87" width="90" height="4" rx="2" fill="#f39c12" />
      {/* Sleigh runners */}
      <path d="M68 98 Q100 108 170 100" stroke="#7f8c8d" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M72 103 Q105 112 172 105" stroke="#95a5a6" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Santa body */}
      <ellipse cx="145" cy="68" rx="22" ry="24" fill="#c0392b" />
      {/* Santa belt */}
      <rect x="123" y="72" width="44" height="7" rx="2" fill="#2c3e50" />
      <rect x="139" y="72" width="12" height="7" fill="#f39c12" />
      {/* Santa face */}
      <circle cx="145" cy="44" r="14" fill="#f4a261" />
      {/* Santa beard */}
      <ellipse cx="145" cy="54" rx="12" ry="8" fill="white" />
      {/* Santa mustache */}
      <ellipse cx="141" cy="50" rx="5" ry="3" fill="white" />
      <ellipse cx="149" cy="50" rx="5" ry="3" fill="white" />
      {/* Santa eyes */}
      <circle cx="140" cy="42" r="2" fill="#2c3e50" />
      <circle cx="150" cy="42" r="2" fill="#2c3e50" />
      {/* Santa nose */}
      <circle cx="145" cy="47" r="2.5" fill="#e74c3c" />
      {/* Santa hat */}
      <path d="M132 38 L145 10 L158 38 Z" fill="#c0392b" />
      <rect x="130" y="36" width="30" height="7" rx="3" fill="white" />
      <circle cx="145" cy="12" r="4" fill="white" />
      {/* Santa arm holding reins */}
      <path d="M124 65 Q105 58 50 55" stroke="#c0392b" strokeWidth="6" strokeLinecap="round" fill="none" />
      {/* Gifts in sleigh */}
      <rect x="88" y="52" width="16" height="14" rx="1" fill="#27ae60" />
      <rect x="88" y="52" width="16" height="4" fill="#f39c12" />
      <rect x="94" y="52" width="4" height="14" fill="#f39c12" />
      <rect x="107" y="55" width="14" height="12" rx="1" fill="#8e44ad" />
      <rect x="107" y="55" width="14" height="4" fill="#ffd700" />
      <rect x="113" y="55" width="4" height="12" fill="#ffd700" />
    </svg>
  );
}

function Reindeer({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Body */}
      <ellipse cx="18" cy="12" rx="12" ry="7" fill="#8B6914" />
      {/* Head */}
      <circle cx="32" cy="8" r="6" fill="#8B6914" />
      {/* Nose */}
      <circle cx="37" cy="8" r="2.5" fill="#e74c3c" />
      {/* Antlers */}
      <line x1="30" y1="3" x2="26" y2="-4" stroke="#5D4037" strokeWidth="2" />
      <line x1="26" y1="-4" x2="22" y2="-7" stroke="#5D4037" strokeWidth="1.5" />
      <line x1="26" y1="-4" x2="29" y2="-8" stroke="#5D4037" strokeWidth="1.5" />
      <line x1="33" y1="2" x2="36" y2="-5" stroke="#5D4037" strokeWidth="2" />
      <line x1="36" y1="-5" x2="33" y2="-9" stroke="#5D4037" strokeWidth="1.5" />
      <line x1="36" y1="-5" x2="39" y2="-9" stroke="#5D4037" strokeWidth="1.5" />
      {/* Legs */}
      <line x1="10" y1="18" x2="8" y2="28" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="16" y1="18" x2="14" y2="28" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="22" y1="18" x2="21" y2="28" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="28" y1="17" x2="27" y2="27" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
}

const STARS = [
  { x: "5%", y: "8%", dur: 2.1, delay: 0 },
  { x: "12%", y: "15%", dur: 3.0, delay: 0.5 },
  { x: "20%", y: "5%", dur: 2.5, delay: 0.2 },
  { x: "30%", y: "12%", dur: 1.8, delay: 0.8 },
  { x: "40%", y: "7%", dur: 2.8, delay: 0.3 },
  { x: "50%", y: "18%", dur: 2.2, delay: 1.0 },
  { x: "60%", y: "4%", dur: 3.2, delay: 0.6 },
  { x: "68%", y: "14%", dur: 1.9, delay: 0.1 },
  { x: "75%", y: "9%", dur: 2.6, delay: 0.7 },
  { x: "82%", y: "20%", dur: 2.0, delay: 0.4 },
  { x: "88%", y: "6%", dur: 2.9, delay: 0.9 },
  { x: "93%", y: "16%", dur: 1.7, delay: 0.2 },
  { x: "8%", y: "25%", dur: 2.3, delay: 1.1 },
  { x: "35%", y: "22%", dur: 2.7, delay: 0.5 },
  { x: "55%", y: "26%", dur: 1.6, delay: 0.8 },
  { x: "72%", y: "28%", dur: 3.1, delay: 0.3 },
  { x: "90%", y: "24%", dur: 2.4, delay: 0.6 },
  { x: "25%", y: "30%", dur: 2.0, delay: 1.2 },
  { x: "48%", y: "32%", dur: 2.8, delay: 0.4 },
  { x: "78%", y: "35%", dur: 1.9, delay: 0.7 },
];

const SNOWFLAKES = [
  { x: "10%", dur: 6, delay: 0 },
  { x: "22%", dur: 7.5, delay: 0.4 },
  { x: "33%", dur: 5.5, delay: 1.0 },
  { x: "45%", dur: 8, delay: 0.2 },
  { x: "57%", dur: 6.5, delay: 0.7 },
  { x: "68%", dur: 7, delay: 1.3 },
  { x: "79%", dur: 5, delay: 0.5 },
  { x: "88%", dur: 6.8, delay: 0.9 },
  { x: "16%", dur: 7.2, delay: 1.5 },
  { x: "92%", dur: 5.8, delay: 0.3 },
];

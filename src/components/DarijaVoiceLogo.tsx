import React, { useState } from 'react';
import { Sparkles, Download, Check, Copy, ExternalLink, ShieldCheck, Volume2 } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showText?: boolean;
  isLight?: boolean;
  onClick?: () => void;
  interactive?: boolean;
}

/**
 * DarijaVoice Official Emblem - Clean, high-end Moroccan AI Voice Brand Mark
 * Combines:
 * 1. Deep Royal Navy Obsidian & Lustrous 18k Moroccan Gold
 * 2. Harmonic AI Soundwaves & Studio Voice Microphone
 * 3. Iconic Moroccan 5-Pointed Star & Moorish Horseshoe Arch Contour
 * Ultra-sharp at any size (16px to 512px) without clutter or cramped text.
 */
export const DarijaVoiceLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  isLight = false,
  onClick,
  interactive = false,
}) => {
  const sizeMap = {
    xs: { box: 'w-7 h-7', iconPx: 28, text: 'text-xs', subText: 'text-[9px]' },
    sm: { box: 'w-8 h-8', iconPx: 32, text: 'text-sm', subText: 'text-[10px]' },
    md: { box: 'w-10 h-10', iconPx: 40, text: 'text-base', subText: 'text-[11px]' },
    lg: { box: 'w-14 h-14', iconPx: 56, text: 'text-xl', subText: 'text-xs' },
    xl: { box: 'w-20 h-20', iconPx: 80, text: 'text-2xl', subText: 'text-sm' },
    '2xl': { box: 'w-28 h-28', iconPx: 112, text: 'text-3xl', subText: 'text-base' },
  };

  const currentSize = sizeMap[size];

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 select-none ${interactive ? 'cursor-pointer group' : ''} ${className}`}
      title="صوت الدارجة - الهوية الرسمية"
    >
      {/* Precision Icon Mark */}
      <div
        className={`${currentSize.box} relative shrink-0 rounded-2xl p-[1.5px] shadow-md shadow-amber-500/10 transition-all duration-300 ${
          interactive ? 'group-hover:scale-105 group-hover:shadow-amber-500/25' : ''
        }`}
        style={{
          background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 45%, #92400e 80%, #f59e0b 100%)',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full rounded-[14px] overflow-hidden"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Deep Royal Night Navy Gradient */}
            <linearGradient id="dvBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a1226" />
              <stop offset="45%" stopColor="#080d1a" />
              <stop offset="100%" stopColor="#020409" />
            </linearGradient>

            {/* Radiant Moroccan Amber Gold Gradient */}
            <linearGradient id="dvGoldMain" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="65%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Light Gold Highlights */}
            <linearGradient id="dvGoldGleam" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#fef9c3" />
            </linearGradient>

            {/* Radial Core Glow */}
            <radialGradient id="dvCoreGlow" cx="50%" cy="52%" r="48%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" />
              <stop offset="50%" stopColor="#d97706" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>

            {/* Soft Ambient Shadow Filter */}
            <filter id="dvSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Card */}
          <rect width="100" height="100" rx="14" fill="url(#dvBgGrad)" />

          {/* Golden Ambient Radial Aura */}
          <rect width="100" height="100" fill="url(#dvCoreGlow)" />

          {/* Geometric Moroccan Frame Accent (Subtle hairline contour) */}
          <rect
            x="3.5"
            y="3.5"
            width="93"
            height="93"
            rx="11"
            fill="none"
            stroke="url(#dvGoldMain)"
            strokeWidth="0.8"
            strokeOpacity="0.4"
          />

          {/* Subtle Moorish Horseshoe Arch Contour framing the vocal core */}
          <path
            d="M 22 78 C 22 42, 34 26, 50 26 C 66 26, 78 42, 78 78"
            fill="none"
            stroke="url(#dvGoldMain)"
            strokeWidth="1.2"
            strokeOpacity="0.25"
            strokeDasharray="2 2"
          />

          {/* Top Apex: Moroccan 5-Pointed Star (Kingdom of Morocco National Emblem) */}
          <polygon
            points="50,13 52.4,19.2 59,19.5 53.6,23.5 55.7,29.8 50,26 44.3,29.8 46.4,23.5 41,19.5 47.6,19.2"
            fill="url(#dvGoldGleam)"
            filter="url(#dvSoftGlow)"
          />

          {/* Acoustic Voice Wave Bars - Left Wing */}
          {/* Wave 1 (Outer left) */}
          <line
            x1="26"
            y1="49"
            x2="26"
            y2="61"
            stroke="url(#dvGoldMain)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
          {/* Wave 2 (Mid-left) */}
          <line
            x1="33"
            y1="42"
            x2="33"
            y2="68"
            stroke="url(#dvGoldMain)"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeOpacity="0.9"
          />
          {/* Wave 3 (Inner-left) */}
          <line
            x1="40"
            y1="36"
            x2="40"
            y2="74"
            stroke="url(#dvGoldGleam)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Acoustic Voice Wave Bars - Right Wing (Symmetric & Harmonious) */}
          {/* Wave 3 (Inner-right) */}
          <line
            x1="60"
            y1="36"
            x2="60"
            y2="74"
            stroke="url(#dvGoldGleam)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Wave 2 (Mid-right) */}
          <line
            x1="67"
            y1="42"
            x2="67"
            y2="68"
            stroke="url(#dvGoldMain)"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeOpacity="0.9"
          />
          {/* Wave 1 (Outer-right) */}
          <line
            x1="74"
            y1="49"
            x2="74"
            y2="61"
            stroke="url(#dvGoldMain)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />

          {/* Central Modern Studio Microphone Capsule */}
          {/* Mic Capsule Body */}
          <rect
            x="46"
            y="37"
            width="8"
            height="18"
            rx="4"
            fill="url(#dvGoldGleam)"
            filter="url(#dvSoftGlow)"
          />
          {/* Grille Acoustic Cuts */}
          <line x1="47.5" y1="42" x2="52.5" y2="42" stroke="#78350f" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="47.5" y1="46" x2="52.5" y2="46" stroke="#78350f" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="47.5" y1="50" x2="52.5" y2="50" stroke="#78350f" strokeWidth="0.8" strokeLinecap="round" />

          {/* Mic U-Mount Curved Bracket */}
          <path
            d="M 43 47 C 43 59, 57 59, 57 47"
            fill="none"
            stroke="url(#dvGoldMain)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Mic Base Stem */}
          <line
            x1="50"
            y1="57"
            x2="50"
            y2="67"
            stroke="url(#dvGoldMain)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Mic Pedestal Stand */}
          <path
            d="M 44 68 C 47 66.5, 53 66.5, 56 68"
            fill="none"
            stroke="url(#dvGoldGleam)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Bottom Audio Frequency Baseline Dot Accent */}
          <circle cx="50" cy="85" r="2.2" fill="url(#dvGoldGleam)" filter="url(#dvSoftGlow)" />
          <circle cx="42" cy="85" r="1.4" fill="url(#dvGoldMain)" opacity="0.6" />
          <circle cx="58" cy="85" r="1.4" fill="url(#dvGoldMain)" opacity="0.6" />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col justify-center text-right leading-none">
          <div className="flex items-center gap-2">
            <span
              className={`font-black tracking-tight ${currentSize.text} ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
              style={{ fontFamily: "'Cairo', sans-serif" }}
            >
              صوت الدارجة
            </span>

            {/* Moroccan AI Badge */}
            <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono tracking-wider">
              AI
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            <span className={`font-bold tracking-widest uppercase font-mono ${currentSize.subText} ${
              isLight ? 'text-amber-700/80' : 'text-amber-400/90'
            }`}>
              DARIJA VOICES
            </span>
            <span className="text-[10px] opacity-40">•</span>
            <span className={`text-[10px] font-medium hidden sm:inline ${
              isLight ? 'text-slate-500' : 'text-stone-400'
            }`}>
              الذكاء الصوتي المغربي
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Brand Identity Showcase Modal
 * Allows the user to view the logo in different sizes, formats, and download it as SVG or high-res asset
 */
export const BrandShowcaseModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
}> = ({ isOpen, onClose, isLight }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopySvg = () => {
    const svgCode = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="dvBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a1226"/>
      <stop offset="100%" stop-color="#020409"/>
    </linearGradient>
    <linearGradient id="dvGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="14" fill="url(#dvBg)"/>
  <polygon points="50,13 52.4,19.2 59,19.5 53.6,23.5 55.7,29.8 50,26 44.3,29.8 46.4,23.5 41,19.5 47.6,19.2" fill="url(#dvGold)"/>
  <line x1="26" y1="49" x2="26" y2="61" stroke="url(#dvGold)" stroke-width="2.4" stroke-linecap="round"/>
  <line x1="33" y1="42" x2="33" y2="68" stroke="url(#dvGold)" stroke-width="2.8" stroke-linecap="round"/>
  <line x1="40" y1="36" x2="40" y2="74" stroke="url(#dvGold)" stroke-width="3.2" stroke-linecap="round"/>
  <line x1="60" y1="36" x2="60" y2="74" stroke="url(#dvGold)" stroke-width="3.2" stroke-linecap="round"/>
  <line x1="67" y1="42" x2="67" y2="68" stroke="url(#dvGold)" stroke-width="2.8" stroke-linecap="round"/>
  <line x1="74" y1="49" x2="74" y2="61" stroke="url(#dvGold)" stroke-width="2.4" stroke-linecap="round"/>
  <rect x="46" y="37" width="8" height="18" rx="4" fill="url(#dvGold)"/>
  <path d="M 43 47 C 43 59, 57 59, 57 47" fill="none" stroke="url(#dvGold)" stroke-width="2" stroke-linecap="round"/>
  <line x1="50" y1="57" x2="50" y2="67" stroke="url(#dvGold)" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 44 68 C 47 66.5, 53 66.5, 56 68" fill="none" stroke="url(#dvGold)" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="50" cy="85" r="2.2" fill="url(#dvGold)"/>
</svg>`;
    navigator.clipboard.writeText(svgCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadSvg = () => {
    const svgCode = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
  <defs>
    <linearGradient id="dvBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a1226"/>
      <stop offset="45%" stop-color="#080d1a"/>
      <stop offset="100%" stop-color="#020409"/>
    </linearGradient>
    <linearGradient id="dvGoldMain" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="25%" stop-color="#f59e0b"/>
      <stop offset="65%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <linearGradient id="dvGoldGleam" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#fef9c3"/>
    </linearGradient>
    <radialGradient id="dvCoreGlow" cx="50%" cy="52%" r="48%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100" height="100" rx="14" fill="url(#dvBgGrad)"/>
  <rect width="100" height="100" fill="url(#dvCoreGlow)"/>
  <rect x="3.5" y="3.5" width="93" height="93" rx="11" fill="none" stroke="url(#dvGoldMain)" stroke-width="0.8" stroke-opacity="0.4"/>
  <path d="M 22 78 C 22 42, 34 26, 50 26 C 66 26, 78 42, 78 78" fill="none" stroke="url(#dvGoldMain)" stroke-width="1.2" stroke-opacity="0.25" stroke-dasharray="2 2"/>
  <polygon points="50,13 52.4,19.2 59,19.5 53.6,23.5 55.7,29.8 50,26 44.3,29.8 46.4,23.5 41,19.5 47.6,19.2" fill="url(#dvGoldGleam)"/>
  <line x1="26" y1="49" x2="26" y2="61" stroke="url(#dvGoldMain)" stroke-width="2.4" stroke-linecap="round" stroke-opacity="0.75"/>
  <line x1="33" y1="42" x2="33" y2="68" stroke="url(#dvGoldMain)" stroke-width="2.8" stroke-linecap="round" stroke-opacity="0.9"/>
  <line x1="40" y1="36" x2="40" y2="74" stroke="url(#dvGoldGleam)" stroke-width="3.2" stroke-linecap="round"/>
  <line x1="60" y1="36" x2="60" y2="74" stroke="url(#dvGoldGleam)" stroke-width="3.2" stroke-linecap="round"/>
  <line x1="67" y1="42" x2="67" y2="68" stroke="url(#dvGoldMain)" stroke-width="2.8" stroke-linecap="round" stroke-opacity="0.9"/>
  <line x1="74" y1="49" x2="74" y2="61" stroke="url(#dvGoldMain)" stroke-width="2.4" stroke-linecap="round" stroke-opacity="0.75"/>
  <rect x="46" y="37" width="8" height="18" rx="4" fill="url(#dvGoldGleam)"/>
  <line x1="47.5" y1="42" x2="52.5" y2="42" stroke="#78350f" stroke-width="0.8" stroke-linecap="round"/>
  <line x1="47.5" y1="46" x2="52.5" y2="46" stroke="#78350f" stroke-width="0.8" stroke-linecap="round"/>
  <line x1="47.5" y1="50" x2="52.5" y2="50" stroke="#78350f" stroke-width="0.8" stroke-linecap="round"/>
  <path d="M 43 47 C 43 59, 57 59, 57 47" fill="none" stroke="url(#dvGoldMain)" stroke-width="2" stroke-linecap="round"/>
  <line x1="50" y1="57" x2="50" y2="67" stroke="url(#dvGoldMain)" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 44 68 C 47 66.5, 53 66.5, 56 68" fill="none" stroke="url(#dvGoldGleam)" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="50" cy="85" r="2.2" fill="url(#dvGoldGleam)"/>
  <circle cx="42" cy="85" r="1.4" fill="url(#dvGoldMain)" opacity="0.6"/>
  <circle cx="58" cy="85" r="1.4" fill="url(#dvGoldMain)" opacity="0.6"/>
</svg>`;
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'darija-voices-official-logo.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-stone-900 border-stone-800 text-stone-100'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold mb-3 border border-amber-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>الهوية البصرية الرسمية الجديدة</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">شعار «صوت الدارجة» الاحترافي</h2>
          <p className="text-xs text-stone-400 mt-1">
            تصميم أنيق وعصري يجمع بين النبرة المغربية الأصيلة وهندسة الذكاء الاصطناعي الصوتي
          </p>
        </div>

        {/* Big Showcase Box */}
        <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 flex flex-col items-center justify-center gap-4 text-white shadow-inner">
          <DarijaVoiceLogo size="2xl" showText={false} />
          <div className="text-center mt-2">
            <h3 className="text-2xl font-black tracking-tight" style={{ fontFamily: "'Cairo', sans-serif" }}>
              صوت الدارجة
            </h3>
            <p className="text-xs font-mono tracking-widest text-amber-400 mt-1 uppercase">
              DARIJAVOICES • MOROCCO AI
            </p>
          </div>
        </div>

        {/* Design Philosophy Highlights */}
        <div className="grid grid-cols-3 gap-2.5 my-5 text-center">
          <div className={`p-3 rounded-xl border text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-stone-950/60 border-stone-800'}`}>
            <span className="text-lg block mb-1">🇲🇦</span>
            <span className="font-bold block">النجمة المغربية</span>
            <span className="text-[10px] opacity-70">أصالة وهوية وطنية</span>
          </div>
          <div className={`p-3 rounded-xl border text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-stone-950/60 border-stone-800'}`}>
            <span className="text-lg block mb-1">🎙️</span>
            <span className="font-bold block">ميكروفون الاستوديو</span>
            <span className="text-[10px] opacity-70">جودة صوت احترافية</span>
          </div>
          <div className={`p-3 rounded-xl border text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-stone-950/60 border-stone-800'}`}>
            <span className="text-lg block mb-1">🌊</span>
            <span className="font-bold block">موجات التردد الذكية</span>
            <span className="text-[10px] opacity-70">ذكاء اصطناعي صوتي</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={handleDownloadSvg}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تحميل الشعار بصيغة SVG فائقة الدقة</span>
          </button>
          <button
            onClick={handleCopySvg}
            className={`w-full sm:w-auto py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
              isLight ? 'border-slate-200 hover:bg-slate-100' : 'border-stone-800 hover:bg-stone-800'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'تم النسخ!' : 'نسخ كود SVG'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

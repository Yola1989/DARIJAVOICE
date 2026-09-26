import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Sparkles,
  Loader2,
  Languages,
  Wand2,
  Coins,
  ShieldCheck,
  User,
  LogIn,
  LogOut,
  Megaphone,
  CheckCircle,
  AlertCircle,
  Info,
  Flame,
  MessageCircle,
  Lock,
  Sun,
  Moon,
  ArrowLeft,
  MessageSquareQuote,
} from 'lucide-react';
import { VOICES, TONES } from './data/presets';
import { AudioPlayer } from './components/AudioPlayer';
import { VoiceSelector } from './components/VoiceSelector';
import { ToneSelector } from './components/ToneSelector';
import { ArabiziConverterModal } from './components/ArabiziConverterModal';
import { AdScriptGeneratorModal } from './components/AdScriptGeneratorModal';
import { AuthModal } from './components/AuthModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { UpgradeModal } from './components/UpgradeModal';
import { LowBalanceToast } from './components/LowBalanceToast';
import { HistoryList } from './components/HistoryList';
import { ReviewsSection } from './components/ReviewsSection';
import { TTSHistoryItem } from './types';
import { useAuth } from './context/AuthContext';
import { db } from './lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { DarijaVoiceLogo, BrandShowcaseModal } from './components/DarijaVoiceLogo';

export default function App() {
  const { user, userProfile, appSettings, signOut, consumeTokens } = useAuth();

  // Light mode is the default primary mode
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('darija_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('darija_theme', next);
  };

  const isLight = theme === 'light';

  // Synchronize document and body classes to ensure background is 100% unified
  useEffect(() => {
    if (isLight) {
      document.documentElement.classList.remove('dark');
      document.body.className = 'bg-slate-50 text-slate-800 antialiased font-sans min-h-screen overflow-x-hidden selection:bg-amber-500 selection:text-white';
    } else {
      document.documentElement.classList.add('dark');
      document.body.className = 'bg-stone-950 text-stone-100 antialiased font-sans min-h-screen overflow-x-hidden selection:bg-amber-500 selection:text-stone-950';
    }
  }, [isLight]);

  const cleanWhatsAppNumber = (appSettings.contactWhatsApp || appSettings.whatsappNumber || '212600000000').replace(/[^0-9]/g, '');

  const [text, setText] = useState(
    'مرحباً بكم فاستوديو أصوات الدارجة المغربية، اكتب هنا أي نص بغيتي تحولو لتسجيل صوتي طبيعي واحترافي.'
  );
  const [selectedVoice, setSelectedVoice] = useState('salma_ads');
  const [selectedTone, setSelectedTone] = useState('commercial');
  const [optimizeDarija, setOptimizeDarija] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active audio player state
  const [activeAudio, setActiveAudio] = useState<{
    audioUrl: string;
    text: string;
    vocalizedText?: string;
    voiceName: string;
    toneName: string;
  } | null>(null);

  // History state with persistent local storage
  const [history, setHistory] = useState<TTSHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('darija_tts_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Could not parse saved history from localStorage', e);
      return [];
    }
  });

  const saveHistoryList = (newList: TTSHistoryItem[]) => {
    setHistory(newList);
    try {
      // Store up to 10 latest items in localStorage
      localStorage.setItem('darija_tts_history', JSON.stringify(newList.slice(0, 10)));
    } catch (e) {
      console.warn('LocalStorage quota reached when saving history', e);
    }
  };

  // Modals state
  const [isArabiziModalOpen, setIsArabiziModalOpen] = useState(false);
  const [isAdScriptModalOpen, setIsAdScriptModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

  const isAdmin = userProfile?.role === 'admin';
  const isActive = userProfile?.status === 'active' || isAdmin;
  const isFreeTrialUser = !isActive;
  const freeTrialsLeft = userProfile ? userProfile.freeTrialsRemaining : appSettings.freeTrialsDefaultCount;

  const handleGenerateTTS = async (customText?: string, customVoice?: string) => {
    const textToProcess = (customText || text).trim();
    const voiceToUse = customVoice || selectedVoice;

    if (!textToProcess) {
      setError('المرجو كتابة نص بالدارجة أولاً.');
      return;
    }

    // Auth & Permission Checks
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    // Check token / trial balance
    let isTrialRun = false;
    let maxSecondsLimit: number | undefined = undefined;

    if (!isAdmin) {
      if (!isActive) {
        // Pending / Free user
        if (freeTrialsLeft <= 0) {
          setError('لقد استنفدت جميع التجارب المجانية. المرجو تفعيل حسابك للاستمتاع بتوليد الأصوات بدون حدود.');
          setIsUpgradeModalOpen(true);
          return;
        }
        isTrialRun = true;
        maxSecondsLimit = appSettings.freeTrialMaxSeconds || 15; // Cut at 15 seconds for free trial
      } else {
        // Check credit expiration
        if (userProfile?.creditsExpireAt && new Date(userProfile.creditsExpireAt).getTime() < Date.now()) {
          setError('انتهت مدة صلاحية رصيدك. المرجو تجديد شحن باقتك للاستمرار في الاستخدام.');
          setIsUpgradeModalOpen(true);
          return;
        }

        // Active subscriber: check token balance
        const estimatedTokensNeeded = Math.ceil(textToProcess.length / 4);
        if ((userProfile?.tokens || 0) < estimatedTokensNeeded) {
          setError('رصيدك من النقاط (Tokens) غير كافٍ. المرجو شحن رصيدك عبر الواتساب.');
          setIsUpgradeModalOpen(true);
          return;
        }
      }
    }

    setIsLoading(true);
    setError(null);

    const toneObj = TONES.find((t) => t.id === selectedTone);
    const voiceObj = VOICES.find((v) => v.id === voiceToUse);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToProcess,
          voiceId: voiceToUse,
          toneDirective: toneObj?.promptDirective,
          optimizeDarija,
          maxSecondsLimit,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'فشل في توليد الصوت. يرجى التأكد من الاتصال والمحاولة من جديد.');
      }

      // Deduct tokens or decrement free trials
      if (!isAdmin) {
        const tokensToDeduct = Math.max(5, Math.ceil(data.duration * (appSettings.tokensPerSecond || 10)));
        await consumeTokens(tokensToDeduct, isTrialRun);
      }

      const newAudioItem = {
        audioUrl: data.audioDataUrl,
        text: textToProcess,
        vocalizedText: data.vocalizedText,
        voiceName: voiceObj?.name || voiceToUse,
        toneName: toneObj?.name || selectedTone,
      };

      setActiveAudio(newAudioItem);

      // Add to persistent history
      const historyEntry: TTSHistoryItem = {
        id: String(Date.now()),
        text: textToProcess,
        vocalizedText: data.vocalizedText,
        audioUrl: data.audioDataUrl,
        audioBase64: data.audioBase64,
        voice: voiceObj?.name || voiceToUse,
        tone: toneObj?.name || selectedTone,
        timestamp: Date.now(),
        duration: data.duration,
      };

      saveHistoryList([historyEntry, ...history.slice(0, 9)]);

      // Save generation log to Firestore if user is authenticated
      if (user) {
        try {
          addDoc(collection(db, 'generations'), {
            userId: user.uid,
            userEmail: user.email || '',
            text: textToProcess,
            vocalizedText: data.vocalizedText || textToProcess,
            voice: voiceObj?.name || voiceToUse,
            tone: toneObj?.name || selectedTone,
            tokensUsed: isAdmin ? 0 : Math.max(5, Math.ceil(data.duration * (appSettings.tokensPerSecond || 10))),
            isFreeTrial: isTrialRun,
            duration: data.duration,
            createdAt: new Date().toISOString(),
          }).catch((err) => console.warn('Non-blocking generation log notice:', err));
        } catch (logErr) {
          console.warn('Generation log notice:', logErr);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء الاتصال بالخادم.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen font-sans pb-16 transition-colors duration-200 ${
      isLight ? 'bg-slate-50 text-slate-800 selection:bg-amber-500 selection:text-white' : 'bg-stone-950 text-stone-100 selection:bg-amber-500 selection:text-stone-950'
    }`}>
      {/* Top Navbar */}
      <header className={`border-b backdrop-blur-md sticky top-0 z-30 transition-colors duration-200 ${
        isLight ? 'bg-white/95 border-slate-200/80 shadow-xs' : 'bg-stone-900/80 border-stone-800/80'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          {/* Logo & Brand using custom DarijaVoice design */}
          <div 
            onClick={() => setIsBrandModalOpen(true)}
            className="cursor-pointer shrink-0 transition-transform active:scale-95"
            title="انقر لمعاينة وتحميل الشعار الرسمي"
          >
            <DarijaVoiceLogo size="md" isLight={isLight} showText={true} interactive={true} />
          </div>

          {/* Centered Floating Pill Navigation (Competitor Style) */}
          <nav className={`hidden md:flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-bold transition shadow-xs ${
            isLight ? 'bg-slate-100/90 border-slate-200 text-slate-700' : 'bg-stone-950/80 border-stone-800 text-stone-300'
          }`}>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className={`px-3.5 py-1.5 rounded-full transition ${
                isLight ? 'bg-slate-950 text-white font-black' : 'bg-stone-800 text-white font-black'
              }`}
            >
              الرئيسية
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('voices-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-1.5 rounded-full hover:text-amber-500 transition"
            >
              الأصوات
            </button>
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full hover:text-amber-500 transition"
            >
              الأسعار
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('reviews-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-1.5 rounded-full hover:text-amber-500 transition"
            >
              آراء العملاء
            </button>
            <a
              href={`https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent('السلام عليكم، مهتم بمنصة صوت الدارجة المغربية')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-full hover:text-emerald-500 transition flex items-center gap-1"
            >
              <span>تواصل معنا</span>
            </a>
          </nav>

          {/* User Status / Account Controls */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button (Light / Dark) */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition flex items-center justify-center ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                  : 'bg-stone-800 hover:bg-stone-700 text-amber-400 border-stone-700'
              }`}
              title={isLight ? 'التبديل إلى الوضع الليلي' : 'التبديل إلى الوضع النهاري'}
              aria-label="تبديل مظهر المنصة"
            >
              {isLight ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {/* Quick Action Tools */}
            <button
              onClick={() => setIsAdScriptModalOpen(true)}
              className={`hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition ${
                isLight 
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200' 
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5 text-amber-500" />
              <span>صانع الإعلانات</span>
            </button>

            <button
              onClick={() => setIsArabiziModalOpen(true)}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
              }`}
            >
              <Languages className="w-3.5 h-3.5 text-amber-500" />
              <span>العرنسية</span>
            </button>

            {/* Admin Dashboard Access Button - ONLY visible for authenticated Admin */}
            {isAdmin && (
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 text-xs font-black shadow-md shadow-amber-500/20 hover:brightness-110 transition"
                title="لوحة تحكم المدير"
              >
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">لوحة المدير</span>
                <span className="sm:hidden">Admin</span>
                <span className="bg-stone-950 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-md font-mono">LIVE</span>
              </button>
            )}

            {/* Auth / Profile State */}
            {user ? (
              <div className={`flex items-center gap-1.5 border p-1 rounded-2xl ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-stone-900 border-stone-800'
              }`}>
                {/* Tokens Badge */}
                <button
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold font-mono transition ${
                    isLight 
                      ? 'bg-white border-amber-300 text-amber-900 shadow-xs' 
                      : 'bg-stone-950 border-amber-500/30 text-amber-400 hover:border-amber-400'
                  }`}
                  title="الرصيد المتاح من النقاط"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {isAdmin ? 'VIP ∞' : isActive ? `${userProfile?.tokens || 0} نقطة` : `تجربة (${freeTrialsLeft})`}
                  </span>
                </button>

                {/* Upgrade Button if pending */}
                {!isActive && !isAdmin && (
                  <button
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs transition shadow-xs"
                  >
                    تفعيل
                  </button>
                )}

                {/* Logout */}
                <button
                  onClick={() => signOut()}
                  className={`p-1.5 rounded-lg transition ${
                    isLight ? 'text-slate-500 hover:text-rose-600 hover:bg-slate-200' : 'text-stone-400 hover:text-rose-400 hover:bg-stone-800'
                  }`}
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-xs shadow-sm transition ${
                  isLight 
                    ? 'bg-slate-950 hover:bg-slate-800 text-white' 
                    : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>تسجيل الدخول</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 md:pt-10 space-y-10">
        
        {/* Competitor Style Hero Section */}
        <section className="text-center space-y-6 pt-2 pb-4">
          {/* Centered DarijaVoice Custom Emblem */}
          <div className="flex justify-center">
            <DarijaVoiceLogo size="xl" showText={false} isLight={isLight} />
          </div>

          {/* Main Headline (Competitor wording & style) */}
          <div className="space-y-3 max-w-3xl mx-auto">
            <h2 className={`text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.25] ${
              isLight ? 'text-slate-950' : 'text-white'
            }`}>
              أنشئ أصواتًا واقعية بمختلف لهجات الدارجة المغربية.
            </h2>
            <p className={`text-sm sm:text-base max-w-xl mx-auto leading-relaxed ${
              isLight ? 'text-slate-600' : 'text-stone-400'
            }`}>
              تقنية ذكاء اصطناعي مغربية مخصصة لتحويل نصوصك إلى صوت ناطق بلكنات محلية دقيقة، جاهزة لحملاتك الإعلانية ومحتواك على السوشيال ميديا.
            </p>
          </div>

          {/* Primary Action Button (Competitor Style Rounded Pill) */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('darija-text-input');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.focus();
                }
              }}
              className={`px-7 py-3 rounded-full font-black text-sm flex items-center gap-2.5 transition-all shadow-md active:scale-95 ${
                isLight 
                  ? 'bg-slate-950 hover:bg-slate-800 text-white' 
                  : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
              }`}
            >
              <span>ابدأ مجاناً</span>
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(true)}
              className={`px-6 py-3 rounded-full font-bold text-sm border transition ${
                isLight 
                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' 
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-200 border-stone-800'
              }`}
            >
              عرض باقات الأسعار
            </button>
          </div>

          {/* Section Subhead (Competitor Style) */}
          <div className="pt-6 border-t border-slate-200/60 dark:border-stone-800/80 max-w-2xl mx-auto space-y-1">
            <h3 className={`text-base sm:text-lg font-black ${isLight ? 'text-slate-900' : 'text-stone-100'}`}>
              أصوات واقعية وعالية الجودة
            </h3>
            <p className={`text-xs sm:text-sm ${isLight ? 'text-slate-500' : 'text-stone-400'}`}>
              اختر من بين مجموعة واسعة من الأصوات المغربية المتنوعة التي تناسب جميع أنواع المحتوى الإعلاني والتجاري.
            </p>
          </div>
        </section>

        {/* Account Status / Free Trial Alert Banner */}
        {user && !isActive && !isAdmin && (
          <div className={`border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs ${
            isLight 
              ? 'bg-amber-50/90 border-amber-200/80 text-amber-950' 
              : 'bg-gradient-to-r from-amber-950/60 via-stone-900 to-amber-950/40 border-amber-500/40'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-300'}`}>
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-right">
                <h3 className={`text-xs sm:text-sm font-bold ${isLight ? 'text-amber-900' : 'text-amber-200'}`}>
                  أنت الآن في وضع التجربة المجانية (لديك {freeTrialsLeft} تجارب متبقية بحد أقصى {appSettings.freeTrialMaxSeconds} ثواني لكل مقطع)
                </h3>
                <p className={`text-[11px] ${isLight ? 'text-amber-800/80' : 'text-stone-400'}`}>
                  لتفعيل حسابك بشكل دائم والاستمتاع بتوليد غير محدود لجميع الأصوات والإعلانات، تواصل معنا عبر الواتساب.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4" />
              <span>تفعيل الاشتراك وشحن النقاط</span>
            </button>
          </div>
        )}

        {/* Input & TTS Controls Card */}
        <div id="studio-section" className={`rounded-3xl p-5 md:p-6 border space-y-5 transition-all ${
          isLight 
            ? 'bg-white border-slate-200/90 shadow-sm' 
            : 'bg-stone-900/70 border-stone-800 shadow-xl'
        }`}>
          {/* Text Area Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="darija-text-input" className={`text-sm font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-stone-200'}`}>
              <Wand2 className="w-4 h-4 text-amber-500" />
              <span>النص المراد تحويله إلى صوت بالدارجة المغربية:</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdScriptModalOpen(true)}
                className={`text-xs font-bold px-3 py-1 rounded-lg border flex items-center gap-1 transition ${
                  isLight 
                    ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200' 
                    : 'text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border-amber-500/30'
                }`}
              >
                <Flame className="w-3 h-3 text-amber-500 fill-current" />
                <span>صياغة نص إعلاني</span>
              </button>

              <button
                type="button"
                onClick={() => setText('')}
                className={`text-xs transition px-1 ${isLight ? 'text-slate-400 hover:text-rose-600' : 'text-stone-500 hover:text-rose-400'}`}
              >
                مسح النص
              </button>
            </div>
          </div>

          {/* Text Input Area */}
          <div className="relative">
            <textarea
              id="darija-text-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اكتب هنا أي نص بالدارجة المغربية..."
              rows={4}
              maxLength={1500}
              className={`w-full rounded-2xl p-4 text-base md:text-lg leading-relaxed font-sans resize-y transition border focus:outline-none focus:ring-2 focus:ring-amber-500/20 ${
                isLight 
                  ? 'bg-slate-50 border-slate-200 focus:border-amber-500 focus:bg-white text-slate-900 placeholder-slate-400' 
                  : 'bg-stone-950/80 border-stone-800 focus:border-amber-500 text-stone-100 placeholder-stone-600'
              }`}
            />
            <div className={`flex justify-between items-center mt-1 px-1 text-xs ${isLight ? 'text-slate-500' : 'text-stone-500'}`}>
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-amber-500" />
                يدعم اللهجة المغربية بمختلف تعبيراتها ونصوص الإعلانات والعرنسية (Franco-Arabe)
              </span>
              <span>{text.length} / 1500 حرف</span>
            </div>
          </div>

          {/* Voice Selector */}
          <div id="voices-section">
            <VoiceSelector
              voices={VOICES}
              selectedVoice={selectedVoice}
              onSelectVoice={setSelectedVoice}
              isUserActive={isActive}
              onRequireUpgrade={() => setIsUpgradeModalOpen(true)}
              isLight={isLight}
            />
          </div>

          {/* Tone Selector */}
          <ToneSelector
            tones={TONES}
            selectedTone={selectedTone}
            onSelectTone={setSelectedTone}
            isLight={isLight}
          />

          {/* Dialect Optimization Toggle */}
          <div className={`flex items-center justify-between p-3 rounded-2xl border ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-stone-950/50 border-stone-800/80 text-stone-200'
          }`}>
            <div className="text-right">
              <span className={`text-xs font-bold block ${isLight ? 'text-slate-800' : 'text-stone-200'}`}>
                تحسين النطق المغربي والإعلاني تلقائياً
              </span>
              <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-stone-400'}`}>
                ضبط مخارج الحروف والتسكين لتبدو طبيعية واحترافية
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={optimizeDarija}
                onChange={(e) => setOptimizeDarija(e.target.checked)}
                className="sr-only peer"
              />
              <div className={`w-10 h-5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 ${
                isLight ? 'bg-slate-200 after:border-slate-300' : 'bg-stone-800 after:border-stone-300'
              }`}></div>
            </label>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-900 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* User Account / Free Trial Status Info */}
          {!user ? (
            <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
              isLight ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-amber-950/20 border-amber-500/20 text-amber-300/90'
            }`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>جرّب أصوات الدارجة المغربية مجاناً: <strong>2 تجارب مجانية (حتى 15 ثانية لكل تجربة)</strong> بعد تسجيل الدخول.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="font-bold text-[11px] underline hover:text-amber-600 shrink-0"
              >
                تسجيل الدخول بالجمايل
              </button>
            </div>
          ) : isFreeTrialUser && !isAdmin && (
            <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
              freeTrialsLeft > 0
                ? isLight ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                : isLight ? 'bg-rose-50/70 border-rose-200 text-rose-900' : 'bg-rose-950/20 border-rose-500/20 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  {freeTrialsLeft > 0
                    ? `رصيدك التجريبي: متبقي لديك ${freeTrialsLeft} تجارب مجانية (حتى ${appSettings.freeTrialMaxSeconds || 15} ثانية لكل تجربة)`
                    : 'لقد استنفدت التجارب المجانية (2/2). لتوليد نصوص غير محدودة بدون اقتطاع، فعّل باقتك الآن.'}
                </span>
              </div>
              {freeTrialsLeft <= 0 && (
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="font-bold text-[11px] bg-amber-500 text-stone-950 px-3 py-1 rounded-lg shrink-0 shadow-xs"
                >
                  تفعيل الباقة
                </button>
              )}
            </div>
          )}

          {/* Generate Button */}
          <button
            type="button"
            onClick={() => handleGenerateTTS()}
            disabled={isLoading || !text.trim()}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-black text-base md:text-lg shadow-md shadow-amber-500/20 hover:shadow-amber-500/30 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.99]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري توليد الصوت المغربي بدقة عالية...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5 stroke-[2.5]" />
                <span>تحويل النص إلى صوت بالدارجة</span>
              </>
            )}
          </button>
        </div>

        {/* Audio Player Result */}
        {activeAudio && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AudioPlayer
              audioUrl={activeAudio.audioUrl}
              text={activeAudio.text}
              vocalizedText={activeAudio.vocalizedText}
              voiceName={activeAudio.voiceName}
              toneName={activeAudio.toneName}
              isLight={isLight}
            />
          </div>
        )}

        {/* History List */}
        <HistoryList
          items={history}
          onPlayItem={(item) => {
            setActiveAudio({
              audioUrl: item.audioUrl,
              text: item.text,
              vocalizedText: item.vocalizedText,
              voiceName: item.voice,
              toneName: item.tone,
            });
          }}
          onClearHistory={() => saveHistoryList([])}
          isLight={isLight}
        />

        {/* Customer Reviews & Testimonials Section */}
        <div id="reviews-section" className="pt-6">
          <ReviewsSection isLight={isLight} />
        </div>
      </main>

      {/* Modern Footer matching Competitor Design */}
      <footer className={`mt-16 border-t transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-stone-900/60 border-stone-800 text-stone-400'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
          {/* Logo & description */}
          <div 
            onClick={() => setIsBrandModalOpen(true)}
            className="flex items-center gap-3 cursor-pointer group"
            title="انقر لمعاينة وتحميل الشعار الرسمي"
          >
            <DarijaVoiceLogo size="md" showText={false} isLight={isLight} interactive={true} />
            <div>
              <span className={`font-black text-sm block group-hover:text-amber-500 transition ${isLight ? 'text-slate-900' : 'text-white'}`}>صوت الدارجة (DARIJAVOICES)</span>
              <p className="text-xs opacity-75">أول منصة ذكاء اصطناعي مغربية متخصصة في التعليق الصوتي الواقعي بالدارجة (انقر لتفاصيل الشعار)</p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center items-center gap-4 text-xs font-semibold">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hover:text-amber-500 transition"
            >
              الرئيسية
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('voices-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-amber-500 transition"
            >
              الأصوات
            </button>
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="hover:text-amber-500 transition"
            >
              باقات الأسعار
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('reviews-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-amber-500 transition"
            >
              آراء العملاء
            </button>
            <a
              href={`https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent('السلام عليكم، مهتم بمنصة صوت الدارجة المغربية')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:text-emerald-400 font-bold transition flex items-center gap-1"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>تواصل عبر واتساب</span>
            </a>
          </div>

          {/* Copyright */}
          <div className="text-xs opacity-60 font-mono" dir="ltr">
            © {new Date().getFullYear()} DarijaVoices. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <AdminDashboardModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />

      {/* Low Token Balance Toast Alert */}
      <LowBalanceToast
        tokens={userProfile?.tokens ?? 0}
        threshold={50}
        isOpen={Boolean(user && userProfile && userProfile.status === 'active' && userProfile.role !== 'admin')}
        onUpgradeClick={() => setIsUpgradeModalOpen(true)}
      />

      <ArabiziConverterModal
        isOpen={isArabiziModalOpen}
        onClose={() => setIsArabiziModalOpen(false)}
        onApplyText={(convertedText) => {
          setText(convertedText);
          handleGenerateTTS(convertedText);
        }}
      />

      <AdScriptGeneratorModal
        isOpen={isAdScriptModalOpen}
        onClose={() => setIsAdScriptModalOpen(false)}
        onApplyScript={(scriptText, recommendedVoice) => {
          setText(scriptText);
          if (recommendedVoice) {
            setSelectedVoice(recommendedVoice);
          }
          handleGenerateTTS(scriptText, recommendedVoice);
        }}
      />

      <BrandShowcaseModal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        isLight={isLight}
      />
    </div>
  );
}

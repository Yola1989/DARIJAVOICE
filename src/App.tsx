import React, { useState } from 'react';
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
  Crown,
} from 'lucide-react';
import { VOICES, TONES, PRESET_PHRASES } from './data/presets';
import { AudioPlayer } from './components/AudioPlayer';
import { VoiceSelector } from './components/VoiceSelector';
import { ToneSelector } from './components/ToneSelector';
import { PresetSelector } from './components/PresetSelector';
import { ArabiziConverterModal } from './components/ArabiziConverterModal';
import { AdScriptGeneratorModal } from './components/AdScriptGeneratorModal';
import { AuthModal } from './components/AuthModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { UpgradeModal } from './components/UpgradeModal';
import { HistoryList } from './components/HistoryList';
import { ReviewsSection } from './components/ReviewsSection';
import { TTSHistoryItem, CustomerReview } from './types';
import { DEFAULT_REVIEWS } from './data/presets';
import { useAuth, isUserAdminEmail } from './context/AuthContext';
import { db } from './lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function App() {
  const { user, userProfile, appSettings, signOut, consumeTokens } = useAuth();

  const [text, setText] = useState(
    'واش كتقلبي على الهمزة وعطر يخلي ريحتك فايحة طول النهار؟ جبنا ليك هاد البرودوي الحصري بأحسن ثمن فالمغرب! الكمية جد محدودة والتوصيل فابور حتال باب دارك!'
  );
  const [selectedVoice, setSelectedVoice] = useState('salma_ads');
  const [selectedTone, setSelectedTone] = useState('commercial');
  const [optimizeDarija, setOptimizeDarija] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<CustomerReview[]>(DEFAULT_REVIEWS);

  // Active audio player state


  // Active audio player state
  const [activeAudio, setActiveAudio] = useState<{
    audioUrl: string;
    text: string;
    vocalizedText?: string;
    voiceName: string;
    toneName: string;
  } | null>(null);

  // History state
  const [history, setHistory] = useState<TTSHistoryItem[]>([]);

  // Modals state
  const [isArabiziModalOpen, setIsArabiziModalOpen] = useState(false);
  const [isAdScriptModalOpen, setIsAdScriptModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const isAdmin = userProfile?.role === 'admin' || isUserAdminEmail(user?.email);
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
        maxSecondsLimit = appSettings.freeTrialMaxSeconds || 5; // Cut at 5 seconds for free trial
      } else {
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

      // Add to history
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

      setHistory((prev) => [historyEntry, ...prev.slice(0, 14)]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء الاتصال بالخادم.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (presetText: string) => {
    setText(presetText);
    handleGenerateTTS(presetText);
  };

  // Load and subscribe to reviews
  React.useEffect(() => {
    // 1. Initial fetch from Server API
    fetch('/api/reviews')
      .then((res) => res.json())
      .then((data) => {
        if (data.reviews && Array.isArray(data.reviews) && data.reviews.length > 0) {
          setReviews(data.reviews);
        }
      })
      .catch(() => {});

    // 2. Realtime listener from Firestore
    try {
      const reviewsRef = collection(db, 'reviews');
      const unsubscribe = onSnapshot(
        reviewsRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: CustomerReview[] = [];
            snapshot.forEach((docSnap) => {
              list.push({ id: docSnap.id, ...(docSnap.data() as Omit<CustomerReview, 'id'>) });
            });
            // Merge with default reviews to keep featured reviews visible
            const existingIds = new Set(list.map((r) => r.id));
            const merged = [...list, ...DEFAULT_REVIEWS.filter((d) => !existingIds.has(d.id))];
            setReviews(merged);
          }
        },
        (err) => {
          console.warn('Firestore reviews snapshot error:', err);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore reviews init error:', e);
    }
  }, []);


  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans pb-16 selection:bg-amber-500 selection:text-stone-950">
      {/* Top Navbar */}
      <header className="border-b border-stone-800/80 bg-stone-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex flex-wrap items-center justify-between gap-2.5">
          {/* Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center text-stone-950 font-bold shrink-0">
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base md:text-lg font-black text-white">صوت الدارجة</h1>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-stone-400 hidden xs:block">تحويل نصوص الدارجة المغربية وأصوات الإعلانات</p>
            </div>
          </div>

          {/* User Status / Account Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
            {/* Upgrade & Pricing Plans Button (Always visible) */}
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-stone-950 font-black text-xs shadow-md shadow-amber-500/20 hover:brightness-110 transition border border-amber-300"
            >
              <Crown className="w-3.5 h-3.5 fill-stone-950 shrink-0" />
              <span>الباقات والترقية</span>
            </button>

            {/* Quick Action Tools */}
            <button
              type="button"
              onClick={() => setIsAdScriptModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition"
            >
              <Megaphone className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">صانع الإعلانات</span>
              <span className="sm:hidden">إعلانات</span>
            </button>

            <button
              type="button"
              onClick={() => setIsArabiziModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-200 border border-stone-700 transition"
            >
              <Languages className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>العرنسية</span>
            </button>

            {/* Admin Dashboard Button */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-black shadow-md hover:bg-amber-400 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">لوحة المدير</span>
                <span className="sm:hidden">Admin</span>
              </button>
            )}

            {/* Auth / Profile State */}
            {user ? (
              <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 p-1 rounded-xl sm:rounded-2xl">
                {/* Tokens Badge */}
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-950 border border-amber-500/30 text-amber-400 hover:border-amber-400 text-xs font-bold font-mono transition"
                  title="الرصيد المتاح من النقاط"
                >
                  <Coins className="w-3 h-3 shrink-0" />
                  <span>
                    {isAdmin ? 'VIP ∞' : isActive ? `${userProfile?.tokens || 0} ن` : `تجربة (${freeTrialsLeft})`}
                  </span>
                </button>

                {/* Upgrade Button if pending */}
                {!isActive && !isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="px-2 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs transition shadow-sm"
                  >
                    تفعيل
                  </button>
                )}

                {/* Logout */}
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="p-1.5 text-stone-400 hover:text-rose-400 rounded-lg hover:bg-stone-800 transition"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-black shadow-md transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول / تسجيل</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Account Status / Free Trial Alert Banner */}
        {user && !isActive && !isAdmin && (
          <div className="bg-gradient-to-r from-amber-950/60 via-stone-900 to-amber-950/40 border border-amber-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h3 className="text-xs sm:text-sm font-bold text-amber-200">
                  أنت الآن في وضع التجربة المجانية (لديك {freeTrialsLeft} تجارب متبقية بحد أقصى {appSettings.freeTrialMaxSeconds} ثواني لكل مقطع)
                </h3>
                <p className="text-[11px] text-stone-400">
                  لتفعيل حسابك بشكل دائم والاستمتاع بتوليد غير محدود لجميع الأصوات والإعلانات، تواصل معنا عبر الواتساب.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4" />
              <span>تفعيل الاشتراك وشحن النقاط</span>
            </button>
          </div>
        )}

        {/* Input & TTS Controls Card */}
        <div className="bg-stone-900/70 border border-stone-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-5">
          {/* Text Area Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="darija-text-input" className="text-sm font-bold text-stone-200 flex items-center gap-1.5">
              <Wand2 className="w-4 h-4 text-amber-400" />
              <span>النص المراد تحويله إلى صوت بالدارجة المغربية:</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdScriptModalOpen(true)}
                className="text-xs font-bold text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 px-3 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1 transition"
              >
                <Flame className="w-3 h-3 text-amber-400 fill-current" />
                <span>اقتراح إعلان لمنتوجك بالذكاء الاصطناعي</span>
              </button>

              <button
                type="button"
                onClick={() => setText('')}
                className="text-xs text-stone-500 hover:text-rose-400 transition px-1"
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
              placeholder="اكتب هنا أي نص بالدارجة... مثلاً: عفاك دوز ليا جوج قرعات من داك العطر الواعر والكمية محدودة!"
              rows={4}
              maxLength={1500}
              className="w-full bg-stone-950/80 border border-stone-800 focus:border-amber-500 rounded-2xl p-4 text-base md:text-lg text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 leading-relaxed font-sans resize-y transition"
            />
            <div className="flex justify-between items-center mt-1 px-1 text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-stone-400" />
                يدعم اللهجة المغربية بجميع فروعها ونصوص الإعلانات والعرنسية (Franco-Arabe)
              </span>
              <span>{text.length} / 1500 حرف</span>
            </div>
          </div>

          {/* Voice Selector */}
          <VoiceSelector
            voices={VOICES}
            selectedVoice={selectedVoice}
            onSelectVoice={setSelectedVoice}
            isUserActive={isActive}
            onRequireUpgrade={() => setIsUpgradeModalOpen(true)}
          />

          {/* Tone Selector */}
          <ToneSelector
            tones={TONES}
            selectedTone={selectedTone}
            onSelectTone={setSelectedTone}
          />

          {/* Dialect Optimization Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-950/50 border border-stone-800/80">
            <div className="text-right">
              <span className="text-xs font-bold text-stone-200 block">
                تحسين النطق المغربي والإعلاني تلقائياً (Phonetic Darija Tuning)
              </span>
              <span className="text-[11px] text-stone-400">
                ضبط مخارج الحروف، التسكين، والنبرة التسويقية لتبدو طبيعية واحترافية 100%
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={optimizeDarija}
                onChange={(e) => setOptimizeDarija(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-900 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Generate Button */}
          <button
            type="button"
            onClick={() => handleGenerateTTS()}
            disabled={isLoading || !text.trim()}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-black text-base md:text-lg shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.99]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري توليد الصوت المغربي بدقة عالية...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5 stroke-[2.5]" />
                <span>تحويل النص إلى صوت (Generate Moroccan Voiceover)</span>
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
            />
          </div>
        )}

        {/* Preset Moroccan Phrases & Ad Scripts */}
        <PresetSelector
          presets={PRESET_PHRASES}
          onSelectPreset={handleSelectPreset}
        />

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
          onClearHistory={() => setHistory([])}
        />

        {/* Customer Reviews & Social Proof Section */}
        <ReviewsSection
          reviews={reviews}
          onAddReview={(newRev) => setReviews((prev) => [newRev, ...prev.filter((r) => r.id !== newRev.id)])}
          userEmail={user?.email || undefined}
          userName={userProfile?.displayName || user?.displayName || undefined}
        />
      </main>


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
        onOpenAuth={() => setIsAuthModalOpen(true)}
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
    </div>
  );
}

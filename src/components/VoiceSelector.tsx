import React, { useState, useRef } from 'react';
import { VoiceOption } from '../types';
import { User, Check, Sparkles, Megaphone, Flame, Play, Square, Volume2, Loader2 } from 'lucide-react';

interface VoiceSelectorProps {
  voices: VoiceOption[];
  selectedVoice: string;
  onSelectVoice: (voiceId: string) => void;
  isUserActive: boolean;
  onRequireUpgrade?: () => void;
  isLight?: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voices,
  selectedVoice,
  onSelectVoice,
  isLight = false,
}) => {
  const [filterGender, setFilterGender] = useState<'all' | 'female' | 'male' | 'commercial'>('all');
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Record<string, string>>({});

  const filteredVoices = voices.filter((v) => {
    if (filterGender === 'female') return v.gender === 'female';
    if (filterGender === 'male') return v.gender === 'male';
    if (filterGender === 'commercial') return v.isCommercialSpecialist;
    return true;
  });

  const handlePlaySample = async (e: React.MouseEvent, voice: VoiceOption) => {
    e.stopPropagation(); // Don't trigger outer card click if just sampling
    setSampleError(null);

    // If already playing this voice, stop it
    if (playingVoiceId === voice.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingVoiceId(null);
      return;
    }

    // Stop existing audio if any
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    let audioUrl = audioCacheRef.current[voice.id];

    if (!audioUrl) {
      setLoadingVoiceId(voice.id);
      setPlayingVoiceId(null);

      try {
        // Direct static audio file check first (100% pre-recorded on server disk)
        audioUrl = `/samples/${voice.id}.wav`;
        audioCacheRef.current[voice.id] = audioUrl;
      } catch (err: any) {
        console.error('Error loading voice sample:', err);
        setSampleError(err.message || 'حدث خطأ أثناء تحميل عينة الصوت.');
        setLoadingVoiceId(null);
        return;
      } finally {
        setLoadingVoiceId(null);
      }
    }

    try {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingVoiceId(null);
      };

      audio.onerror = async () => {
        // Fallback to server endpoint if direct static path had issues
        try {
          const res = await fetch(`/api/voice-sample/${voice.id}`);
          const data = await res.json();
          if (data?.audioUrl) {
            audioCacheRef.current[voice.id] = data.audioUrl;
            const fallbackAudio = new Audio(data.audioUrl);
            audioRef.current = fallbackAudio;
            fallbackAudio.onended = () => setPlayingVoiceId(null);
            await fallbackAudio.play();
            setPlayingVoiceId(voice.id);
            return;
          }
        } catch (fallbackErr) {
          console.error('Fallback audio error:', fallbackErr);
        }
        setPlayingVoiceId(null);
        setLoadingVoiceId(null);
        setSampleError('تعذر تشغيل الصوت في المتصفح.');
      };

      await audio.play();
      setPlayingVoiceId(voice.id);
    } catch (err: any) {
      console.error('Error playing voice sample audio:', err);
      setPlayingVoiceId(null);
      setSampleError('تعذر تشغيل الصوت، المرجو إعادة النقر مرة أخرى.');
    }
  };

  return (
    <div className="space-y-3">
      {/* Selector Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className={`text-sm font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-stone-200'}`}>
          <User className="w-4 h-4 text-amber-500" />
          <span>اختر نبرة الصوت وشخصية المعلق المغربي:</span>
        </label>

        {/* Filter Pills */}
        <div className={`flex items-center gap-1 p-1 rounded-xl border text-xs font-semibold ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-stone-950 border-stone-800'
        }`}>
          <button
            type="button"
            onClick={() => setFilterGender('all')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filterGender === 'all'
                ? isLight ? 'bg-white text-slate-900 font-bold shadow-xs' : 'bg-stone-100 text-stone-950 font-bold'
                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            الكل (8)
          </button>
          <button
            type="button"
            onClick={() => setFilterGender('commercial')}
            className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
              filterGender === 'commercial'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-amber-600 dark:text-amber-400 hover:underline'
            }`}
          >
            <Megaphone className="w-3 h-3" />
            <span>أصوات الإشهار</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterGender('female')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filterGender === 'female'
                ? 'bg-rose-500 text-white font-bold'
                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            أصوات إناث (4)
          </button>
          <button
            type="button"
            onClick={() => setFilterGender('male')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filterGender === 'male'
                ? 'bg-blue-600 text-white font-bold'
                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            أصوات ذكور (4)
          </button>
        </div>
      </div>

      {/* Sample Error Notification if any */}
      {sampleError && (
        <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs flex items-center justify-between">
          <span>{sampleError}</span>
          <button
            type="button"
            onClick={() => setSampleError(null)}
            className="text-red-400 hover:text-red-100 font-bold px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Voices Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {filteredVoices.map((voice) => {
          const isSelected = selectedVoice === voice.id;
          const isLoadingSample = loadingVoiceId === voice.id;
          const isPlayingSample = playingVoiceId === voice.id;

          return (
            <div
              key={voice.id}
              onClick={() => onSelectVoice(voice.id)}
              className={`text-right p-3.5 rounded-2xl border transition-all duration-200 relative group flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? isLight
                    ? 'bg-amber-50/70 border-amber-500 shadow-md ring-1 ring-amber-500/40'
                    : 'bg-gradient-to-b from-amber-950/50 to-stone-900 border-amber-500 shadow-lg shadow-amber-500/15 ring-1 ring-amber-500/60'
                  : isLight
                    ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs'
                    : 'bg-stone-900/70 border-stone-800/90 hover:border-stone-700 hover:bg-stone-800/60'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shadow-md">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}

              <div>
                {/* Specialty / Commercial Tag */}
                {voice.isCommercialSpecialist && (
                  <div className="mb-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      isLight 
                        ? 'bg-amber-100 text-amber-900 border-amber-200' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      <Flame className="w-3 h-3 text-amber-500 fill-current" />
                      {voice.specialtyTag || 'مناسب للإعلانات والتسويق'}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                      voice.gender === 'female'
                        ? isLight
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-rose-950/70 text-rose-300 border border-rose-800/40'
                        : isLight
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-blue-950/70 text-blue-300 border border-blue-800/40'
                    }`}
                  >
                    {voice.gender === 'female' ? 'صوت أنثوي 👩' : 'صوت ذكوري 👨'}
                  </span>
                  <span className={`text-sm font-black ${isLight ? 'text-slate-900' : 'text-stone-100'}`}>{voice.name}</span>
                </div>

                <p className={`text-xs line-clamp-2 leading-relaxed mt-1 ${isLight ? 'text-slate-600' : 'text-stone-400'}`}>
                  {voice.description}
                </p>
              </div>

              {/* Sample Voice Player Button & Greeting Preview */}
              <div className={`mt-3 pt-2.5 border-t flex flex-col gap-2 ${isLight ? 'border-slate-100' : 'border-stone-800/70'}`}>
                <button
                  type="button"
                  onClick={(e) => handlePlaySample(e, voice)}
                  disabled={isLoadingSample}
                  className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                    isPlayingSample
                      ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-400 shadow-amber-500/30 animate-pulse'
                      : isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                        : 'bg-stone-800 hover:bg-stone-700 text-amber-300 hover:text-amber-200 border border-stone-700/80'
                  }`}
                  title={voice.sampleGreeting || 'استمع لعينة الصوت'}
                >
                  {isLoadingSample ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                      <span className="text-[11px]">جاري تجهيز العينة...</span>
                    </>
                  ) : isPlayingSample ? (
                    <>
                      <Square className="w-3 h-3 fill-current" />
                      <span className="text-[11px]">إيقاف الصوت ⏹️</span>
                      {/* Animated Sound Bars */}
                      <span className="flex items-center gap-0.5 ml-1">
                        <span className="w-1 h-3 bg-stone-950 rounded-full animate-bounce"></span>
                        <span className="w-1 h-4 bg-stone-950 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                        <span className="w-1 h-2 bg-stone-950 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                      </span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[11px]">🔊 استمع للنموذج (Sample)</span>
                    </>
                  )}
                </button>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {voice.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        isLight ? 'bg-slate-100 text-slate-600' : 'bg-stone-950/80 text-stone-400'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

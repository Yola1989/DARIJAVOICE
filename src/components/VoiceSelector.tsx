import React, { useState, useRef, useEffect } from 'react';
import { VoiceOption } from '../types';
import { User, Check, Sparkles, Megaphone, Flame, Play, Square, Loader2, Volume2, AlertCircle } from 'lucide-react';

interface VoiceSelectorProps {
  voices: VoiceOption[];
  selectedVoice: string;
  onSelectVoice: (voiceId: string) => void;
  isUserActive: boolean;
  onRequireUpgrade?: () => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voices,
  selectedVoice,
  onSelectVoice,
  isUserActive,
  onRequireUpgrade,
}) => {
  const [filterGender, setFilterGender] = useState<'all' | 'female' | 'male' | 'commercial'>('all');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleTogglePreview = async (e: React.MouseEvent, voice: VoiceOption) => {
    e.stopPropagation(); // Don't trigger the card selection click unless desired

    // If already playing this voice, stop it
    if (playingVoiceId === voice.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    // Stop existing playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setPlayingVoiceId(null);
    setLoadingVoiceId(voice.id);
    setPreviewError(null);

    try {
      const response = await fetch(`/api/voices/preview/${voice.id}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.isQuotaError || response.status === 429) {
          throw new Error('تم استهلاك الحد المجاني لنموذج الصوت (Gemini 429 Quota). يرجى الانتظار بضع ثوانٍ.');
        }
        throw new Error(data.error || 'تعذر تشغيل عينة الصوت.');
      }

      const audio = new Audio(data.audioDataUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingVoiceId(null);
      };

      audio.onerror = () => {
        setPlayingVoiceId(null);
        setPreviewError('فشل تشغيل العينة الصوتية.');
      };

      await audio.play();
      setPlayingVoiceId(voice.id);
    } catch (err: any) {
      console.error('Preview error:', err);
      setPreviewError(err.message || 'حدث خطأ أثناء تحميل نموذج الصوت.');
      setTimeout(() => setPreviewError(null), 5000);
    } finally {
      setLoadingVoiceId(null);
    }
  };

  const filteredVoices = voices.filter((v) => {
    if (filterGender === 'female') return v.gender === 'female';
    if (filterGender === 'male') return v.gender === 'male';
    if (filterGender === 'commercial') return v.isCommercialSpecialist;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Selector Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-bold text-stone-200 flex items-center gap-1.5">
          <User className="w-4 h-4 text-amber-400" />
          <span>اختر نبرة الصوت وشخصية المعلق المغربي:</span>
        </label>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs font-semibold overflow-x-auto max-w-full scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterGender('all')}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition ${
              filterGender === 'all' ? 'bg-stone-100 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            الكل (8)
          </button>
          <button
            type="button"
            onClick={() => setFilterGender('commercial')}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition flex items-center gap-1 ${
              filterGender === 'commercial' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <Megaphone className="w-3 h-3" />
            <span>أصوات الإشهار</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterGender('female')}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition ${
              filterGender === 'female' ? 'bg-rose-500 text-white font-bold' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            أصوات إناث (4)
          </button>
          <button
            type="button"
            onClick={() => setFilterGender('male')}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition ${
              filterGender === 'male' ? 'bg-blue-500 text-white font-bold' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            أصوات ذكور (4)
          </button>
        </div>
      </div>

      {/* Preview Error Notice */}
      {previewError && (
        <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{previewError}</span>
        </div>
      )}

      {/* Voices Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {filteredVoices.map((voice) => {
          const isSelected = selectedVoice === voice.id;
          const isPlayingThis = playingVoiceId === voice.id;
          const isLoadingThis = loadingVoiceId === voice.id;

          return (
            <div
              key={voice.id}
              onClick={() => onSelectVoice(voice.id)}
              className={`text-right p-3.5 rounded-2xl border transition-all duration-200 relative group flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-b from-amber-950/50 to-stone-900 border-amber-500 shadow-lg shadow-amber-500/15 ring-1 ring-amber-500/60'
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
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Flame className="w-3 h-3 text-amber-400 fill-current" />
                      {voice.specialtyTag || 'مناسب للإعلانات والتسويق'}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                      voice.gender === 'female'
                        ? 'bg-rose-950/70 text-rose-300 border border-rose-800/40'
                        : 'bg-blue-950/70 text-blue-300 border border-blue-800/40'
                    }`}
                  >
                    {voice.gender === 'female' ? 'صوت أنثوي 👩' : 'صوت ذكوري 👨'}
                  </span>
                  <span className="text-sm font-black text-stone-100">{voice.name}</span>
                </div>

                <p className="text-xs text-stone-400 line-clamp-3 leading-relaxed mt-1">
                  {voice.description}
                </p>
              </div>

              {/* Action Buttons: Preview Audio + Tags */}
              <div className="mt-3 pt-2.5 border-t border-stone-800/70 space-y-2">
                {/* Voice Preview Button */}
                <button
                  type="button"
                  id={`preview-voice-${voice.id}`}
                  onClick={(e) => handleTogglePreview(e, voice)}
                  disabled={isLoadingThis}
                  className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    isPlayingThis
                      ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20 animate-pulse'
                      : 'bg-stone-800/90 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 border border-stone-700/60'
                  }`}
                  title="استمع لنموذج صوتي تعريفي"
                >
                  {isLoadingThis ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري التحميل...</span>
                    </>
                  ) : isPlayingThis ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>إيقاف المعاينة الصوتية</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>استمع للنموذج (معاينة)</span>
                    </>
                  )}
                </button>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {voice.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800/90 text-stone-300 font-medium"
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

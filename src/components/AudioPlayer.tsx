import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Download, Volume2, VolumeX, FastForward, Check, Copy } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  text: string;
  vocalizedText?: string;
  voiceName?: string;
  toneName?: string;
  onReplay?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  text,
  vocalizedText,
  voiceName,
  toneName,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Reset state when a new audio is loaded
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.log('Autoplay deferred or prevented:', e);
      });
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const cycleSpeed = () => {
    const speeds = [0.8, 1, 1.2, 1.5];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMute = !isMuted;
    setIsMuted(newMute);
    audioRef.current.muted = newMute;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  };

  const copyText = () => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-stone-900/90 border border-amber-500/30 rounded-2xl p-5 md:p-6 shadow-xl backdrop-blur-md relative overflow-hidden transition-all duration-300">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent pointer-events-none rounded-tr-2xl" />
      
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            جاهز للاستماع 🔊
          </span>
          {voiceName && (
            <span className="text-xs text-stone-400 bg-stone-800/80 px-2.5 py-1 rounded-full border border-stone-700">
              الصوت: <strong className="text-stone-200">{voiceName}</strong>
            </span>
          )}
          {toneName && (
            <span className="text-xs text-stone-400 bg-stone-800/80 px-2.5 py-1 rounded-full border border-stone-700">
              النبرة: <strong className="text-stone-200">{toneName}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyText}
            className="flex items-center gap-1.5 px-3 py-1 text-xs text-stone-300 hover:text-white bg-stone-800/80 hover:bg-stone-700 rounded-lg border border-stone-700 transition"
            title="نسخ النص"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {isCopied ? 'تم النسخ' : 'نسخ النص'}
          </button>
          
          <a
            href={audioUrl}
            download={`darija-voice-${Date.now()}.wav`}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/30 transition"
            title="تحميل المقطع الصوتي بصيغة WAV"
          >
            <Download className="w-3.5 h-3.5" />
            تحميل WAV
          </a>
        </div>
      </div>

      {/* Main Pronounced Text Display */}
      <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-4 mb-5 text-right">
        <p className="text-lg md:text-xl font-medium text-stone-100 leading-relaxed font-sans">
          "{text}"
        </p>
        {vocalizedText && vocalizedText !== text && (
          <p className="mt-2 text-xs text-amber-400/80 border-t border-stone-800/80 pt-2 flex items-center gap-1">
            <span className="text-stone-500">النطق المحسن بالدارجة:</span>
            <span>{vocalizedText}</span>
          </p>
        )}
      </div>

      {/* Waveform Visualization Bars */}
      <div className="flex items-center justify-center gap-1 h-12 mb-4 px-2">
        {Array.from({ length: 36 }).map((_, i) => {
          const isPassed = (i / 36) * 100 <= progressPercent;
          // Generate wave height
          const baseHeight = Math.sin(i * 0.45) * 18 + 24;
          const dynamicHeight = isPlaying 
            ? Math.max(8, (baseHeight + Math.sin(Date.now() / 150 + i) * 12))
            : baseHeight;
          return (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-150 ${
                isPassed
                  ? 'bg-gradient-to-t from-amber-500 to-amber-300'
                  : 'bg-stone-800'
              }`}
              style={{
                height: `${Math.max(6, Math.min(46, dynamicHeight))}px`,
                opacity: isPassed ? 1 : 0.45,
              }}
            />
          );
        })}
      </div>

      {/* Progress Bar Scrubber */}
      <div className="relative mb-4">
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.01"
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
        <div className="flex justify-between text-xs text-stone-400 font-mono mt-1 px-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-stone-800">
        {/* Play/Pause & Reset */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
                setIsPlaying(true);
              }
            }}
            className="p-2.5 rounded-full text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition"
            title="إعادة من البداية"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل الصوت'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={cycleSpeed}
            className="px-2.5 py-1 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg border border-stone-700 flex items-center gap-1 transition"
            title="سرعة القراءة"
          >
            <FastForward className="w-3 h-3 text-amber-400" />
            <span>{playbackRate}x</span>
          </button>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 text-stone-400 hover:text-stone-200 transition"
            title={isMuted ? 'إلغاء الكتم' : 'كتم الصوت'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 md:w-24 h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>
    </div>
  );
};

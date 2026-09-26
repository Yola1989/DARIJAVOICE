import React from 'react';
import { TTSHistoryItem } from '../types';
import { History, Play, Download, Trash2, Volume2 } from 'lucide-react';

interface HistoryListProps {
  items: TTSHistoryItem[];
  onPlayItem: (item: TTSHistoryItem) => void;
  onClearHistory: () => void;
  isLight?: boolean;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  items,
  onPlayItem,
  onClearHistory,
  isLight = false,
}) => {
  if (items.length === 0) return null;

  return (
    <div className={`rounded-2xl p-5 space-y-3 border ${
      isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-stone-900/50 border-stone-800/80'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-500" />
          <h3 className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-stone-100'}`}>سجل التسجيلات الصوتية السابقة</h3>
        </div>
        <button
          onClick={onClearHistory}
          className={`text-xs flex items-center gap-1 transition ${
            isLight ? 'text-slate-400 hover:text-rose-500' : 'text-stone-500 hover:text-rose-400'
          }`}
          title="مسح السجل"
        >
          <Trash2 className="w-3 h-3" />
          <span>مسح الكل</span>
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition ${
              isLight 
                ? 'bg-slate-50 border-slate-200/80 hover:border-slate-300' 
                : 'bg-stone-950/60 border-stone-800/60 hover:border-stone-700'
            }`}
          >
            <div className="min-w-0 flex-1 text-right">
              <p className={`text-xs font-medium truncate font-sans ${isLight ? 'text-slate-800' : 'text-stone-200'}`}>
                "{item.text}"
              </p>
              <div className={`flex items-center gap-2 mt-1 text-[10px] ${isLight ? 'text-slate-500' : 'text-stone-400'}`}>
                <span>الصوت: {item.voice}</span>
                <span>•</span>
                <span>النبرة: {item.tone}</span>
                <span>•</span>
                <span>{new Date(item.timestamp).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onPlayItem(item)}
                className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition"
                title="استماع"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
              <a
                href={item.audioUrl}
                download={`darija-clip-${item.id}.wav`}
                className={`p-2 rounded-lg transition ${
                  isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                }`}
                title="تحميل"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

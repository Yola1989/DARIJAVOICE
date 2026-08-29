import React from 'react';
import { ToneOption } from '../types';
import { Sparkles, MessageCircle, BookOpen, Volume2, Radio } from 'lucide-react';

interface ToneSelectorProps {
  tones: ToneOption[];
  selectedTone: string;
  onSelectTone: (toneId: string) => void;
}

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'MessageCircle':
      return <MessageCircle className="w-3.5 h-3.5" />;
    case 'Sparkles':
      return <Sparkles className="w-3.5 h-3.5" />;
    case 'BookOpen':
      return <BookOpen className="w-3.5 h-3.5" />;
    case 'Volume2':
      return <Volume2 className="w-3.5 h-3.5" />;
    case 'Radio':
      return <Radio className="w-3.5 h-3.5" />;
    default:
      return <Sparkles className="w-3.5 h-3.5" />;
  }
};

export const ToneSelector: React.FC<ToneSelectorProps> = ({
  tones,
  selectedTone,
  onSelectTone,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-stone-200 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>أسلوب ونبرة الإلقاء</span>
        </label>
        <span className="text-xs text-stone-400">طريقة الحديث والمشاعر</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {tones.map((tone) => {
          const isSelected = selectedTone === tone.id;
          return (
            <button
              key={tone.id}
              type="button"
              onClick={() => onSelectTone(tone.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-150 ${
                isSelected
                  ? 'bg-amber-500 text-stone-950 border-amber-400 font-semibold shadow-sm shadow-amber-500/20'
                  : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              {getIcon(tone.icon)}
              <span>{tone.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

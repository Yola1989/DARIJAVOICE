import React, { useState } from 'react';
import { PresetPhrase } from '../types';
import { Bookmark, Sparkles, ArrowUpRight, Globe } from 'lucide-react';

interface PresetSelectorProps {
  presets: PresetPhrase[];
  onSelectPreset: (text: string, title?: string) => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  presets,
  onSelectPreset,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');

  const categories = ['الكل', ...Array.from(new Set(presets.map((p) => p.category)))];

  const filteredPresets =
    selectedCategory === 'الكل'
      ? presets
      : presets.filter((p) => p.category === selectedCategory);

  return (
    <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-stone-100">نماذج جاهزة بالدارجة المغربية</h3>
        </div>
        <span className="text-xs text-stone-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          جرب بضغطة واحدة
        </span>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-stone-100 text-stone-950 font-bold'
                : 'bg-stone-800/70 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {filteredPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelectPreset(preset.text, preset.title)}
            className="group text-right p-3 rounded-xl bg-stone-950/40 hover:bg-stone-800/60 border border-stone-800/60 hover:border-amber-500/40 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-amber-400/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/30">
                  {preset.category}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-amber-400 transition" />
              </div>
              <h4 className="text-xs font-bold text-stone-200 mb-1 group-hover:text-white">
                {preset.title}
              </h4>
              <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                "{preset.text}"
              </p>
            </div>
            <p className="text-[10px] text-stone-500 mt-2 border-t border-stone-800/50 pt-1.5">
              {preset.meaning}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

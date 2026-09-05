import React, { useState } from "react";
import {
  Languages,
  ArrowRight,
  Check,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";
import { apiFetch } from "../lib/api";

interface ArabiziConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyText: (arabicText: string) => void;
}

export const ArabiziConverterModal: React.FC<ArabiziConverterModalProps> = ({
  isOpen,
  onClose,
  onApplyText,
}) => {
  const [arabiziInput, setArabiziInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [convertedResult, setConvertedResult] = useState<{
    arabicScript?: string;
    englishMeaning?: string;
    culturalNote?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConvert = async () => {
    if (!arabiziInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{
        arabicScript?: string;
        englishMeaning?: string;
        culturalNote?: string;
      }>("/api/darija/convert-arabizi", {
        method: "POST",
        body: JSON.stringify({ text: arabiziInput }),
      });
      setConvertedResult(data);
    } catch (err: any) {
      setError(err.message || "فشل في الاتصال بالسيرفر.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseText = () => {
    if (convertedResult?.arabicScript) {
      onApplyText(convertedResult.arabicScript);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden shadow-2xl p-5 sm:p-6 relative my-auto text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 p-2 text-stone-300 hover:text-white rounded-xl bg-stone-800/80 hover:bg-stone-700 border border-stone-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto pr-0.5 space-y-4">
          <div className="flex items-center gap-2 mb-2 pr-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100">
                محول العرنسية (Arabizi / Franco)
              </h3>
              <p className="text-xs text-stone-400">
                تحويل الحروف اللاتينية والأرقام (3, 7, 9) إلى دارجة مغربية عربية
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              اكتب النص بالعرنسية (Latin / Numbers):
            </label>
            <textarea
              value={arabiziInput}
              onChange={(e) => setArabiziInput(e.target.value)}
              placeholder="مثال: salam labas 3lik? kidayr m3a chi khdma o chi 3otla?..."
              rows={3}
              dir="ltr"
              className="w-full bg-stone-950/80 border border-stone-800 rounded-xl p-3 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono resize-none"
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-1 text-[11px] text-stone-500">
              <span>3 = ع</span> | <span>7 = ح</span> | <span>9 = ق</span> |{" "}
              <span>5 = خ</span>
            </div>

            <button
              onClick={handleConvert}
              disabled={loading || !arabiziInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 text-xs font-bold rounded-xl shadow-md transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري التحويل...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تحويل إلى حروف عربية</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-950/30 p-2.5 rounded-lg border border-rose-900/50">
              {error}
            </p>
          )}

          {convertedResult && (
            <div className="bg-stone-950 border border-amber-500/30 rounded-xl p-4 space-y-3 animate-in fade-in">
              <div>
                <span className="text-xs text-amber-400 font-semibold block mb-1">
                  النتيجة بالدارجة المغربية:
                </span>
                <p className="text-base font-bold text-stone-100 leading-relaxed font-sans">
                  {convertedResult.arabicScript}
                </p>
              </div>

              {convertedResult.englishMeaning && (
                <div className="text-xs text-stone-400 border-t border-stone-800 pt-2">
                  <strong className="text-stone-300">المعنى:</strong>{" "}
                  {convertedResult.englishMeaning}
                </div>
              )}

              {convertedResult.culturalNote && (
                <div className="text-xs text-amber-300/80 bg-amber-950/20 p-2 rounded border border-amber-800/30">
                  💡 {convertedResult.culturalNote}
                </div>
              )}

              <button
                onClick={handleUseText}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                <Check className="w-4 h-4" />
                <span>استخدام هذا النص وتحويله لصوت</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

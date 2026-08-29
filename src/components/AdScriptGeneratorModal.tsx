import React, { useState } from 'react';
import { Sparkles, Megaphone, Loader2, ArrowRight, Check, X, Flame } from 'lucide-react';

interface AdScriptGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyScript: (scriptText: string, voiceId?: string) => void;
}

export const AdScriptGeneratorModal: React.FC<AdScriptGeneratorModalProps> = ({
  isOpen,
  onClose,
  onApplyScript,
}) => {
  const [productDesc, setProductDesc] = useState('');
  const [audience, setAudience] = useState('المشترين المغاربة عبر فيسبوك وتيك توك');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    title?: string;
    script?: string;
    hook?: string;
    voiceRecommendation?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!productDesc.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/darija/generate-ad-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productDescription: productDesc,
          targetAudience: audience,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        throw new Error(data.error || 'فشل في توليد نص الإعلان.');
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    if (result?.script) {
      onApplyScript(result.script, result.voiceRecommendation || 'salma_ads');
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-stone-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-stone-900 border border-amber-500/40 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden shadow-2xl p-5 sm:p-6 relative text-right my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 p-2 text-stone-300 hover:text-white rounded-xl bg-stone-800/80 hover:bg-stone-700 border border-stone-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto pr-0.5 space-y-4">
          <div className="flex items-center gap-3 mb-2 pr-2">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-stone-100 flex items-center gap-1.5 flex-wrap">
                <span>كاتب إعلانات المنتجات الذكي بالدارجة</span>
                <span className="text-[10px] bg-amber-500 text-stone-950 font-bold px-2 py-0.5 rounded-full">
                  E-Commerce AI
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                اكتب اسم منتوجك وسيقوم الذكاء الاصطناعي بصياغة إعلان تسويقي جاهز
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-200 mb-1.5">
              شنو هو المنتوج أو الخدمة ديالك؟ (الوصف والمميزات):
            </label>
            <textarea
              rows={3}
              value={productDesc}
              onChange={(e) => setProductDesc(e.target.value)}
              placeholder="مثال: عطر مسك أصلي فاخر كيدوم 24 ساعة، مع توصيل مجاني والدفع بعد المعاينة عند الاستلام..."
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl p-3 text-xs text-stone-100 focus:outline-none placeholder-stone-600 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-stone-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              جاهز لإعلانات TikTok و Instagram Reels
            </span>

            <button
              onClick={handleGenerate}
              disabled={loading || !productDesc.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-stone-950 text-xs font-black rounded-xl shadow-md transition flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الصياغة...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>صياغة إعلان بالدارجة</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-900">
              {error}
            </p>
          )}

          {result && (
            <div className="bg-stone-950 border border-amber-500/40 rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-amber-400">الإعلان المقترح بالدارجة:</span>
                <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full">
                  الصوت الموصى به: {result.voiceRecommendation === 'salma_ads' ? 'سلمى (Salma)' : 'المهدي (Mehdi)'}
                </span>
              </div>

              <p className="text-sm font-medium text-stone-100 leading-relaxed font-sans bg-stone-900/60 p-3 rounded-xl border border-stone-800/80">
                "{result.script}"
              </p>

              <button
                onClick={handleUse}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>استخدام هذا الإعلان وتوليد الصوت فوراً</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

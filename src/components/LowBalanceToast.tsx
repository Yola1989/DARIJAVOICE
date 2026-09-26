import React, { useState, useEffect } from 'react';
import { Coins, AlertTriangle, ArrowRight, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LowBalanceToastProps {
  tokens: number;
  threshold?: number;
  isOpen: boolean;
  onUpgradeClick: () => void;
}

export const LowBalanceToast: React.FC<LowBalanceToastProps> = ({
  tokens,
  threshold = 50,
  isOpen,
  onUpgradeClick,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [prevTokens, setPrevTokens] = useState<number | null>(null);

  // If tokens drop further, un-dismiss so user is warned again
  useEffect(() => {
    if (prevTokens !== null && tokens < prevTokens && tokens < threshold) {
      setIsDismissed(false);
    }
    setPrevTokens(tokens);
  }, [tokens, threshold, prevTokens]);

  const shouldShow = isOpen && !isDismissed && tokens < threshold && tokens >= 0;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-5 left-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] sm:w-auto"
          dir="rtl"
        >
          <div className="bg-stone-900/95 border-2 border-amber-500/80 rounded-2xl p-4 shadow-2xl shadow-amber-950/50 backdrop-blur-md text-stone-100 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 relative">
                  <Coins className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                    تنبيه: رصيد النقاط منخفض!
                  </h4>
                  <p className="text-xs text-stone-300 mt-0.5 leading-snug">
                    متبقي لديك <span className="font-bold text-amber-400 font-mono text-sm">{tokens}</span> نقطة فقط (أقل من {threshold} نقطة).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="text-stone-400 hover:text-stone-200 p-1 rounded-lg hover:bg-stone-800 transition"
                title="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800/80">
              <span className="text-[11px] text-stone-400">
                اشحن رصيدك لتفادي انقطاع الخدمة
              </span>
              <button
                type="button"
                onClick={() => {
                  onUpgradeClick();
                  setIsDismissed(true);
                }}
                className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 px-3 py-1.5 rounded-xl text-xs font-black shadow-md shadow-amber-500/20 flex items-center gap-1 transition"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>شحن الحساب</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

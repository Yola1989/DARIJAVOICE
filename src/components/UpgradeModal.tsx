import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, PhoneCall, Check, MessageCircle, X, Coins, ShieldCheck, Zap } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  const { userProfile, appSettings } = useAuth();

  if (!isOpen) return null;

  const handleWhatsApp = (planName: string, price: number) => {
    const phone = appSettings.contactWhatsApp.replace(/[^0-9+]/g, '');
    const userEmail = userProfile?.email || 'غير مسجل';
    const message = encodeURIComponent(
      `السلام عليكم خويا، بغيت نفعل حسابي فموقع صوت الدارجة ونشحن باقة (${planName} - ${price} درهم).\nإيميل حسابي: ${userEmail}`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-stone-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-stone-900 border border-amber-500/40 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl p-4 sm:p-6 relative text-right my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button Top-Left */}
        <button
          onClick={onClose}
          type="button"
          aria-label="إغلاق"
          className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 p-2 text-stone-300 hover:text-white rounded-xl bg-stone-800/80 hover:bg-stone-700 border border-stone-700/60 transition shadow-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content inside modal */}
        <div className="overflow-y-auto pr-1 space-y-5 pb-2">
          {/* Modal Header */}
          <div className="text-center max-w-lg mx-auto pt-2 sm:pt-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>تفعيل الحساب وشحن النقاط (Tokens)</span>
            </div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white px-6">
              اختر الباقة المناسبة لمشاريعك وإعلاناتك
            </h3>
            <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">
              استفد من أصوات الدارجة المغربية الحصرية، أصوات الإعلانات لمنتجاتك على تيك توك وفيسبوك، والتوليد اللامحدود.
            </p>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Starter Plan */}
            <div className="bg-stone-950/70 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-sm font-bold text-stone-100">باقة البداية</h4>
                  <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded font-mono">Starter</span>
                </div>
                <div className="text-2xl font-black text-amber-400 my-2">
                  {appSettings.starterPriceMAD} <span className="text-xs text-stone-400 font-normal">درهم</span>
                </div>
                <ul className="text-xs text-stone-300 space-y-2">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 500 نقطة (Tokens)</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> فتح جميع الأصوات</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> تحميل WAV عالي الدقة</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleWhatsApp('Starter', appSettings.starterPriceMAD)}
                className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>طلب عبر الواتساب</span>
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-b from-amber-950/40 to-stone-950 border-2 border-amber-500 rounded-2xl p-4 flex flex-col justify-between space-y-4 relative shadow-lg shadow-amber-500/10">
              <div className="absolute -top-3 right-4 bg-amber-500 text-stone-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                الأكثر طلباً للتجارة
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-sm font-bold text-amber-300">باقة المحترفين</h4>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 font-mono">Pro</span>
                </div>
                <div className="text-2xl font-black text-amber-400 my-2">
                  {appSettings.proPriceMAD} <span className="text-xs text-stone-400 font-normal">درهم</span>
                </div>
                <ul className="text-xs text-stone-200 space-y-2">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> <strong>2,000 نقطة (Tokens)</strong></li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> أصوات الإعلانات (سلمى والمهدي)</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> صياغة وتوليد إعلانات Reels/TikTok</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> أولوية في المعالجة السريعة</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleWhatsApp('Pro', appSettings.proPriceMAD)}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>تفعيل فوري عبر الواتساب</span>
              </button>
            </div>

            {/* Business Plan */}
            <div className="bg-stone-950/70 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-sm font-bold text-stone-100">باقة الشركات</h4>
                  <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800/40 font-mono">Business</span>
                </div>
                <div className="text-2xl font-black text-white my-2">
                  {appSettings.businessPriceMAD} <span className="text-xs text-stone-400 font-normal">درهم</span>
                </div>
                <ul className="text-xs text-stone-300 space-y-2">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> 5,000 نقطة (Tokens)</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> توليد نصوص طويلة ومقالات</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> دعم فني مخصص 24/7</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleWhatsApp('Business', appSettings.businessPriceMAD)}
                className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>طلب عبر الواتساب</span>
              </button>
            </div>
          </div>

          {/* Payment Methods instructions */}
          <div className="bg-stone-950 p-3.5 sm:p-4 rounded-2xl border border-stone-800/80 text-xs text-stone-400 space-y-1">
            <p className="font-bold text-stone-300">طرق الدفع المتوفرة:</p>
            <p className="leading-relaxed">
              التحويل البنكي (CIH Bank / Attijariwafa / BMCE / Banque Populaire) أو عبر Cash Plus و Wafacash. يتم تفعيل الحساب وشحن النقاط فور التوصل بالإشعار!
            </p>
          </div>

          {/* Secondary Close Button for Mobile */}
          <div className="pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-stone-800/90 hover:bg-stone-800 text-stone-300 text-xs font-bold rounded-xl transition border border-stone-700/60"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

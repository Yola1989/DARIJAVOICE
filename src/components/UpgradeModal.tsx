import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Check, MessageCircle, X, Sparkles, User as UserIcon, RefreshCw, Gift } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  const { userProfile, appSettings } = useAuth();
  const [resetting, setResetting] = useState(false);

  if (!isOpen) return null;

  const isEligibleForLaunchBonus = 
    appSettings.launchBonusEnabled !== false &&
    !userProfile?.launchBonusGrantedAt &&
    (appSettings.launchBonusClaimedCount || 0) < (appSettings.launchBonusLimit || 100);

  const handleWhatsApp = (planName: string, price: number, minutes: number, months: number) => {
    const phone = (appSettings.contactWhatsApp || '212600000000').replace(/[^0-9]/g, '');
    const userEmail = userProfile?.email || 'غير مسجل';
    const bonusText = isEligibleForLaunchBonus 
      ? `\n🎁 (مستفيد من عرض الإطلاق: +10 دقائق مجاناً مضافة للباقة)` 
      : '';
    const message = encodeURIComponent(
      `السلام عليكم خويا، بغيت نشحن باقة (${planName} - ${price} درهم - ${minutes} دقيقة صالحة ${months} أشهر).${bonusText}\nإيميل حسابي: ${userEmail}`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  // Helper for admin to sync and reset database prices if old cached values were present
  const handleFixPricesInDB = async () => {
    if (userProfile?.role !== 'admin') return;
    setResetting(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...appSettings,
        miniPriceMAD: 59,
        starterPriceMAD: 99,
        proPriceMAD: 199,
        businessPriceMAD: 599,
      }, { merge: true });
    } catch (e) {
      console.error(e);
    } finally {
      setResetting(false);
    }
  };

  // Prices with fallback to the official ones
  const miniPrice = appSettings.miniPriceMAD || 59;
  const starterPrice = appSettings.starterPriceMAD || 99;
  const proPrice = appSettings.proPriceMAD || 199;
  const businessPrice = (appSettings.businessPriceMAD && appSettings.businessPriceMAD >= 500) 
    ? appSettings.businessPriceMAD 
    : 599;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-stone-950/85 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
      <div className="bg-stone-900 border border-amber-500/40 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl p-6 relative text-right max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Top Badge & Title */}
        <div className="text-center max-w-2xl mx-auto mb-5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>باقات رصيد مسبق الدفع</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            خلص مرة وحدة واستعمل الرصيد على راحتك
          </h3>
          <p className="text-xs text-stone-400 mt-2 leading-relaxed">
            ما كاين لا تجديد شهري إجباري لا اقتطاع أوتوماتيكي. الرصيد صالح 3 أشهر فـ Mini و Starter، و6 أشهر فـ Pro، وباقة Business صالحة 12 شهر.
          </p>

          {/* Launch Bonus Banner */}
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-950/80 via-stone-900 to-amber-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold shadow-sm">
            <Gift className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>
              🎁 هدية حصرية: أول 100 زبون كتزادهم 10 دقائق صوت إضافية أوتوماتيكياً مع أي باقة ختاروها!
            </span>
          </div>
        </div>

        {/* Current User Status Bar */}
        {userProfile && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-950/80 border border-stone-800 rounded-2xl px-4 py-2.5 mb-5 text-xs">
            <div className="flex items-center gap-2 text-stone-300">
              <UserIcon className="w-4 h-4 text-emerald-400" />
              <span>الحساب الحالي:</span>
              <strong className="text-amber-300 font-mono" dir="ltr">{userProfile.email}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-500/10 text-amber-400 font-black rounded-lg border border-amber-500/30">
                <span dir="ltr" className="font-mono">{(userProfile.tokens || 0).toLocaleString('en-US')}</span> نقطة
              </span>
              {userProfile.creditsExpireAt && (
                <span className="text-[11px] text-stone-400">
                  تنتهي: {new Date(userProfile.creditsExpireAt).toLocaleDateString('ar-MA')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Pricing Cards 4 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          
          {/* Mini Plan */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-stone-700 transition">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded font-mono">mini</span>
                <h4 className="text-sm font-bold text-stone-100">باقة Mini</h4>
              </div>
              <div className="text-2xl font-black text-amber-400 my-2 flex items-baseline gap-1.5">
                <span dir="ltr" className="font-mono">{miniPrice}</span>
                <span className="text-xs text-stone-400 font-normal">درهم / شحنة</span>
              </div>
              <p className="text-[11px] text-stone-400 mb-3">مناسبة باش تجرب الخدمة وتوجد إعلانات قصيرة.</p>
              <ul className="text-xs text-stone-300 space-y-2">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 30 دقيقة صوت تقريباً</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> <span dir="ltr" className="font-mono font-bold">18,000</span> نقطة</li>
                {isEligibleForLaunchBonus && (
                  <li className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/30 px-2 py-1 rounded border border-emerald-800/40">
                    <Gift className="w-3.5 h-3.5 shrink-0" /> +10 دقايق بونيس إطلاق مجاناً
                  </li>
                )}
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> جميع الأصوات وحقوق الاستعمال التجاري</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> صلاحية الرصيد 3 أشهر</li>
              </ul>
            </div>

            <button
              onClick={() => handleWhatsApp('Mini', miniPrice, 30, 3)}
              className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>طلب الشحن عبر الواتساب</span>
            </button>
          </div>

          {/* Starter Plan */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-stone-700 transition">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded font-mono">starter</span>
                <h4 className="text-sm font-bold text-stone-100">باقة Starter</h4>
              </div>
              <div className="text-2xl font-black text-amber-400 my-2 flex items-baseline gap-1.5">
                <span dir="ltr" className="font-mono">{starterPrice}</span>
                <span className="text-xs text-stone-400 font-normal">درهم / شحنة</span>
              </div>
              <p className="text-[11px] text-stone-400 mb-3">لصناع المحتوى والمتاجر اللي كيخدمو بشكل منتظم.</p>
              <ul className="text-xs text-stone-300 space-y-2">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 60 دقيقة صوت تقريباً</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> <span dir="ltr" className="font-mono font-bold">36,000</span> نقطة</li>
                {isEligibleForLaunchBonus && (
                  <li className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/30 px-2 py-1 rounded border border-emerald-800/40">
                    <Gift className="w-3.5 h-3.5 shrink-0" /> +10 دقايق بونيس إطلاق مجاناً
                  </li>
                )}
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> جميع الأصوات وحقوق الاستعمال التجاري</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> صلاحية الرصيد 3 أشهر</li>
              </ul>
            </div>

            <button
              onClick={() => handleWhatsApp('Starter', starterPrice, 60, 3)}
              className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>طلب الشحن عبر الواتساب</span>
            </button>
          </div>

          {/* Pro Plan - Highlighted */}
          <div className="bg-gradient-to-b from-amber-950/40 to-stone-950 border-2 border-amber-500 rounded-2xl p-4 flex flex-col justify-between space-y-4 relative shadow-lg shadow-amber-500/10">
            <div className="absolute -top-3 right-4 bg-amber-500 text-stone-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
              الأكثر طلباً
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 font-mono">pro</span>
                <h4 className="text-sm font-bold text-amber-300">باقة Pro</h4>
              </div>
              <div className="text-2xl font-black text-amber-400 my-2 flex items-baseline gap-1.5">
                <span dir="ltr" className="font-mono">{proPrice}</span>
                <span className="text-xs text-stone-400 font-normal">درهم / شحنة</span>
              </div>
              <p className="text-[11px] text-stone-300 mb-3">للإعلانات والحملات المتعددة بجميع الأصوات.</p>
              <ul className="text-xs text-stone-200 space-y-2">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> 180 دقيقة صوت تقريباً</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> <span dir="ltr" className="font-mono font-bold">108,000</span> نقطة</li>
                {isEligibleForLaunchBonus && (
                  <li className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/40 px-2 py-1 rounded border border-emerald-800/40">
                    <Gift className="w-3.5 h-3.5 shrink-0" /> +10 دقايق بونيس إطلاق مجاناً
                  </li>
                )}
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> جميع الأصوات وحقوق الاستعمال التجاري</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> صلاحية الرصيد 6 أشهر</li>
              </ul>
            </div>

            <button
              onClick={() => handleWhatsApp('Pro', proPrice, 180, 6)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-md"
            >
              <MessageCircle className="w-4 h-4" />
              <span>طلب الشحن عبر الواتساب</span>
            </button>
          </div>

          {/* Business Plan */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-stone-700 transition">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded font-mono">business</span>
                <h4 className="text-sm font-bold text-stone-100">باقة Business</h4>
              </div>
              <div className="text-2xl font-black text-amber-400 my-2 flex items-baseline gap-1.5">
                <span dir="ltr" className="font-mono">{businessPrice}</span>
                <span className="text-xs text-stone-400 font-normal">درهم / شحنة</span>
              </div>
              <p className="text-[11px] text-stone-400 mb-3">للوكالات والفرق اللي عندها حجم إنتاج كبير.</p>
              <ul className="text-xs text-stone-300 space-y-2">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 720 دقيقة صوت تقريباً</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> <span dir="ltr" className="font-mono font-bold">432,000</span> نقطة</li>
                {isEligibleForLaunchBonus && (
                  <li className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/30 px-2 py-1 rounded border border-emerald-800/40">
                    <Gift className="w-3.5 h-3.5 shrink-0" /> +10 دقايق بونيس إطلاق مجاناً
                  </li>
                )}
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> جميع الأصوات وحقوق الاستعمال التجاري</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> صلاحية الرصيد 12 شهر</li>
              </ul>
            </div>

            <button
              onClick={() => handleWhatsApp('Business', businessPrice, 720, 12)}
              className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>طلب الشحن عبر الواتساب</span>
            </button>
          </div>

        </div>

        {/* Admin quick sync if old prices were cached in Firestore */}
        {userProfile?.role === 'admin' && (appSettings.businessPriceMAD === 399 || !appSettings.businessPriceMAD) && (
          <div className="mb-4 bg-amber-950/40 border border-amber-500/40 p-3 rounded-xl flex items-center justify-between text-xs text-amber-300">
            <span>تنبيه للمدير: قاعدة البيانات ما زالت تحتوي على السعر القديم لباقة Business.</span>
            <button
              onClick={handleFixPricesInDB}
              disabled={resetting}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg transition flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
              <span>تحديث السعر فوراً إلى 599 درهم</span>
            </button>
          </div>
        )}

        {/* Payment Methods instructions matching your exact screenshot */}
        <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800/80 text-xs text-stone-400 space-y-1">
          <p className="font-bold text-stone-300">طرق وتعليمات الدفع:</p>
          <p>
            {appSettings.paymentInstructions || 'لشحن رصيدك أو تفعيل اشتراكك، تواصل معنا مباشرة عبر واتساب مع إرسال إيميل حسابك وطريقة الدفع المفضلة (CIH Bank / Cash Plus / Wafacash). سيتم تفعيل حسابك وشحن النقاط فوراً!'}
          </p>
        </div>
      </div>
    </div>
  );
};

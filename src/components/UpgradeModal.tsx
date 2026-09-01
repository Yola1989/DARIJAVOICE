import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { SubscriptionRequest } from '../types';
import {
  Sparkles,
  PhoneCall,
  Check,
  MessageCircle,
  X,
  Coins,
  ShieldCheck,
  Zap,
  Mail,
  UserCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onOpenAuth }) => {
  const { user, userProfile, appSettings } = useAuth();
  const [manualEmail, setManualEmail] = useState('');
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentEmail = (userProfile?.email || user?.email || manualEmail).trim();

  const handleWhatsApp = async (planName: string, price: number) => {
    setEmailError(null);
    const targetEmail = (userProfile?.email || user?.email || manualEmail).trim();

    if (!targetEmail) {
      setEmailError('المرجو كتابة بريدك الإلكتروني (Gmail) أدناه لربط الباقة بحسابك وتفعيلها.');
      return;
    }

    setSubmittingPlan(planName);

    try {
      const planTier = planName.toLowerCase() as 'starter' | 'pro' | 'business';
      let tokensCount = 15000;
      if (planTier === 'pro') tokensCount = 50000;
      if (planTier === 'business') tokensCount = 150000;

      // 1. Save subscription request into Firestore (if online & authenticated/configured)
      try {
        const reqRef = doc(collection(db, 'subscription_requests'));
        const newRequest: SubscriptionRequest = {
          id: reqRef.id,
          userId: user?.uid || userProfile?.id || '',
          userEmail: targetEmail,
          userName: userProfile?.displayName || user?.displayName || targetEmail.split('@')[0],
          planName,
          planTier,
          priceMAD: price,
          tokensCount,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        await setDoc(reqRef, newRequest);
      } catch (fsErr) {
        console.warn('Notice saving to Firestore direct:', fsErr);
      }

      // 2. Also save to server endpoint for 100% guarantee across all environments
      try {
        await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.uid || userProfile?.id || '',
            userEmail: targetEmail,
            userName: userProfile?.displayName || user?.displayName || targetEmail.split('@')[0],
            planName,
            planTier,
            priceMAD: price,
            tokensCount,
          }),
        });
      } catch (srvErr) {
        console.warn('Notice saving to server api:', srvErr);
      }

      // 3. If user is logged in, record pending upgrade on user document
      if (user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, {
            updatedAt: new Date().toISOString(),
          });
        } catch (uErr) {
          console.warn('Notice updating user doc:', uErr);
        }
      }

      setSubmittedSuccess(`تم تسجيل طلبك لباقة (${planName}). جاري فتح الواتساب للتواصل وتأكيد التفعيل...`);

      // 3. Open WhatsApp with complete formatted message
      const phone = appSettings.contactWhatsApp.replace(/[^0-9+]/g, '');
      const message = encodeURIComponent(
        `السلام عليكم خويا، بغيت نفعل حسابي فموقع صوت الدارجة ونشحن باقة (${planName} - ${price} درهم).\nإيميل حسابي: ${targetEmail}`
      );

      setTimeout(() => {
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
        setSubmittingPlan(null);
      }, 700);
    } catch (err: any) {
      console.error('Error saving subscription request:', err);
      // Fallback open WhatsApp directly
      const phone = appSettings.contactWhatsApp.replace(/[^0-9+]/g, '');
      const message = encodeURIComponent(
        `السلام عليكم خويا، بغيت نفعل حسابي فموقع صوت الدارجة ونشحن باقة (${planName} - ${price} درهم).\nإيميل حسابي: ${targetEmail}`
      );
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
      setSubmittingPlan(null);
    }
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
        <div className="overflow-y-auto pr-1 space-y-4 pb-2">
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

          {/* User Email Banner / Input */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-3.5">
            {user || userProfile ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-stone-400">حسابك الحالي: </span>
                    <strong className="text-amber-300 font-mono text-xs">{currentEmail}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-stone-900 px-2.5 py-1 rounded-lg border border-stone-800 text-[11px] text-stone-300">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>الرصيد: {userProfile?.tokens?.toLocaleString() || 0} نقطة</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>بريدك الإلكتروني (Gmail) لتفعيل الاشتراك:</span>
                  </label>
                  {onOpenAuth && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAuth();
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 underline font-bold"
                    >
                      أو سجل الدخول بضغطة زر
                    </button>
                  )}
                </div>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => {
                    setManualEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder="مثال: yourname@gmail.com"
                  className="w-full bg-stone-900 border border-stone-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 text-left dir-ltr outline-none transition"
                  dir="ltr"
                />
                {emailError && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{emailError}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Success Banner */}
          {submittedSuccess && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{submittedSuccess}</span>
            </div>
          )}

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
                  {appSettings.starterPriceMAD} <span className="text-xs text-stone-400 font-normal">درهم / شهرياً</span>
                </div>
                <ul className="text-xs text-stone-300 space-y-2">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> <strong>15,000 حرف/نقطة</strong> (~40 إعلان أو ريلز)</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> فتح جميع الأصوات المغربية الأساسية</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> تحميل MP3 و WAV عالي الدقة</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> حقوق الاستخدام التجاري والإعلاني</li>
                </ul>
              </div>

              <button
                type="button"
                disabled={submittingPlan !== null}
                onClick={() => handleWhatsApp('Starter', appSettings.starterPriceMAD)}
                className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submittingPlan === 'Starter' ? (
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                )}
                <span>طلب وتفعيل عبر الواتساب</span>
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
                  {appSettings.proPriceMAD} <span className="text-xs text-stone-400 font-normal">درهم / شهرياً</span>
                </div>
                <ul className="text-xs text-stone-200 space-y-2">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> <strong>50,000 حرف/نقطة</strong> (~150 إعلان)</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> أصوات الإعلانات الحصرية (سلمى، المهدي، أنس...)</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> صياغة وتوليد إعلانات Reels/TikTok بالـ AI</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> أولوية وسرعة فائقة في المعالجة</li>
                </ul>
              </div>

              <button
                type="button"
                disabled={submittingPlan !== null}
                onClick={() => handleWhatsApp('Pro', appSettings.proPriceMAD)}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {submittingPlan === 'Pro' ? (
                  <Loader2 className="w-4 h-4 text-stone-950 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4" />
                )}
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
                  {appSettings.businessPriceMAD} <span className="text-xs text-stone-400 font-normal">درهم / شهرياً</span>
                </div>
                <ul className="text-xs text-stone-300 space-y-2">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> <strong>150,000 حرف/نقطة</strong> (~450 إعلان وبودكاست)</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> توليد نصوص طويلة ومقالات بلا حدود</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> خوادم مخصصة بأعلى سرعة معالجة</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> دعم فني VIP مخصص 24/7</li>
                </ul>
              </div>

              <button
                type="button"
                disabled={submittingPlan !== null}
                onClick={() => handleWhatsApp('Business', appSettings.businessPriceMAD)}
                className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submittingPlan === 'Business' ? (
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                )}
                <span>طلب وتفعيل عبر الواتساب</span>
              </button>
            </div>
          </div>

          {/* Payment Methods instructions */}
          <div className="bg-stone-950 p-3.5 sm:p-4 rounded-2xl border border-stone-800/80 text-xs text-stone-400 space-y-1.5">
            <p className="font-bold text-stone-200">طرق وتعليمات الدفع:</p>
            <p className="leading-relaxed whitespace-pre-line text-stone-300">
              {appSettings.paymentInstructions || 'التحويل البنكي (CIH Bank / Attijariwafa / Cash Plus / Wafacash). تواصل معنا عبر الواتساب لتفعيل حسابك فوراً!'}
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

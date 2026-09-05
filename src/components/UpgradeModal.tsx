import React, { useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Coins,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
}

type PaidPlanId = "mini" | "starter" | "pro" | "business";

interface PlanCard {
  id: PaidPlanId;
  name: string;
  price: number;
  minutes: number;
  tokens: number;
  validityMonths: number;
  description: string;
  featured?: boolean;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
}) => {
  const { user, userProfile, appSettings } = useAuth();
  const [submittingPlan, setSubmittingPlan] = useState<PaidPlanId | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const plans: PlanCard[] = [
    {
      id: "mini",
      name: "Mini",
      price: appSettings.miniPriceMAD,
      minutes: 30,
      tokens: 18_000,
      validityMonths: 6,
      description: "مناسبة باش تجرب الخدمة وتوجد إعلانات قصيرة.",
    },
    {
      id: "starter",
      name: "Starter",
      price: appSettings.starterPriceMAD,
      minutes: 60,
      tokens: 36_000,
      validityMonths: 6,
      description: "لصناع المحتوى والمتاجر اللي كيخدمو بشكل منتظم.",
    },
    {
      id: "pro",
      name: "Pro",
      price: appSettings.proPriceMAD,
      minutes: 180,
      tokens: 108_000,
      validityMonths: 6,
      description: "للإعلانات والحملات المتعددة بجميع الأصوات.",
      featured: true,
    },
    {
      id: "business",
      name: "Business",
      price: appSettings.businessPriceMAD,
      minutes: 720,
      tokens: 432_000,
      validityMonths: 12,
      description: "للوكالات والفرق اللي عندها حجم إنتاج كبير.",
    },
  ];
  const launchBonusAvailable =
    appSettings.launchBonusEnabled &&
    appSettings.launchBonusClaimedCount < appSettings.launchBonusLimit;

  const requestPlan = async (plan: PlanCard) => {
    setError(null);
    setSubmittedSuccess(null);

    if (!user) {
      onClose();
      onOpenAuth?.();
      return;
    }

    setSubmittingPlan(plan.id);

    try {
      await apiFetch("/api/subscriptions", {
        method: "POST",
        body: JSON.stringify({ planId: plan.id }),
      });

      setSubmittedSuccess(
        `تسجل طلب باقة ${plan.name} بنجاح. تواصل معنا فالواتساب باش تأكد الأداء ويتشحن الرصيد.`,
      );

      const phone = appSettings.contactWhatsApp.replace(/[^0-9]/g, "");
      const message = encodeURIComponent(
        `السلام عليكم، بغيت نشحن باقة ${plan.name} بـ ${plan.price} درهم.\nإيميل الحساب: ${user.email || ""}`,
      );

      if (phone) {
        window.setTimeout(() => {
          const whatsAppUrl = [
            "https://",
            "wa.me/",
            phone,
            "?text=",
            message,
          ].join("");
          window.open(whatsAppUrl, "_blank", "noopener,noreferrer");
        }, 500);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "تعذر تسجيل طلب الباقة. حاول مرة أخرى.",
      );
    } finally {
      setSubmittingPlan(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-950/85 p-3 backdrop-blur-md sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div
        className="relative my-auto flex max-h-[92vh] w-full max-w-5xl flex-col rounded-3xl border border-amber-500/40 bg-stone-900 p-4 text-right shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          type="button"
          aria-label="إغلاق"
          className="absolute left-3 top-3 z-10 rounded-xl border border-stone-700 bg-stone-800/80 p-2 text-stone-300 transition hover:bg-stone-700 hover:text-white sm:left-4 sm:top-4"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="mx-auto max-w-2xl px-8 text-center">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>باقات رصيد مسبق الدفع</span>
            </div>
            <h3 className="text-xl font-black text-white sm:text-2xl">
              خلص مرة وحدة واستعمل الرصيد على راحتك
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-stone-400">
              ما كاين لا تجديد شهري إجباري لا اقتطاع أوتوماتيكي. الرصيد صالح
              6 أشهر، وباقة Business صالحة 12 شهر.
            </p>
            {launchBonusAvailable && (
              <p className="mt-2 text-xs font-bold text-emerald-300">
                🎁 أول {appSettings.launchBonusLimit} زبون مؤدٍ كياخذ {appSettings.launchBonusMinutes} دقائق هدية فالشحنة الأولى.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-stone-800 bg-stone-950/80 p-3.5">
            {user ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-stone-400">الحساب الحالي: </span>
                    <strong className="font-mono text-amber-300">
                      {userProfile?.email || user.email}
                    </strong>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-stone-800 bg-stone-900 px-2.5 py-1 text-stone-300">
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                  <span>
                    {(userProfile?.tokens || 0).toLocaleString()} نقطة
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs text-amber-300">
                <ShieldCheck className="h-4 w-4" />
                <span>سجل الدخول أولاً باش يتربط طلب الشحن بحسابك الصحيح.</span>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {submittedSuccess && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-950/50 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{submittedSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between space-y-4 rounded-2xl p-4 ${
                  plan.featured
                    ? "border-2 border-amber-500 bg-gradient-to-b from-amber-950/40 to-stone-950 shadow-lg shadow-amber-500/10"
                    : "border border-stone-800 bg-stone-950/70"
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 right-4 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black text-stone-950">
                    الأكثر طلباً
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-stone-100">
                      باقة {plan.name}
                    </h4>
                    <span className="rounded bg-stone-800 px-2 py-0.5 font-mono text-[10px] text-stone-300">
                      {plan.id}
                    </span>
                  </div>

                  <div className="my-2 text-2xl font-black text-amber-400">
                    {plan.price}{" "}
                    <span className="text-xs font-normal text-stone-400">
                      درهم / شحنة
                    </span>
                  </div>

                  <p className="mb-3 text-[11px] leading-relaxed text-stone-400">
                    {plan.description}
                  </p>

                  <ul className="space-y-2 text-xs text-stone-300">
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <strong>{plan.minutes} دقيقة صوت تقريباً</strong>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>{plan.tokens.toLocaleString()} نقطة</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>جميع الأصوات وحقوق الاستعمال التجاري</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>صلاحية الرصيد {plan.validityMonths} أشهر</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={submittingPlan !== null}
                  onClick={() => requestPlan(plan)}
                  className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black transition disabled:opacity-50 ${
                    plan.featured
                      ? "bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 hover:from-amber-400 hover:to-amber-300"
                      : "bg-stone-800 text-stone-200 hover:bg-stone-700"
                  }`}
                >
                  {submittingPlan === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                  )}
                  <span>
                    {user
                      ? "طلب الشحن عبر الواتساب"
                      : "سجل الدخول واطلب الباقة"}
                  </span>
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-stone-800/80 bg-stone-950 p-3.5 text-xs text-stone-400">
            <p className="mb-1 font-bold text-stone-200">طرق وتعليمات الدفع:</p>
            <p className="whitespace-pre-line leading-relaxed text-stone-300">
              {appSettings.paymentInstructions ||
                "تواصل معنا عبر الواتساب لتأكيد الأداء وتفعيل الرصيد."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

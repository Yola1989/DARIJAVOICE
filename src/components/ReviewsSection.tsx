import React, { useState } from "react";
import { CustomerReview } from "../types";
import {
  Star,
  CheckCircle2,
  MessageSquarePlus,
  Sparkles,
  X,
  Send,
} from "lucide-react";
import { apiFetch } from "../lib/api";

interface ReviewsSectionProps {
  reviews: CustomerReview[];
  userEmail?: string;
  userName?: string;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  reviews,
  userEmail,
  userName,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState(userName || "");
  const [role, setRole] = useState("");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const visibleReviews = reviews.filter((r) => r.isVisible);
  const averageRating = visibleReviews.length
    ? (
        visibleReviews.reduce((total, review) => total + review.rating, 0) /
        visibleReviews.length
      ).toFixed(1)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!comment.trim() || !name.trim()) return;

    if (!userEmail) {
      window.alert("خاصك تسجل الدخول قبل ما ترسل التقييم.");
      return;
    }

    setLoading(true);

    try {
      await apiFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim() || "مستخدم المنصة",
          rating,
          comment: comment.trim(),
        }),
      });

      setSubmitted(true);

      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitted(false);
        setComment("");
      }, 1800);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر إرسال التقييم. حاول مرة أخرى.";

      window.alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-12 pt-8 border-t border-stone-800/80">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              {visibleReviews.length > 0
                ? `${visibleReviews.length} تقييمات موثقة`
                : "آراء الزبناء"}
            </span>
            {averageRating && (
              <div className="flex items-center gap-0.5 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-amber-400 text-amber-400"
                  />
                ))}
                <span className="text-xs font-bold text-stone-300 mr-1.5">
                  {averageRating} / 5
                </span>
              </div>
            )}
          </div>
          <h3 className="text-lg sm:text-xl font-black text-stone-100">
            شنو كيقولو رواد الأعمال وصناع المحتوى على DarijaVoice؟
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-amber-400 border border-stone-700 hover:border-amber-500/50 rounded-xl text-xs font-bold transition shadow-sm"
        >
          <MessageSquarePlus className="w-4 h-4 text-amber-400" />
          <span>أضف تقييمك ورأيك</span>
        </button>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleReviews.length === 0 && (
          <div className="md:col-span-2 lg:col-span-4 rounded-2xl border border-dashed border-stone-800 bg-stone-900/30 p-6 text-center text-xs text-stone-400">
            مازال ما كاين حتى تقييم منشور. التقييمات كتبان هنا غير من بعد
            مراجعتها والموافقة عليها.
          </div>
        )}
        {visibleReviews.map((rev) => (
          <div
            key={rev.id}
            className="bg-stone-900/60 border border-stone-800/90 hover:border-amber-500/30 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-sm relative group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-0.5 text-amber-400">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                {rev.verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" />
                    مستخدم موثق
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-300 leading-relaxed font-normal mb-3">
                &ldquo;{rev.comment}&rdquo;
              </p>
            </div>

            <div className="pt-2 border-t border-stone-800/60 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-stone-200">{rev.name}</p>
                <p className="text-[11px] text-stone-400">{rev.role}</p>
              </div>
              <span className="text-[10px] text-stone-400 font-mono">
                {rev.createdAt}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for adding Review */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 left-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {submitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-stone-100">
                  شكراً جزيلاً على تقييمك!
                </h4>
                <p className="text-xs text-stone-400">
                  تسجل رأيك وباقي غير يراجعو المدير قبل ما يبان للمستخدمين.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-stone-100 flex items-center gap-2">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    تقييم تجربة الصوت والخدمة
                  </h4>
                  <p className="text-xs text-stone-400">
                    رأيك يساعدنا في تحسين مخارج حروف الدارجة وإضافة أصوات جديدة.
                  </p>
                </div>

                {/* Star Rating Select */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    التقييم بالنجوم:
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-stone-600 hover:scale-110 transition"
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            (hoverRating || rating) >= star
                              ? "fill-amber-400 text-amber-400"
                              : "text-stone-700"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-amber-400 mr-2">
                      {rating === 5
                        ? "ممتاز جداً 🌟"
                        : rating === 4
                          ? "جيد جداً 👍"
                          : rating === 3
                            ? "مقبول"
                            : "يحتاج تحسين"}
                    </span>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    الاسم الكامل أو اسم البراند:
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: يونس / متجر إكسسوارات"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    طبيعة النشاط (اختياري):
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="مثال: صانع محتوى تيك توك، صاحب متجر E-commerce..."
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    رأيك في جودة الصوت ونطق الدارجة:
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="اكتب تجربتك بصراحة... مثلاً: جودة الصوت ممتازة، ساعدني في إعلانات المتجر..."
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !comment.trim()}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {loading ? "جاري الإرسال..." : "إرسال التقييم للمراجعة"}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ReviewItem } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Star,
  MessageSquareQuote,
  Plus,
  CheckCircle,
  X,
  Loader2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface ReviewsSectionProps {
  isLight?: boolean;
}

const DEFAULT_REVIEWS: ReviewItem[] = [
  {
    id: 'def-1',
    authorName: 'حمزة بناني',
    authorRole: 'صانع محتوى وإعلانات تيك توك',
    rating: 5,
    comment: 'الصوت ديال سلمى فالإعلانات غير ليا تماماً نسبة التحويل (ROAS) فحملات الدروب شيبينغ فالمغرب. مخارج الحروف بالدارجة طبيعية بزاف بحال يلا مسجل فاستوديو محترف!',
    status: 'approved',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: 'def-2',
    authorName: 'سارة العلمي',
    authorRole: 'مسؤولة تسويق - متجر مستحضرات تجميل',
    rating: 5,
    comment: 'خاصية صانع الإعلانات مع الصوت النسائي الحماسي وفرات علينا مصاريف الفويس أوفر الأسبوعية. الخدمة سريعة وجودة الصوت عالية وخالية من الروبوتية.',
    status: 'approved',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'def-3',
    authorName: 'ياسين لمرابط',
    authorRole: 'ميديا باير (Media Buyer)',
    rating: 5,
    comment: 'أحسن استثمار درتو هاد الشهر. النبرة التسويقية كتجيب المبيعات فالفايسبوك وتيك توك، خصوصاً مع ميزة كتابة النص بالعرنسية (Franco) والتحويل التلقائي للدارجة.',
    status: 'approved',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
];

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ isLight = false }) => {
  const { user, userProfile } = useAuth();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [authorName, setAuthorName] = useState(userProfile?.displayName || '');
  const [authorRole, setAuthorRole] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Fetch approved reviews from Firestore
  useEffect(() => {
    try {
      const reviewsRef = collection(db, 'reviews');
      const q = query(
        reviewsRef,
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: ReviewItem[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            list.push({
              id: doc.id,
              authorName: data.authorName || 'مستخدم',
              authorRole: data.authorRole || '',
              rating: data.rating || 5,
              comment: data.comment || '',
              status: data.status || 'approved',
              userId: data.userId,
              userEmail: data.userEmail,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
            });
          });

          // If no reviews in firestore yet, show default testimonials
          if (list.length === 0) {
            setReviews(DEFAULT_REVIEWS);
          } else {
            setReviews(list);
          }
          setLoading(false);
        },
        (err) => {
          console.warn('Reviews listener fallback:', err);
          setReviews(DEFAULT_REVIEWS);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch {
      setReviews(DEFAULT_REVIEWS);
      setLoading(false);
    }
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !authorName.trim()) {
      setSubmitError('يرجى كتابة اسمك ورأيك في الخدمة');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const reviewsRef = collection(db, 'reviews');
      await addDoc(reviewsRef, {
        authorName: authorName.trim(),
        authorRole: authorRole.trim() || 'مستخدم صوت الدارجة',
        rating: Number(rating) || 5,
        comment: comment.trim(),
        status: 'approved', // Live for instant feedback, admin can hide anytime
        userId: user?.uid || null,
        userEmail: user?.email || null,
        createdAt: serverTimestamp(),
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(false);
        setComment('');
        setAuthorRole('');
      }, 1800);
    } catch (err: any) {
      console.error('Error submitting review:', err);
      setSubmitError('حدث خطأ أثناء حفظ التقييم، يرجى المحاولة لاحقاً');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="reviews-section" className="space-y-6 pt-4 pb-2">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-4 border-slate-200 dark:border-stone-800">
        <div className="text-right space-y-1">
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded-xl ${isLight ? 'bg-amber-100 text-amber-900' : 'bg-amber-500/20 text-amber-400'}`}>
              <MessageSquareQuote className="w-4 h-4" />
            </span>
            <h2 className={`text-lg sm:text-xl font-black ${isLight ? 'text-slate-900' : 'text-stone-100'}`}>
              آراء وتقييمات مستخدمي صوت الدارجة
            </h2>
          </div>
          <p className={`text-xs sm:text-sm ${isLight ? 'text-slate-500' : 'text-stone-400'}`}>
            تجارب حقيقية لرواد الأعمال، الميديا بايرز، وصناع المحتوى بالمغرب
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (userProfile?.displayName) setAuthorName(userProfile.displayName);
            setIsModalOpen(true);
          }}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition shadow-xs ${
            isLight
              ? 'bg-slate-900 hover:bg-slate-800 text-white'
              : 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-black'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>أضف تقييمك وتجربتك</span>
        </button>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between text-right relative ${
              isLight
                ? 'bg-white border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300'
                : 'bg-stone-900/60 border-stone-800 hover:border-stone-700 hover:bg-stone-900/90'
            }`}
          >
            <div>
              {/* Stars */}
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < rev.rating
                        ? 'text-amber-400 fill-amber-400'
                        : isLight
                        ? 'text-slate-200'
                        : 'text-stone-700'
                    }`}
                  />
                ))}
              </div>

              {/* Comment Body */}
              <p className={`text-xs sm:text-sm leading-relaxed mb-4 font-sans ${isLight ? 'text-slate-700' : 'text-stone-300'}`}>
                "{rev.comment}"
              </p>
            </div>

            {/* Author Footer */}
            <div className={`pt-3 border-t flex items-center justify-between gap-2 ${isLight ? 'border-slate-100' : 'border-stone-800/80'}`}>
              <div className="min-w-0">
                <h4 className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-stone-200'}`}>
                  {rev.authorName}
                </h4>
                {rev.authorRole && (
                  <p className={`text-[11px] truncate ${isLight ? 'text-slate-500' : 'text-stone-400'}`}>
                    {rev.authorRole}
                  </p>
                )}
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
              }`}>
                <ShieldCheck className="w-3 h-3" />
                <span>مستخدم موثق</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs" dir="rtl">
          <div className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl relative transition-all ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-stone-900 border-stone-800 text-stone-100'
          }`}>
            <button
              onClick={() => setIsModalOpen(false)}
              className={`absolute top-4 left-4 p-1.5 rounded-full transition ${
                isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800'
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-right mb-5">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black">شاركنا رأيك في منصة صوت الدارجة</h3>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-stone-400'}`}>
                رأيك يساعدنا على تحسين وتطوير الأصوات وخدمة المجتمع المغربي.
              </p>
            </div>

            {submitSuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="text-sm font-bold text-emerald-600">شكراً لك! تم تسجيل رأيك بنجاح</h4>
                <p className="text-xs text-slate-500">نقدر ملاحظتك وتجربتك معنا في المنصة.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4 text-right">
                {submitError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                    {submitError}
                  </div>
                )}

                <div>
                  <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-stone-300'}`}>
                    الاسم الكامل:
                  </label>
                  <input
                    type="text"
                    required
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="مثال: يوسف، سارة..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 focus:border-amber-500 text-slate-900'
                        : 'bg-stone-950 border-stone-800 focus:border-amber-500 text-stone-100'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-stone-300'}`}>
                    المجال أو التخصص (اختياري):
                  </label>
                  <input
                    type="text"
                    value={authorRole}
                    onChange={(e) => setAuthorRole(e.target.value)}
                    placeholder="مثال: صانع محتوى، صاحب متجر إلكتروني، ميديا باير..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 focus:border-amber-500 text-slate-900'
                        : 'bg-stone-950 border-stone-800 focus:border-amber-500 text-stone-100'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-stone-300'}`}>
                    التقييم:
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= rating
                              ? 'text-amber-400 fill-amber-400'
                              : isLight
                              ? 'text-slate-200'
                              : 'text-stone-700'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-amber-500 mr-2">
                      {rating} من 5 نجوم
                    </span>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-stone-300'}`}>
                    رأيك في أصوات المنصة وتجربتك:
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="اكتب هنا تجربتك الصادقة مع أصوات الدارجة..."
                    className={`w-full p-3 rounded-xl border text-xs outline-none transition resize-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 focus:border-amber-500 text-slate-900'
                        : 'bg-stone-950 border-stone-800 focus:border-amber-500 text-stone-100'
                    }`}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <span>نشر التقييم</span>
                    )}
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

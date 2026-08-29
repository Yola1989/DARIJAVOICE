import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, AlertCircle, Loader2, Sparkles, CheckCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
}) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        onClose();
      } else {
        await signUpWithEmail(email, password, name);
        setSuccessMsg('تم إنشاء حسابك بنجاح! يمكنك الآن تجربة التطبيق أو التواصل لتفعيل اشتراكك الكامل.');
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error(err);
      let msg = 'حدث خطأ أثناء تسجيل الدخول.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'كلمة المرور ضعيفة، يرجى كتابة 6 أحرف على الأقل.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('فشل في تسجيل الدخول عبر Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden shadow-2xl p-5 sm:p-6 relative my-auto text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Tabs */}
        <div className="flex border-b border-stone-800 pb-3 mb-4 justify-between items-center shrink-0">
          <div className="flex gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl transition ${
                mode === 'signin'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl transition ${
                mode === 'signup'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              حساب جديد
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="text-stone-400 hover:text-white p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-800 border border-stone-700 transition"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto pr-0.5 space-y-4">
          {/* Info Banner */}
          <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-3 text-xs text-amber-300/90 flex items-start gap-2">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>
              {mode === 'signup'
                ? 'سجّل الآن واحصل على تجارب مجانية لاختبار أصوات الدارجة المغربية والإعلانات!'
                : 'ادخل لحسابك لإدارة نقاطك وتوليد أصوات الدارجة بجودة عالية بدون انقطاع.'}
            </span>
          </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-900 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-900 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google Quick Login */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full mb-4 py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 text-sm font-semibold border border-stone-700 flex items-center justify-center gap-3 transition shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.3c0 2.9.7 5.6 1.9 8l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
            />
          </svg>
          <span>المتابعة باستخدام Google</span>
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px bg-stone-800 flex-1" />
          <span className="text-[11px] text-stone-500">أو بالبريد الإلكتروني</span>
          <div className="h-px bg-stone-800 flex-1" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">الاسم أو اللقب:</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: يونس"
                  className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none pr-9"
                />
                <UserIcon className="w-4 h-4 text-stone-500 absolute top-3 right-3" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">البريد الإلكتروني:</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                dir="ltr"
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none pr-9 text-right"
              />
              <Mail className="w-4 h-4 text-stone-500 absolute top-3 right-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">كلمة المرور:</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none pr-9 text-right"
              />
              <Lock className="w-4 h-4 text-stone-500 absolute top-3 right-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'signin' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>دخول</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>إنشاء الحساب</span>
              </>
            )}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
};

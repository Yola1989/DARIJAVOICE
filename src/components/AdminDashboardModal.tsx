import React, { useState, useEffect } from 'react';
import { useAuth, isUserAdminEmail } from '../context/AuthContext';
import { db } from '../lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';
import { UserProfile, AppSettings, CustomerReview } from '../types';
import { DEFAULT_REVIEWS } from '../data/presets';
import {
  Users,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Plus,
  Coins,
  Search,
  Settings,
  RefreshCw,
  PhoneCall,
  Save,
  Clock,
  Sparkles,
  Sliders,
  Trash2,
  X,
  CreditCard,
  Send,
  Star,
  Eye,
  EyeOff,
  MessageSquare,
} from 'lucide-react';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, userProfile, appSettings } = useAuth();
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [reviewsList, setReviewsList] = useState<CustomerReview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'reviews' | 'pricing' | 'settings'>('users');
  const [loading, setLoading] = useState(true);


  // Settings form state
  const [settingsForm, setSettingsForm] = useState<AppSettings>(appSettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Selected user for editing tokens / status
  const [selectedUserEdit, setSelectedUserEdit] = useState<UserProfile | null>(null);
  const [addTokensAmount, setAddTokensAmount] = useState<number>(500);

  useEffect(() => {
    setSettingsForm(appSettings);
  }, [appSettings]);

  useEffect(() => {
    if (!isOpen) return;

    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'));

    const unsubscribeUsers = onSnapshot(
      q,
      (snapshot) => {
        const users: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          users.push(docSnap.data() as UserProfile);
        });
        setUsersList(users);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching users:', err);
        setLoading(false);
      }
    );

    // Fetch and Subscribe to reviews
    fetch('/api/reviews')
      .then((res) => res.json())
      .then((data) => {
        if (data.reviews && Array.isArray(data.reviews)) {
          setReviewsList(data.reviews);
        }
      })
      .catch(() => {});

    const reviewsRef = collection(db, 'reviews');
    const unsubscribeReviews = onSnapshot(
      reviewsRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const revs: CustomerReview[] = [];
          snapshot.forEach((docSnap) => {
            revs.push({ id: docSnap.id, ...(docSnap.data() as Omit<CustomerReview, 'id'>) });
          });
          // Merge with defaults to keep all reviews visible
          const existingIds = new Set(revs.map((r) => r.id));
          const merged = [...revs, ...DEFAULT_REVIEWS.filter((d) => !existingIds.has(d.id))];
          setReviewsList(merged);
        }
      },
      (err) => {
        console.warn('Error fetching reviews from Firestore:', err);
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeReviews();
    };
  }, [isOpen]);


  if (!isOpen) return null;

  const isAdmin = userProfile?.role === 'admin' || isUserAdminEmail(user?.email);

  // Verify Admin role
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 max-w-sm text-center">
          <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-100 mb-1">غير مصرح لك بالدخول</h3>
          <p className="text-xs text-stone-400 mb-4">
            هذه اللوحة مخصصة فقط لمدير الموقع (Admin) للتحكم بالمشتركين والنقاط.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl"
          >
            إغلاق
          </button>
        </div>
      </div>
    );
  }

  // Filter Users
  const filteredUsers = usersList.filter((u) => {
    const matchSearch =
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.id || '').includes(searchQuery);

    if (filterStatus === 'all') return matchSearch;
    return matchSearch && u.status === filterStatus;
  });

  // Action: Toggle Status (Activate / Suspend)
  const handleToggleStatus = async (userToUpdate: UserProfile) => {
    const newStatus = userToUpdate.status === 'active' ? 'pending' : 'active';
    try {
      const userRef = doc(db, 'users', userToUpdate.id);
      await updateDoc(userRef, {
        status: newStatus,
        // If activating and has 0 tokens, grant starter tokens (15,000)
        tokens: newStatus === 'active' && (userToUpdate.tokens || 0) < 500 ? 15000 : userToUpdate.tokens,
        subscriptionTier: newStatus === 'active' && userToUpdate.subscriptionTier === 'free' ? 'starter' : userToUpdate.subscriptionTier,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Action: Add / Set Tokens
  const handleAddTokens = async (userId: string, currentTokens: number) => {
    try {
      const userRef = doc(db, 'users', userId);
      const newTotal = currentTokens + Number(addTokensAmount);
      await updateDoc(userRef, {
        tokens: newTotal,
        status: 'active', // auto activate when charging tokens
        updatedAt: new Date().toISOString(),
      });
      setSelectedUserEdit(null);
    } catch (err) {
      console.error('Error adding tokens:', err);
    }
  };

  // Action: Update Tier with exact plan tokens
  const handleSetTier = async (userId: string, tier: 'free' | 'starter' | 'pro' | 'business' | 'unlimited') => {
    try {
      const userRef = doc(db, 'users', userId);
      let tokensToAdd = 0;
      let freeTrials = 0;

      if (tier === 'free') {
        tokensToAdd = 0;
        freeTrials = appSettings.freeTrialsDefaultCount || 2;
      } else if (tier === 'starter') {
        tokensToAdd = 15000;
      } else if (tier === 'pro') {
        tokensToAdd = 50000;
      } else if (tier === 'business') {
        tokensToAdd = 150000;
      } else if (tier === 'unlimited') {
        tokensToAdd = 999999;
      }

      await updateDoc(userRef, {
        subscriptionTier: tier,
        status: 'active',
        tokens: tokensToAdd,
        freeTrialsRemaining: tier === 'free' ? freeTrials : 999999,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error updating tier:', err);
    }
  };

  // Save Global Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      localStorage.setItem('darija_app_settings', JSON.stringify(settingsForm));
      await setDoc(doc(db, 'settings', 'global'), settingsForm, { merge: true });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving settings:', err);
      // Fallback local save indication
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 2500);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-stone-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-stone-900 border border-amber-500/30 rounded-3xl w-full max-w-5xl h-[94vh] sm:h-[90vh] flex flex-col overflow-hidden shadow-2xl relative text-right my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-3 sm:p-5 md:p-6 border-b border-stone-800 bg-stone-950/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-md shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base md:text-lg font-black text-white">لوحة تحكم المدير</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  VIP 👑
                </span>
              </div>
              <p className="text-[11px] text-stone-400">إدارة المشتركين، شحن النقاط (Tokens)، وتفعيل الحسابات</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Tabs */}
            <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs font-bold overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                  activeTab === 'users' ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                المستخدمين ({usersList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === 'reviews' ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>التقييمات ({reviewsList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pricing')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                  activeTab === 'pricing' ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                الأسعار
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                  activeTab === 'settings' ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                الإعدادات والواتساب
              </button>
            </div>


            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-300 hover:text-white rounded-xl bg-stone-800/80 hover:bg-stone-700 border border-stone-700 transition shrink-0"
              title="إغلاق اللوحة"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Users Management */}
        {activeTab === 'users' && (
          <div className="flex-1 flex flex-col min-h-0 p-4 md:p-6 space-y-4">
            {/* Stats Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-stone-950/60 border border-stone-800 p-3 rounded-2xl">
                <span className="text-xs text-stone-400">إجمالي المسجلين</span>
                <p className="text-lg font-black text-white">{usersList.length}</p>
              </div>
              <div className="bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-2xl">
                <span className="text-xs text-emerald-300">الحسابات المفعلة (نشطة)</span>
                <p className="text-lg font-black text-emerald-400">
                  {usersList.filter((u) => u.status === 'active').length}
                </p>
              </div>
              <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-2xl">
                <span className="text-xs text-amber-300">بانتظار التفعيل (Pending)</span>
                <p className="text-lg font-black text-amber-400">
                  {usersList.filter((u) => u.status === 'pending').length}
                </p>
              </div>
              <div className="bg-blue-950/30 border border-blue-800/40 p-3 rounded-2xl">
                <span className="text-xs text-blue-300">مجموع النقاط الموزعة</span>
                <p className="text-lg font-black text-blue-400">
                  {usersList.reduce((acc, u) => acc + (u.tokens || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالإيميل أو الاسم..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 pr-9"
                />
                <Search className="w-4 h-4 text-stone-500 absolute top-2.5 right-3" />
              </div>

              <div className="flex items-center gap-1.5">
                {['all', 'pending', 'active', 'suspended'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      filterStatus === st
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {st === 'all' && 'الكل'}
                    {st === 'pending' && 'قيد الانتظار'}
                    {st === 'active' && 'المفعلين'}
                    {st === 'suspended' && 'المعلقين'}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table / List */}
            <div className="flex-1 overflow-y-auto border border-stone-800 rounded-2xl bg-stone-950/40 divide-y divide-stone-800/60">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-stone-500 text-xs">
                  لا يوجد مستخدمين يطابقون البحث.
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-stone-900/50 transition"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          u.role === 'admin'
                            ? 'bg-amber-500 text-stone-950'
                            : u.status === 'active'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {u.displayName ? u.displayName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-stone-100">
                            {u.displayName || 'مستخدم'}
                          </span>
                          {u.role === 'admin' && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-stone-400 font-mono block">
                          {u.email}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${
                          u.status === 'active'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                            : u.status === 'pending'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                            : 'bg-rose-950/60 text-rose-300 border-rose-800/50'
                        }`}
                      >
                        {u.status === 'active' ? 'مفعل (نشط)' : u.status === 'pending' ? 'بانتظار التفعيل' : 'معلق'}
                      </span>

                      {/* Tokens Pill */}
                      <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 px-2.5 py-1 rounded-full text-xs text-amber-400 font-mono font-bold">
                        <Coins className="w-3.5 h-3.5" />
                        <span>{u.tokens?.toLocaleString() || 0} نقطة</span>
                      </div>

                      {/* Free Trials remaining */}
                      <span className="text-[10px] text-stone-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                        تجارب مجانية: {u.freeTrialsRemaining ?? 0}
                      </span>
                    </div>

                    {/* Actions Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Activate / Deactivate button */}
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                          u.status === 'active'
                            ? 'bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                        }`}
                      >
                        {u.status === 'active' ? (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>إلغاء التفعيل</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>تفعيل الحساب الآن</span>
                          </>
                        )}
                      </button>

                      {/* Add Tokens Button */}
                      <button
                        onClick={() => setSelectedUserEdit(u)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>شحن نقاط</span>
                      </button>

                      {/* Quick Tier change */}
                      <select
                        value={u.subscriptionTier || 'free'}
                        onChange={(e) => handleSetTier(u.id, e.target.value as any)}
                        className="bg-stone-900 border border-stone-800 rounded-xl px-2 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
                      >
                        <option value="free">مجاني (Free)</option>
                        <option value="starter">باقة البداية (Starter)</option>
                        <option value="pro">باقة المحترفين (Pro)</option>
                        <option value="business">باقة الأعمال (Business)</option>
                        <option value="unlimited">غير محدود (VIP)</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Pricing Packages Overview */}
        {activeTab === 'pricing' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-stone-100 mb-1">باقات ونماذج الاشتراك للزبائن</h3>
              <p className="text-xs text-stone-400">
                هذه الباقات التي تظهر للمشتركين عند طلب الشحن أو التواصل عبر الواتساب:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Starter Pack */}
              <div className="bg-stone-950 border border-stone-800 p-5 rounded-2xl relative space-y-4">
                <span className="text-xs font-bold text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-800/30">
                  باقة المبتدئين (Starter)
                </span>
                <div className="flex items-baseline gap-1 text-2xl font-black text-white">
                  <span>{settingsForm.starterPriceMAD}</span>
                  <span className="text-xs text-stone-400">درهم مغربي</span>
                </div>
                <ul className="text-xs text-stone-300 space-y-2">
                  <li className="flex items-center gap-1.5">✓ <strong>15,000 حرف/نقطة</strong> (~40 إعلان أو 30 دقيقة)</li>
                  <li className="flex items-center gap-1.5">✓ جميع الأصوات المغربية الأساسية</li>
                  <li className="flex items-center gap-1.5">✓ تحميل MP3/WAV بجودة عالية</li>
                </ul>
              </div>

              {/* Pro Pack */}
              <div className="bg-gradient-to-b from-amber-950/30 to-stone-950 border-2 border-amber-500/80 p-5 rounded-2xl relative space-y-4 shadow-xl">
                <span className="text-xs font-bold text-stone-950 bg-amber-500 px-3 py-1 rounded-full">
                  ⭐ الأكثر طلباً (Pro)
                </span>
                <div className="flex items-baseline gap-1 text-2xl font-black text-amber-400">
                  <span>{settingsForm.proPriceMAD}</span>
                  <span className="text-xs text-stone-400">درهم مغربي</span>
                </div>
                <ul className="text-xs text-stone-200 space-y-2">
                  <li className="flex items-center gap-1.5">✓ <strong>50,000 حرف/نقطة</strong> (~150 إعلان أو ساعتين ونصف)</li>
                  <li className="flex items-center gap-1.5">✓ أصوات الإعلانات الحصرية (سلمى، المهدي، أنس...)</li>
                  <li className="flex items-center gap-1.5">✓ صياغة وتوليد إعلانات Reels/TikTok بالـ AI</li>
                  <li className="flex items-center gap-1.5">✓ دعم فني وتفعيل فوري عبر الواتساب</li>
                </ul>
              </div>

              {/* Business Pack */}
              <div className="bg-stone-950 border border-stone-800 p-5 rounded-2xl relative space-y-4">
                <span className="text-xs font-bold text-blue-400 bg-blue-950/40 px-2.5 py-1 rounded-full border border-blue-800/30">
                  باقة صناع المحتوى والشركات (Business)
                </span>
                <div className="flex items-baseline gap-1 text-2xl font-black text-white">
                  <span>{settingsForm.businessPriceMAD}</span>
                  <span className="text-xs text-stone-400">درهم مغربي</span>
                </div>
                <ul className="text-xs text-stone-300 space-y-2">
                  <li className="flex items-center gap-1.5">✓ <strong>150,000 حرف/نقطة</strong> (~450 إعلان أو 6 ساعات)</li>
                  <li className="flex items-center gap-1.5">✓ نصوص غير محدودة الطول في التوليد</li>
                  <li className="flex items-center gap-1.5">✓ خوادم مخصصة بأعلى سرعة معالجة</li>
                  <li className="flex items-center gap-1.5">✓ دعم فني VIP مخصص 24/7</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Customer Reviews Management */}
        {activeTab === 'reviews' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>إدارة آراء وتقييمات العملاء (Social Proof)</span>
                </h3>
                <p className="text-xs text-stone-400">
                  يمكنك التحكم في إظهار أو إخفاء أي تقييم يظهر في الموقع أو حذفه بالكامل.
                </p>
              </div>

              <div className="text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 font-bold">
                إجمالي التقييمات: {reviewsList.length} | الظاهرة في الموقع: {reviewsList.filter(r => r.isVisible).length}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {reviewsList.map((rev) => (
                <div
                  key={rev.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    rev.isVisible
                      ? 'bg-stone-950/80 border-stone-800'
                      : 'bg-stone-950/40 border-stone-900 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-100">{rev.name}</span>
                        {rev.verified && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/40">
                            موثق
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          rev.isVisible
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-stone-800 text-stone-400'
                        }`}>
                          {rev.isVisible ? 'ظاهر في الموقع' : 'مخفي'}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-400">{rev.role}</span>
                    </div>

                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(rev.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-stone-300 bg-stone-900/60 p-2.5 rounded-xl mb-3 border border-stone-800/60 leading-relaxed">
                    &ldquo;{rev.comment}&rdquo;
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-800/60 text-xs">
                    <span className="text-[10px] text-stone-500 font-mono">{rev.createdAt}</span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const newVis = !rev.isVisible;
                          // Optimistic update
                          setReviewsList((prev) =>
                            prev.map((r) => (r.id === rev.id ? { ...r, isVisible: newVis } : r))
                          );

                          // Server API call
                          try {
                            await fetch(`/api/reviews/${rev.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ isVisible: newVis }),
                            });
                          } catch (e) {}

                          // Firestore update
                          try {
                            const revDoc = doc(db, 'reviews', rev.id);
                            await updateDoc(revDoc, { isVisible: newVis });
                          } catch (e) {}
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition text-[11px] ${
                          rev.isVisible
                            ? 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {rev.isVisible ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>إخفاء من الموقع</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>إظهار في الموقع</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('هل أنت متأكد من رغبتك في حذف هذا التقييم؟')) {
                            // Optimistic update
                            setReviewsList((prev) => prev.filter((r) => r.id !== rev.id));

                            // Server API call
                            try {
                              await fetch(`/api/reviews/${rev.id}`, { method: 'DELETE' });
                            } catch (e) {}

                            // Firestore delete
                            try {
                              const revDoc = doc(db, 'reviews', rev.id);
                              await deleteDoc(revDoc);
                            } catch (e) {}
                          }
                        }}
                        className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                        title="حذف التقييم"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Settings Form */}

        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-stone-200 mb-1">
                  رقم الواتساب لاستقبال طلبات الدفع والتفعيل:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={settingsForm.contactWhatsApp}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contactWhatsApp: e.target.value })}
                    placeholder="+212600000000"
                    dir="ltr"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                  <PhoneCall className="w-4 h-4 text-stone-500 absolute top-3 left-3" />
                </div>
                <span className="text-[10px] text-stone-500">
                  سيظهر زر مباشر في الموقع للمستخدمين للتواصل معك وتأكيد التحويل البنكي أو الكاش بلوس.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-200 mb-1">
                    عدد التجارب المجانية لكل مستخدم جديد:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={settingsForm.freeTrialsDefaultCount}
                    onChange={(e) => setSettingsForm({ ...settingsForm, freeTrialsDefaultCount: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-stone-500">افتراضياً: تجربتان مجانيتان</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-200 mb-1">
                    أقصى مدة للتجربة المجانية (بالثواني):
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={settingsForm.freeTrialMaxSeconds}
                    onChange={(e) => setSettingsForm({ ...settingsForm, freeTrialMaxSeconds: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-stone-500">مثال: 15 ثانية (تتيح سماع جملة أو إعلان تجريبي كامل)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-200 mb-1">
                  تعليمات وطرق الدفع المعروضة للمستخدم:
                </label>
                <textarea
                  rows={3}
                  value={settingsForm.paymentInstructions}
                  onChange={(e) => setSettingsForm({ ...settingsForm, paymentInstructions: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-100 focus:border-amber-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">سعر باقة Starter (درهم):</label>
                  <input
                    type="number"
                    value={settingsForm.starterPriceMAD}
                    onChange={(e) => setSettingsForm({ ...settingsForm, starterPriceMAD: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">سعر باقة Pro (درهم):</label>
                  <input
                    type="number"
                    value={settingsForm.proPriceMAD}
                    onChange={(e) => setSettingsForm({ ...settingsForm, proPriceMAD: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">سعر باقة Business (درهم):</label>
                  <input
                    type="number"
                    value={settingsForm.businessPriceMAD}
                    onChange={(e) => setSettingsForm({ ...settingsForm, businessPriceMAD: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs text-stone-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</span>
              </button>

              {settingsSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle className="w-4 h-4" /> تم حفظ الإعدادات بنجاح!
                </span>
              )}
            </form>
          </div>
        )}

        {/* Modal: Recharge Tokens for a single user */}
        {selectedUserEdit && (
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-stone-900 border border-amber-500/50 p-6 rounded-3xl max-w-md w-full text-right shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <h4 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>شحن نقاط وتفعيل للمستخدم</span>
                </h4>
                <button
                  onClick={() => setSelectedUserEdit(null)}
                  className="text-stone-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="bg-stone-950 p-3 rounded-xl text-xs space-y-1 text-stone-300">
                <p><strong>المستخدم:</strong> {selectedUserEdit.displayName || selectedUserEdit.email}</p>
                <p><strong>الإيميل:</strong> {selectedUserEdit.email}</p>
                <p><strong>الرصيد الحالي:</strong> {selectedUserEdit.tokens || 0} نقطة</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  النقاط الإضافية للشحن (Tokens):
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                  {[
                    { label: '+15k (Starter)', val: 15000 },
                    { label: '+50k (Pro)', val: 50000 },
                    { label: '+150k (Business)', val: 150000 },
                    { label: '+5k', val: 5000 },
                    { label: '+1k', val: 1000 },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setAddTokensAmount(item.val)}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition ${
                        addTokensAmount === item.val
                          ? 'bg-amber-500 text-stone-950 border-amber-400'
                          : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={addTokensAmount}
                  onChange={(e) => setAddTokensAmount(Number(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleAddTokens(selectedUserEdit.id, selectedUserEdit.tokens || 0)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  تأكيد الشحن والتفعيل
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserEdit(null)}
                  className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs rounded-xl transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

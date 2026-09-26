import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { UserProfile, AppSettings, ReviewItem } from '../types';
import {
  Users,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Plus,
  Coins,
  Search,
  Settings,
  PhoneCall,
  Save,
  Clock,
  Sparkles,
  Gift,
  X,
  RefreshCw,
  Star,
  Eye,
  EyeOff,
  Trash2,
  MessageSquareQuote,
  Download,
} from 'lucide-react';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { userProfile, appSettings } = useAuth();
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'reviews' | 'pricing' | 'settings'>('users');
  const [loading, setLoading] = useState(true);

  // New review modal state
  const [isAddReviewModalOpen, setIsAddReviewModalOpen] = useState(false);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewRole, setNewReviewRole] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [addingReview, setAddingReview] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<AppSettings>(appSettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Selected user for editing tokens / status
  const [selectedUserEdit, setSelectedUserEdit] = useState<UserProfile | null>(null);
  const [selectedPlanTier, setSelectedPlanTier] = useState<'mini' | 'starter' | 'pro' | 'business' | 'custom'>('pro');
  const [addTokensAmount, setAddTokensAmount] = useState<number>(108000);
  const [validityMonthsInput, setValidityMonthsInput] = useState<number>(6);

  useEffect(() => {
    setSettingsForm({
      ...appSettings,
      businessPriceMAD: (!appSettings.businessPriceMAD || appSettings.businessPriceMAD < 500) ? 599 : appSettings.businessPriceMAD,
    });
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

    const reviewsRef = collection(db, 'reviews');
    const qReviews = query(reviewsRef, orderBy('createdAt', 'desc'));
    const unsubscribeReviews = onSnapshot(
      qReviews,
      (snapshot) => {
        const revs: ReviewItem[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          revs.push({
            id: docSnap.id,
            authorName: d.authorName || 'مستخدم',
            authorRole: d.authorRole || '',
            rating: d.rating || 5,
            comment: d.comment || '',
            status: d.status || 'approved',
            userId: d.userId,
            userEmail: d.userEmail,
            createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt || new Date().toISOString(),
          });
        });
        setReviewsList(revs);
      },
      (err) => {
        console.error('Error fetching reviews:', err);
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeReviews();
    };
  }, [isOpen]);

  // Action: Toggle Review Visibility (Approved vs Hidden)
  const handleToggleReviewStatus = async (rev: ReviewItem) => {
    const nextStatus = rev.status === 'approved' ? 'hidden' : 'approved';
    try {
      const ref = doc(db, 'reviews', rev.id);
      await updateDoc(ref, {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error toggling review status:', err);
    }
  };

  // Action: Delete Review
  const handleDeleteReview = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا التقييم نهائياً؟')) return;
    try {
      await deleteDoc(doc(db, 'reviews', id));
    } catch (err) {
      console.error('Error deleting review:', err);
    }
  };

  // Action: Add Admin Review manually
  const handleAddAdminReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) return;
    setAddingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        authorName: newReviewAuthor.trim(),
        authorRole: newReviewRole.trim() || 'عميل موثق',
        rating: Number(newReviewRating) || 5,
        comment: newReviewComment.trim(),
        status: 'approved',
        userId: userProfile?.id || null,
        userEmail: userProfile?.email || null,
        createdAt: serverTimestamp(),
      });
      setIsAddReviewModalOpen(false);
      setNewReviewAuthor('');
      setNewReviewRole('');
      setNewReviewComment('');
    } catch (err) {
      console.error('Error creating review:', err);
    } finally {
      setAddingReview(false);
    }
  };

  if (!isOpen) return null;

  // Verify Admin role
  if (userProfile?.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm" dir="rtl">
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
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Action: Add / Recharge Tokens with Plan Expiry and 10-Minute Launch Bonus logic
  const handleRechargeUser = async (targetUser: UserProfile) => {
    try {
      const userRef = doc(db, 'users', targetUser.id);
      const settingsRef = doc(db, 'settings', 'global');
      const now = new Date();

      // Calculate expiration: strictly replace old validity
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + Number(validityMonthsInput || 3));

      // Launch Bonus Check: First 100 paying customers get 10 minutes free on FIRST charge automatically
      let bonusTokens = 0;
      let grantBonus = false;
      const bonusLimit = appSettings.launchBonusLimit || 100;
      const claimedCount = appSettings.launchBonusClaimedCount || 0;

      if (
        appSettings.launchBonusEnabled !== false &&
        !targetUser.launchBonusGrantedAt &&
        claimedCount < bonusLimit
      ) {
        grantBonus = true;
        // 10 minutes = 600 seconds * 10 tokens/sec = 6000 tokens
        const bonusMinutes = appSettings.launchBonusMinutes || 10;
        bonusTokens = bonusMinutes * 60 * (appSettings.tokensPerSecond || 10);
      }

      // STRICT RULE: Renewal replaces old balance completely (التجديد كيعوض الرصيد القديم)
      const finalTokens = Number(addTokensAmount) + bonusTokens;

      const userUpdatePayload: any = {
        tokens: finalTokens,
        status: 'active',
        subscriptionTier: selectedPlanTier === 'custom' ? 'starter' : selectedPlanTier,
        creditsExpireAt: expiryDate.toISOString(),
        updatedAt: now.toISOString(),
      };

      if (grantBonus) {
        userUpdatePayload.launchBonusGrantedAt = now.toISOString();
        userUpdatePayload.launchBonusMinutes = appSettings.launchBonusMinutes || 10;
        // Increment global claimed count
        await updateDoc(settingsRef, {
          launchBonusClaimedCount: claimedCount + 1,
        });
      }

      await updateDoc(userRef, userUpdatePayload);
      setSelectedUserEdit(null);
    } catch (err) {
      console.error('Error recharging user:', err);
    }
  };

  // Action: Direct Tier assignment (also includes auto 10-min launch bonus if user is eligible!)
  const handleSetTier = async (targetUser: UserProfile, tier: 'free' | 'mini' | 'starter' | 'pro' | 'business' | 'unlimited') => {
    try {
      const userRef = doc(db, 'users', targetUser.id);
      const settingsRef = doc(db, 'settings', 'global');
      const now = new Date();

      let baseTokens = 0;
      let months = 3;

      if (tier === 'mini') {
        baseTokens = 18000;
        months = 3;
      } else if (tier === 'starter') {
        baseTokens = 36000;
        months = 3;
      } else if (tier === 'pro') {
        baseTokens = 108000;
        months = 6;
      } else if (tier === 'business') {
        baseTokens = 432000;
        months = 12;
      } else if (tier === 'unlimited') {
        baseTokens = 999999;
        months = 120;
      }

      // Launch Bonus Check: First 100 paying customers get 10 minutes free on FIRST charge automatically
      let bonusTokens = 0;
      let grantBonus = false;
      const bonusLimit = appSettings.launchBonusLimit || 100;
      const claimedCount = appSettings.launchBonusClaimedCount || 0;

      if (
        tier !== 'free' &&
        appSettings.launchBonusEnabled !== false &&
        !targetUser.launchBonusGrantedAt &&
        claimedCount < bonusLimit
      ) {
        grantBonus = true;
        const bonusMinutes = appSettings.launchBonusMinutes || 10;
        bonusTokens = bonusMinutes * 60 * (appSettings.tokensPerSecond || 10);
      }

      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + months);

      const updateData: any = {
        subscriptionTier: tier,
        status: tier === 'free' ? 'pending' : 'active',
        tokens: baseTokens + bonusTokens,
        creditsExpireAt: tier === 'free' ? null : expiryDate.toISOString(),
        updatedAt: now.toISOString(),
      };

      if (grantBonus) {
        updateData.launchBonusGrantedAt = now.toISOString();
        updateData.launchBonusMinutes = appSettings.launchBonusMinutes || 10;
        await updateDoc(settingsRef, {
          launchBonusClaimedCount: claimedCount + 1,
        });
      }

      await updateDoc(userRef, updateData);
    } catch (err) {
      console.error('Error updating tier:', err);
    }
  };

  // Save Global Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...settingsForm,
        businessPriceMAD: settingsForm.businessPriceMAD || 599,
      }, { merge: true });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-stone-950/85 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
      <div className="bg-stone-900 border border-amber-500/30 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl relative text-right">
        {/* Top Header */}
        <div className="p-4 md:p-6 border-b border-stone-800 bg-stone-950/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-md">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black text-white">لوحة تحكم المدير (Admin Dashboard)</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  حساب المدير مفعل 👑
                </span>
              </div>
              <p className="text-xs text-stone-400">إدارة المشتركين، شحن الباقات، وتحديد مدة الصلاحية</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs font-bold">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'users' ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                المستخدمين ({usersList.length})
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'reviews' ? 'bg-amber-500 text-stone-950 font-black' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <MessageSquareQuote className="w-3.5 h-3.5" />
                <span>التعليقات والتقييمات ({reviewsList.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'pricing' ? 'bg-amber-500 text-stone-950 font-black' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                باقات الأسعار
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'settings' ? 'bg-amber-500 text-stone-950 font-black' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                الإعدادات وهدية الإطلاق
              </button>
            </div>

            {/* Direct Project ZIP Backup Button */}
            <a
              href="/darijavoices-full-backup.zip"
              download="darijavoices-full-backup.zip"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 transition shadow-sm"
              title="تحميل نسخة احتياطية كاملة للمشروع وملفات الكود"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تحميل كود المشروع (ZIP)</span>
              <span className="sm:hidden">ZIP</span>
            </a>

            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition"
              title="إغلاق اللوحة"
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
                <p className="text-lg font-black text-white" dir="ltr">{usersList.length}</p>
              </div>
              <div className="bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-2xl">
                <span className="text-xs text-emerald-300">الحسابات المفعلة (نشطة)</span>
                <p className="text-lg font-black text-emerald-400" dir="ltr">
                  {usersList.filter((u) => u.status === 'active').length}
                </p>
              </div>
              <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-2xl">
                <span className="text-xs text-amber-300">بانتظار التفعيل (Pending)</span>
                <p className="text-lg font-black text-amber-400" dir="ltr">
                  {usersList.filter((u) => u.status === 'pending').length}
                </p>
              </div>
              <div className="bg-blue-950/30 border border-blue-800/40 p-3 rounded-2xl">
                <span className="text-xs text-blue-300">مستفيدي بونيس الإطلاق</span>
                <p className="text-lg font-black text-blue-400" dir="ltr">
                  {appSettings.launchBonusClaimedCount || 0} / {appSettings.launchBonusLimit || 100}
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
                    {st === 'all'
                      ? 'الكل'
                      : st === 'pending'
                      ? 'قيد الانتظار'
                      : st === 'active'
                      ? 'المفعلة'
                      : 'المعلقة'}
                  </button>
                ))}
              </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-stone-500 text-xs">لا يوجد مستخدمين مطابقين.</div>
              ) : (
                filteredUsers.map((u) => {
                  const isExpired = u.creditsExpireAt && new Date(u.creditsExpireAt).getTime() < Date.now();
                  return (
                    <div
                      key={u.id}
                      className="bg-stone-950/70 border border-stone-800/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 hover:border-stone-700 transition"
                    >
                      {/* User Identity */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-stone-800 text-stone-300 flex items-center justify-center font-bold text-xs uppercase">
                          {u.displayName?.[0] || u.email?.[0] || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-stone-100">{u.displayName || 'مستخدم'}</span>
                            {u.role === 'admin' && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                                مدير
                              </span>
                            )}
                            {u.launchBonusGrantedAt && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                                <Gift className="w-2.5 h-2.5" /> أخذ البونيس
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-stone-400 font-mono" dir="ltr">{u.email}</span>
                        </div>
                      </div>

                      {/* Status & Tokens */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${
                            u.status === 'active'
                              ? isExpired
                                ? 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                              : u.status === 'pending'
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                              : 'bg-rose-950/60 text-rose-300 border-rose-800/50'
                          }`}
                        >
                          {u.status === 'active'
                            ? isExpired
                              ? 'منتهي الصلاحية'
                              : 'مفعل (نشط)'
                            : u.status === 'pending'
                            ? 'بانتظار التفعيل'
                            : 'معلق'}
                        </span>

                        {/* Tokens Pill */}
                        <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 px-2.5 py-1 rounded-full text-xs text-amber-400 font-mono font-bold">
                          <Coins className="w-3.5 h-3.5" />
                          <span dir="ltr">{(u.tokens || 0).toLocaleString('en-US')}</span>
                          <span className="text-[10px] font-normal text-stone-400">نقطة</span>
                        </div>

                        {/* Expiry Date */}
                        {u.creditsExpireAt && (
                          <span className="text-[10px] text-stone-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                            صالح إلى: {new Date(u.creditsExpireAt).toLocaleDateString('ar-MA')}
                          </span>
                        )}
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
                              <span>تفعيل الحساب</span>
                            </>
                          )}
                        </button>

                        {/* Recharge Package Button */}
                        <button
                          onClick={() => {
                            setSelectedUserEdit(u);
                            setSelectedPlanTier('pro');
                            setAddTokensAmount(108000);
                            setValidityMonthsInput(6);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>شحن باقة</span>
                        </button>

                        {/* Quick Tier change */}
                        <select
                          value={u.subscriptionTier || 'free'}
                          onChange={(e) => handleSetTier(u, e.target.value as any)}
                          className="bg-stone-900 border border-stone-800 rounded-xl px-2 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
                        >
                          <option value="free">مجاني (Free)</option>
                          <option value="mini">باقة Mini (3 أشهر)</option>
                          <option value="starter">باقة Starter (3 أشهر)</option>
                          <option value="pro">باقة Pro (6 أشهر)</option>
                          <option value="business">باقة Business (12 شهر)</option>
                          <option value="unlimited">غير محدود (VIP)</option>
                        </select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Pricing Packages Overview */}
        {activeTab === 'pricing' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-stone-100 mb-1">باقات ونماذج الاشتراك مسبقة الدفع المعروضة للزبائن</h3>
              <p className="text-xs text-stone-400">
                هذه الباقات التي تظهر للمشتركين عند فتح نافذة الترقية والطلب عبر الواتساب:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Mini Pack */}
              <div className="bg-stone-950 border border-stone-800 p-5 rounded-2xl relative space-y-4">
                <span className="text-xs font-bold text-stone-300 bg-stone-900 px-2.5 py-1 rounded-full border border-stone-800 font-mono">
                  Mini
                </span>
                <div className="flex items-baseline gap-1 text-2xl font-black text-white">
                  <span dir="ltr" className="font-mono">{settingsForm.miniPriceMAD || 59}</span>
                  <span className="text-xs text-stone-400">درهم / شحنة</span>
                </div>
                <ul className="text-xs text-stone-300 space-y-2">
                  <li className="flex items-center gap-1.5">✓ 30 دقيقة صوت تقريباً</li>
                  <li className="flex items-center gap-1.5">✓ <span dir="ltr" className="font-mono font-bold">18,000</span> نقطة</li>
                  <li className="flex items-center gap-1.5">✓ جميع الأصوات والاستعمال التجاري</li>
                  <li className="flex items-center gap-1.5 text-amber-300 font-semibold">✓ صلاحية الرصيد: 3 أشهر</li>
                </ul>
              </div>

              {/* Starter Pack */}
              <div className="bg-stone-950 border border-stone-800 p-5 rounded-2xl relative space-y-4">
                <span className="text-xs font-bold text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-800/30 font-mono">
                  Starter
                </span>
                <div className="flex items-baseline gap-1 text-2xl font-black text-white">
                  <span dir="ltr" className="font-mono">{settingsForm.starterPriceMAD || 99}</span>
                  <span className="text-xs text-stone-400">درهم / شحنة</span>
                </div>
                <ul className="text-xs text-stone-300 space-y-2">
                  <li className="flex items-center gap-1.5">✓ 60 دقيقة صوت تقريباً</li>
                  <li className="flex items-center gap-1.5">✓ <span dir="ltr" className="font-mono font-bold">36,000</span> نقطة</li>
                  <li className="flex items-center gap-1.5">✓ جميع الأصوات والاستعمال التجاري</li>
                  <li className="flex items-center gap-1.5 text-amber-300 font-semibold">✓ صلاحية الرصيد: 3 أشهر</li>
                </ul>
              </div>

              {/* Pro Pack */}
              <div className="bg-gradient-to-b from-amber-950/30 to-stone-950 border-2 border-amber-500/80 p-5 rounded-2xl relative space-y-4 shadow-xl">
                <span className="text-xs font-bold text-stone-950 bg-amber-500 px-3 py-1 rounded-full font-mono">
                  ⭐ الأكثر طلباً (Pro)
                </span>
                <div className="flex items-baseline gap-1 text-2xl font-black text-amber-400">
                  <span dir="ltr" className="font-mono">{settingsForm.proPriceMAD || 199}</span>
                  <span className="text-xs text-stone-400">درهم / شحنة</span>
                </div>
                <ul className="text-xs text-stone-200 space-y-2">
                  <li className="flex items-center gap-1.5">✓ 180 دقيقة صوت تقريباً</li>
                  <li className="flex items-center gap-1.5">✓ <span dir="ltr" className="font-mono font-bold">108,000</span> نقطة</li>
                  <li className="flex items-center gap-1.5">✓ جميع الأصوات والاستعمال التجاري</li>
                  <li className="flex items-center gap-1.5 text-amber-300 font-semibold">✓ صلاحية الرصيد: 6 أشهر</li>
                </ul>
              </div>

              {/* Business Pack */}
              <div className="bg-stone-950 border border-stone-800 p-5 rounded-2xl relative space-y-4">
                <span className="text-xs font-bold text-blue-400 bg-blue-950/40 px-2.5 py-1 rounded-full border border-blue-800/30 font-mono">
                  Business
                </span>
                <div className="flex items-baseline gap-1 text-2xl font-black text-white">
                  <span dir="ltr" className="font-mono">{settingsForm.businessPriceMAD || 599}</span>
                  <span className="text-xs text-stone-400">درهم / شحنة</span>
                </div>
                <ul className="text-xs text-stone-300 space-y-2">
                  <li className="flex items-center gap-1.5">✓ 720 دقيقة صوت تقريباً</li>
                  <li className="flex items-center gap-1.5">✓ <span dir="ltr" className="font-mono font-bold">432,000</span> نقطة</li>
                  <li className="flex items-center gap-1.5">✓ جميع الأصوات والاستعمال التجاري</li>
                  <li className="flex items-center gap-1.5 text-amber-300 font-semibold">✓ صلاحية الرصيد: 12 شهر</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Settings Form */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-stone-200 mb-1">
                  رقم الواتساب لاستقبال طلبات الدفع والتفعيل والتواصل:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={settingsForm.contactWhatsApp}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contactWhatsApp: e.target.value })}
                    placeholder="مثال: 212612345678"
                    dir="ltr"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                  <PhoneCall className="w-4 h-4 text-stone-500 absolute top-3 left-3" />
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  هذا الرقم هو الذي تفتح عليه محادثات الواتساب في زر "تواصل معنا"، الفوتر، وباقات التفعيل (أدخل الرقم بصيغة الدخول الدولي، مثلاً 212600000000).
                </p>
              </div>

              {/* Launch Bonus Configuration */}
              <div className="bg-stone-950/90 border border-emerald-500/40 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Gift className="w-4 h-4" />
                  <span>إعدادات هدية الإطلاق (10 دقائق لأول 100 شحنة أولى)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">الحد الأقصى للمستفيدين:</label>
                    <input
                      type="number"
                      value={settingsForm.launchBonusLimit || 100}
                      onChange={(e) => setSettingsForm({ ...settingsForm, launchBonusLimit: Number(e.target.value) })}
                      className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2 text-xs text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">المستفيدين الحاليين:</label>
                    <input
                      type="number"
                      value={settingsForm.launchBonusClaimedCount || 0}
                      onChange={(e) => setSettingsForm({ ...settingsForm, launchBonusClaimedCount: Number(e.target.value) })}
                      className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2 text-xs text-stone-100"
                    />
                  </div>
                </div>
              </div>

              {/* Free Trial Policy Configuration */}
              <div className="bg-stone-950/90 border border-amber-500/30 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>إعدادات التجارب المجانية للمستخدمين الجدد (Free Trials):</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">عدد التجارب المجانية لكل حساب:</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={settingsForm.freeTrialsDefaultCount ?? 2}
                      onChange={(e) => setSettingsForm({ ...settingsForm, freeTrialsDefaultCount: Number(e.target.value) })}
                      className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2 text-xs text-stone-100 font-mono"
                    />
                    <span className="text-[10px] text-stone-400">الحالي: 2 تجارب مجانية</span>
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">الحد الأقصى لثواني التجربة (ثوانٍ):</label>
                    <input
                      type="number"
                      min={3}
                      max={60}
                      value={settingsForm.freeTrialMaxSeconds ?? 15}
                      onChange={(e) => setSettingsForm({ ...settingsForm, freeTrialMaxSeconds: Number(e.target.value) })}
                      className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2 text-xs text-stone-100 font-mono"
                    />
                    <span className="text-[10px] text-stone-400">الحالي: 15 ثانية لكل تجربة</span>
                  </div>
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">سعر Mini (درهم):</label>
                  <input
                    type="number"
                    value={settingsForm.miniPriceMAD || 59}
                    onChange={(e) => setSettingsForm({ ...settingsForm, miniPriceMAD: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs text-stone-100 font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">سعر Starter (درهم):</label>
                  <input
                    type="number"
                    value={settingsForm.starterPriceMAD || 99}
                    onChange={(e) => setSettingsForm({ ...settingsForm, starterPriceMAD: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs text-stone-100 font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">سعر Pro (درهم):</label>
                  <input
                    type="number"
                    value={settingsForm.proPriceMAD || 199}
                    onChange={(e) => setSettingsForm({ ...settingsForm, proPriceMAD: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs text-stone-100 font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">سعر Business (درهم):</label>
                  <input
                    type="number"
                    value={settingsForm.businessPriceMAD || 599}
                    onChange={(e) => setSettingsForm({ ...settingsForm, businessPriceMAD: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs text-stone-100 font-mono"
                    dir="ltr"
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

        {/* Tab: Reviews & Testimonials Management */}
        {activeTab === 'reviews' && (
          <div className="flex-1 flex flex-col min-h-0 p-4 md:p-6 space-y-4 overflow-y-auto">
            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-stone-950/60 border border-stone-800 p-3 rounded-2xl">
                <span className="text-xs text-stone-400">إجمالي التقييمات</span>
                <p className="text-lg font-black text-white" dir="ltr">{reviewsList.length}</p>
              </div>
              <div className="bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-2xl">
                <span className="text-xs text-emerald-300">الظاهرة في الموقع</span>
                <p className="text-lg font-black text-emerald-400" dir="ltr">
                  {reviewsList.filter((r) => r.status === 'approved').length}
                </p>
              </div>
              <div className="bg-stone-950/40 border border-stone-800 p-3 rounded-2xl">
                <span className="text-xs text-stone-400">المخفية من الموقع</span>
                <p className="text-lg font-black text-stone-300" dir="ltr">
                  {reviewsList.filter((r) => r.status === 'hidden').length}
                </p>
              </div>
              <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-2xl">
                <span className="text-xs text-amber-300">متوسط التقييم</span>
                <p className="text-lg font-black text-amber-400" dir="ltr">
                  {reviewsList.length > 0
                    ? (reviewsList.reduce((acc, r) => acc + (r.rating || 5), 0) / reviewsList.length).toFixed(1)
                    : '5.0'} ★
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-950/60 p-3 rounded-2xl border border-stone-800">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-stone-500 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم أو نص التعليق..."
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl pr-9 pl-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddReviewModalOpen(true)}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة تقييم جديد</span>
                </button>
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-3">
              {reviewsList.length === 0 ? (
                <div className="text-center py-12 text-stone-500 text-xs">
                  لا توجد أي تقييمات حتى الآن. يمكنك إضافة تقييم جديد يدويًا أو انتظار تقييمات الزوار.
                </div>
              ) : (
                reviewsList
                  .filter((r) => {
                    if (!searchQuery) return true;
                    return (
                      r.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.comment.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                  })
                  .map((rev) => {
                    const isApproved = rev.status === 'approved';
                    return (
                      <div
                        key={rev.id}
                        className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isApproved
                            ? 'bg-stone-900/80 border-stone-800'
                            : 'bg-stone-950/40 border-stone-800/60 opacity-70'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs text-stone-100">{rev.authorName}</span>
                            {rev.authorRole && (
                              <span className="text-[11px] text-stone-400 bg-stone-950 px-2 py-0.5 rounded-lg border border-stone-800">
                                {rev.authorRole}
                              </span>
                            )}
                            {/* Status Badge */}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isApproved
                                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
                                  : 'bg-stone-800 text-stone-400 border-stone-700'
                              }`}
                            >
                              {isApproved ? 'ظاهر للزوار بالموقع ✓' : 'مخفي ✕'}
                            </span>
                            {/* Stars */}
                            <div className="flex items-center gap-0.5 mr-auto">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${
                                    i < rev.rating
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-stone-700'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-stone-300 leading-relaxed font-sans">
                            "{rev.comment}"
                          </p>
                          <span className="text-[10px] text-stone-500 font-mono block">
                            {new Date(rev.createdAt).toLocaleString('ar-MA')}
                          </span>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-800">
                          <button
                            type="button"
                            onClick={() => handleToggleReviewStatus(rev)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                              isApproved
                                ? 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                            title={isApproved ? 'إخفاء التقييم من واجهة الموقع' : 'إظهار التقييم لجميع الزوار'}
                          >
                            {isApproved ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>إخفاء</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>إظهار بالموقع</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteReview(rev.id)}
                            className="p-2 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded-xl transition"
                            title="حذف التقييم نهائياً"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* Modal: Add Review by Admin */}
        {isAddReviewModalOpen && (
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-stone-900 border border-amber-500/50 p-6 rounded-3xl max-w-md w-full text-right shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <h4 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                  <MessageSquareQuote className="w-4 h-4 text-amber-400" />
                  <span>إضافة تقييم جديد (كـ Admin)</span>
                </h4>
                <button
                  onClick={() => setIsAddReviewModalOpen(false)}
                  className="text-stone-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddAdminReview} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">اسم العميل:</label>
                  <input
                    type="text"
                    required
                    value={newReviewAuthor}
                    onChange={(e) => setNewReviewAuthor(e.target.value)}
                    placeholder="مثال: يونس المرابط"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">الصفة أو التخصص:</label>
                  <input
                    type="text"
                    value={newReviewRole}
                    onChange={(e) => setNewReviewRole(e.target.value)}
                    placeholder="مثال: ميديا باير، متجر تجارة إلكترونية"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">التقييم:</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setNewReviewRating(s)}
                        className="p-1"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            s <= newReviewRating ? 'text-amber-400 fill-amber-400' : 'text-stone-700'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs text-amber-400 mr-2 font-bold">{newReviewRating} نجوم</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">نص التعليق / التقييم:</label>
                  <textarea
                    required
                    rows={3}
                    value={newReviewComment}
                    onChange={(e) => setNewReviewComment(e.target.value)}
                    placeholder="اكتب التقييم هنا..."
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500 leading-relaxed"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={addingReview}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl shadow-md transition"
                  >
                    {addingReview ? 'جاري الحفظ...' : 'نشر التقييم في الموقع'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddReviewModalOpen(false)}
                    className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs rounded-xl transition"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Recharge Tokens for a single user */}
        {selectedUserEdit && (
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-stone-900 border border-amber-500/50 p-6 rounded-3xl max-w-md w-full text-right shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <h4 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>شحن باقة وتفعيل للمستخدم</span>
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
                <p><strong>الإيميل:</strong> <span dir="ltr" className="font-mono">{selectedUserEdit.email}</span></p>
                <p><strong>الرصيد الحالي:</strong> <span dir="ltr" className="font-mono font-bold">{(selectedUserEdit.tokens || 0).toLocaleString('en-US')}</span> نقطة (سيتم تعويضه بالباقة الجديدة)</p>
                {selectedUserEdit.creditsExpireAt && (
                  <p className="text-amber-400"><strong>الصلاحية الحالية:</strong> {new Date(selectedUserEdit.creditsExpireAt).toLocaleDateString('ar-MA')}</p>
                )}
                {!selectedUserEdit.launchBonusGrantedAt && (appSettings.launchBonusClaimedCount || 0) < (appSettings.launchBonusLimit || 100) && (
                  <p className="text-emerald-400 font-bold">🎁 مؤهل لأخذ هدية الإطلاق (10 دقائق إضافية مجاناً)!</p>
                )}
              </div>

              {/* Quick Select Package */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  اختر الباقة المراد تفعيلها:
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanTier('mini');
                      setAddTokensAmount(18000);
                      setValidityMonthsInput(3);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-right transition ${
                      selectedPlanTier === 'mini'
                        ? 'bg-amber-500 text-stone-950 border-amber-400'
                        : 'bg-stone-800 text-stone-300 border-stone-700'
                    }`}
                  >
                    <div>باقة Mini (59 درهم)</div>
                    <div className="text-[10px] opacity-80"><span dir="ltr" className="font-mono">18,000</span> نقطة (3 أشهر)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanTier('starter');
                      setAddTokensAmount(36000);
                      setValidityMonthsInput(3);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-right transition ${
                      selectedPlanTier === 'starter'
                        ? 'bg-amber-500 text-stone-950 border-amber-400'
                        : 'bg-stone-800 text-stone-300 border-stone-700'
                    }`}
                  >
                    <div>باقة Starter (99 درهم)</div>
                    <div className="text-[10px] opacity-80"><span dir="ltr" className="font-mono">36,000</span> نقطة (3 أشهر)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanTier('pro');
                      setAddTokensAmount(108000);
                      setValidityMonthsInput(6);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-right transition ${
                      selectedPlanTier === 'pro'
                        ? 'bg-amber-500 text-stone-950 border-amber-400'
                        : 'bg-stone-800 text-stone-300 border-stone-700'
                    }`}
                  >
                    <div>باقة Pro (199 درهم)</div>
                    <div className="text-[10px] opacity-80"><span dir="ltr" className="font-mono">108,000</span> نقطة (6 أشهر)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanTier('business');
                      setAddTokensAmount(432000);
                      setValidityMonthsInput(12);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-right transition ${
                      selectedPlanTier === 'business'
                        ? 'bg-amber-500 text-stone-950 border-amber-400'
                        : 'bg-stone-800 text-stone-300 border-stone-700'
                    }`}
                  >
                    <div>باقة Business (599 درهم)</div>
                    <div className="text-[10px] opacity-80"><span dir="ltr" className="font-mono">432,000</span> نقطة (12 شهر)</div>
                  </button>
                </div>
              </div>

              {/* Number of months */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  مدة الصلاحية (بالأشهر):
                </label>
                <input
                  type="number"
                  value={validityMonthsInput}
                  onChange={(e) => setValidityMonthsInput(Number(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                  dir="ltr"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleRechargeUser(selectedUserEdit)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  تأكيد الشحن وتحديث الصلاحية
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

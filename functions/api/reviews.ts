export const onRequestGet = async () => {
  const defaultReviews = [
    {
      id: 'rev_1',
      name: 'أمين البرنوصي',
      role: 'صاحب متجر E-commerce وDropshipping',
      rating: 5,
      comment: 'صراحة صوت سلمى الإعلاني بدل ليا خدمة الفيديو كاملة! خدمت بيه 4 إعلانات فـ TikTok Ads ونتائج المبيعات كانت هربانة بلا ما نبقى نخلص فويس أوفر على كل فيديو.',
      verified: true,
      isVisible: true,
      createdAt: 'منذ يومين',
    },
    {
      id: 'rev_2',
      name: 'مريم التازي',
      role: 'صانعة محتوى وReels Creator',
      rating: 5,
      comment: 'نطق الدارجة طبيعي بزاف وحتى الكلمات الصعبة كينطقهم مقادين بلا لحن روبوتي. باقة Pro وافية ومكفية ونفعتني بزاف فالسوشيال ميديا.',
      verified: true,
      isVisible: true,
      createdAt: 'منذ 4 أيام',
    },
    {
      id: 'rev_3',
      name: 'ياسين المهدوي',
      role: 'Media Buyer ووكالة تسويق رقمي',
      rating: 5,
      comment: 'السرعة فالتوليد وجودة الـ WAV نقية بزاف. كنوفر أسبوع ديال التسجيل والتعديل فـ 5 ثواني فقط. منصة مغربية نفتخرو بيها 👏',
      verified: true,
      isVisible: true,
      createdAt: 'منذ أسبوع',
    },
    {
      id: 'rev_4',
      name: 'حمزة الشاوي',
      role: 'قناة بودكاست وشروحات يوتيوب',
      rating: 5,
      comment: 'صوت أنس وخديجة ممتاز فالشروحات والمقالات الطويلة. تفعيل النقاط كان فوري عبر الواتساب والدعم الفني متجاوبين وسريعين.',
      verified: true,
      isVisible: true,
      createdAt: 'منذ أسبوعين',
    },
  ];

  return new Response(JSON.stringify({ success: true, reviews: defaultReviews }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const onRequestPost = async (context: any) => {
  try {
    const { request } = context;
    const body: any = await request.json();
    const { name, role, rating, comment, verified } = body;

    const newReview = {
      id: `rev_${Date.now()}`,
      name: String(name || 'مستخدم').trim(),
      role: String(role || 'مستخدم المنصة').trim(),
      rating: Number(rating) || 5,
      comment: String(comment || '').trim(),
      verified: Boolean(verified),
      isVisible: true,
      createdAt: 'الآن',
    };

    return new Response(JSON.stringify({ success: true, review: newReview }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

# DarijaVoice 2.0

منصة تحويل نصوص الدارجة المغربية إلى صوت، مع تسجيل دخول Firebase، رصيد مسبق الدفع، طلبات شحن، لوحة مدير، وتقييمات خاضعة للمراجعة.

## المتطلبات

- Node.js 20 أو أحدث
- مشروع Firebase مضبوط في `firebase-applet-config.json`
- Firebase Admin credentials محلياً، أو Application Default Credentials على Cloud Run
- Gemini API key على الخادم فقط

## التشغيل محلياً

1. انسخ `.env.example` إلى `.env`.
2. اضبط القيم التالية داخل `.env`:

```env
GEMINI_API_KEY="YOUR_SERVER_KEY"
GEMINI_TEXT_MODEL="gemini-2.5-flash"
GOOGLE_APPLICATION_CREDENTIALS="C:/path/to/firebase-admin.json"
ALLOWED_ORIGINS="http://localhost:8080"
PORT="8080"
```

3. ثبّت وشغّل الفحص:

```bash
npm ci
npm run check
```

4. شغّل نسخة التطوير:

```bash
npm run dev
```

أو نسخة الإنتاج المحلية:

```bash
npm run build
npm start
```

## قواعد مهمة

- لا تضع `GEMINI_API_KEY` في متغير يبدأ بـ `VITE_`.
- لا ترفع `.env` أو Firebase Admin JSON إلى Git أو Cloud Run image.
- كل عمليات الرصيد، الاشتراكات، الإعدادات، والتقييمات تتم عبر الخادم مع Firebase ID token.
- الباقات رصيد مسبق الدفع وليست اشتراكاً يتجدد تلقائياً.
- صلاحية Mini وStarter وPro هي 6 أشهر، وBusiness هي 12 شهراً.
- أول 100 زبون مؤدٍ يحصل على 10 دقائق هدية في أول شحنة فقط.
- التقييم الجديد يبقى `pending` ومخفياً حتى يوافق عليه المدير.

## الباقات

| الباقة   |   السعر | الدقائق التقريبية |  النقاط |
| -------- | ------: | ----------------: | ------: |
| Mini     |  59 MAD |                30 |  18,000 |
| Starter  |  99 MAD |                60 |  36,000 |
| Pro      | 199 MAD |               180 | 108,000 |
| Business | 599 MAD |               720 | 432,000 |

## Cloud Run

البناء يعتمد على `Dockerfile`. اضبط على الخدمة:

- `GEMINI_API_KEY` من Secret Manager
- `GEMINI_TEXT_MODEL=gemini-2.5-flash`
- `ALLOWED_ORIGINS` بالنطاق النهائي فقط
- Firebase service identity / Application Default Credentials
- `PORT` يضبطه Cloud Run تلقائياً

بعد النشر، أضف نطاق Cloud Run والنطاق المخصص إلى Firebase Authentication > Authorized domains.

## فحص ما قبل الإطلاق

```bash
npm run check
npm audit --omit=dev
```

ثم اختبر بدون استهلاك Gemini أولاً:

- `/api/health` يرجع `200`.
- AI routes بدون تسجيل دخول ترجع `401`.
- إرسال تقييم مسجل ينشئ تقييماً `pending` لا يظهر للعامة.
- موافقة المدير تظهر التقييم، وحذفه يزيله.
- طلب باقة واحد يظهر في لوحة المدير ولا يشحن الرصيد إلا مرة واحدة عند الموافقة.

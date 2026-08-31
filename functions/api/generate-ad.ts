import { GoogleGenAI } from '@google/genai';

export const onRequestPost = async (context: any) => {
  try {
    const { request, env } = context;
    const body: any = await request.json();
    const { productName, audience, angle } = body;

    if (!productName) {
      return new Response(JSON.stringify({ error: 'Product name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is missing' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `أنت كاتب نصوص إعلانية محترف (Copywriter) متخصص في إعلانات التجارة الإلكترونية وتيك توك بالمغرب (TikTok Ads, Reels, Facebook Ads بالدارجة المغربية).

اكتب نص إعلاني صوتي جذاب جداً وقصير (بين 25 إلى 45 كلمة) بالدارجة المغربية للمنتج التالي:
- اسم/نوع المنتج: ${productName}
- الجمهور المستهدف: ${audience || 'المغاربة، رواد الشراء أونلاين'}
- زاوية الإعلان: ${angle || 'حل مشكلة، عرض خاص، توصيل سريع والدفع عند الاستلام'}

الشروط:
1. ابدأ بـ Hook قوي يجذب الانتباه في أول 3 ثواني.
2. اعرض ميزة المنتج وكيف يحل المشكلة بالدارجة الحية.
3. اختم بـ Call to Action واضح (سارع بالطلب الآن، التوصيل فابور حتى لباب الدار والدفع عند الاستلام).
4. أخرج النص الإعلاني فقط بدون أي تعليقات جانبية.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const script = response.text?.trim() || '';

    return new Response(JSON.stringify({ success: true, script }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Ad generation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

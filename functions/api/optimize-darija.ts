import { GoogleGenAI } from '@google/genai';

export const onRequestPost = async (context: any) => {
  try {
    const { request, env } = context;
    const body: any = await request.json();
    const { text, tone } = body;

    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
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

    const prompt = `أنت خبير لغوي متخصص في الدارجة المغربية المعاصرة وتشكيل مخارج الحروف لتوليد الأصوات بالذكاء الاصطناعي (TTS Pronunciation Specialist).
المهمة المطلوبة:
إعادة صياغة وضبط النص المغربي التالي ليكون بأعلى جودة نطق طبيعية وبدون أي ركاكة، مع مراعاة النبرة المطلوبة: "${tone || 'طبيعي ومقنع'}".

النص الأصلي:
${text}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const optimized = response.text?.trim() || text;

    return new Response(JSON.stringify({ success: true, optimizedText: optimized }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Optimization failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

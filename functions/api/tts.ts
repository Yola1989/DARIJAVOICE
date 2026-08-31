import { GoogleGenAI } from '@google/genai';

export const onRequestPost = async (context: any) => {
  try {
    const { request, env } = context;
    const body: any = await request.json();
    const { text, voiceId, tone } = body;

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

    const voiceMapping: Record<string, string> = {
      salma: 'Aoede',
      mehdi: 'Puck',
      khalid: 'Charon',
      imane: 'Kore',
      anas: 'Fenrir',
      khadija: 'Aoede',
    };

    const targetVoice = voiceMapping[voiceId] || 'Aoede';
    const promptText = `Speak naturally in Moroccan Arabic (Darija) with high clarity, native accent, and tone matching: "${tone || 'Natural'}". Text: ${text}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: targetVoice,
            },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts;
    let base64Audio = '';
    let mimeType = 'audio/mp3';

    if (parts && parts.length > 0) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          base64Audio = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'audio/mp3';
          break;
        }
      }
    }

    if (!base64Audio) {
      return new Response(
        JSON.stringify({ error: 'لم نتمكن من استخراج الصوت، يرجى المحاولة مرة أخرى.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, audioBase64: base64Audio, mimeType: mimeType }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'TTS generation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

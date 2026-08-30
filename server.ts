import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy/Safe AI client initialization
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * Mapping Moroccan Voice IDs to underlying Gemini TTS Prebuilt Voices
 */
const MOROCCAN_VOICE_MAP: Record<string, { geminiVoice: string; styleGuide: string }> = {
  khadija: {
    geminiVoice: 'Kore',
    styleGuide: 'Speak as Khadija, a warm, natural Moroccan woman speaking authentic Darija.',
  },
  salma_ads: {
    geminiVoice: 'Aoede',
    styleGuide: 'Speak as Salma, a top-tier Moroccan commercial voiceover artist for social media and TikTok ads with persuasive rhythm and high marketing punch.',
  },
  zainab_promo: {
    geminiVoice: 'Zephyr',
    styleGuide: 'Speak as Zainab, an elegant, smooth Moroccan brand promoter for beauty and luxury products.',
  },
  mariam: {
    geminiVoice: 'Kore',
    styleGuide: 'Speak as Mariam, an articulate, clear Moroccan female educator and explainer.',
  },
  youssef: {
    geminiVoice: 'Puck',
    styleGuide: 'Speak as Youssef, an energetic, modern Moroccan young man with authentic cadence.',
  },
  mehdi_ads: {
    geminiVoice: 'Fenrir',
    styleGuide: 'Speak as Mehdi, a powerful, enthusiastic Moroccan male commercial voiceover specialist for e-commerce sales, discounts, and high-converting marketing ads.',
  },
  amine: {
    geminiVoice: 'Charon',
    styleGuide: 'Speak as Amine, a deep, wise, and dignified Moroccan male narrator with authentic cadence and pronunciation in Moroccan Darija.',
  },
  hamza: {
    geminiVoice: 'Fenrir',
    styleGuide: 'Speak as Hamza, a calm, balanced, and friendly Moroccan male speaker with clear articulation in Moroccan Darija.',
  },
};

/**
 * Encapsulate raw PCM 16-bit mono 24000Hz into a valid standard WAV audio container
 */
function pcmToWavBuffer(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);

  // "fmt " sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Moroccan Darija TTS Engine with Commercial Ad Mastery' });
});

/**
 * In-Memory Cache for Voice Previews so preview clicks consume 0 live API calls after first fetch
 */
const PREVIEW_AUDIO_CACHE = new Map<string, {
  audioDataUrl: string;
  audioBase64: string;
  mimeType: string;
  duration: number;
  sampleText: string;
  voiceName: string;
}>();

const VOICE_PREVIEW_SCRIPTS: Record<string, { name: string; script: string }> = {
  khadija: {
    name: 'خديجة',
    script: 'السلام عليكم، أنا خديجة. الصوت الدافئ والطبيعي بالدارجة المغربية لأي محتوى كيعجبك.',
  },
  salma_ads: {
    name: 'سلمى',
    script: 'أهلاً! أنا سلمى، الصوت الإعلاني لي غادي يخلي إعلاناتك ومبيعاتك تفركع وتجيب زبناء جداد!',
  },
  zainab_promo: {
    name: 'زينب',
    script: 'سلام! أنا زينب، الصوت الأنيق لي كيعطي فخامة وجاذبية خاصة للمنتوجات والبراند ديالك.',
  },
  mariam: {
    name: 'مريم',
    script: 'مرحباً! أنا مريم، متخصصة في الشروحات والمحتوى التعليمي الواضح والمبسط بالدارجة.',
  },
  youssef: {
    name: 'يوسف',
    script: 'وا فين! أنا يوسف، صوت شبابي وحيوي كيهضر بنيشان لأي بودكاست أو محتوى معاصر.',
  },
  mehdi_ads: {
    name: 'المهدي',
    script: 'السلام عليكم! أنا المهدي، أقوى صوت حماسي للعروض والتخفيضات والإعلانات التجارية فالمغرب!',
  },
  amine: {
    name: 'أمين',
    script: 'مرحباً بكم، أنا أمين. الصوت الوقور والعميق للوثائقيات والقصص والتراث المغربي الأصيل.',
  },
  hamza: {
    name: 'حمزة',
    script: 'السلام عليكم، أنا حمزة. الصوت المتوازن والواضح للرسائل الصوتية والخدمات التفاعلية.',
  },
};

/**
 * Voice Preview Endpoint - Returns cached audio or synthesizes and caches it
 */
app.get('/api/voices/preview/:voiceId', async (req, res) => {
  const { voiceId } = req.params;
  const previewInfo = VOICE_PREVIEW_SCRIPTS[voiceId] || {
    name: voiceId,
    script: 'السلام عليكم، مرحباً بك في استوديو صوت الدارجة المغربية.',
  };

  // 1. Check in-memory cache first
  if (PREVIEW_AUDIO_CACHE.has(voiceId)) {
    const cached = PREVIEW_AUDIO_CACHE.get(voiceId)!;
    return res.json({
      success: true,
      cached: true,
      ...cached,
    });
  }

  try {
    const ai = getAiClient();
    const voiceConfig = MOROCCAN_VOICE_MAP[voiceId] || {
      geminiVoice: 'Kore',
      styleGuide: 'Speak in warm, conversational Moroccan Darija accent.',
    };

    const prompt = `Persona Directive: ${voiceConfig.styleGuide}
Dialect: Authentic Moroccan Arabic (الدارجة المغربية) with natural Moroccan cadence and pronunciation.
Tone: Natural, authentic, welcoming voice intro.
Text to speak:
"${previewInfo.script}"`;

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceConfig.geminiVoice },
          },
        },
      },
    });

    const part = ttsResponse.candidates?.[0]?.content?.parts?.[0];
    const rawAudioBase64 = part?.inlineData?.data;
    const returnedMime = part?.inlineData?.mimeType || 'audio/pcm;rate=24000';

    if (!rawAudioBase64) {
      throw new Error('لم يتم استرجاع صوت المعاينة.');
    }

    const rawBuffer = Buffer.from(rawAudioBase64, 'base64');
    const finalWavBuffer = (returnedMime.includes('pcm') || returnedMime.includes('rate=24000') || !returnedMime.includes('wav'))
      ? pcmToWavBuffer(rawBuffer, 24000, 1, 16)
      : rawBuffer;

    const audioBase64 = finalWavBuffer.toString('base64');
    const audioDataUrl = `data:audio/wav;base64,${audioBase64}`;
    const duration = Math.max(1, Number(((rawBuffer.length / 2) / 24000).toFixed(2)));

    const result = {
      audioDataUrl,
      audioBase64,
      mimeType: 'audio/wav',
      duration,
      sampleText: previewInfo.script,
      voiceName: previewInfo.name,
    };

    // Store in cache so no further API calls needed for this voice preview
    PREVIEW_AUDIO_CACHE.set(voiceId, result);

    res.json({
      success: true,
      cached: false,
      ...result,
    });
  } catch (error: any) {
    console.error(`Error generating voice preview for ${voiceId}:`, error);
    
    // Check for Quota Exceeded (429)
    const isQuotaError =
      error?.status === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('RESOURCE_EXHAUSTED');

    if (isQuotaError) {
      return res.status(429).json({
        success: false,
        error: 'تم تجاوز الحد المجاني المسموح به في Google Gemini API (Quota Exceeded 429). يرجى الانتظار دقيقة أو الترقية.',
        isQuotaError: true,
        voiceId,
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'فشل في توليد معاينة الصوت.',
    });
  }
});

/**
 * Text-to-Speech endpoint for Moroccan Darija
 */
app.post('/api/tts', async (req, res) => {
  try {
    const {
      text,
      voiceId = 'khadija',
      toneDirective,
      optimizeDarija = true,
      maxSecondsLimit, // e.g., 5 seconds for free trial cuts
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'يرجى إدخال نص صحيح بالدارجة لتحويله إلى صوت.' });
    }

    const ai = getAiClient();
    const rawText = text.trim();
    let speechText = rawText;
    let vocalizedScript = rawText;

    const voiceConfig = MOROCCAN_VOICE_MAP[voiceId] || {
      geminiVoice: 'Kore',
      styleGuide: 'Speak in warm, conversational Moroccan Darija accent.',
    };

    // Detect if text contains Arabizi (Latin characters with numbers like 3, 7, 9)
    const hasArabizi = /[a-zA-Z]/.test(rawText);
    
    // Only call extra LLM text refinement if text contains Arabizi/Latin, saving 50% quota for regular Arabic script
    if (hasArabizi) {
      try {
        const refinePrompt = `You are a world-class Moroccan voiceover director and linguist in Moroccan Arabic (الدارجة المغربية).
Given this text provided by a user:
"""${rawText}"""

Task:
1. Convert any Arabizi (e.g. "salam labas 3lik") accurately into Moroccan Arabic script.
2. Polish the text so it sounds 100% natural when read aloud in Moroccan Darija, preserving all idioms (like بزاف، دابا، عفاك، كيداير، مزيان، برودوي، تخفيضات).
3. Strictly keep it in authentic Moroccan Darija (DO NOT convert to MSA/Fusha).

Return ONLY the refined Moroccan Darija text.`;

        const refineResp = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: refinePrompt,
        });

        if (refineResp.text && refineResp.text.trim()) {
          vocalizedScript = refineResp.text.trim().replace(/^["']|["']$/g, '');
          speechText = vocalizedScript;
        }
      } catch (optErr) {
        console.warn('Vocalization optimization skipped:', optErr);
      }
    }

    // Build speech prompt with explicit Moroccan intonation instructions
    const prompt = `Persona Directive: ${voiceConfig.styleGuide}
Dialect: Authentic Moroccan Arabic (الدارجة المغربية) with natural Moroccan cadence and pronunciation.
${toneDirective ? `Tone / Intonation Style: ${toneDirective}\n` : 'Tone: Engaging, professional Moroccan voiceover.\n'}
Text to speak in authentic Moroccan Darija:
"${speechText}"`;

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceConfig.geminiVoice },
          },
        },
      },
    });

    const part = ttsResponse.candidates?.[0]?.content?.parts?.[0];
    const rawAudioBase64 = part?.inlineData?.data;
    const returnedMime = part?.inlineData?.mimeType || 'audio/pcm;rate=24000';

    if (!rawAudioBase64) {
      throw new Error('لم نتمكن من استخراج الصوت المولد من النموذج.');
    }

    // Process audio buffer: if raw PCM or contains PCM, wrap in standard WAV header
    let rawBuffer = Buffer.from(rawAudioBase64, 'base64');

    // Apply Free Trial seconds cut if requested (e.g. 5 seconds max)
    const bytesPerSecond = 24000 * 2; // 24000 samples/sec * 2 bytes per 16-bit sample
    if (maxSecondsLimit && maxSecondsLimit > 0) {
      const maxBytes = Math.floor(maxSecondsLimit * bytesPerSecond);
      if (rawBuffer.length > maxBytes) {
        rawBuffer = rawBuffer.subarray(0, maxBytes);
      }
    }

    let finalWavBuffer: Buffer;
    let finalMime = 'audio/wav';

    if (returnedMime.includes('pcm') || returnedMime.includes('rate=24000') || !returnedMime.includes('wav') || maxSecondsLimit) {
      finalWavBuffer = pcmToWavBuffer(rawBuffer, 24000, 1, 16);
    } else {
      finalWavBuffer = rawBuffer;
      finalMime = returnedMime;
    }

    const audioBase64 = finalWavBuffer.toString('base64');
    const audioDataUrl = `data:${finalMime};base64,${audioBase64}`;

    // Estimated duration: (samples) / 24000 = (data bytes / 2) / 24000
    const estimatedDuration = Math.max(0.5, Number(((rawBuffer.length / 2) / 24000).toFixed(2)));

    res.json({
      success: true,
      audioDataUrl,
      audioBase64,
      mimeType: finalMime,
      duration: estimatedDuration,
      sampleRate: 24000,
      vocalizedText: vocalizedScript,
      originalText: rawText,
      voice: voiceId,
    });
  } catch (error: any) {
    console.error('Error generating Darija TTS:', error);
    
    // Check for Quota Exceeded (429)
    const isQuotaError =
      error?.status === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.message?.includes('exceeded your current quota');

    if (isQuotaError) {
      return res.status(429).json({
        success: false,
        error: '⚠️ تم استهلاك الحد الأقصى للطلبات المجانية في باقة Gemini API (429 Rate Limit). يرجى الانتظار لبضع ثوانٍ أو دقيقة والمحاولة من جديد، أو استخدام مفتاح API مع باقة Pay-As-You-Go.',
        isQuotaError: true,
      });
    }

    res.status(500).json({
      error: error.message || 'حدث خطأ أثناء توليد الصوت بالدارجة. يرجى المحاولة مرة أخرى.',
    });
  }
});

/**
 * Generate High-Converting Moroccan Ad Script (AI Copywriter for Voiceover)
 */
app.post('/api/darija/generate-ad-script', async (req, res) => {
  try {
    const { productDescription, targetAudience = 'Moroccan social media shoppers' } = req.body;
    if (!productDescription) {
      return res.status(400).json({ error: 'المرجو إدخال وصف للمنتوج أو الخدمة.' });
    }

    const ai = getAiClient();
    const prompt = `You are a high-converting Moroccan E-Commerce and Marketing Copywriter.
Create a catchy, compelling, high-energy 15-30 second Moroccan Darija voiceover script for an ad targeting TikTok, Instagram Reels, and Facebook ads.

Product / Offer: "${productDescription}"
Target Audience: "${targetAudience}"

Rules:
- Must be written in 100% natural, modern, persuasive Moroccan Darija.
- Include a strong hook (صدمة أو سؤال جذاب فاللول).
- Highlight the problem and solution clearly.
- Include a high-converting call to action (توصيل فابور، الدفع عند الاستلام، الكمية محدودة، كليكي على الرابط).
- Return ONLY a JSON object:
{
  "title": "عنوان الإعلان المقترح",
  "script": "نص الإعلان بالدارجة المغربية جاهز للقراءة والتسجيل",
  "voiceRecommendation": "salma_ads" or "mehdi_ads",
  "hook": "الجملة الافتتاحية الجذابة"
}`;

    const resp = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(resp.text || '{}');
    res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Error generating ad script:', error);
    res.status(500).json({ error: 'فشل في توليد نص الإعلان.' });
  }
});

/**
 * Translate / Transliterate Arabizi or Franco-Arabe to Darija text
 */
app.post('/api/darija/convert-arabizi', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'المرجو كتابة النص المطلوب تحويله.' });
    }

    const ai = getAiClient();
    const prompt = `Convert the following Moroccan Arabizi / Franco-Arabe text into proper Arabic script Moroccan Darija (الدارجة المغربية):
Text: "${text}"

Rules:
- Keep the exact Darija vocabulary (e.g., 3 -> ع, 7 -> ح, 9 -> ق, kh -> خ, gh -> غ, ch -> ش).
- Maintain Moroccan dialect idioms and phrases.
- Return a JSON object with:
  {
    "arabicScript": "the converted Darija text in Arabic alphabet",
    "englishMeaning": "quick explanation",
    "culturalNote": "short note"
  }`;

    const resp = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(resp.text || '{}');
    res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Error converting Arabizi:', error);
    res.status(500).json({ error: 'فشل في تحويل النص. يرجى المحاولة لاحقاً.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Darija TTS Commercial Engine running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

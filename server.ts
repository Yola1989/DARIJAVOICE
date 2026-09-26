import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Lightweight in-memory rate limiting to prevent spam and protect API quota
const ipRateLimits = new Map<string, { count: number; resetTime: number }>();
function checkRateLimit(ip: string, maxRequests = 25, windowMs = 60000): boolean {
  const now = Date.now();
  const record = ipRateLimits.get(ip);
  if (!record || now > record.resetTime) {
    ipRateLimits.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) {
    return false;
  }
  record.count += 1;
  return true;
}

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
    styleGuide: 'Speak as Mehdi, an energetic, high-converting Moroccan male voiceover narrator for high-impact promos and flash sales.',
  },
  amine: {
    geminiVoice: 'Charon',
    styleGuide: 'Speak as Amine, a calm, deeply narrative Moroccan storyteller and documentary narrator.',
  },
  hamza: {
    geminiVoice: 'Fenrir',
    styleGuide: 'Speak as Hamza, a professional, balanced Moroccan corporate and customer service narrator.',
  },
};

/**
 * Utility to convert raw PCM 16-bit LE buffer to a standard WAV audio buffer
 */
function pcmToWavBuffer(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Moroccan Darija TTS Engine with Commercial Ad Mastery' });
});

/**
 * Text-to-Speech endpoint for Moroccan Darija
 */
app.post('/api/tts', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp, 25, 60000)) {
      return res.status(429).json({ error: 'تم تجاوز الحد المسموح به من الطلبات مؤقتاً. يرجى الانتظار دقيقة واحدة.' });
    }

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

    const rawText = text.trim();
    if (rawText.length > 2500) {
      return res.status(400).json({ error: 'الحد الأقصى للنص هو 2500 حرف في التسجيل الواحد.' });
    }

    const ai = getAiClient();
    let speechText = rawText;
    let vocalizedScript = rawText;

    const voiceConfig = MOROCCAN_VOICE_MAP[voiceId] || {
      geminiVoice: 'Kore',
      styleGuide: 'Speak in warm, conversational Moroccan Darija accent.',
    };

    // Detect if text is Arabizi (Latin characters with numbers like 3, 7, 9) or needs phonetic Moroccan refinement
    const hasArabizi = /[a-zA-Z]/.test(rawText) && (/[0-9]/.test(rawText) || rawText.split(' ').some(w => w.length > 2));
    
    if (optimizeDarija || hasArabizi) {
      try {
        const refinePrompt = `You are a world-class Moroccan voiceover director and linguist in Moroccan Arabic (الدارجة المغربية).
Given this text provided by a user:
"""${rawText}"""

Task:
1. If the input is in Arabizi (e.g. "salam labas 3lik"), convert it accurately into Moroccan Arabic script.
2. Polish the text so it sounds 100% natural when read aloud in Moroccan Darija, preserving all idioms (like بزاف، دابا، عفاك، كيداير، مزيان، برودوي، تخفيضات).
3. If it looks like a commercial advertisement or product promo, make the rhythm crisp and catchy for voiceover!
4. Strictly keep it in authentic Moroccan Darija (DO NOT convert to MSA/Fusha).

Return ONLY the refined Moroccan Darija text.`;

        const refineResp = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: refinePrompt,
        });

        if (refineResp.text && refineResp.text.trim()) {
          vocalizedScript = refineResp.text.trim().replace(/^["']|["']$/g, '');
          speechText = vocalizedScript;
        }
      } catch (err) {
        console.warn('Text refinement fallback to raw text:', err);
      }
    }

    // Build speech generation directive
    const promptDirectives = [
      `Language: Moroccan Arabic (الدارجة المغربية) only.`,
      `Accent: 100% authentic Moroccan cadence, pronunciation and colloquial rhythm.`,
      `Persona: ${voiceConfig.styleGuide}`,
    ];

    if (toneDirective) {
      promptDirectives.push(`Tone & Style requirement: ${toneDirective}`);
    }

    const speechPrompt = `${promptDirectives.join('\n')}\n\nText to speak:\n"${speechText}"`;

    // Generate Audio using Gemini TTS
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: speechPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceConfig.geminiVoice,
            },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];
    const rawAudioBase64 = part?.inlineData?.data;
    const returnedMime = part?.inlineData?.mimeType || 'audio/wav';

    if (!rawAudioBase64) {
      throw new Error('لم يتم استلام ملف الصوت من النموذج. يرجى تجربة جملة أخرى.');
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
    res.status(500).json({
      error: error.message || 'حدث خطأ أثناء توليد الصوت بالدارجة. يرجى المحاولة مرة أخرى.',
    });
  }
});

/**
 * Voice Preview Samples:
 * Static pre-recorded sample sentences for each Moroccan voice persona.
 * Audio is cached permanently to disk / memory so clicking any voice sample NEVER consumes Gemini API quota repeatedly!
 */
const SAMPLES_DIR = path.join(process.cwd(), 'public', 'samples');
if (!fs.existsSync(SAMPLES_DIR)) {
  fs.mkdirSync(SAMPLES_DIR, { recursive: true });
}

// In-memory cache for ultra-fast instant playback without API calls
const voiceSampleCache = new Map<string, { audioUrl: string; duration: number; sampleText: string }>();

const VOICE_SAMPLE_TEXTS: Record<string, string> = {
  khadija: 'السلام عليكم! أنا خديجة، مرحبا بيك. الصوت ديالي طبيعي ودافي بالدارجة المغربية.',
  salma_ads: 'أهلاً وسهلاً! أنا سلمى، معلقة إعلانية. باغي تزيد مبيعاتك؟ أنا هنا باش نعطيك أحسن صوت إشهاري لمنتوجك!',
  zainab_promo: 'مرحبا بيك! أنا زينب. كنقدم محتوى راقي وناعم لمنتجات التجميل، العطور، والماركات الفاخرة.',
  mariam: 'أهلاً بيك! أنا مريم. كنقدم شروحات ودروس واضحة وممتعة بالدارجة المغربية المفهومة.',
  youssef: 'سلام وعليكم أ العشران! أنا يوسف، صوت شبابي وحيوي للبودكاست والمحتوى العصري.',
  mehdi_ads: 'السلام عليكم! أنا المهدي. عروض خيالية وتخفيضات قوية لمنتجاتك مع أقوى إعلان تجاري حماسي!',
  amine: 'مرحباً بكم. أنا أمين. نبرة وقورة وعميقة للأفلام الوثائقية والسرد والتراث المغربي الأصيل.',
  hamza: 'أهلاً وسهلاً بكم. أنا حمزة، صوت متوازن وسلس للخدمات الهاتفية والمؤسساتية.',
};

/**
 * Load pre-saved audio samples from disk on server start
 */
function loadDiskSampleCache() {
  for (const voiceId of Object.keys(VOICE_SAMPLE_TEXTS)) {
    const filePath = path.join(SAMPLES_DIR, `${voiceId}.wav`);
    if (fs.existsSync(filePath)) {
      try {
        const fileBuf = fs.readFileSync(filePath);
        const audioUrl = `data:audio/wav;base64,${fileBuf.toString('base64')}`;
        // approximate duration: (length - 44) / (24000 * 2)
        const duration = Math.max(1, Number(((fileBuf.length - 44) / 48000).toFixed(2)));
        voiceSampleCache.set(voiceId, {
          audioUrl,
          duration,
          sampleText: VOICE_SAMPLE_TEXTS[voiceId],
        });
        console.log(`[Cache] Loaded pre-recorded sample from disk for voice: ${voiceId}`);
      } catch (err) {
        console.warn(`Could not read disk sample for ${voiceId}:`, err);
      }
    }
  }
}
loadDiskSampleCache();

/**
 * Get instant voice sample audio
 * GUARANTEE: Once generated or loaded from disk, it is served 100% locally from cache,
 * with ZERO calls to Gemini API no matter how many times visitors click it!
 */
app.get('/api/voice-sample/:voiceId', async (req, res) => {
  try {
    const { voiceId } = req.params;
    if (!voiceId || !/^[a-z0-9_]+$/.test(voiceId)) {
      return res.status(400).json({ error: 'معرّف الصوت غير صالح' });
    }
    const voiceConfig = MOROCCAN_VOICE_MAP[voiceId];
    if (!voiceConfig) {
      return res.status(404).json({ error: 'الصوت غير موجود' });
    }

    // 1. Check in-memory permanent cache
    if (voiceSampleCache.has(voiceId)) {
      return res.json({ success: true, ...voiceSampleCache.get(voiceId), cached: true });
    }

    // 2. Check disk file cache
    const diskPath = path.join(SAMPLES_DIR, `${voiceId}.wav`);
    if (fs.existsSync(diskPath)) {
      const fileBuf = fs.readFileSync(diskPath);
      const audioUrl = `data:audio/wav;base64,${fileBuf.toString('base64')}`;
      const duration = Math.max(1, Number(((fileBuf.length - 44) / 48000).toFixed(2)));
      const result = { audioUrl, duration, sampleText: VOICE_SAMPLE_TEXTS[voiceId] };
      voiceSampleCache.set(voiceId, result);
      return res.json({ success: true, ...result, cached: true });
    }

    // 3. Fallback: Only if disk file doesn't exist, record once and save permanently to disk
    const sampleText = VOICE_SAMPLE_TEXTS[voiceId] || 'السلام عليكم، مرحبا بك في منصة صوت دارجة.';
    const ai = getAiClient();

    const prompt = `Persona Directive: ${voiceConfig.styleGuide}
Dialect: Authentic Moroccan Arabic (الدارجة المغربية) with natural Moroccan cadence and pronunciation.
Tone: Warm, confident and welcoming Moroccan voice sample.
Text to speak:
"${sampleText}"`;

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
    if (!rawAudioBase64) {
      throw new Error('فشل توليد عينة الصوت');
    }

    const rawBuffer = Buffer.from(rawAudioBase64, 'base64');
    const wavBuffer = pcmToWavBuffer(rawBuffer, 24000, 1, 16);
    
    // Save to disk permanently so it is NEVER generated again
    try {
      fs.writeFileSync(diskPath, wavBuffer);
    } catch (writeErr) {
      console.warn('Failed to write sample to disk:', writeErr);
    }

    const audioDataUrl = `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
    const duration = Math.max(1, Number(((rawBuffer.length / 2) / 24000).toFixed(2)));

    const result = { audioUrl: audioDataUrl, duration, sampleText };
    voiceSampleCache.set(voiceId, result);

    res.json({ success: true, ...result, cached: false });
  } catch (error: any) {
    console.error('Error generating voice sample:', error);
    res.status(500).json({
      error: error.message || 'فشل في تحميل نموذج الصوت. يرجى المحاولة مرة أخرى.',
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text?.trim() || '{}';
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = {
        title: 'إعلان تجاري بالدارجة',
        script: responseText,
        voiceRecommendation: 'salma_ads',
        hook: 'عروض حصرية كتسناك دابا!',
      };
    }

    res.json({ success: true, ...data });
  } catch (error: any) {
    console.error('Error generating ad script:', error);
    res.status(500).json({ error: 'تعذر توليد سكريبت الإعلان. يرجى المحاولة لاحقاً.' });
  }
});

/**
 * Endpoint to convert Arabizi or messy script into clean Moroccan Darija
 */
app.post('/api/darija/convert-arabizi', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'النص مطلوب.' });
    }

    const ai = getAiClient();
    const prompt = `Convert this Moroccan Arabizi or casual Moroccan text into polished, natural Moroccan Arabic written in Arabic script:
"""${text}"""

Rules:
- Output ONLY the converted Arabic script text.
- Preserve colloquial Moroccan vocabulary (بزاف، دابا، عفاك، كيداير، مزيان، زوين).
- Do not convert to formal Arabic (Fusha). Keep it authentic Moroccan Darija.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
    });

    const converted = (response.text || '').trim().replace(/^["']|["']$/g, '');
    res.json({ success: true, convertedText: converted });
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
    // Determine the dist directory path whether running from root or dist folder
    let distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      if (fs.existsSync(path.join(__dirname, 'index.html'))) {
        distPath = __dirname;
      } else if (fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
        distPath = path.join(__dirname, '../dist');
      }
    }

    console.log(`Serving static production files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Application build files not found. Please trigger a redeploy.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Darija TTS Commercial Engine running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

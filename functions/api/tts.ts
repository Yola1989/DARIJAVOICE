import { GoogleGenAI } from '@google/genai';

/**
 * Moroccan Voice Mapping to Gemini TTS Voices
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
  khalid_news: {
    geminiVoice: 'Charon',
    styleGuide: 'Speak as Khalid, an authoritative, deep Moroccan narrator for documentaries, news, and serious storytelling.',
  },
  anas_podcast: {
    geminiVoice: 'Puck',
    styleGuide: 'Speak as Anas, a friendly, casual Moroccan podcast host and conversational storyteller.',
  },
  fatima_story: {
    geminiVoice: 'Aoede',
    styleGuide: 'Speak as Fatima, an expressive, emotional Moroccan storytelling narrator for audiobooks and dramatic tales.',
  },
};

function pcmToWav(pcmBuffer: Uint8Array, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): ArrayBuffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // write PCM samples
  const wavBytes = new Uint8Array(buffer, 44, dataSize);
  wavBytes.set(pcmBuffer);

  return buffer;
}

export const onRequestPost = async (context: any) => {
  try {
    const { request, env } = context;
    const body: any = await request.json();
    const {
      text: rawText,
      voiceId = 'salma_ads',
      toneDirective,
      optimizeDarija = true,
      maxSecondsLimit,
    } = body;

    if (!rawText || !rawText.trim()) {
      return new Response(JSON.stringify({ error: 'المرجو كتابة نص بالدارجة أولاً.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not configured in Cloudflare environment.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const voiceConfig = MOROCCAN_VOICE_MAP[voiceId] || {
      geminiVoice: 'Aoede',
      styleGuide: 'Speak in warm, conversational Moroccan Darija accent.',
    };

    let speechText = rawText.trim();
    let vocalizedScript = speechText;

    // Detect Arabizi
    const hasArabizi = /[a-zA-Z]/.test(speechText);
    if (hasArabizi) {
      try {
        const refinePrompt = `You are a Moroccan voiceover director and linguist in Moroccan Arabic (الدارجة المغربية).
Convert any Arabizi accurately into Moroccan Arabic script and polish it for authentic Darija speech:
"""${speechText}"""
Return ONLY the refined Moroccan Darija text.`;

        const refineResp = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: refinePrompt,
        });

        if (refineResp.text && refineResp.text.trim()) {
          vocalizedScript = refineResp.text.trim().replace(/^["']|["']$/g, '');
          speechText = vocalizedScript;
        }
      } catch (optErr) {
        console.warn('Arabizi conversion error:', optErr);
      }
    }

    const prompt = `Persona Directive: ${voiceConfig.styleGuide}
Dialect: Authentic Moroccan Arabic (الدارجة المغربية) with natural Moroccan cadence and pronunciation.
${toneDirective ? `Tone / Intonation Style: ${toneDirective}\n` : 'Tone: Engaging, professional Moroccan voiceover.\n'}
Text to speak in authentic Moroccan Darija:
"${speechText}"`;

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceConfig.geminiVoice,
            },
          },
        },
      },
    });

    const part = ttsResponse.candidates?.[0]?.content?.parts?.[0];
    const rawAudioBase64 = part?.inlineData?.data;
    const returnedMime = part?.inlineData?.mimeType || 'audio/pcm;rate=24000';

    if (!rawAudioBase64) {
      return new Response(
        JSON.stringify({ error: 'لم نتمكن من استخراج الصوت، يرجى المحاولة مرة أخرى.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert Base64 to binary
    const binaryString = atob(rawAudioBase64);
    let bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Handle trial limit if specified
    const bytesPerSecond = 24000 * 2;
    if (maxSecondsLimit && maxSecondsLimit > 0) {
      const maxBytes = Math.floor(maxSecondsLimit * bytesPerSecond);
      if (bytes.length > maxBytes) {
        bytes = bytes.subarray(0, maxBytes);
      }
    }

    const wavArrayBuffer = pcmToWav(bytes, 24000, 1, 16);
    const wavBytes = new Uint8Array(wavArrayBuffer);
    
    // Base64 encode WAV
    let wavBinary = '';
    for (let i = 0; i < wavBytes.byteLength; i++) {
      wavBinary += String.fromCharCode(wavBytes[i]);
    }
    const finalAudioBase64 = btoa(wavBinary);
    const duration = Math.max(1, Number(((bytes.length / 2) / 24000).toFixed(2)));
    const audioDataUrl = `data:audio/wav;base64,${finalAudioBase64}`;

    return new Response(
      JSON.stringify({
        success: true,
        audioDataUrl,
        audioBase64: finalAudioBase64,
        mimeType: 'audio/wav',
        duration,
        vocalizedScript,
        voiceId,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'TTS generation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

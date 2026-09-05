import express, { NextFunction, Request, Response } from "express";
import path from "node:path";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { GoogleGenAI, Modality } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  DocumentReference,
  FieldValue,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";

dotenv.config();

if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();
const app = express();
const PORT = Number(process.env.PORT || 8080);
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";

const ADMIN_EMAILS = new Set([
  "younes.ahdidou@gmail.com",
  "younes.ahdidou@googlemail.com",
]);

const PLANS = {
  mini: {
    name: "Mini",
    priceMAD: 59,
    tokensCount: 18000,
    includedMinutes: 30,
    validityMonths: 6,
  },
  starter: {
    name: "Starter",
    priceMAD: 99,
    tokensCount: 36000,
    includedMinutes: 60,
    validityMonths: 6,
  },
  pro: {
    name: "Pro",
    priceMAD: 199,
    tokensCount: 108000,
    includedMinutes: 180,
    validityMonths: 6,
  },
  business: {
    name: "Business",
    priceMAD: 599,
    tokensCount: 432000,
    includedMinutes: 720,
    validityMonths: 12,
  },
} as const;

const DEFAULT_SETTINGS = {
  freeTrialsDefaultCount: 2,
  freeTrialMaxSeconds: 15,
  tokensPerSecond: 10,
  contactWhatsApp: "+212600000000",
  paymentInstructions: "تواصل معنا عبر الواتساب لتأكيد الأداء وتفعيل الرصيد.",
  miniPriceMAD: 59,
  starterPriceMAD: 99,
  proPriceMAD: 199,
  businessPriceMAD: 599,
  launchBonusEnabled: true,
  launchBonusLimit: 100,
  launchBonusMinutes: 10,
  launchBonusClaimedCount: 0,
  commercialSettingsVersion: 2,
};

function normalizeSettings(data: Record<string, any> | undefined) {
  const merged = { ...DEFAULT_SETTINGS, ...(data || {}) };

  if (Number(data?.commercialSettingsVersion || 0) < 2) {
    return {
      ...merged,
      freeTrialsDefaultCount: 2,
      freeTrialMaxSeconds: 15,
      miniPriceMAD: 59,
      starterPriceMAD: 99,
      proPriceMAD: 199,
      businessPriceMAD: 599,
      launchBonusEnabled: true,
      launchBonusLimit: 100,
      launchBonusMinutes: 10,
      launchBonusClaimedCount: 0,
      commercialSettingsVersion: 2,
    };
  }

  return merged;
}

function addMonthsIso(months: number) {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

const VOICES: Record<string, { voice: string; guide: string }> = {
  khadija: {
    voice: "Kore",
    guide: "Warm natural Moroccan Darija woman",
  },
  salma_ads: {
    voice: "Aoede",
    guide: "Persuasive Moroccan commercial voiceover woman",
  },
  zainab_promo: {
    voice: "Zephyr",
    guide: "Elegant Moroccan brand promoter",
  },
  mariam: {
    voice: "Kore",
    guide: "Clear Moroccan educator",
  },
  youssef: {
    voice: "Puck",
    guide: "Energetic young Moroccan man",
  },
  mehdi_ads: {
    voice: "Fenrir",
    guide: "Powerful Moroccan commercial voiceover man",
  },
  amine: {
    voice: "Charon",
    guide: "Deep dignified Moroccan narrator",
  },
  hamza: {
    voice: "Fenrir",
    guide: "Calm friendly Moroccan man",
  },
};

declare global {
  namespace Express {
    interface Request {
      actor?: { uid: string; email: string; admin: boolean };
    }
  }
}

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  res.setHeader(
    "X-Request-Id",
    req.header("X-Request-Id") || crypto.randomUUID(),
  );
  next();
});

const origins = new Set(
  (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

app.use((req, res, next) => {
  const origin = req.header("origin");

  if (origin && origins.size && !origins.has(origin)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS",
  );

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const buckets = new Map<string, { n: number; at: number }>();

app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  const key = req.ip || "unknown";
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.at > 60_000) {
    buckets.set(key, { n: 1, at: now });
  } else if (++bucket.n > 90) {
    return res.status(429).json({ error: "طلبات كثيرة، انتظر قليلاً." });
  }

  next();
});

const bucketCleanup = setInterval(() => {
  const cutoff = Date.now() - 5 * 60_000;
  for (const [key, bucket] of buckets) {
    if (bucket.at < cutoff) buckets.delete(key);
  }
}, 5 * 60_000);
bucketCleanup.unref();

async function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = req.header("authorization") || "";

    if (!raw.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "خاصك تسجل الدخول.", code: "AUTH_REQUIRED" });
    }

    const decoded = await getAuth().verifyIdToken(raw.slice(7), true);
    const email = (decoded.email || "").toLowerCase();
    const profile = await db.doc(`users/${decoded.uid}`).get();

    req.actor = {
      uid: decoded.uid,
      email,
      admin: ADMIN_EMAILS.has(email) || profile.data()?.role === "admin",
    };

    next();
  } catch {
    return res.status(401).json({
      error: "الجلسة منتهية، سجل الدخول من جديد.",
      code: "INVALID_TOKEN",
    });
  }
}

function admin(req: Request, res: Response, next: NextFunction) {
  if (!req.actor?.admin) {
    return res.status(403).json({ error: "غير مصرح." });
  }

  next();
}

function ai() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY غير مضبوط");
  return new GoogleGenAI({ apiKey: key });
}

function pcmWav(pcm: Buffer) {
  const header = Buffer.alloc(44);
  header.write("RIFF");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24000, 24);
  header.writeUInt32LE(48000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function synthesize(text: string, voiceId: string, tone?: string) {
  const voice = VOICES[voiceId] || VOICES.khadija;
  const result = await ai().models.generateContent({
    model: "gemini-3.1-flash-tts-preview",
    contents: [
      {
        parts: [
          {
            text:
              `Speak in authentic Moroccan Darija. Persona: ${voice.guide}. ` +
              `${tone || ""}\nText:\n${text}`,
          },
        ],
      },
    ],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice.voice },
        },
      },
    },
  });

  const part = result.candidates?.[0]?.content?.parts?.[0];
  if (!part?.inlineData?.data) throw new Error("لم يتم توليد الصوت");

  const raw = Buffer.from(part.inlineData.data, "base64");
  return part.inlineData.mimeType?.includes("wav") ? raw : pcmWav(raw);
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "2.0.0" });
});

app.get("/api/settings", async (_req, res) => {
  const snapshot = await db.doc("settings/global").get();
  res.json({ settings: normalizeSettings(snapshot.data()) });
});

app.post("/api/me/bootstrap", auth, async (req, res) => {
  const ref = db.doc(`users/${req.actor!.uid}`);
  const settingsRef = db.doc("settings/global");

  await db.runTransaction(async (tx) => {
    const [snapshot, settingsSnapshot] = await Promise.all([
      tx.get(ref),
      tx.get(settingsRef),
    ]);
    const settings = normalizeSettings(settingsSnapshot.data());

    if (!snapshot.exists) {
      tx.create(ref, {
        id: req.actor!.uid,
        email: req.actor!.email,
        displayName: req.actor!.email.split("@")[0],
        role: req.actor!.admin ? "admin" : "user",
        status: req.actor!.admin ? "active" : "pending",
        tokens: req.actor!.admin ? 999999 : 0,
        freeTrialsRemaining: req.actor!.admin
          ? 999999
          : settings.freeTrialsDefaultCount,
        freeTrialMaxSeconds: settings.freeTrialMaxSeconds,
        subscriptionTier: req.actor!.admin ? "unlimited" : "free",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else if (!req.actor!.admin) {
      const profile = snapshot.data();
      const expired =
        profile?.creditsExpireAt &&
        new Date(profile.creditsExpireAt).getTime() <= Date.now();

      if (expired && Number(profile?.tokens || 0) > 0) {
        tx.update(ref, {
          tokens: 0,
          status: "pending",
          subscriptionTier: "free",
          creditsExpiredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  });

  const [profile, settings] = await Promise.all([
    ref.get(),
    db.doc("settings/global").get(),
  ]);

  res.json({
    profile: profile.data(),
    settings: normalizeSettings(settings.data()),
  });
});

app.post("/api/tts", auth, async (req, res) => {
  const text = String(req.body.text || "").trim();
  const voiceId = String(req.body.voiceId || "khadija");
  const tone = String(req.body.toneDirective || "").slice(0, 300);

  if (!text || text.length > 3000) {
    return res.status(400).json({ error: "النص مطلوب وبحد أقصى 3000 حرف." });
  }

  if (!Object.prototype.hasOwnProperty.call(VOICES, voiceId)) {
    return res.status(400).json({ error: "الصوت غير موجود." });
  }

  const userRef = db.doc(`users/${req.actor!.uid}`);
  const lockRef = db.doc(`generation_locks/${req.actor!.uid}`);
  let trial = false;
  let reserved = 0;
  let maxSeconds = 300;
  let settled = false;

  try {
    await db.runTransaction(async (tx) => {
      const [userSnapshot, lockSnapshot] = await Promise.all([
        tx.get(userRef),
        tx.get(lockRef),
      ]);
      const profile = userSnapshot.data();

      if (!profile) throw new Error("PROFILE");
      if (profile.status === "suspended") throw new Error("SUSPENDED");
      if (
        !req.actor!.admin &&
        profile.status === "active" &&
        profile.creditsExpireAt &&
        new Date(profile.creditsExpireAt).getTime() <= Date.now()
      ) {
        throw new Error("EXPIRED");
      }
      if (
        lockSnapshot.exists &&
        (lockSnapshot.data()?.expiresAt?.toMillis?.() || 0) > Date.now()
      ) {
        throw new Error("BUSY");
      }

      trial = profile.status !== "active" && !req.actor!.admin;

      if (trial) {
        if ((profile.freeTrialsRemaining || 0) <= 0) {
          throw new Error("NO_TRIAL");
        }
        maxSeconds = profile.freeTrialMaxSeconds || 15;
      } else {
        reserved = Math.max(
          5,
          Math.ceil(text.length / 8) * (profile.tokensPerSecond || 10),
        );

        if (!req.actor!.admin && (profile.tokens || 0) < reserved) {
          throw new Error("NO_CREDIT");
        }

        if (!req.actor!.admin) {
          tx.update(userRef, { tokens: FieldValue.increment(-reserved) });
        }
      }

      tx.set(lockRef, {
        requestId: crypto.randomUUID(),
        expiresAt: Timestamp.fromMillis(Date.now() + 180000),
      });
    });

    let wav = await synthesize(text, voiceId, tone);
    const maxBytes = maxSeconds * 48000;

    if (trial && wav.length > 44 + maxBytes) {
      wav = pcmWav(wav.subarray(44, 44 + maxBytes));
    }

    const duration = Math.max(0.5, (wav.length - 44) / 48000);
    const actual = Math.ceil(duration * 10);

    await db.runTransaction(async (tx) => {
      if (trial && !req.actor!.admin) {
        tx.update(userRef, {
          freeTrialsRemaining: FieldValue.increment(-1),
          updatedAt: new Date().toISOString(),
        });
      } else if (!req.actor!.admin && reserved > actual) {
        tx.update(userRef, {
          tokens: FieldValue.increment(reserved - actual),
          updatedAt: new Date().toISOString(),
        });
      } else if (!req.actor!.admin && actual > reserved) {
        tx.update(userRef, {
          tokens: FieldValue.increment(-(actual - reserved)),
          updatedAt: new Date().toISOString(),
        });
      }

      tx.delete(lockRef);
      tx.set(db.collection("generations").doc(), {
        userId: req.actor!.uid,
        text: text.slice(0, 500),
        voice: voiceId,
        duration,
        tokensUsed: trial ? 0 : actual,
        isFreeTrial: trial,
        createdAt: new Date().toISOString(),
      });
    });

    settled = true;
    const audioBase64 = wav.toString("base64");

    return res.json({
      success: true,
      audioDataUrl: `data:audio/wav;base64,${audioBase64}`,
      audioBase64,
      mimeType: "audio/wav",
      duration,
      vocalizedText: text,
      tokensDeducted: trial ? 0 : actual,
    });
  } catch (error: any) {
    if (!settled && reserved && !req.actor!.admin) {
      await userRef
        .update({ tokens: FieldValue.increment(reserved) })
        .catch(() => {});
    }

    await lockRef.delete().catch(() => {});

    const messages: Record<string, string> = {
      PROFILE: "تعذر تحميل الحساب.",
      NO_TRIAL: "سالاو التجارب المجانية.",
      NO_CREDIT: "الرصيد غير كافٍ.",
      BUSY: "كاين توليد آخر خدام دابا.",
      SUSPENDED: "الحساب موقوف.",
      EXPIRED: "صلاحية الرصيد سالات. شحن باقة جديدة باش تكمل.",
    };

    const known = Boolean(messages[error.message]);
    if (!known) console.error("TTS generation failed:", error);

    return res.status(known ? 409 : 503).json({
      error: messages[error.message] || "فشل توليد الصوت. حاول من جديد.",
    });
  }
});

const PREVIEW_VOICES = new Set(Object.keys(VOICES));
const PREVIEW_TEXT = "السلام عليكم، مرحبا بك في صوت الدارجة المغربية.";
const previewJobs = new Map<string, Promise<string>>();

app.get("/api/voices/preview/:id", async (req, res) => {
  const voiceId = String(req.params.id || "").trim();

  if (!PREVIEW_VOICES.has(voiceId)) {
    return res.status(404).json({ error: "الصوت غير موجود." });
  }

  res.set(
    "Cache-Control",
    "public, max-age=86400, stale-while-revalidate=604800",
  );

  try {
    const ref = db.doc(`voice_previews/${voiceId}`);
    const snapshot = await ref.get();
    const cachedBase64 = snapshot.data()?.audioBase64;

    if (typeof cachedBase64 === "string" && cachedBase64.length > 0) {
      return res.json({
        success: true,
        cached: true,
        audioDataUrl: `data:audio/wav;base64,${cachedBase64}`,
      });
    }

    let job = previewJobs.get(voiceId);

    if (!job) {
      job = (async () => {
        const wav = await synthesize(PREVIEW_TEXT, voiceId);
        const audioBase64 = wav.toString("base64");

        if (Buffer.byteLength(audioBase64, "utf8") > 900000) {
          throw new Error("PREVIEW_TOO_LARGE");
        }

        await ref.set(
          {
            voiceId,
            audioBase64,
            mimeType: "audio/wav",
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );

        return audioBase64;
      })().finally(() => {
        previewJobs.delete(voiceId);
      });

      previewJobs.set(voiceId, job);
    }

    const audioBase64 = await job;

    return res.json({
      success: true,
      cached: false,
      audioDataUrl: `data:audio/wav;base64,${audioBase64}`,
    });
  } catch (error) {
    console.error("Voice preview failed:", error);
    return res.status(503).json({ error: "المعاينة غير متاحة مؤقتاً." });
  }
});

const AI_DAILY_LIMITS: Record<string, number> = {
  free: 3,
  mini: 10,
  starter: 20,
  pro: 60,
  business: 150,
  unlimited: 500,
};

async function reserveAiToolUsage(
  userId: string,
  isAdmin: boolean,
  tool: "arabizi" | "ad",
) {
  if (isAdmin) return null;

  const day = new Date().toISOString().slice(0, 10);
  const profileRef = db.doc(`users/${userId}`);
  const usageRef = db.doc(`ai_tool_usage/${userId}_${day}_${tool}`);

  await db.runTransaction(async (tx) => {
    const [profileSnapshot, usageSnapshot] = await Promise.all([
      tx.get(profileRef),
      tx.get(usageRef),
    ]);
    const profile = profileSnapshot.data();

    if (!profile) throw new Error("PROFILE");
    if (profile.status === "suspended") throw new Error("SUSPENDED");

    const tier = String(profile.subscriptionTier || "free");
    const limit = AI_DAILY_LIMITS[tier] || AI_DAILY_LIMITS.free;
    const count = Number(usageSnapshot.data()?.count || 0);

    if (count >= limit) throw new Error("AI_LIMIT");

    tx.set(
      usageRef,
      {
        userId,
        tool,
        day,
        tier,
        limit,
        count: count + 1,
        updatedAt: new Date().toISOString(),
        expiresAt: Timestamp.fromMillis(Date.now() + 90 * 86400000),
      },
      { merge: true },
    );
  });

  return usageRef;
}

async function refundAiToolUsage(ref: DocumentReference | null) {
  if (!ref) return;

  await ref
    .update({
      count: FieldValue.increment(-1),
      updatedAt: new Date().toISOString(),
    })
    .catch(() => {});
}

app.post("/api/darija/convert-arabizi", auth, async (req, res) => {
  const text = String(req.body.text || "")
    .trim()
    .slice(0, 1500);

  if (!text) return res.status(400).json({ error: "النص مطلوب." });

  let usageRef: DocumentReference | null = null;

  try {
    usageRef = await reserveAiToolUsage(
      req.actor!.uid,
      req.actor!.admin,
      "arabizi",
    );

    const result = await ai().models.generateContent({
      model: TEXT_MODEL,
      contents:
        "حوّل للدارجة المغربية بالحروف العربية، وأرجع JSON فيه " +
        `arabicScript وenglishMeaning وculturalNote فقط:\n${text}`,
      config: { responseMimeType: "application/json" },
    });

    return res.json({
      success: true,
      ...JSON.parse(result.text || "{}"),
    });
  } catch (error: any) {
    await refundAiToolUsage(usageRef);

    if (error.message === "AI_LIMIT") {
      return res
        .status(429)
        .json({ error: "وصلتي للحد اليومي ديال هاد الأداة." });
    }

    if (error.message === "SUSPENDED") {
      return res.status(403).json({ error: "الحساب موقوف." });
    }

    console.error("Arabizi conversion failed:", error);
    return res.status(503).json({ error: "تعذر تحويل النص مؤقتاً." });
  }
});

app.post("/api/darija/generate-ad-script", auth, async (req, res) => {
  const description = String(req.body.productDescription || "")
    .trim()
    .slice(0, 1500);

  if (!description) {
    return res.status(400).json({ error: "وصف المنتج مطلوب." });
  }

  let usageRef: DocumentReference | null = null;

  try {
    usageRef = await reserveAiToolUsage(req.actor!.uid, req.actor!.admin, "ad");

    const result = await ai().models.generateContent({
      model: TEXT_MODEL,
      contents:
        "اكتب إعلاناً قصيراً مقنعاً بالدارجة المغربية للمنتج: " +
        `${description}. أرجع JSON فقط فيه: ` +
        "title, script, voiceRecommendation, hook",
      config: { responseMimeType: "application/json" },
    });

    return res.json({
      success: true,
      ...JSON.parse(result.text || "{}"),
    });
  } catch (error: any) {
    await refundAiToolUsage(usageRef);

    if (error.message === "AI_LIMIT") {
      return res
        .status(429)
        .json({ error: "وصلتي للحد اليومي ديال هاد الأداة." });
    }

    if (error.message === "SUSPENDED") {
      return res.status(403).json({ error: "الحساب موقوف." });
    }

    console.error("Ad generation failed:", error);
    return res.status(503).json({ error: "تعذر إنشاء الإعلان مؤقتاً." });
  }
});

app.post("/api/subscriptions", auth, async (req, res) => {
  const id = String(req.body.planId || "") as keyof typeof PLANS;
  const plan = PLANS[id];

  if (!plan) return res.status(400).json({ error: "الباقة غير صحيحة." });

  const settingsSnapshot = await db.doc("settings/global").get();
  const settings = normalizeSettings(settingsSnapshot.data());
  const priceSettingKey = `${id}PriceMAD`;
  const configuredPrice = Number(
    (settings as Record<string, unknown>)[priceSettingKey],
  );
  const priceMAD =
    Number.isFinite(configuredPrice) && configuredPrice > 0
      ? configuredPrice
      : plan.priceMAD;

  const existing = await db
    .collection("subscription_requests")
    .where("userId", "==", req.actor!.uid)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (!existing.empty) {
    return res.status(409).json({ error: "عندك طلب قيد المراجعة." });
  }

  const ref = db.collection("subscription_requests").doc();
  const profile = (await db.doc(`users/${req.actor!.uid}`).get()).data();
  const data = {
    id: ref.id,
    userId: req.actor!.uid,
    userEmail: req.actor!.email,
    userName: profile?.displayName || req.actor!.email.split("@")[0],
    planName: plan.name,
    planTier: id,
    priceMAD,
    tokensCount: plan.tokensCount,
    includedMinutes: plan.includedMinutes,
    validityMonths: plan.validityMonths,
    serverValidated: true,
    commercialSettingsVersion: 2,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  await ref.set(data);
  res.json({ success: true, request: data });
});

app.get("/api/subscriptions", auth, admin, async (_req, res) => {
  const query = await db
    .collection("subscription_requests")
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  res.json({ requests: query.docs.map((doc) => doc.data()) });
});

app.patch("/api/subscriptions/:id", auth, admin, async (req, res) => {
  const status = String(req.body.status);

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "حالة غير صحيحة" });
  }

  const ref = db.doc(`subscription_requests/${req.params.id}`);

  try {
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const request = snapshot.data();

      if (!request || request.status !== "pending") {
        throw new Error("ALREADY_PROCESSED");
      }

      const approvedPlan = PLANS[request.planTier as keyof typeof PLANS];
      if (!approvedPlan) throw new Error("INVALID_PLAN");

      const now = new Date().toISOString();
      let approvalUpdates: Record<string, unknown> = {};

      if (status === "approved") {
        const userRef = db.doc(`users/${request.userId}`);
        const settingsRef = db.doc("settings/global");
        const [userSnapshot, settingsSnapshot] = await Promise.all([
          tx.get(userRef),
          tx.get(settingsRef),
        ]);
        const user = userSnapshot.data();
        if (!user) throw new Error("USER_NOT_FOUND");

        const settings = normalizeSettings(settingsSnapshot.data());
        const planTokens = request.serverValidated
          ? Number(request.tokensCount || approvedPlan.tokensCount)
          : approvedPlan.tokensCount;
        const planMinutes = request.serverValidated
          ? Number(request.includedMinutes || approvedPlan.includedMinutes)
          : approvedPlan.includedMinutes;
        const validityMonths = request.serverValidated
          ? Number(request.validityMonths || approvedPlan.validityMonths)
          : approvedPlan.validityMonths;

        const bonusAvailable =
          settings.launchBonusEnabled === true &&
          !user.launchBonusGrantedAt &&
          Number(settings.launchBonusClaimedCount || 0) <
            Number(settings.launchBonusLimit || 100);
        const bonusMinutes = bonusAvailable
          ? Number(settings.launchBonusMinutes || 10)
          : 0;
        const bonusTokens = bonusMinutes * 60 * DEFAULT_SETTINGS.tokensPerSecond;

        const oldExpiryMs = new Date(user.creditsExpireAt || 0).getTime();
        const oldBalanceValid =
          Number.isFinite(oldExpiryMs) && oldExpiryMs > Date.now();
        const baseTokens = oldBalanceValid ? Number(user.tokens || 0) : 0;
        const candidateExpiryMs = new Date(addMonthsIso(validityMonths)).getTime();
        const creditsExpireAt = new Date(
          Math.max(oldBalanceValid ? oldExpiryMs : 0, candidateExpiryMs),
        ).toISOString();

        tx.update(userRef, {
          status: "active",
          subscriptionTier: request.planTier,
          tokens: baseTokens + planTokens + bonusTokens,
          creditsExpireAt,
          ...(bonusAvailable
            ? {
                launchBonusGrantedAt: now,
                launchBonusMinutes: bonusMinutes,
              }
            : {}),
          updatedAt: now,
        });

        if (bonusAvailable) {
          const migratingLegacySettings =
            Number(settingsSnapshot.data()?.commercialSettingsVersion || 0) < 2;
          tx.set(
            settingsRef,
            {
              ...(migratingLegacySettings
                ? {
                    freeTrialsDefaultCount: 2,
                    freeTrialMaxSeconds: 15,
                    miniPriceMAD: 59,
                    starterPriceMAD: 99,
                    proPriceMAD: 199,
                    businessPriceMAD: 599,
                    launchBonusEnabled: true,
                    launchBonusLimit: 100,
                    launchBonusMinutes: 10,
                  }
                : {}),
              launchBonusClaimedCount:
                Number(settings.launchBonusClaimedCount || 0) + 1,
              commercialSettingsVersion: 2,
              updatedAt: now,
            },
            { merge: true },
          );
        }

        approvalUpdates = {
          tokensCount: planTokens,
          includedMinutes: planMinutes,
          validityMonths,
          bonusMinutesApplied: bonusMinutes,
          tokensAdded: planTokens + bonusTokens,
        };
      }

      tx.update(ref, {
        ...approvalUpdates,
        status,
        updatedAt: now,
        approvedAt: status === "approved" ? now : null,
        approvedBy: req.actor!.uid,
      });

      tx.set(db.collection("audit_logs").doc(), {
        action: `subscription_${status}`,
        requestId: req.params.id,
        adminId: req.actor!.uid,
        createdAt: now,
      });
    });
  } catch (error: any) {
    if (error.message === "ALREADY_PROCESSED") {
      return res.status(409).json({ error: "هاد الطلب سبق تعالج." });
    }
    if (error.message === "INVALID_PLAN") {
      return res
        .status(400)
        .json({ error: "الباقة المسجلة فالطلب غير صحيحة." });
    }
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "الحساب المرتبط بالطلب غير موجود." });
    }
    throw error;
  }

  res.json({ success: true });
});

app.delete("/api/subscriptions/:id", auth, admin, async (req, res) => {
  const requestId = String(req.params.id || "");
  const batch = db.batch();
  batch.delete(db.doc(`subscription_requests/${requestId}`));
  batch.set(db.collection("audit_logs").doc(), {
    action: "subscription_deleted",
    requestId,
    adminId: req.actor!.uid,
    createdAt: new Date().toISOString(),
  });
  await batch.commit();
  res.json({ success: true });
});

function validDocumentId(value: string) {
  return /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

app.patch("/api/admin/users/:id/status", auth, admin, async (req, res) => {
  const userId = String(req.params.id || "");
  const status = String(req.body.status || "");

  if (
    !validDocumentId(userId) ||
    !["pending", "active", "suspended"].includes(status)
  ) {
    return res.status(400).json({ error: "بيانات الحساب غير صحيحة." });
  }

  const userRef = db.doc(`users/${userId}`);
  const snapshot = await userRef.get();
  if (!snapshot.exists)
    return res.status(404).json({ error: "الحساب غير موجود." });

  const now = new Date().toISOString();
  const batch = db.batch();
  batch.update(userRef, { status, updatedAt: now });
  batch.set(db.collection("audit_logs").doc(), {
    action: "user_status_changed",
    userId,
    status,
    adminId: req.actor!.uid,
    createdAt: now,
  });
  await batch.commit();
  return res.json({ success: true });
});

app.patch("/api/admin/users/:id/tokens", auth, admin, async (req, res) => {
  const userId = String(req.params.id || "");
  const amount = Number(req.body.amount);

  if (
    !validDocumentId(userId) ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > 10_000_000
  ) {
    return res.status(400).json({ error: "قيمة الشحن غير صحيحة." });
  }

  const userRef = db.doc(`users/${userId}`);
  const snapshot = await userRef.get();
  if (!snapshot.exists)
    return res.status(404).json({ error: "الحساب غير موجود." });

  const now = new Date().toISOString();
  const profile = snapshot.data();
  const oldExpiryMs = new Date(profile?.creditsExpireAt || 0).getTime();
  const oldBalanceValid = Number.isFinite(oldExpiryMs) && oldExpiryMs > Date.now();
  const baseTokens = oldBalanceValid ? Number(profile?.tokens || 0) : 0;
  const creditsExpireAt = new Date(
    Math.max(oldBalanceValid ? oldExpiryMs : 0, new Date(addMonthsIso(6)).getTime()),
  ).toISOString();
  const batch = db.batch();
  batch.update(userRef, {
    tokens: baseTokens + amount,
    status: "active",
    creditsExpireAt,
    updatedAt: now,
  });
  batch.set(db.collection("audit_logs").doc(), {
    action: "tokens_added",
    userId,
    amount,
    adminId: req.actor!.uid,
    createdAt: now,
  });
  await batch.commit();
  return res.json({ success: true });
});

app.patch("/api/admin/users/:id/tier", auth, admin, async (req, res) => {
  const userId = String(req.params.id || "");
  const tier = String(req.body.tier || "");
  const allowedTiers = new Set([
    "free",
    "mini",
    "starter",
    "pro",
    "business",
    "unlimited",
  ]);

  if (!validDocumentId(userId) || !allowedTiers.has(tier)) {
    return res.status(400).json({ error: "الباقة غير صحيحة." });
  }

  const userRef = db.doc(`users/${userId}`);
  const snapshot = await userRef.get();
  if (!snapshot.exists)
    return res.status(404).json({ error: "الحساب غير موجود." });

  const tokens =
    tier === "free"
      ? 0
      : tier === "unlimited"
        ? 999999
        : PLANS[tier as keyof typeof PLANS].tokensCount;
  const validityMonths =
    tier === "free" || tier === "unlimited"
      ? 0
      : PLANS[tier as keyof typeof PLANS].validityMonths;
  const now = new Date().toISOString();
  const batch = db.batch();
  batch.update(userRef, {
    subscriptionTier: tier,
    status: tier === "free" ? "pending" : "active",
    tokens,
    freeTrialsRemaining:
      tier === "free" ? DEFAULT_SETTINGS.freeTrialsDefaultCount : 0,
    creditsExpireAt:
      tier === "free" || tier === "unlimited"
        ? null
        : addMonthsIso(validityMonths),
    updatedAt: now,
  });
  batch.set(db.collection("audit_logs").doc(), {
    action: "user_tier_changed",
    userId,
    tier,
    tokens,
    adminId: req.actor!.uid,
    createdAt: now,
  });
  await batch.commit();
  return res.json({ success: true });
});

app.patch("/api/admin/settings", auth, admin, async (req, res) => {
  const settingsRef = db.doc("settings/global");
  const currentSettings = normalizeSettings((await settingsRef.get()).data());
  const numeric = (
    name: string,
    fallback: number,
    min: number,
    max: number,
  ) => {
    const value = Number(req.body[name] ?? fallback);
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new Error("INVALID_SETTINGS");
    }
    return value;
  };

  try {
    const settings = {
      freeTrialsDefaultCount: numeric("freeTrialsDefaultCount", 2, 0, 10),
      freeTrialMaxSeconds: numeric("freeTrialMaxSeconds", 15, 1, 30),
      tokensPerSecond: numeric("tokensPerSecond", 10, 1, 100),
      contactWhatsApp: String(req.body.contactWhatsApp || "")
        .trim()
        .slice(0, 30),
      paymentInstructions: String(req.body.paymentInstructions || "")
        .trim()
        .slice(0, 1000),
      miniPriceMAD: numeric("miniPriceMAD", 59, 1, 10000),
      starterPriceMAD: numeric("starterPriceMAD", 99, 1, 10000),
      proPriceMAD: numeric("proPriceMAD", 199, 1, 10000),
      businessPriceMAD: numeric("businessPriceMAD", 599, 1, 10000),
      launchBonusEnabled: req.body.launchBonusEnabled !== false,
      launchBonusLimit: numeric("launchBonusLimit", 100, 1, 10000),
      launchBonusMinutes: numeric("launchBonusMinutes", 10, 0, 120),
      launchBonusClaimedCount: Number(
        currentSettings.launchBonusClaimedCount || 0,
      ),
      commercialSettingsVersion: 2,
      updatedAt: new Date().toISOString(),
      updatedBy: req.actor!.uid,
    };

    if (
      !/^\+?[0-9]{8,15}$/.test(settings.contactWhatsApp.replace(/[\s-]/g, ""))
    ) {
      return res.status(400).json({ error: "رقم الواتساب غير صحيح." });
    }

    const batch = db.batch();
    batch.set(settingsRef, settings, { merge: true });
    batch.set(db.collection("audit_logs").doc(), {
      action: "settings_updated",
      adminId: req.actor!.uid,
      createdAt: settings.updatedAt,
    });
    await batch.commit();
    return res.json({ success: true, settings });
  } catch (error: any) {
    if (error.message === "INVALID_SETTINGS") {
      return res.status(400).json({ error: "قيم الإعدادات غير صحيحة." });
    }
    throw error;
  }
});

app.get("/api/reviews", async (_req, res) => {
  const query = await db
    .collection("reviews")
    .where("isVisible", "==", true)
    .where("moderationStatus", "==", "approved")
    .limit(50)
    .get();

  const reviews = query.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    );

  res.json({ reviews });
});

app.post("/api/reviews", auth, async (req, res) => {
  const name = String(req.body.name || "")
    .trim()
    .slice(0, 80);
  const comment = String(req.body.comment || "")
    .trim()
    .slice(0, 800);

  if (!name || !comment) {
    return res.status(400).json({ error: "الاسم والتعليق مطلوبان." });
  }

  const duplicate = await db
    .collection("reviews")
    .where("userId", "==", req.actor!.uid)
    .limit(1)
    .get();

  if (!duplicate.empty && !req.actor!.admin) {
    return res.status(409).json({ error: "سبق ليك رسلتي تقييماً للمراجعة." });
  }

  const ref = db.collection("reviews").doc();
  const data = {
    name,
    role: String(req.body.role || "مستخدم المنصة").slice(0, 100),
    rating: Math.min(5, Math.max(1, Number(req.body.rating) || 5)),
    comment,
    verified: true,
    isVisible: false,
    moderationStatus: "pending",
    userId: req.actor!.uid,
    createdAt: new Date().toISOString(),
  };

  await ref.set(data);
  res.json({ success: true, review: { id: ref.id, ...data } });
});

app.patch("/api/reviews/:id", auth, admin, async (req, res) => {
  if (typeof req.body.isVisible !== "boolean") {
    return res.status(400).json({ error: "حالة التقييم غير صحيحة." });
  }

  const reviewId = String(req.params.id || "");
  const reviewRef = db.doc(`reviews/${reviewId}`);
  const snapshot = await reviewRef.get();

  if (!snapshot.exists) {
    return res.status(404).json({ error: "التقييم غير موجود." });
  }

  const isVisible = req.body.isVisible;
  const now = new Date().toISOString();
  const batch = db.batch();

  batch.update(reviewRef, {
    isVisible,
    moderationStatus: isVisible ? "approved" : "hidden",
    updatedAt: now,
    moderatedBy: req.actor!.uid,
  });

  batch.set(db.collection("audit_logs").doc(), {
    action: isVisible ? "review_approved" : "review_hidden",
    reviewId,
    adminId: req.actor!.uid,
    createdAt: now,
  });

  await batch.commit();

  return res.json({ success: true });
});

app.delete("/api/reviews/:id", auth, admin, async (req, res) => {
  const reviewId = String(req.params.id || "");
  const reviewRef = db.doc(`reviews/${reviewId}`);
  const snapshot = await reviewRef.get();

  if (!snapshot.exists) {
    return res.status(404).json({ error: "التقييم غير موجود." });
  }

  const batch = db.batch();

  batch.delete(reviewRef);

  batch.set(db.collection("audit_logs").doc(), {
    action: "review_deleted",
    reviewId,
    adminId: req.actor!.uid,
    createdAt: new Date().toISOString(),
  });

  await batch.commit();

  return res.json({ success: true });
});
async function start() {
  if (process.env.NODE_ENV === "production") {
    if (!origins.size) {
      throw new Error("ALLOWED_ORIGINS is required in production");
    }

    const dist = path.join(process.cwd(), "dist");
    app.use(
      express.static(dist, {
        index: false,
        maxAge: "1h",
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader(
              "Cache-Control",
              "public, max-age=31536000, immutable",
            );
          } else if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-store");
          }
        },
      }),
    );
    app.get("/{*splat}", (_req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.sendFile(path.join(dist, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.use(
    (error: unknown, _req: Request, res: Response, next: NextFunction) => {
      console.error("Unhandled request error:", error);
      if (res.headersSent) return next(error);
      return res.status(500).json({ error: "وقع خطأ داخلي مؤقت." });
    },
  );

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DarijaVoice listening on ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start DarijaVoice:", error);
  process.exit(1);
});

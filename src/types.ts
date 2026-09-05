export interface VoiceOption {
  id: string;
  geminiVoice: string;
  name: string;
  arabicName: string;
  gender: "female" | "male";
  isCommercialSpecialist?: boolean;
  specialtyTag?: string;
  description: string;
  tags: string[];
  previewSamplePhrase?: string;
}

export interface ToneOption {
  id: string;
  name: string;
  englishLabel: string;
  promptDirective: string;
  icon: string;
}

export interface PresetPhrase {
  id: string;
  category: string;
  title: string;
  text: string;
  arabizi?: string;
  meaning: string;
  isCommercial?: boolean;
}

export type PlanId =
  "free" | "mini" | "starter" | "pro" | "business" | "unlimited";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "user";
  status: "pending" | "active" | "suspended";
  tokens: number;
  freeTrialsRemaining: number;
  freeTrialMaxSeconds: number;
  subscriptionTier: PlanId;
  creditsExpireAt?: string;
  createdAt: string;
  updatedAt: string;
  phoneNumber?: string;
}

export interface AppSettings {
  freeTrialsDefaultCount: number;
  freeTrialMaxSeconds: number;
  tokensPerSecond: number;
  contactWhatsApp: string;
  paymentInstructions: string;
  miniPriceMAD: number;
  starterPriceMAD: number;
  proPriceMAD: number;
  businessPriceMAD: number;
  launchBonusEnabled: boolean;
  launchBonusLimit: number;
  launchBonusMinutes: number;
  launchBonusClaimedCount: number;
  commercialSettingsVersion: number;
}

export interface TTSHistoryItem {
  id: string;
  text: string;
  vocalizedText?: string;
  audioUrl: string;
  audioBase64: string;
  voice: string;
  tone: string;
  timestamp: number;
  duration?: number;
  tokensDeducted?: number;
}

export interface CustomerReview {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  rating: number;
  comment: string;
  verified: boolean;
  isVisible: boolean;
  moderationStatus?: "pending" | "approved" | "hidden" | "rejected";
  createdAt: string;
}

export interface SubscriptionRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  planName: string;
  planTier: Exclude<PlanId, "free" | "unlimited">;
  priceMAD: number;
  tokensCount: number;
  includedMinutes: number;
  validityMonths?: number;
  bonusMinutesApplied?: number;
  tokensAdded?: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  notes?: string;
}

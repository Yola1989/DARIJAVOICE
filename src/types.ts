export interface VoiceOption {
  id: string;
  geminiVoice: string; // Underlying Gemini prebuilt voice: Kore, Puck, Aoede, Charon, Fenrir, Zephyr
  name: string; // Moroccan Arabic Name e.g. "خديجة", "يوسف"
  arabicName: string;
  gender: 'female' | 'male';
  isCommercialSpecialist?: boolean; // Flag for marketing/commercial voices
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

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  status: 'pending' | 'active' | 'suspended';
  tokens: number; // Tokens balance
  freeTrialsRemaining: number; // e.g., 2 free trials for non-activated users
  freeTrialMaxSeconds: number; // e.g., 5 seconds max per trial
  subscriptionTier: 'free' | 'starter' | 'pro' | 'business' | 'unlimited';
  expiresAt?: string;
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
  starterPriceMAD: number;
  proPriceMAD: number;
  businessPriceMAD: number;
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
  role: string; // e.g. "صاحب متجر إلكتروني", "صانع محتوى ريلز"
  avatar?: string;
  rating: number; // 1 to 5
  comment: string;
  verified: boolean;
  isVisible: boolean; // Control visibility from admin dashboard
  createdAt: string;
}


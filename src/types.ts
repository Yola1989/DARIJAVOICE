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
  sampleGreeting?: string; // Short Moroccan greeting sample
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
  freeTrialMaxSeconds: number; // e.g., 15 seconds max per trial
  subscriptionTier: 'free' | 'mini' | 'starter' | 'pro' | 'business' | 'unlimited';
  creditsExpireAt?: string | null;
  launchBonusGrantedAt?: string | null;
  launchBonusMinutes?: number;
  createdAt: string;
  updatedAt: string;
  phoneNumber?: string;
}

export interface AppSettings {
  freeTrialsDefaultCount: number;
  freeTrialMaxSeconds: number;
  tokensPerSecond: number;
  contactWhatsApp: string;
  whatsappNumber?: string;
  paymentInstructions: string;
  miniPriceMAD: number;
  starterPriceMAD: number;
  proPriceMAD: number;
  businessPriceMAD: number;
  launchBonusEnabled: boolean;
  launchBonusLimit: number;
  launchBonusMinutes: number;
  launchBonusClaimedCount: number;
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

export interface ReviewItem {
  id: string;
  authorName: string;
  authorRole?: string;
  rating: number; // 1 to 5
  comment: string;
  status: 'approved' | 'pending' | 'hidden';
  userId?: string;
  userEmail?: string;
  createdAt: string;
}


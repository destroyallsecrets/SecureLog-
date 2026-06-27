export interface VisitorRecord {
  id: string;
  name: string;
  passType: string;
  affiliation: string;
  timestamp: string; // ISO string
}

export type VoiceStep = 'IDLE' | 'NAME' | 'PASS_TYPE' | 'AFFILIATION' | 'REVIEW';

export interface AppSettings {
  capacityLimit: number;
  useVoiceGuidance: boolean;
  voiceVolume: number;
  highContrastMode: boolean;
  theme: 'light' | 'dark';
}

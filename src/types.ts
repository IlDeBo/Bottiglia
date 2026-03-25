export interface Message {
  id: string;
  text: string;
  timestamp: number;
  rssi?: number;
  color?: string;
  type?: 'message' | 'reaction';
  reactionType?: 'heart' | 'wave' | 'star';
  likes?: number;
}

export type AppState = 'write' | 'transmitting' | 'inbox' | 'permissions' | 'onboarding' | 'bottle';

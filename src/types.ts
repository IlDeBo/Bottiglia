export interface Message {
  id: string;
  text: string;
  timestamp: number;
}

export type AppState = 'write' | 'transmitting' | 'inbox';

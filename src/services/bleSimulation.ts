import React, { useState, useEffect } from 'react';
import { Message } from '../types';

// This is a simulation for the web preview.
// In a real React Native app, this would interface with react-native-ble-plx.

const MOCK_MESSAGES = [
  "C'è un silenzio bellissimo stasera.",
  "Qualcuno ha visto la luna?",
  "Sperlonga è magica d'inverno.",
  "Un saluto da un passante solitario.",
  "La brezza marina profuma di sale.",
  "Le onde sussurrano segreti antichi.",
  "Siamo polvere di stelle in un mare scuro.",
  "Il tempo si è fermato tra i vicoli.",
  "Ascolta il battito del cuore della città.",
  "Un pensiero gentile per chi legge.",
];

const COLORS = ['var(--color-app-ink)', '#3b82f6', '#f97316', '#ef4444', '#10b981', '#8b5cf6'];

export const useBLESimulation = (isScanning: boolean) => {
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(() => {
      const chance = Math.random();
      
      setReceivedMessages(prev => {
        // Update existing message likes (Simulation of gossip)
        if (chance > 0.7 && prev.length > 0) {
          const randomIndex = Math.floor(Math.random() * prev.length);
          const target = prev[randomIndex];
          
          if (target.type === 'message') {
            const updatedMessage = {
              ...target,
              likes: (target.likes || 0) + 1
            };
            
            return prev.map(m => m.id === target.id ? updatedMessage : m);
          }
        }

        // New message creation
        if (chance > 0.4) {
          const isReaction = Math.random() > 0.8;
          const randomText = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];
          const reactions: ('heart' | 'wave' | 'star')[] = ['heart', 'wave', 'star'];
          
          const newMessage: Message = {
            id: Math.random().toString(36).substr(2, 9),
            text: isReaction ? '' : randomText,
            timestamp: Date.now(),
            rssi: -30 - Math.floor(Math.random() * 60),
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            type: isReaction ? 'reaction' : 'message',
            reactionType: isReaction ? reactions[Math.floor(Math.random() * reactions.length)] : undefined,
            likes: isReaction ? undefined : Math.floor(Math.random() * 3),
          };

          const updated = [newMessage, ...prev];
          return updated.slice(0, 15);
        }
        
        return prev;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isScanning]);

  return { receivedMessages };
};

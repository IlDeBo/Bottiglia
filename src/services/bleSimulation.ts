import React, { useState, useEffect } from 'react';
import { Message } from './types';

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

export const useBLESimulation = (isScanning: boolean) => {
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const randomText = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];
        const newMessage: Message = {
          id: Math.random().toString(36).substr(2, 9),
          text: randomText,
          timestamp: Date.now(),
        };

        setReceivedMessages(prev => {
          const updated = [newMessage, ...prev];
          return updated.slice(0, 10); // Keep last 10
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isScanning]);

  return { receivedMessages };
};

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Inbox, PenLine, X, Radio, Waves } from 'lucide-react';
import { cn } from './lib/utils';
import { Message, AppState } from './types';
import { useBLESimulation } from './services/bleSimulation';

export default function App() {
  const [state, setState] = useState<AppState>('write');
  const [messageText, setMessageText] = useState('');
  const [inbox, setInbox] = useState<Message[]>([]);
  
  // Simulation of BLE scanning
  const { receivedMessages } = useBLESimulation(true);

  useEffect(() => {
    if (receivedMessages.length > 0) {
      // Add new messages to local inbox if they aren't already there
      setInbox(prev => {
        const newOnes = receivedMessages.filter(rm => !prev.some(p => p.id === rm.id));
        if (newOnes.length === 0) return prev;
        const updated = [...newOnes, ...prev];
        return updated.slice(0, 10);
      });
    }
  }, [receivedMessages]);

  const handleTransmit = () => {
    if (messageText.trim().length > 0) {
      setState('transmitting');
    }
  };

  const handleStop = () => {
    setState('write');
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative overflow-hidden font-sans">
      {/* Background Waves Decoration */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-sea-foam/20 to-transparent" />
        <motion.div 
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-10 left-0 right-0"
        >
          <Waves className="w-full h-32 text-sea-foam" />
        </motion.div>
      </div>

      {/* Header */}
      <header className="z-10 pt-12 pb-6 px-8 flex justify-between items-center">
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-serif italic tracking-wide"
        >
          Bottiglia
        </motion.h1>
        <div className="flex gap-4">
          <button 
            onClick={() => setState('inbox')}
            className={cn(
              "p-2 rounded-full transition-colors relative",
              state === 'inbox' ? "bg-sea-foam text-ocean-dark" : "text-sea-foam/60 hover:text-sea-foam"
            )}
          >
            <Inbox size={20} />
            {inbox.length > 0 && state !== 'inbox' && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-400 rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setState('write')}
            className={cn(
              "p-2 rounded-full transition-colors",
              state === 'write' ? "bg-sea-foam text-ocean-dark" : "text-sea-foam/60 hover:text-sea-foam"
            )}
          >
            <PenLine size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 z-10 px-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {state === 'write' && (
            <motion.div 
              key="write"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col h-full justify-center gap-8"
            >
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest opacity-50 ml-1">Il tuo messaggio</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value.slice(0, 150))}
                  placeholder="Scrivi qualcosa di effimero..."
                  className="w-full h-40 bg-transparent border border-sea-foam/20 rounded-2xl p-6 text-lg focus:outline-none focus:border-sea-foam/50 transition-colors resize-none placeholder:italic placeholder:opacity-30"
                />
                <div className="text-right text-[10px] tracking-tighter opacity-30">
                  {messageText.length} / 150
                </div>
              </div>

              <button
                onClick={handleTransmit}
                disabled={messageText.trim().length === 0}
                className={cn(
                  "w-full py-5 rounded-full flex items-center justify-center gap-3 transition-all duration-500",
                  messageText.trim().length > 0 
                    ? "bg-sea-foam text-ocean-dark shadow-lg shadow-sea-foam/10" 
                    : "bg-sea-foam/10 text-sea-foam/20 cursor-not-allowed"
                )}
              >
                <Send size={18} />
                <span className="font-medium tracking-wide uppercase text-sm">Trasmetti</span>
              </button>
            </motion.div>
          )}

          {state === 'transmitting' && (
            <motion.div 
              key="transmitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full items-center justify-center gap-12"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-sea-foam/20 rounded-full pulse-animation" />
                <div className="absolute inset-0 bg-sea-foam/10 rounded-full pulse-animation [animation-delay:1s]" />
                <div className="relative z-10 w-32 h-32 bg-sea-foam/5 border border-sea-foam/20 rounded-full flex items-center justify-center">
                  <Radio size={48} className="text-sea-foam animate-pulse" />
                </div>
              </div>

              <div className="text-center space-y-4 max-w-xs">
                <h2 className="text-xl font-serif italic">In viaggio...</h2>
                <p className="text-sea-foam/60 text-sm leading-relaxed italic">
                  "{messageText}"
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] opacity-30 pt-4">
                  Il tuo messaggio è ora visibile a chiunque sia vicino a te.
                </p>
              </div>

              <button
                onClick={handleStop}
                className="mt-8 px-8 py-3 rounded-full border border-sea-foam/20 text-sea-foam/60 hover:bg-sea-foam/5 hover:text-sea-foam transition-all flex items-center gap-2"
              >
                <X size={16} />
                <span className="text-xs uppercase tracking-widest">Interrompi</span>
              </button>
            </motion.div>
          )}

          {state === 'inbox' && (
            <motion.div 
              key="inbox"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full pt-4"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-serif italic">Messaggi raccolti</h2>
                <span className="text-[10px] uppercase tracking-widest opacity-30">
                  {inbox.length} trovati
                </span>
              </div>

              <div className="space-y-4 pb-12">
                {inbox.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center space-y-4">
                    <Waves size={40} />
                    <p className="italic text-sm">Il mare è calmo. Nessun messaggio in arrivo.</p>
                  </div>
                ) : (
                  inbox.map((msg, i) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-5 rounded-2xl bg-sea-foam/5 border border-sea-foam/10 hover:border-sea-foam/20 transition-colors"
                    >
                      <p className="text-sea-foam/80 leading-relaxed italic">
                        {msg.text}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="z-10 p-8 text-center">
        <p className="text-[9px] uppercase tracking-[0.3em] opacity-20">
          Local BLE Transmission • No Server • Ephemeral
        </p>
      </footer>
    </div>
  );
}

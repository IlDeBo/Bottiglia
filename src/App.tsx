import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Inbox, PenLine, X, Radio, Waves, Moon, Sun, Heart, Star, MapPin, ShieldCheck, Volume2, VolumeX, Anchor } from 'lucide-react';
import { cn } from './lib/utils';
import { Message, AppState } from './types';
import { useBLESimulation } from './services/bleSimulation';

const COLORS = ['var(--color-app-ink)', '#3b82f6', '#f97316', '#ef4444', '#10b981', '#8b5cf6'];

export default function App() {
  const [state, setState] = useState<AppState>('onboarding');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [inbox, setInbox] = useState<Message[]>([]);
  const [seenMessageIds, setSeenMessageIds] = useState<Set<string>>(new Set());
  const [reactedMessages, setReactedMessages] = useState<Set<string>>(new Set());
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Qualcosa è arrivato a riva');
  const [theme, setTheme] = useState<'night' | 'dawn'>('night');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [savedMessage, setSavedMessage] = useState<Message | null>(null);
  const [showBottleConfirm, setShowBottleConfirm] = useState(false);
  const [pendingBottleMessage, setPendingBottleMessage] = useState<Message | null>(null);
  const [isReleasing, setIsReleasing] = useState(false);
  
  // Simulation of BLE scanning
  const { receivedMessages } = useBLESimulation(state !== 'permissions' && state !== 'onboarding');

  // Check for onboarding skip preference
  useEffect(() => {
    const skip = localStorage.getItem('fluendo_skip_onboarding');
    if (skip === 'true') {
      setState('permissions');
      setDontShowAgain(true);
    }

    const saved = localStorage.getItem('fluendo_saved_message');
    if (saved) {
      try {
        setSavedMessage(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved message', e);
      }
    }
  }, []);

  useEffect(() => {
    if (savedMessage) {
      localStorage.setItem('fluendo_saved_message', JSON.stringify(savedMessage));
    } else {
      localStorage.removeItem('fluendo_saved_message');
    }
  }, [savedMessage]);

  // Sound and Haptic effects helper - Natural & Maritime version
  const triggerFeedback = (type: 'receive' | 'send' | 'click') => {
    // Haptic Feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'receive') navigator.vibrate([10, 50, 10]);
      else if (type === 'send') navigator.vibrate(20);
      else if (type === 'click') navigator.vibrate(5);
    }

    if (!soundEnabled) return;
    
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    // Common setup
    gain.connect(filter);
    filter.connect(ctx.destination);
    filter.type = 'lowpass';
    
    if (type === 'receive') {
      // Soft "Wave" sound (Filtered White Noise)
      const bufferSize = ctx.sampleRate * 1.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      filter.frequency.setValueAtTime(100, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.5);
      filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 1.5);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.4);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      
      noise.connect(gain);
      noise.start();
    } else if (type === 'send') {
      // Soft "Breeze" sound (High-pass filtered noise fading out)
      const bufferSize = ctx.sampleRate * 1.0;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.8);
      
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      
      noise.connect(gain);
      noise.start();
    } else {
      // Soft "Bubble" pop
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.1);
      
      filter.frequency.setValueAtTime(400, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }
  };

  // Ephemeral Aging: Remove messages older than 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      setInbox(prev => prev.filter(msg => now - msg.timestamp < tenMinutes));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (receivedMessages.length > 0) {
      setInbox(prev => {
        let hasNew = false;
        let updatedInbox = [...prev];

        receivedMessages.forEach(incoming => {
          const existingIndex = updatedInbox.findIndex(m => m.id === incoming.id);
          
          if (existingIndex > -1) {
            // Update existing message if likes increased
            if ((incoming.likes || 0) > (updatedInbox[existingIndex].likes || 0)) {
              updatedInbox[existingIndex] = { 
                ...updatedInbox[existingIndex], 
                likes: incoming.likes 
              };
            }
          } else {
            // It's a brand new message
            if (!seenMessageIds.has(incoming.id)) {
              updatedInbox = [incoming, ...updatedInbox];
              hasNew = true;
              setSeenMessageIds(s => new Set(s).add(incoming.id));
            }
          }
        });

        if (hasNew) {
          setToastMessage('Qualcosa è arrivato a riva');
          setShowToast(true);
          triggerFeedback('receive');
          setTimeout(() => setShowToast(false), 3000);
        }

        return updatedInbox.slice(0, 15);
      });
    }
  }, [receivedMessages]);

  const handleTransmit = () => {
    if (messageText.trim().length > 0) {
      triggerFeedback('send');
      setIsTransmitting(true);
      setState('transmitting');
    }
  };

  const handleReaction = (msgId: string) => {
    if (reactedMessages.has(msgId)) return;
    
    triggerFeedback('click');
    setReactedMessages(prev => new Set(prev).add(msgId));
    
    // Increment local like count for the message
    setInbox(prev => prev.map(msg => 
      msg.id === msgId ? { ...msg, likes: (msg.likes || 0) + 1 } : msg
    ));
    
    // Simulate sending a reaction
    setToastMessage('Apprezzamento inviato');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleStop = () => {
    setIsTransmitting(false);
    setState('write');
  };

  const handleSaveBottle = (msg: Message) => {
    triggerFeedback('click');
    if (savedMessage) {
      setPendingBottleMessage(msg);
      setShowBottleConfirm(true);
    } else {
      setSavedMessage(msg);
      setInbox(prev => prev.filter(m => m.id !== msg.id));
      setToastMessage('Hai raccolto una bottiglia');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const handleConfirmReplaceBottle = () => {
    if (pendingBottleMessage) {
      setSavedMessage(pendingBottleMessage);
      setInbox(prev => prev.filter(m => m.id !== pendingBottleMessage.id));
      setPendingBottleMessage(null);
      setShowBottleConfirm(false);
      setToastMessage('Hai raccolto una nuova bottiglia');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const handleReleaseBottle = () => {
    setIsReleasing(true);
    triggerFeedback('receive'); // Soft sound
    setTimeout(() => {
      setSavedMessage(null);
      setIsReleasing(false);
      setToastMessage('La bottiglia è tornata in mare');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }, 1500);
  };

  const clearInbox = () => {
    setInbox([]);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'night' ? 'dawn' : 'night');
  };

  const nextOnboarding = () => {
    triggerFeedback('click');
    if (onboardingStep < 6) {
      setOnboardingStep(prev => prev + 1);
    } else {
      if (dontShowAgain) {
        localStorage.setItem('fluendo_skip_onboarding', 'true');
      } else {
        localStorage.removeItem('fluendo_skip_onboarding');
      }
      setState('permissions');
    }
  };

  const renderOnboarding = () => {
    const steps = [
      {
        title: "Fluendo",
        content: "metti le tue parole in bottiglia.",
        button: "Entra"
      },
      {
        title: "L'idea",
        content: "Le parole più belle non hanno sempre bisogno di un destinatario.\n\nA volte basta lanciarle nell'aria — e lasciare che trovino da sole chi ne ha bisogno.",
        button: "Respira"
      },
      {
        title: "Come funziona",
        content: "Scrivi un pensiero. Breve, come un haiku.\nScegli un colore. Premi Trasmetti.\n\nLe tue parole scorrono via Bluetooth verso chiunque sia nei paraggi. Sconosciuti. Passanti. Qualcuno sul tuo stesso tram.\n\nQuando smetti di trasmettere, il messaggio scompare.\nNessuna traccia. Nessun archivio. Solo il momento.",
        button: "Capisco"
      },
      {
        title: "I messaggi che arrivano",
        content: "Anche tu ricevi — in silenzio, senza cercarlo.\n\nI messaggi degli altri appaiono nel tuo mare. Durano dieci minuti, poi svaniscono. Puoi mandargli un cuore: lo sentirà, senza sapere chi sei.\n\nTutto è anonimo. Tutto è effimero.\nQuasi tutto.",
        button: "Continua"
      },
      {
        title: "La bottiglia",
        content: "Una sola eccezione alla regola.\n\nSe un messaggio ti colpisce davvero — se senti che quelle parole erano per te — puoi raccoglierlo. Tenerlo al sicuro, fuori dal flusso del tempo.\n\nMa puoi raccogliere una sola bottiglia alla volta.\nSe ne vuoi raccogliere un'altra, dovrai prima lasciare andare quella che hai.\n\nScegliere significa anche rinunciare.",
        button: "Ho capito"
      },
      {
        title: "La filosofia",
        content: "Fluendo non vuole il tuo tempo.\nNon sa chi sei. Non giudica quello che dici.\n\nDi notte è scura come il mare aperto.\nAll'alba si tinge di caldo — scegli tu.\n\nTrasmetti quando hai qualcosa da dire.\nPoi metti via il telefono.",
        button: "Quasi pronto"
      },
      {
        title: "Cosa vuoi dire\nal mondo oggi?",
        content: "",
        button: "Inizia a scrivere"
      }
    ];

    const step = steps[onboardingStep];
    const isLastStep = onboardingStep === 6;

    return (
      <motion.div 
        key={onboardingStep}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="flex-1 flex flex-col items-center justify-center p-12 text-center"
      >
        <div className="mb-12">
          <Waves size={48} className="text-app-ink-muted mx-auto mb-6 opacity-40" />
          <h2 className={cn(
            "uppercase tracking-[0.3em] text-app-ink-muted mb-8 font-medium",
            isLastStep ? "text-3xl md:text-4xl font-serif italic normal-case tracking-normal" : "text-xs"
          )}>
            {step.title}
          </h2>
          {step.content && (
            <div className="text-xl md:text-2xl font-serif leading-relaxed whitespace-pre-wrap">
              {step.content}
            </div>
          )}
        </div>

        <div className="mt-auto w-full flex flex-col items-center gap-8">
          <button
            onClick={nextOnboarding}
            className={cn(
              "group relative overflow-hidden rounded-full border border-app-ink-faint hover:border-app-ink-muted transition-all duration-500",
              isLastStep ? "w-full py-5 bg-app-ink text-app-bg border-none" : "px-8 py-4"
            )}
          >
            <span className={cn(
              "relative z-10 text-sm tracking-widest uppercase transition-opacity",
              isLastStep ? "opacity-100 font-medium" : "opacity-60 group-hover:opacity-100"
            )}>
              {step.button}
            </span>
            {!isLastStep && (
              <motion.div 
                className="absolute inset-0 bg-app-ink-faint opacity-0 group-hover:opacity-100 transition-opacity"
                layoutId="btn-bg"
              />
            )}
          </button>

          {isLastStep && (
            <label className="flex items-center gap-3 cursor-pointer opacity-40 hover:opacity-100 transition-opacity group">
              <div className="relative w-4 h-4 border border-app-ink-muted rounded-sm flex items-center justify-center">
                <input 
                  type="checkbox" 
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {dontShowAgain && <div className="w-2 h-2 bg-app-ink-muted rounded-full" />}
              </div>
              <span className="text-[10px] uppercase tracking-widest">Non mostrare più</span>
            </label>
          )}
        </div>
      </motion.div>
    );
  };

  // Apply theme class to body for full-page transition
  useEffect(() => {
    if (theme === 'dawn') {
      document.body.classList.add('theme-dawn');
    } else {
      document.body.classList.remove('theme-dawn');
    }
  }, [theme]);

  return (
    <div className={cn(
      "flex flex-col h-screen max-w-md mx-auto relative overflow-hidden font-sans transition-colors duration-700 bg-app-bg text-app-ink",
      theme === 'dawn' && "theme-dawn"
    )}>
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-50 flex justify-center px-8 pointer-events-none"
          >
            <div className="bg-app-ink text-app-bg px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-app-ink-faint">
              <Waves size={16} className={cn(toastMessage === 'Apprezzamento inviato' ? "text-red-400" : "animate-bounce")} />
              <span className="text-xs font-medium uppercase tracking-widest">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Waves Decoration */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-app-ink-faint to-transparent" />
        <motion.div 
          animate={{ 
            y: [0, -20, 0],
            scaleY: 1 + (inbox.length * 0.05) // Reactive Tide: Waves grow with activity
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-10 left-0 right-0 origin-bottom"
        >
          <Waves className="w-full h-32 text-app-ink" />
        </motion.div>
      </div>

      {/* Header */}
      {state !== 'onboarding' && (
        <header className="z-10 pt-12 pb-6 px-8 flex justify-between items-center">
          <div className="flex flex-col">
            <motion.h1 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                triggerFeedback('click');
                setOnboardingStep(0);
                setState('onboarding');
              }}
              className="text-2xl font-serif italic tracking-wide cursor-pointer hover:opacity-70 transition-opacity"
            >
              Fluendo
            </motion.h1>
            <span className="text-[8px] uppercase tracking-[0.4em] opacity-30 mt-1">
              {theme === 'night' ? 'Notte Profonda' : 'Alba Chiara'}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Sound Toggle */}
            <button 
              onClick={() => {
                triggerFeedback('click');
                setSoundEnabled(!soundEnabled);
              }}
              className="text-app-ink-muted hover:text-app-ink transition-colors"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <div className="w-px h-4 bg-app-ink-faint mx-1" />

            {/* Theme Toggle Switch */}
            <button 
              onClick={() => {
                triggerFeedback('click');
                toggleTheme();
              }}
              className="relative w-12 h-6 rounded-full bg-app-ink-faint flex items-center p-1 transition-all"
            >
              <motion.div 
                animate={{ x: theme === 'night' ? 0 : 24 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="w-4 h-4 rounded-full bg-app-ink flex items-center justify-center"
              >
                {theme === 'night' ? <Moon size={10} className="text-app-bg" /> : <Sun size={10} className="text-app-bg" />}
              </motion.div>
            </button>

            <div className="w-px h-4 bg-app-ink-faint mx-1" />

            <button 
              onClick={() => {
                triggerFeedback('click');
                setState('inbox');
              }}
              className={cn(
                "p-2 rounded-full transition-colors relative",
                state === 'inbox' ? "bg-app-ink text-app-bg" : "text-app-ink-muted hover:text-app-ink"
              )}
            >
              <Inbox size={20} />
              {inbox.length > 0 && state !== 'inbox' && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-400 rounded-full" />
              )}
            </button>

            <button 
              onClick={() => {
                triggerFeedback('click');
                setState('bottle');
              }}
              className={cn(
                "p-2 rounded-full transition-colors relative",
                state === 'bottle' ? "bg-app-ink text-app-bg" : cn("text-app-ink-muted hover:text-app-ink", !savedMessage && "opacity-30")
              )}
            >
              <Anchor size={20} />
              {savedMessage && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-app-ink rounded-full animate-pulse" />
              )}
            </button>

            <button 
              onClick={() => {
                triggerFeedback('click');
                setState(isTransmitting ? 'transmitting' : 'write');
              }}
              className={cn(
                "p-2 rounded-full transition-colors relative",
                (state === 'write' || state === 'transmitting') ? "bg-app-ink text-app-bg" : "text-app-ink-muted hover:text-app-ink"
              )}
            >
              <PenLine size={20} />
              {isTransmitting && state !== 'transmitting' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 flex items-center justify-center">
                  <span className="absolute inset-0 bg-app-ink rounded-full pulse-animation opacity-40" />
                  <span className="relative w-full h-full bg-app-ink border-2 border-app-bg rounded-full flex items-center justify-center">
                    <span className="w-1 h-1 bg-app-bg rounded-full animate-pulse" />
                  </span>
                </span>
              )}
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 z-10 px-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {state === 'onboarding' && renderOnboarding()}

          {state === 'permissions' && (
            <motion.div 
              key="permissions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col h-full items-center justify-center text-center gap-8"
            >
              <div className="w-20 h-20 bg-app-ink-faint rounded-full flex items-center justify-center">
                <ShieldCheck size={40} className="text-app-ink" />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-serif italic">Pronto a fluire?</h2>
                <p className="text-app-ink-muted text-sm leading-relaxed">
                  Fluendo usa il Bluetooth Low Energy per connetterti a chi ti circonda senza server. Abbiamo bisogno del tuo permesso per iniziare la scansione.
                </p>
              </div>
              <button
                onClick={() => {
                  triggerFeedback('click');
                  setState('write');
                }}
                className="w-full py-5 bg-app-ink text-app-bg rounded-full font-medium uppercase tracking-widest text-sm shadow-xl"
              >
                Concedi Permesso
              </button>
            </motion.div>
          )}

          {state === 'write' && (
            <motion.div 
              key="write"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col h-full justify-center gap-6"
            >
              <div className="space-y-2 relative">
                <label className="text-xs uppercase tracking-widest opacity-50 ml-1">Il tuo messaggio</label>
                <div className="relative">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value.slice(0, 150))}
                    placeholder="Scrivi qualcosa di effimero..."
                    style={{ color: selectedColor }}
                    className="w-full h-40 bg-transparent border border-app-ink-faint rounded-2xl p-6 text-lg focus:outline-none focus:border-app-ink-muted transition-colors resize-none placeholder:italic placeholder:text-app-ink placeholder:opacity-30"
                  />
                  {messageText.length > 0 && (
                    <button
                      onClick={() => {
                        triggerFeedback('click');
                        setMessageText('');
                      }}
                      className="absolute top-4 right-4 p-2 text-app-ink-faint hover:text-app-ink transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                {/* Color Picker */}
                <div className="flex gap-3 mt-2 px-1">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        triggerFeedback('click');
                        setSelectedColor(color);
                      }}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-transform",
                        selectedColor === color ? "border-app-ink scale-125" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <div className={cn(
                  "text-right text-[10px] tracking-tighter transition-colors duration-300",
                  messageText.length >= 150 ? "text-red-500 opacity-100 font-bold" : "opacity-30"
                )}>
                  {messageText.length} / 150
                </div>
              </div>

              <button
                onClick={handleTransmit}
                disabled={messageText.trim().length === 0}
                className={cn(
                  "w-full py-5 rounded-full flex items-center justify-center gap-3 transition-all duration-500",
                  messageText.trim().length > 0 
                    ? "bg-app-ink text-app-bg shadow-lg shadow-app-ink-faint" 
                    : "bg-app-ink-faint text-app-ink-muted cursor-not-allowed"
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
                <div className="absolute inset-0 bg-app-ink-faint rounded-full pulse-animation" />
                <div className="absolute inset-0 bg-app-ink-faint/50 rounded-full pulse-animation [animation-delay:1s]" />
                <div className="relative z-10 w-32 h-32 bg-app-ink-faint/5 border border-app-ink-faint rounded-full flex items-center justify-center">
                  <Radio size={48} className="text-app-ink animate-pulse" />
                </div>
              </div>

              <div className="text-center space-y-4 max-w-xs">
                <h2 className="text-xl font-serif italic">In viaggio...</h2>
                <p className="text-app-ink-muted text-sm leading-relaxed italic">
                  "{messageText}"
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] opacity-30 pt-4">
                  Il tuo messaggio è ora visibile a chiunque sia vicino a te.
                </p>
              </div>

              <button
                onClick={() => {
                  triggerFeedback('click');
                  handleStop();
                }}
                className="mt-8 px-8 py-3 rounded-full border border-app-ink-faint text-app-ink-muted hover:bg-app-ink-faint hover:text-app-ink transition-all flex items-center gap-2"
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
                {inbox.length > 0 && (
                  <button 
                    onClick={() => {
                      triggerFeedback('click');
                      clearInbox();
                    }}
                    className="text-[10px] uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity"
                  >
                    Svuota il mare
                  </button>
                )}
              </div>

              <div className="space-y-4 pb-12">
                {inbox.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center space-y-4">
                    <Waves size={40} />
                    <p className="italic text-sm">Il mare è calmo. Nessun messaggio in arrivo.</p>
                  </div>
                ) : (
                  inbox.map((msg, i) => {
                    const age = Date.now() - msg.timestamp;
                    const opacity = Math.max(0.2, 1 - (age / (10 * 60 * 1000)));
                    const distance = msg.rssi ? Math.abs(msg.rssi + 30) / 2 : 0;

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-5 rounded-2xl bg-app-ink-faint border border-app-ink-faint hover:border-app-ink-muted transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2 text-[8px] uppercase tracking-widest opacity-40">
                            <MapPin size={10} />
                            <span>{distance < 5 ? 'Molto vicino' : distance < 15 ? 'A pochi passi' : 'All\'orizzonte'}</span>
                          </div>
                          <div className="flex gap-2">
                            {msg.type !== 'reaction' && (
                              <button 
                                onClick={() => handleReaction(msg.id)} 
                                disabled={reactedMessages.has(msg.id)}
                                className={cn(
                                  "p-2 rounded-full transition-all duration-500 relative flex items-center gap-1.5",
                                  reactedMessages.has(msg.id) 
                                    ? "text-red-500 bg-red-500/10 scale-110" 
                                    : "text-app-ink-muted hover:text-red-400 bg-app-ink-faint"
                                )}
                                title={reactedMessages.has(msg.id) ? "Apprezzato" : "Apprezza"}
                              >
                                {reactedMessages.has(msg.id) && (
                                  <motion.div
                                    initial={{ scale: 0.5, opacity: 1 }}
                                    animate={{ scale: 3, opacity: 0 }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className="absolute inset-0 rounded-full border-2 border-red-500 pointer-events-none"
                                  />
                                )}
                                <Heart 
                                  size={16} 
                                  fill={reactedMessages.has(msg.id) ? "currentColor" : "none"} 
                                  className={cn(reactedMessages.has(msg.id) && "animate-pulse")}
                                />
                                {msg.likes !== undefined && msg.likes > 0 && (
                                  <span className="text-[10px] font-bold tracking-tighter">
                                    {msg.likes}
                                  </span>
                                )}
                              </button>
                            )}
                            {msg.type !== 'reaction' && (
                              <button 
                                onClick={() => handleSaveBottle(msg)} 
                                className="p-2 rounded-full text-app-ink-muted hover:text-app-ink bg-app-ink-faint transition-all"
                                title="Raccogli questa bottiglia"
                              >
                                <Anchor size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                        {msg.type === 'reaction' ? (
                          <motion.div 
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="flex items-center gap-3 text-app-ink-muted italic text-sm py-2"
                          >
                            <div className="w-8 h-8 rounded-full bg-app-ink-faint flex items-center justify-center shadow-inner">
                              <Heart size={16} className="text-red-500 group-[.theme-dawn]:text-red-600 fill-red-500/20" />
                            </div>
                            <span className="opacity-80">Qualcuno ha apprezzato un tuo messaggio</span>
                          </motion.div>
                        ) : (
                          <p className="leading-relaxed italic" style={{ color: (msg.color === '#e0f2f1' || msg.color === 'var(--color-app-ink)') ? 'var(--color-app-ink)' : (msg.color || 'inherit') }}>
                            {msg.text}
                          </p>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {state === 'bottle' && (
            <motion.div 
              key="bottle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full items-center justify-center text-center py-12"
            >
              <AnimatePresence mode="wait">
                {!savedMessage ? (
                  <motion.div 
                    key="empty-bottle"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 opacity-30"
                  >
                    <Anchor size={64} strokeWidth={1} className="mx-auto" />
                    <p className="italic text-sm max-w-[200px] leading-relaxed">
                      Nessuna bottiglia raccolta. Le parole degli altri stanno ancora navigando.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="full-bottle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isReleasing ? 0 : 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: isReleasing ? 1.5 : 0.5 }}
                    className="flex flex-col items-center justify-center gap-12 w-full"
                  >
                    <div className="px-4">
                      <p className="text-2xl md:text-3xl font-serif leading-relaxed italic text-app-ink">
                        {savedMessage.text}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => {
                        triggerFeedback('click');
                        handleReleaseBottle();
                      }}
                      disabled={isReleasing}
                      className="text-[10px] uppercase tracking-[0.3em] opacity-30 hover:opacity-100 transition-opacity mt-12 px-6 py-2 border border-app-ink-faint rounded-full"
                    >
                      Lascia andare
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showBottleConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-app-bg/80 backdrop-blur-sm px-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-app-bg border border-app-ink-faint p-8 rounded-[2rem] shadow-2xl max-w-xs w-full text-center space-y-8"
            >
              <div className="space-y-4">
                <Anchor size={32} className="mx-auto text-app-ink-muted opacity-40" />
                <p className="text-sm leading-relaxed italic opacity-80">
                  Hai già una bottiglia raccolta. Vuoi lasciarla andare per raccogliere questa?
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    triggerFeedback('click');
                    handleConfirmReplaceBottle();
                  }}
                  className="w-full py-4 bg-app-ink text-app-bg rounded-full text-xs uppercase tracking-widest font-medium"
                >
                  Lascia andare
                </button>
                <button
                  onClick={() => {
                    triggerFeedback('click');
                    setShowBottleConfirm(false);
                    setPendingBottleMessage(null);
                  }}
                  className="w-full py-4 text-app-ink-muted text-xs uppercase tracking-widest font-medium"
                >
                  Tienila
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="z-10 p-8 text-center">
        <p className="text-[9px] uppercase tracking-[0.3em] opacity-20">
          Local BLE Transmission • No Server • Ephemeral
        </p>
      </footer>
    </div>
  );
}

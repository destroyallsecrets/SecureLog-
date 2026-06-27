import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, RefreshCw, ChevronRight, CheckCircle, AlertTriangle, ShieldCheck, HelpCircle, X, Check } from 'lucide-react';
import { VoiceStep, AppSettings } from '../types';
import AudioWave from './AudioWave';
import { playNextStepBeep, playSaveBeep, playErrorBeep, speakText } from '../utils/audioHelper';

interface VoiceWizardProps {
  settings: AppSettings;
  onSaveEntry: (entry: { name: string; passType: string; affiliation: string }) => void;
  isCapacityFull: boolean;
}

export default function VoiceWizard({ settings, onSaveEntry, isCapacityFull }: VoiceWizardProps) {
  const [currentStep, setCurrentStep] = useState<VoiceStep>('IDLE');
  const [transcript, setTranscript] = useState<string>('');
  const [isRecognitionActive, setIsRecognitionActive] = useState<boolean>(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  // Draft entry
  const [draft, setDraft] = useState({
    name: '',
    passType: '',
    affiliation: '',
  });

  const recognitionRef = useRef<any>(null);
  const draftRef = useRef(draft);
  const currentStepRef = useRef(currentStep);

  // Keep refs in sync for event handlers
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // Check support on mount
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const prompts: Record<Exclude<VoiceStep, 'IDLE' | 'REVIEW'>, string> = {
    NAME: "Speak the visitor's full name",
    PASS_TYPE: "Say \"QR\" or \"Grey Card\" or similar",
    AFFILIATION: "Say \"Player\", \"Coach\", \"Employee\", or company name",
  };

  const speakPrompts: Record<Exclude<VoiceStep, 'IDLE' | 'REVIEW'>, string> = {
    NAME: "Speak the visitor's full name",
    PASS_TYPE: "Say the pass type",
    AFFILIATION: "Say their affiliation or company",
  };

  // Initialize Speech Recognition
  const initRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true; // Show live feedback in the UI!
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsRecognitionActive(true);
      setRecognitionError(null);
    };

    rec.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const speechText = result[0].transcript;
      setTranscript(speechText);

      if (result.isFinal) {
        const cleanedText = speechText.trim();
        handleFinalTranscript(cleanedText);
      }
    };

    rec.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Simple silent retry or feedback
        setRecognitionError('No voice detected. Please try speaking again.');
      } else if (event.error === 'not-allowed') {
        setRecognitionError('Microphone permission denied. Enable microphone access.');
      } else {
        setRecognitionError(`Recognition error: ${event.error}`);
      }
      setIsRecognitionActive(false);
      playErrorBeep(settings.voiceVolume * 0.5);
    };

    rec.onend = () => {
      setIsRecognitionActive(false);
    };

    recognitionRef.current = rec;
    return rec;
  };

  const handleFinalTranscript = (text: string) => {
    if (!text) return;

    const step = currentStepRef.current;
    
    setDraft(prev => {
      const updated = { ...prev };
      if (step === 'NAME') updated.name = text;
      else if (step === 'PASS_TYPE') updated.passType = text;
      else if (step === 'AFFILIATION') updated.affiliation = text;
      return updated;
    });

    setTranscript('');

    // Advance steps
    if (step === 'NAME') {
      playNextStepBeep(settings.voiceVolume * 0.4);
      setCurrentStep('PASS_TYPE');
    } else if (step === 'PASS_TYPE') {
      playNextStepBeep(settings.voiceVolume * 0.4);
      setCurrentStep('AFFILIATION');
    } else if (step === 'AFFILIATION') {
      // Auto-save entry after affiliation is finalized
      setCurrentStep('REVIEW');
    }
  };

  // Triggered when step state changes
  useEffect(() => {
    if (currentStep === 'IDLE') {
      setDraft({ name: '', passType: '', affiliation: '' });
      setTranscript('');
      stopListening();
      return;
    }

    if (currentStep === 'REVIEW') {
      // Complete and save
      const finalEntry = {
        name: draftRef.current.name || 'Unknown Visitor',
        passType: draftRef.current.passType || 'Standard',
        affiliation: draftRef.current.affiliation || 'None',
      };
      
      onSaveEntry(finalEntry);
      playSaveBeep(settings.voiceVolume * 0.6);
      speakText('Visitor Logged successfully.', settings.useVoiceGuidance, settings.voiceVolume);
      
      // Flash a quick review stage, then return to IDLE
      const timer = setTimeout(() => {
        setCurrentStep('IDLE');
      }, 2000);
      return () => clearTimeout(timer);
    }

    // Otherwise, we are in NAME, PASS_TYPE, or AFFILIATION
    // Provide audio guidance
    speakText(speakPrompts[currentStep as keyof typeof speakPrompts], settings.useVoiceGuidance, settings.voiceVolume);
    
    // Automatically start listening for this step
    const timer = setTimeout(() => {
      startListening();
    }, 400); // Tiny pause to allow TTS to start or user to prepare

    return () => clearTimeout(timer);
  }, [currentStep]);

  const startListening = () => {
    if (isCapacityFull) {
      setRecognitionError('Gate capacity reached. Clear logs or adjust limit.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      
      const rec = initRecognition();
      if (rec) {
        rec.start();
      }
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }
  };

  const stopListening = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      setIsRecognitionActive(false);
    } catch (e) {
      console.error('Failed to stop recognition:', e);
    }
  };

  const handleStartSequence = () => {
    if (isCapacityFull) return;
    setDraft({ name: '', passType: '', affiliation: '' });
    setCurrentStep('NAME');
  };

  const handleCancel = () => {
    stopListening();
    setCurrentStep('IDLE');
    setDraft({ name: '', passType: '', affiliation: '' });
    setTranscript('');
  };

  const handleSkipStep = () => {
    const step = currentStep;
    setDraft(prev => {
      const updated = { ...prev };
      if (step === 'NAME') updated.name = 'Skipped Name';
      else if (step === 'PASS_TYPE') updated.passType = 'Skipped Pass';
      else if (step === 'AFFILIATION') updated.affiliation = 'Skipped Affiliation';
      return updated;
    });

    if (step === 'NAME') {
      setCurrentStep('PASS_TYPE');
    } else if (step === 'PASS_TYPE') {
      setCurrentStep('AFFILIATION');
    } else if (step === 'AFFILIATION') {
      setCurrentStep('REVIEW');
    }
  };

  // Keyboard Spacebar integration for hands-free gatekeepers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (currentStep === 'IDLE') {
          handleStartSequence();
        } else {
          // If already listening, we can manually toggle / pause or abort
          handleCancel();
        }
      } else if (e.code === 'Escape') {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, isCapacityFull]);

  // Handle manual correction inputs in-line inside the wizard if wanted
  const handleManualEdit = (field: 'name' | 'passType' | 'affiliation', val: string) => {
    setDraft(prev => ({
      ...prev,
      [field]: val,
    }));
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 shadow-xl ${
        currentStep !== 'IDLE' 
          ? 'border-emerald-500/50 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.01]' 
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
      }`}>
        
        {/* Animated Accent Line */}
        {currentStep !== 'IDLE' && (
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 animate-pulse" />
        )}

        <div className="p-6 md:p-8 text-center flex flex-col items-center">
          
          {/* Header Indicators */}
          <div className="w-full flex items-center justify-between mb-6">
            <span className="text-xs font-mono font-semibold tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              SECURE WEB API LOGGING
            </span>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
              LOCAL ONLY • NO-AI
            </span>
          </div>

          {!isSupported ? (
            /* Speech Recognition API Unsupported fallback warning */
            <div className="w-full p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left space-y-3 mb-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                    Speech API Not Supported
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                    Your current browser doesn't support the HTML5 Web Speech API. For full hands-free check-ins, we recommend <b>Google Chrome</b>, <b>Safari</b>, or <b>Microsoft Edge</b>.
                  </p>
                </div>
              </div>
              <div className="text-xs text-slate-500 border-t border-amber-500/10 pt-2 flex items-center justify-between">
                <span>Manual typing mode is fully active.</span>
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-indigo-500">Keyboard Ready</span>
              </div>
            </div>
          ) : null}

          {/* Wizard Steps Flowchart */}
          {currentStep !== 'IDLE' && currentStep !== 'REVIEW' && (
            <div className="flex items-center justify-center space-x-2 md:space-x-3 mb-6 w-full max-w-sm">
              {(['NAME', 'PASS_TYPE', 'AFFILIATION'] as const).map((step, idx) => {
                const stepNames = { NAME: '1. Name', PASS_TYPE: '2. Pass', AFFILIATION: '3. Company' };
                const isCurrent = currentStep === step;
                const isPassed = 
                  (step === 'NAME' && (currentStep === 'PASS_TYPE' || currentStep === 'AFFILIATION')) ||
                  (step === 'PASS_TYPE' && currentStep === 'AFFILIATION');
                
                return (
                  <div key={step} className="flex items-center grow">
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold grow text-center transition border ${
                      isCurrent 
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10' 
                        : isPassed
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'
                    }`}>
                      {stepNames[step]}
                    </div>
                    {idx < 2 && (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700 mx-0.5 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Interactive Core Display */}
          <AnimatePresence mode="wait">
            {currentStep === 'IDLE' ? (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full flex flex-col items-center py-4"
              >
                <div className="text-sm font-semibold text-slate-400 dark:text-slate-500 mb-1">
                  CURRENT STANDBY PROMPT
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight max-w-md leading-tight mb-8">
                  Tap the microphone or press [Spacebar] to trigger visitor scan
                </h2>

                {/* Big Mic Trigger Button */}
                <button
                  onClick={handleStartSequence}
                  disabled={isCapacityFull}
                  className={`relative group w-24 h-24 rounded-full flex items-center justify-center transition shadow-lg cursor-pointer ${
                    isCapacityFull
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-tr from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 hover:shadow-emerald-500/20 active:scale-95 text-white'
                  }`}
                  aria-label="Start visitor scanning"
                >
                  <Mic className="w-10 h-10 group-hover:scale-105 transition" />
                  
                  {/* Subtle outer rings */}
                  {!isCapacityFull && (
                    <span className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping opacity-60 pointer-events-none" />
                  )}
                </button>

                {isCapacityFull && (
                  <div className="mt-4 text-xs font-semibold text-rose-500 bg-rose-500/10 px-3 py-1 rounded-lg border border-rose-500/20">
                    Capacity Full. Please update settings or download CSV.
                  </div>
                )}

                <p className="mt-6 text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Uses secure local Web Speech dictation. No internet cloud lookup required.
                </p>
              </motion.div>
            ) : currentStep === 'REVIEW' ? (
              /* Success Autosave State */
              <motion.div
                key="review"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full py-4 flex flex-col items-center"
              >
                <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Visitor Entry Saved!
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-5">
                  Automatically appending to live records table...
                </p>

                {/* Micro-Card Review of saved data */}
                <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl p-4 text-left space-y-2">
                  <div className="flex justify-between items-center border-b pb-2 border-slate-200/50 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-indigo-500">SAVED METADATA</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Just now</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">NAME</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                        {draft.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">PASS TYPE</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                        {draft.passType}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">COMPANY</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                        {draft.affiliation}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Listening Active State for Steps */
              <motion.div
                key="listening-steps"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full py-2 flex flex-col items-center text-left"
              >
                {/* Active Prompt Headline */}
                <div className="w-full text-center mb-5">
                  <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full animate-pulse border border-amber-500/20">
                    {isRecognitionActive ? '🎤 VOICE LOG ACTIVE' : '🔇 AUDIO STANDBY'}
                  </span>
                  <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight mt-3">
                    {prompts[currentStep as keyof typeof prompts]}
                  </h3>
                </div>

                {/* Animated Pulse Wave */}
                <div className="w-full max-w-xs mx-auto mb-6">
                  <AudioWave isListening={isRecognitionActive} />
                </div>

                {/* Real-time speech transcription preview box */}
                <div className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 min-h-[70px] flex flex-col justify-between mb-4">
                  <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider font-mono">
                    REAL-TIME TRANSCRIPTION PREVIEW
                  </div>
                  {transcript ? (
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 italic select-all mt-1">
                      "{transcript}"
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-600 italic mt-1">
                      {isRecognitionActive 
                        ? 'Waiting for spoken speech...' 
                        : 'Speech engine paused. Speak clearly or adjust mic.'}
                    </p>
                  )}
                </div>

                {/* Error Banner if any */}
                {recognitionError && (
                  <div className="w-full p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-medium flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-500" />
                    <span>{recognitionError}</span>
                  </div>
                )}

                {/* Live Draft Form (Manual Fallback / Direct Overrides) */}
                <div className="w-full bg-slate-50/50 dark:bg-slate-950/20 p-4 border border-slate-200/50 dark:border-slate-800/80 rounded-xl space-y-3 text-xs mb-6">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                    <span>EDIT SPOKEN DRAFT IN REAL-TIME</span>
                    <span className="text-[9px] font-normal italic">Click fields below to correct any spelling</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Name Draft */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
                        Visitor Name
                      </label>
                      <input
                        type="text"
                        placeholder="Say or type..."
                        value={draft.name}
                        onChange={(e) => handleManualEdit('name', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs font-semibold"
                      />
                    </div>

                    {/* Pass Type Draft */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
                        Pass Type
                      </label>
                      <input
                        type="text"
                        placeholder="Say or type..."
                        value={draft.passType}
                        onChange={(e) => handleManualEdit('passType', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs font-semibold"
                      />
                    </div>

                    {/* Affiliation Draft */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
                        Affiliation
                      </label>
                      <input
                        type="text"
                        placeholder="Say or type..."
                        value={draft.affiliation}
                        onChange={(e) => handleManualEdit('affiliation', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Operations Toolbar */}
                <div className="w-full flex flex-wrap gap-2 justify-between">
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={handleCancel}
                      className="px-3 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-medium flex items-center gap-1 text-slate-600 dark:text-slate-400 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Abort Sequence
                    </button>
                    
                    <button
                      onClick={startListening}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-xl text-xs font-medium flex items-center gap-1 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry Speak
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSkipStep}
                      className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 transition flex items-center gap-1 cursor-pointer"
                    >
                      Skip Step
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        // Advance manually or save
                        if (currentStep === 'NAME') {
                          setCurrentStep('PASS_TYPE');
                        } else if (currentStep === 'PASS_TYPE') {
                          setCurrentStep('AFFILIATION');
                        } else if (currentStep === 'AFFILIATION') {
                          setCurrentStep('REVIEW');
                        }
                      }}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {currentStep === 'AFFILIATION' ? 'Save Draft' : 'Next Step'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}

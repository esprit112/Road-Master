import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, RefreshCw, AlertTriangle, Check, X, Sparkles, Send } from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage, Type } from "@google/genai";
import { TripInputs, UserProfile, RoadTripResponse } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  inputs: TripInputs;
  roadTrip: RoadTripResponse | null;
  onUpdateRoute: (newInputs: Partial<TripInputs>) => void;
  onUpdateProfile: (newProfile: Partial<UserProfile>) => void;
  activeProfile: UserProfile | null;
  userLocation: { lat: number; lng: number } | null;
  countryName: string;
}

export function ChatAssistant({ 
  isOpen, 
  onClose, 
  inputs, 
  roadTrip,
  onUpdateRoute, 
  onUpdateProfile, 
  activeProfile, 
  userLocation, 
  countryName 
}: ChatAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastModelResponse, setLastModelResponse] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<any>(null);
  const [textInput, setTextInput] = useState('');

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const toggleMic = async () => {
    if (isListening) {
      // Stop listening but keep session
      if (processorRef.current) processorRef.current.disconnect();
      if (sourceRef.current) sourceRef.current.disconnect();
      setIsListening(false);
      setAudioLevel(0);
    } else {
      // Try to start listening
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsListening(true);
        setError(null);
        setupAudioProcessing(stream);
      } catch (micErr: any) {
        console.warn("Microphone access failed:", micErr);
        setError("Microphone unavailable. Please check permissions.");
      }
    }
  };

  const startSession = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setLastModelResponse('');

      // 1. Initialize Audio Context (needed for output even if input fails)
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });

      // 2. Connect to Gemini Live API
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: `
            You are the "Route Master Assistant," an immersive, full-screen HUD co-pilot.
            
            CURRENT CONTEXT:
            - Start: ${inputs.startPoint}
            - End: ${inputs.endPoint}
            - Route Type: ${inputs.routeType || 'NOT SELECTED'}
            - Vehicle: ${activeProfile?.vehicle.type || 'car'} (${activeProfile?.vehicle.power || 'Petrol'})
            - Current Country: ${countryName}
            - Road Trip Active: ${roadTrip ? 'Yes' : 'No'}
            ${roadTrip ? `- Total Days: ${roadTrip.itinerary_daily.length}` : ''}

            ${activeProfile ? `
            ACTIVE PROFILE:
            - Name: ${activeProfile.name}
            - Persona: ${activeProfile.persona}
            - Interests: ${activeProfile.interests}
            - Driving Style: ${activeProfile.drivingStyle}
            ` : ''}

            GUARDRAILS:
            1. If the user asks to "Start Route", "Change Plan", or "Architect Trip", you MUST check if inputs.routeType is selected.
            2. If routeType is null or "NOT SELECTED", you MUST respond: "I'd love to help, but please select Point to Point or Round Trip first!"
            3. Be concise. Your responses are displayed in large text on a HUD. 
            4. Detect the user's language and respond in kind (Polyglot Mode).

            CAPABILITIES:
            - Answer questions about the current route (e.g., "How far until the turnaround point?").
            - Update trip parameters (destination, interests, serendipity, routeType).
            - Update user profile preferences.
          `,
          tools: [{
            functionDeclarations: [
              {
                name: "updateRoute",
                description: "Update the road trip route parameters after user confirmation.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    endPoint: { type: Type.STRING, description: "The new destination" },
                    interests: { type: Type.STRING, description: "Updated interests or added stops" },
                    serendipity: { type: Type.STRING, description: "New serendipity level" },
                    routeType: { type: Type.STRING, description: "New route type (Point to Point or Round Trip)" }
                  }
                }
              },
              {
                name: "updateProfile",
                description: "Update the user's permanent profile preferences.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    vehicleType: { type: Type.STRING, description: "New vehicle type" },
                    petStatus: { type: Type.BOOLEAN, description: "New pet status" },
                    drivingStyle: { type: Type.STRING, description: "New driving style" },
                    interests: { type: Type.STRING, description: "Updated interests" }
                  }
                }
              }
            ]
          }]
        },
        callbacks: {
          onopen: async () => {
            setIsConnecting(false);
            
            // 3. Attempt to get microphone for voice input
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              setIsListening(true);
              setupAudioProcessing(stream);
            } catch (micErr: any) {
              console.warn("Microphone access failed:", micErr);
              setError("Microphone unavailable. Text mode active.");
              setIsListening(false);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData) {
                  const base64Audio = part.inlineData.data;
                  if (base64Audio) playAudioChunk(base64Audio);
                }
                if (part.text) {
                  setLastModelResponse(prev => prev + part.text);
                }
              }
            }

            if (message.serverContent?.interrupted) {
              stopPlayback();
            }

            if (message.toolCall) {
              for (const call of message.toolCall.functionCalls) {
                if (call.name === 'updateRoute') {
                  setPendingChange({ type: 'route', args: call.args });
                } else if (call.name === 'updateProfile') {
                  setPendingChange({ type: 'profile', args: call.args });
                }
              }
            }
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            setError("Connection error. Please try again.");
            stopSession();
          },
          onclose: () => {
            setIsListening(false);
            setIsConnecting(false);
          }
        }
      });

      sessionRef.current = session;
    } catch (err: any) {
      console.error("Failed to start session:", err);
      setError("Failed to connect to assistant.");
      setIsConnecting(false);
    }
  };

  const setupAudioProcessing = (stream: MediaStream) => {
    if (!audioContextRef.current) return;
    sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
    processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    processorRef.current.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
      setAudioLevel(Math.sqrt(sum / inputData.length));
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
      if (sessionRef.current) {
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        sessionRef.current.sendRealtimeInput({ audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' } });
      }
    };
    sourceRef.current.connect(processorRef.current);
    processorRef.current.connect(audioContextRef.current.destination);
  };

  const playAudioChunk = (base64Data: string) => {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    const pcmData = new Int16Array(bytes.buffer);
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) floatData[i] = pcmData[i] / 0x7FFF;
    audioQueueRef.current.push(floatData);
    if (!isPlayingRef.current) processAudioQueue();
  };

  const processAudioQueue = async () => {
    if (audioQueueRef.current.length === 0 || !audioContextRef.current) {
      isPlayingRef.current = false;
      return;
    }
    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift()!;
    const buffer = audioContextRef.current.createBuffer(1, chunk.length, 16000);
    buffer.getChannelData(0).set(chunk);
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => processAudioQueue();
    source.start();
  };

  const stopPlayback = () => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  };

  const stopSession = () => {
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    setIsListening(false);
    setAudioLevel(0);
  };

  const handleSendText = () => {
    if (!textInput.trim() || !sessionRef.current) return;
    sessionRef.current.sendRealtimeInput({ text: textInput });
    setTextInput('');
    setLastModelResponse('');
  };

  const handleConfirmChange = () => {
    if (pendingChange) {
      if (pendingChange.type === 'route') {
        onUpdateRoute(pendingChange.args);
      } else if (pendingChange.type === 'profile') {
        const updates: any = { ...pendingChange.args };
        if (updates.vehicleType) {
          updates.vehicle = { ...activeProfile?.vehicle, type: updates.vehicleType };
          delete updates.vehicleType;
        }
        if (updates.petStatus !== undefined) {
          updates.preferences = { ...activeProfile?.preferences, hasPet: updates.petStatus };
          delete updates.petStatus;
        }
        onUpdateProfile(updates);
      }
      setPendingChange(null);
      if (sessionRef.current) {
        sessionRef.current.sendToolResponse({
          functionResponses: [{
            name: pendingChange.type === 'route' ? "updateRoute" : "updateProfile",
            response: { success: true },
            id: "update_call"
          }]
        });
      }
    }
  };

  useEffect(() => {
    if (isOpen && !sessionRef.current) {
      startSession();
    }
    return () => {
      if (!isOpen) stopSession();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-white font-black tracking-tight text-lg">Route Master Assistant</h1>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Immersive HUD Mode</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
        >
          <X size={24} />
        </button>
      </header>

      {/* Response Area */}
      <main className="flex-1 flex items-center justify-center px-10 text-center relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={lastModelResponse || 'idle'}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.05, y: -20 }}
            className="max-w-4xl"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight drop-shadow-2xl">
              {lastModelResponse || (isConnecting ? "Connecting to Pilot..." : "How can I help with your journey?")}
            </h2>
          </motion.div>
        </AnimatePresence>

        {/* Visualizer Overlay */}
        {isListening && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
            <motion.div 
              animate={{ 
                scale: [1, 1 + audioLevel * 2, 1],
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="w-96 h-96 rounded-full bg-indigo-500 blur-3xl"
            />
          </div>
        )}
      </main>

      {/* Command Center */}
      <footer className="h-[30%] flex flex-col items-center justify-end gap-8 pb-16 px-6">
        {/* Pending Change Confirmation */}
        <AnimatePresence>
          {pendingChange && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl mb-4"
            >
              <div className="flex items-center gap-3 mb-4 text-amber-400">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-bold text-lg text-white">Confirm Update</h3>
              </div>
              <div className="space-y-1 mb-6 text-white/80 text-sm">
                {pendingChange.args.endPoint && <div>Destination: <span className="text-white font-bold">{pendingChange.args.endPoint}</span></div>}
                {pendingChange.args.routeType && <div>Route Type: <span className="text-white font-bold">{pendingChange.args.routeType}</span></div>}
                {pendingChange.args.interests && <div>Interests: <span className="text-white font-bold">{pendingChange.args.interests}</span></div>}
              </div>
              <div className="flex gap-3">
                <button onClick={handleConfirmChange} className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
                  <Check size={18} /> Confirm
                </button>
                <button onClick={() => setPendingChange(null)} className="flex-1 bg-white/10 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
                  <X size={18} /> Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text Input */}
        <div className="w-full max-w-md relative">
          <input 
            type="text"
            placeholder="Type here for Passenger Mode..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-md font-medium pr-14"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
          />
          <button 
            onClick={handleSendText}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"
          >
            <Send size={18} />
          </button>
        </div>

        {/* Microphone Button */}
        <div className="relative">
          <AnimatePresence>
            {isListening && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 0.3 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 bg-indigo-500 rounded-full blur-xl"
              />
            )}
          </AnimatePresence>
          <button
            onClick={sessionRef.current ? toggleMic : startSession}
            disabled={isConnecting}
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 relative z-10",
              isListening 
                ? 'bg-indigo-600 text-white scale-110 shadow-indigo-500/50' 
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
            )}
          >
            {isConnecting ? (
              <RefreshCw className="w-10 h-10 animate-spin" />
            ) : isListening ? (
              <MicOff className="w-10 h-10" />
            ) : (
              <Mic className="w-10 h-10" />
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 text-red-200 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-red-500/30 backdrop-blur-md">
            {error}
          </div>
        )}
      </footer>
    </div>
  );
}

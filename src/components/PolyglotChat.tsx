import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Languages, RefreshCw, Volume2, AlertTriangle, Check, X } from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage, Type } from "@google/genai";
import { TripInputs, VehicleType, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface PolyglotChatProps {
  inputs: TripInputs;
  onUpdateRoute: (newInputs: Partial<TripInputs>) => void;
  onUpdateProfile: (newProfile: Partial<UserProfile>) => void;
  activeProfile: UserProfile | null;
  userLocation: { lat: number; lng: number } | null;
  countryName: string;
}

export function PolyglotChat({ inputs, onUpdateRoute, onUpdateProfile, activeProfile, userLocation, countryName }: PolyglotChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState({ native: '', local: '' });
  const [lastModelResponse, setLastModelResponse] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<any>(null);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const startSession = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: `
            You are the "Polyglot Pilot," a voice-activated co-pilot for the Gemini Road Architect.
            Current Trip Context:
            - Start: ${inputs.startPoint}
            - End: ${inputs.endPoint}
            - Vehicle: ${activeProfile?.vehicle.type || 'car'} (${activeProfile?.vehicle.power || 'Petrol'})
            - Current Country: ${countryName}

            ${activeProfile ? `
            ACTIVE PROFILE CONTEXT:
            - Name: ${activeProfile.name}
            - Persona: ${activeProfile.persona}
            - Current Vehicle: ${activeProfile.vehicle.type}
            - Pet Status: ${activeProfile.preferences.hasPet ? 'Traveling with pets' : 'No pets'}
            - Driving Style: ${activeProfile.drivingStyle}
            - Interests: ${activeProfile.interests}
            ` : ''}

            AUDIO & LANGUAGE LOGIC:
            ... (rest of logic)

            PROFILE UPDATES:
            - If the user says "I got a new car" or "I'm a vegan now" or any other profile-related update, you MUST:
              1. Confirm the update with the user.
              2. Trigger the updateProfile() tool once confirmed.
              3. For "new car", ask for the vehicle type. For "vegan", update interests.

            ROUTE AUTHORITY (The "Impact" Rule):
            ... (rest of rule)
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
                    serendipity: { type: Type.STRING, description: "New serendipity level" }
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
          onopen: () => {
            setIsListening(true);
            setIsConnecting(false);
            setupAudioProcessing(stream);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData) {
                  // Handle audio output
                  const base64Audio = part.inlineData.data;
                  if (base64Audio) {
                    playAudioChunk(base64Audio);
                  }
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
            const isQuota = err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');
            setError(isQuota ? "Polyglot Pilot is at capacity. Please try again in a few seconds." : "Connection error. Please try again.");
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
      const isQuota = err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');
      setError(isQuota ? "Polyglot Pilot is at capacity. Please try again in a few seconds." : "Could not access microphone or connect.");
      setIsConnecting(false);
    }
  };

  const setupAudioProcessing = (stream: MediaStream) => {
    if (!audioContextRef.current) return;

    sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
    processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

    processorRef.current.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate audio level for UI
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      setAudioLevel(Math.sqrt(sum / inputData.length));

      // Convert Float32 to Int16 PCM
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
      }

      // Send to Gemini
      if (sessionRef.current) {
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        sessionRef.current.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      }
    };

    sourceRef.current.connect(processorRef.current);
    processorRef.current.connect(audioContextRef.current.destination);
  };

  const playAudioChunk = (base64Data: string) => {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const pcmData = new Int16Array(bytes.buffer);
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 0x7FFF;
    }

    audioQueueRef.current.push(floatData);
    if (!isPlayingRef.current) {
      processAudioQueue();
    }
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
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsListening(false);
    setAudioLevel(0);
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
      // Send tool response back to session if it's still open
      if (sessionRef.current) {
        sessionRef.current.sendToolResponse({
          functionResponses: [{
            name: pendingChange.type === 'route' ? "updateRoute" : "updateProfile",
            response: { success: true },
            id: "update_call" // In a real app, use the actual call ID
          }]
        });
      }
    }
  };

  const handleCancelChange = () => {
    setPendingChange(null);
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {pendingChange && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rm-card shadow-2xl p-6 w-80"
          >
            <div className="flex items-center gap-3 mb-4 text-[var(--accent)]">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-lg">
                {pendingChange.type === 'route' ? 'Route Authority' : 'Profile Update'}
              </h3>
            </div>
            <p className="text-sm text-[var(--text-main)] opacity-80 mb-6">
              {pendingChange.type === 'route' 
                ? 'Confirm the requested route changes?' 
                : 'Confirm the permanent profile update?'}
              {pendingChange.args.endPoint && <div className="mt-2 font-medium text-[var(--text-main)]">Destination: {pendingChange.args.endPoint}</div>}
              {pendingChange.args.addedStop && <div className="mt-1 font-medium text-[var(--text-main)]">Add Stop: {pendingChange.args.addedStop}</div>}
              {pendingChange.args.vehicleType && <div className="mt-1 font-medium text-[var(--text-main)]">Vehicle: {pendingChange.args.vehicleType}</div>}
              {pendingChange.args.interests && <div className="mt-1 font-medium text-[var(--text-main)]">Interests: {pendingChange.args.interests}</div>}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmChange}
                className="flex-1 rm-btn rm-btn-primary py-2 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Confirm
              </button>
              <button
                onClick={handleCancelChange}
                className="flex-1 rm-btn bg-slate-100 dark:bg-slate-800 text-[var(--text-main)] py-2 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-end gap-3">
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="rm-card p-4 shadow-xl max-w-xs"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [4, audioLevel * 40 + 4, 4] }}
                      transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                      className="w-1 bg-[var(--active)] rounded-full"
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)] opacity-70">Polyglot Pilot Active</span>
              </div>
              <p className="text-sm text-[var(--text-main)] line-clamp-3 italic">
                {lastModelResponse || "Listening for your command..."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={isListening ? stopSession : startSession}
          disabled={isConnecting}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
            isListening 
              ? 'bg-[var(--accent)] text-white scale-110' 
              : 'bg-[var(--primary)] text-white hover:bg-[var(--active)] hover:scale-105'
          } ${isConnecting ? 'opacity-50 cursor-wait' : ''}`}
        >
          {isConnecting ? (
            <RefreshCw className="w-8 h-8 animate-spin" />
          ) : isListening ? (
            <MicOff className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-600 text-xs px-3 py-1 rounded-full border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}

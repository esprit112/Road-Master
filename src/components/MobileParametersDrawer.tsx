import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, MapPin, Navigation, Compass, ArrowRight, Loader2, Search, Zap, Repeat, ArrowRightCircle } from 'lucide-react';
import { UserProfile, TripInputs, SerendipityLevel, RouteType } from '../types';
import { cn } from '../lib/utils';
import { getLocationSuggestions, UK_PRESETS } from '../services/geminiService';
import { PersonaLoader } from './PersonaLoader';

interface MobileParametersDrawerProps {
  activeProfile: UserProfile;
  inputs: TripInputs;
  setInputs: (inputs: TripInputs) => void;
  loading: boolean;
  onArchitect: (e: React.FormEvent) => void;
  calculatedDistance: string | null;
  ctaText?: string;
  contextualMessage?: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function MobileParametersDrawer({ 
  activeProfile, 
  inputs, 
  setInputs, 
  loading, 
  onArchitect,
  calculatedDistance,
  ctaText = "Architect My Trip",
  contextualMessage,
  isOpen,
  setIsOpen
}: MobileParametersDrawerProps) {
  const handlePresetSelection = (presetKey: string) => {
    if (!presetKey) {
      setInputs({ ...inputs, preset: undefined });
      return;
    }
    const preset = UK_PRESETS[presetKey];
    setInputs({
      ...inputs,
      preset: presetKey,
      startPoint: preset.start,
      endPoint: preset.end,
    });
  };
  
  // Variants for the different heights (Peek vs Full)
  const drawerVariants = {
    peek: { y: "calc(100% - 160px)", transition: { type: "spring" as const, damping: 30, stiffness: 300 } },
    open: { y: "10%", transition: { type: "spring" as const, damping: 30, stiffness: 300 } }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[70]">
      {/* Background Dimmer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto"
          />
        )}
      </AnimatePresence>

      {/* The Bottom Sheet */}
      <motion.div
        variants={drawerVariants}
        initial="peek"
        animate={isOpen ? "open" : "peek"}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          const velocity = info.velocity.y;
          const offset = info.offset.y;
          
          if (velocity < -500 || offset < -150) {
            setIsOpen(true);
          } else if (velocity > 500 || offset > 150) {
            setIsOpen(false);
          }
        }}
        className="absolute inset-0 pointer-events-auto flex flex-col rounded-t-[32px] border-t border-slate-200/50 bg-[#F8FAFC]/80 shadow-[0_-20px_50px_rgba(0,0,0,0.15)] backdrop-blur-2xl"
      >
        {/* Handle Bar */}
        <div className="flex w-full items-center justify-center p-4 cursor-grab active:cursor-grabbing" onClick={() => setIsOpen(!isOpen)}>
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>

        {/* Peek Content (Visible when closed) */}
        {!isOpen && (
          <div className="px-6 flex items-center justify-between pb-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#1A237E]">Quick Start</p>
              <h3 className="text-lg font-bold text-[#1A237E]">Planning for {activeProfile.name}</h3>
              {inputs.endPoint && (
                <p className="text-xs text-[#1A237E]/60 font-medium">To: {inputs.endPoint}</p>
              )}
            </div>
            <button 
              onClick={() => setIsOpen(true)}
              className="rounded-full bg-[#1A237E] p-4 text-white shadow-lg shadow-indigo-200"
            >
              <ChevronUp size={20} />
            </button>
          </div>
        )}

        {/* Full Content (Visible when pulled up) */}
        <div className="flex-1 overflow-y-auto px-6 pt-2 pb-24">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="h-full flex items-center justify-center"
              >
                <PersonaLoader 
                  persona={activeProfile.persona} 
                  contextualMessage={contextualMessage} 
                />
              </motion.div>
            ) : (
              <motion.div 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-[#1A237E] tracking-tight">Trip Parameters</h2>
                  <button onClick={() => setIsOpen(false)} className="text-[#1A237E]/40 hover:text-[#1A237E]">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={(e) => { onArchitect(e); }} className="space-y-5">
                  {/* 0. Quick Start Template */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-[#1A237E] flex items-center gap-2">
                      <Zap size={12} className="text-amber-500 fill-amber-500" />
                      Quick Start Template
                    </label>
                    <select 
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-[#1A237E] shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-medium appearance-none min-h-[44px]"
                      value={inputs.preset || ""}
                      onChange={(e) => handlePresetSelection(e.target.value)}
                    >
                      <option value="">Custom Route</option>
                      {Object.entries(UK_PRESETS).map(([key, preset]) => (
                        <option key={key} value={key}>
                          {preset.name}
                        </option>
                      ))}
                    </select>
                    {inputs.preset && (
                      <p className="text-[10px] text-indigo-600 font-bold px-2">
                        {UK_PRESETS[inputs.preset].description}
                      </p>
                    )}
                  </div>

                  {/* 1. Route Type Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-[#1A237E]">Route Type</label>
                    <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner">
                      {(['Point to Point', 'Round Trip'] as RouteType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setInputs({...inputs, routeType: type})}
                          className={cn(
                            "flex-1 py-3 text-[10px] font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 min-h-[44px]",
                            inputs.routeType === type 
                              ? "bg-[#1A237E] text-white shadow-md" 
                              : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          {type === 'Point to Point' ? <ArrowRightCircle size={14} /> : <Repeat size={14} />}
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Start Point */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-[#1A237E]">Start Point</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Current Location"
                        className="w-full rounded-2xl border border-slate-200 bg-white p-4 pl-12 text-[#1A237E] shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-medium min-h-[44px]"
                        value={inputs.startPoint}
                        onChange={(e) => setInputs({...inputs, startPoint: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* 3. Destination */}
                  <div className="space-y-2 relative">
                    <label className="text-xs font-black uppercase text-[#1A237E]">
                      {inputs.routeType === 'Round Trip' ? 'Turnaround Destination' : 'Destination'}
                    </label>
                    <div className="relative">
                      <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        required
                        placeholder={inputs.routeType === 'Round Trip' ? "Furthest point?" : "Where to?"}
                        className="w-full rounded-2xl border border-slate-200 bg-white p-4 pl-12 text-[#1A237E] shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-medium min-h-[44px]"
                        value={inputs.endPoint}
                        onChange={(e) => setInputs({...inputs, endPoint: e.target.value})}
                      />
                    </div>

                    {calculatedDistance && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg w-fit">
                          <Compass className="w-3 h-3 text-indigo-600" />
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{calculatedDistance}</span>
                        </div>
                        {(() => {
                          const hoursMatch = calculatedDistance.match(/(\d+(?:\.\d+)?)\s*hours/i);
                          if (hoursMatch) {
                            const hours = parseFloat(hoursMatch[1]);
                            if (hours >= 8) {
                              return (
                                <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                                  <p className="text-[10px] font-bold text-amber-700 leading-tight">
                                    ✨ Pro Tip: This trip is over 8 hours. Consider an overnight stop to explore hidden gems and avoid rushing!
                                  </p>
                                </div>
                              );
                            } else {
                              return (
                                <div className="px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                                  <p className="text-[10px] font-bold text-indigo-700 leading-tight">
                                    🛡️ Safety First: Remember to take regular breaks every 2 hours or if you feel tired.
                                  </p>
                                </div>
                              );
                            }
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>

                  {/* 3. Number of Days */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-[#1A237E]">Number of Days</label>
                    <input 
                      type="number" 
                      min={1}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-[#1A237E] shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-medium min-h-[44px]"
                      value={inputs.days}
                      onChange={(e) => setInputs({...inputs, days: parseInt(e.target.value) || 1})}
                    />
                  </div>

                  {/* 4. Interests */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-[#1A237E]">Interests</label>
                    <textarea 
                      rows={2}
                      placeholder="Hiking, vintage shops, coffee..."
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-[#1A237E] shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-medium resize-none min-h-[44px]"
                      value={inputs.interests}
                      onChange={(e) => setInputs({...inputs, interests: e.target.value})}
                    />
                  </div>

                  {/* 5. Serendipity */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-[#1A237E]">Serendipity Slider</label>
                    <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner">
                      {(['Direct/Efficient', 'Hidden Gems/Quirky'] as SerendipityLevel[]).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setInputs({...inputs, serendipity: level})}
                          className={cn(
                            "flex-1 py-3 text-[10px] font-bold rounded-xl transition-all active:scale-95 min-h-[44px]",
                            inputs.serendipity === level 
                              ? "bg-[#1A237E] text-white shadow-md" 
                              : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          {level.split('/')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 6. The "Architect" Action */}
                  <button 
                    disabled={loading}
                    className="w-full rounded-2xl bg-[#1A237E] py-5 text-lg font-black text-white shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 min-h-[44px]"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        {ctaText}
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

const X = ({ size, className }: { size: number; className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

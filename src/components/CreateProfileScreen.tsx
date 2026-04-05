import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Car, Dog, Map, Sparkles, Check, Navigation, Smartphone, Monitor, Globe, Activity, Zap } from 'lucide-react';
import { db } from '../db';
import { Persona, VehicleType, VehicleProfile, UserProfile } from '../types';
import { cn } from '../lib/utils';

interface CreateProfileScreenProps {
  onCreated: (profile: UserProfile) => void;
}

const PERSONAS: { id: Persona; label: string; icon: string; description: string }[] = [
  { id: 'The Electron Explorer', label: 'Electron Explorer', icon: '⚡', description: 'EV focused, tech-savvy, sustainable.' },
  { id: 'The Value Voyager', label: 'Value Voyager', icon: '💰', description: 'Budget-conscious, hidden gems, local eats.' },
  { id: 'The Solo Nomad', label: 'Solo Nomad', icon: '🏜️', description: 'Off-grid, rugged, independent adventurer.' },
  { id: 'Kinship Krew', label: 'Kinship Krew', icon: '👨‍👩‍👧‍👦', description: 'Family-focused, facilities, high-engagement.' },
  { id: 'Duo Discoverers', label: 'Duo Discoverers', icon: '🥂', description: 'Atmospheric, scenic, intimate dining.' },
  { id: 'Social Syndicate', label: 'Social Syndicate', icon: '🍻', description: 'High-adventure, pubs, group variety.' },
];

const VEHICLE_TYPES: { id: VehicleType; label: string; icon: string }[] = [
  { id: 'car', label: 'Car', icon: '🚗' },
  { id: 'van', label: 'Van', icon: '🚐' },
  { id: 'motorhome', label: 'RV', icon: '🏠' },
  { id: 'moto_cycle', label: 'Bike', icon: '🏍️' },
  { id: 'offroad', label: '4x4', icon: '🚜' },
];

export function CreateProfileScreen({ onCreated }: CreateProfileScreenProps) {
  const [step, setStep] = useState(1);
  const [osDetected, setOsDetected] = useState('Unknown');
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: '',
    persona: 'The Solo Nomad',
    group_size: { adults: 1, children: 0 },
    vehicle: {
      type: 'car',
      power: 'Petrol',
      isOversized: false,
      is_large: false,
    },
    preferences: {
      rangeThreshold: 20,
      roadTolerance: 'Adventure',
      gradientLimit: 15,
      vibe: 'Social',
      hasPet: false,
      dietary: '',
      discovery_vibe: 'Social/Adventure',
    },
    settings: {
      preferred_navigator: 'Google Maps',
      os_platform: 'Unknown',
      auto_handoff: true,
    },
    drivingStyle: 'Scenic',
    interests: '',
  });

  useEffect(() => {
    const ua = window.navigator.userAgent;
    let os = 'Unknown';
    if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    else if (/Macintosh/i.test(ua)) os = 'MacOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Linux/i.test(ua)) os = 'Linux';
    
    setOsDetected(os);
    
    const defaultNav = (os === 'iOS' || os === 'MacOS') ? 'Apple Maps' : 'Google Maps';
    
    setProfile(prev => ({
      ...prev,
      settings: {
        ...prev.settings!,
        os_platform: os,
        preferred_navigator: defaultNav
      }
    }));
  }, []);

  const handleCreate = async () => {
    const newProfile = {
      ...profile,
      name: profile.name || 'Road Architect',
      group_size: profile.group_size || { adults: 1, children: 0 },
      vehicle: {
        type: profile.vehicle?.type || 'car',
        power: profile.vehicle?.power || 'Petrol',
        isOversized: profile.vehicle?.isOversized || false,
        is_large: profile.vehicle?.is_large || false,
      },
      preferences: {
        rangeThreshold: profile.preferences?.rangeThreshold || 20,
        roadTolerance: profile.preferences?.roadTolerance || 'Adventure',
        gradientLimit: profile.preferences?.gradientLimit || 15,
        vibe: profile.preferences?.vibe || 'Social',
        hasPet: profile.preferences?.hasPet || false,
        dietary: profile.preferences?.dietary || '',
        discovery_vibe: profile.preferences?.discovery_vibe || 'Social/Adventure',
      },
      settings: {
        preferred_navigator: profile.settings?.preferred_navigator || 'Google Maps',
        os_platform: profile.settings?.os_platform || osDetected,
        auto_handoff: profile.settings?.auto_handoff ?? true,
      },
    } as UserProfile;
    
    const id = await db.profiles.add(newProfile);
    onCreated({ ...newProfile, id });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 my-auto"
      >
        <div className="p-8 md:p-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Initialize <span className="text-[var(--active)]">Route Master</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Craft your digital road identity.</p>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((s) => (
                <div 
                  key={s} 
                  className={cn(
                    "h-1.5 w-6 rounded-full transition-all",
                    step >= s ? "bg-[var(--active)]" : "bg-slate-100 dark:bg-slate-800"
                  )}
                />
              ))}
            </div>
          </div>

          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Your Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="e.g. Max Power"
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-lg font-medium focus:ring-2 focus:ring-[var(--active)] transition-all min-h-[44px]"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Select Your Persona</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setProfile({ ...profile, persona: p.id })}
                      className={cn(
                        "p-4 rounded-2xl border text-left transition-all hover:border-[var(--active)]/50 min-h-[44px]",
                        profile.persona === p.id 
                          ? "bg-[var(--active)]/5 border-[var(--active)] ring-1 ring-[var(--active)]" 
                          : "bg-white dark:bg-slate-800/30 border-slate-100 dark:border-slate-700"
                      )}
                    >
                      <span className="text-2xl mb-2 block">{p.icon}</span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{p.label}</h3>
                      <p className="text-[10px] text-slate-500 mt-1 leading-tight">{p.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Adults</label>
                  <input 
                    type="number"
                    min={1}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 px-4 text-sm min-h-[44px]"
                    value={profile.group_size?.adults}
                    onChange={(e) => setProfile({ ...profile, group_size: { ...profile.group_size!, adults: parseInt(e.target.value) || 1 } })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Children</label>
                  <input 
                    type="number"
                    min={0}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 px-4 text-sm min-h-[44px]"
                    value={profile.group_size?.children}
                    onChange={(e) => setProfile({ ...profile, group_size: { ...profile.group_size!, children: parseInt(e.target.value) || 0 } })}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Your Primary Vehicle</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {VEHICLE_TYPES.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setProfile({ ...profile, vehicle: { ...profile.vehicle!, type: v.id } })}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all min-h-[44px]",
                        profile.vehicle?.type === v.id 
                          ? "bg-[var(--active)] text-white border-[var(--active)] shadow-lg scale-105" 
                          : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600"
                      )}
                    >
                      <span className="text-2xl">{v.icon}</span>
                      <span className="text-[10px] font-bold uppercase">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Fuel Type</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 px-4 text-sm min-h-[44px]"
                    value={profile.vehicle?.power}
                    onChange={(e) => setProfile({ ...profile, vehicle: { ...profile.vehicle!, power: e.target.value as VehicleProfile } })}
                  >
                    <option>Petrol</option>
                    <option>Diesel</option>
                    <option>EV</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase text-slate-400">Large Vehicle?</h4>
                    <p className="text-[9px] text-slate-500">Motorhome/Caravan</p>
                  </div>
                  <button 
                    onClick={() => setProfile({ ...profile, vehicle: { ...profile.vehicle!, is_large: !profile.vehicle?.is_large } })}
                    className={cn(
                      "w-10 h-5 rounded-full transition-all relative",
                      profile.vehicle?.is_large ? "bg-[var(--active)]" : "bg-slate-300 dark:bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                      profile.vehicle?.is_large ? "left-5.5" : "left-0.5"
                    )} />
                  </button>
                </div>
              </div>

              {profile.vehicle?.power === 'EV' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Max Battery Range (Miles)</label>
                  <div className="relative">
                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                    <input 
                      type="number"
                      placeholder="e.g. 250"
                      className="w-full bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl py-4 pl-12 pr-4 text-lg font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 transition-all min-h-[44px]"
                      value={profile.preferences?.rangeThreshold}
                      onChange={(e) => setProfile({ ...profile, preferences: { ...profile.preferences!, rangeThreshold: parseInt(e.target.value) || 0 } })}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 italic px-2">We'll use this to optimize charging stops along your route.</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Dog className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Traveling with Pets?</h3>
                    <p className="text-xs text-slate-500">We'll find dog parks and pet-friendly stops.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setProfile({ ...profile, preferences: { ...profile.preferences!, hasPet: !profile.preferences?.hasPet } })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    profile.preferences?.hasPet ? "bg-[var(--active)]" : "bg-slate-300 dark:bg-slate-700"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    profile.preferences?.hasPet ? "left-7" : "left-1"
                  )} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Road Tolerance</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 px-4 text-sm"
                    value={profile.preferences?.roadTolerance}
                    onChange={(e) => setProfile({ ...profile, preferences: { ...profile.preferences!, roadTolerance: e.target.value as 'Efficiency' | 'Adventure' } })}
                  >
                    <option value="Efficiency">Efficiency</option>
                    <option value="Adventure">Adventure</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Vibe</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 px-4 text-sm"
                    value={profile.preferences?.vibe}
                    onChange={(e) => setProfile({ ...profile, preferences: { ...profile.preferences!, vibe: e.target.value as 'Stealth' | 'Social' } })}
                  >
                    <option value="Social">Social</option>
                    <option value="Stealth">Stealth</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Discovery</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 px-4 text-sm"
                    value={profile.preferences?.discovery_vibe}
                    onChange={(e) => setProfile({ ...profile, preferences: { ...profile.preferences!, discovery_vibe: e.target.value } })}
                  >
                    <option>Active/Educational</option>
                    <option>Romantic</option>
                    <option>Social/Adventure</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Interests & Vibes</label>
                <textarea 
                  rows={2}
                  placeholder="e.g. Brutalist architecture, specialty coffee, wild swimming..."
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-4 text-sm resize-none"
                  value={profile.interests}
                  onChange={(e) => setProfile({ ...profile, interests: e.target.value })}
                />
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800/50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                    {osDetected === 'iOS' || osDetected === 'MacOS' ? <Smartphone className="w-6 h-6 text-indigo-600" /> : <Globe className="w-6 h-6 text-indigo-600" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      {osDetected === 'iOS' || osDetected === 'MacOS' ? "I see you're on an Apple device!" : `I see you're on ${osDetected}!`}
                    </h3>
                    <p className="text-xs text-slate-500">I've pre-selected the best navigator for your ecosystem.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Preferred Navigator</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Google Maps', 'Apple Maps', 'Waze'].map((nav) => {
                      const isDisabled = nav === 'Apple Maps' && osDetected === 'Android';
                      const isActive = profile.settings?.preferred_navigator === nav;
                      
                      return (
                        <button
                          key={nav}
                          disabled={isDisabled}
                          onClick={() => setProfile({ ...profile, settings: { ...profile.settings!, preferred_navigator: nav as any } })}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                            isActive 
                              ? "bg-white dark:bg-slate-800 border-indigo-600 ring-2 ring-indigo-600/20 shadow-lg" 
                              : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500",
                            isDisabled && "opacity-50 grayscale pointer-events-none"
                          )}
                        >
                          <div className="w-8 h-8 flex items-center justify-center">
                            {nav === 'Google Maps' && <img src="https://www.google.com/images/branding/product/ico/maps15_24dp.ico" alt="" className="w-6 h-6" />}
                            {nav === 'Apple Maps' && <Navigation className="w-6 h-6 text-blue-500" />}
                            {nav === 'Waze' && <Activity className="w-6 h-6 text-cyan-400" />}
                          </div>
                          <span className="text-[10px] font-bold">{nav}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Navigation className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Auto Handoff</h3>
                    <p className="text-xs text-slate-500">Prepare all navigation links automatically.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setProfile({ ...profile, settings: { ...profile.settings!, auto_handoff: !profile.settings?.auto_handoff } })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    profile.settings?.auto_handoff ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    profile.settings?.auto_handoff ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
            </motion.div>
          )}

          <div className="mt-12 flex items-center justify-between">
            {step > 1 ? (
              <button 
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
              >
                Back
              </button>
            ) : <div />}
            
            <button 
              onClick={() => step < 4 ? setStep(step + 1) : handleCreate()}
              className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--active)] text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-[var(--primary)]/20"
            >
              {step < 4 ? 'Continue' : 'Launch Route Master'}
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

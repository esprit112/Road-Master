import React from 'react';
import { motion } from 'motion/react';
import { UserPlus, LogIn, ChevronRight, Car, MapPin } from 'lucide-react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

interface WelcomeScreenProps {
  profiles: UserProfile[];
  onSelect: (profile: UserProfile) => void;
  onCreateNew: () => void;
}

export function WelcomeScreen({ profiles, onSelect, onCreateNew }: WelcomeScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20"
      >
        <div className="p-10 text-center">
          <div className="w-20 h-20 bg-[var(--active)]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Car className="w-10 h-10 text-[var(--active)]" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Welcome Back, <span className="text-[var(--active)]">Pilot</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Choose your persona to begin the journey.</p>

          <div className="mt-10 space-y-3">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => onSelect(profile)}
                className="w-full group flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-[var(--active)]/5 border border-slate-100 dark:border-slate-700 rounded-3xl transition-all active:scale-[0.98] hover:border-[var(--active)]/30"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
                    {profile.persona === 'The Electron Explorer' ? '⚡' : 
                     profile.persona === 'The Value Voyager' ? '💰' : '🏜️'}
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-[var(--active)] transition-colors">
                      {profile.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                      {profile.persona}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[var(--active)] transition-colors" />
              </button>
            ))}

            <button
              onClick={onCreateNew}
              className="w-full flex items-center justify-center gap-3 p-5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-400 hover:text-[var(--active)] hover:border-[var(--active)]/50 transition-all active:scale-[0.98]"
            >
              <UserPlus className="w-5 h-5" />
              <span className="font-bold text-sm">Create New Profile</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

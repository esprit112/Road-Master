import React from 'react';
import { motion } from 'motion/react';
import { UserPlus, ChevronRight, Car, Clock, MapPin } from 'lucide-react';
import { UserProfile, SavedRoute } from '../types';
import { cn } from '../lib/utils';

interface WelcomeScreenProps {
  profiles: UserProfile[];
  onSelect: (profile: UserProfile) => void;
  onCreateNew: () => void;
  savedRoutes: SavedRoute[];
  onResumeRoute: (route: SavedRoute) => void;
}

export function WelcomeScreen({ profiles, onSelect, onCreateNew, savedRoutes, onResumeRoute }: WelcomeScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 my-auto"
      >
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-indigo-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Car className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Welcome Back, <span className="text-indigo-600">Pilot</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Choose your persona to begin the journey.</p>

          <div className="mt-8 space-y-3">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => onSelect(profile)}
                className="w-full group flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-600/5 border border-slate-100 dark:border-slate-700 rounded-3xl transition-all active:scale-[0.98] hover:border-indigo-600/30 min-h-[44px]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform">
                    {profile.persona === 'The Electron Explorer' ? '⚡' : 
                     profile.persona === 'The Value Voyager' ? '💰' : '🏜️'}
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors text-sm">
                      {profile.name}
                    </h3>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
                      {profile.persona}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
              </button>
            ))}

            <button
              onClick={onCreateNew}
              className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-400 hover:text-indigo-600 hover:border-indigo-600/50 transition-all active:scale-[0.98] min-h-[44px]"
            >
              <UserPlus className="w-5 h-5" />
              <span className="font-bold text-sm">Create New Profile</span>
            </button>
          </div>

          {savedRoutes.length > 0 && (
            <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-4 px-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Trips</h4>
              </div>
              <div className="space-y-2">
                {savedRoutes.map((route) => (
                  <button 
                    key={route.id}
                    onClick={() => onResumeRoute(route)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-indigo-600/5 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600/10 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{route.display_name}</p>
                        <p className="text-[9px] text-slate-500 font-medium">{new Date(route.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg uppercase">
                      Resume
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, LogOut, Settings, Pencil, Trash2, Smartphone, Monitor, Globe, ChevronRight, Check } from 'lucide-react';
import { UserProfile, Persona, VehicleType, VehicleProfile, RoadTolerance, Vibe } from '../types';
import { cn } from '../lib/utils';

interface ProfileViewProps {
  activeProfile: UserProfile | null;
  handleLogout: () => void;
  handleUpdateProfile: (updates: Partial<UserProfile>) => void;
  handleDeleteProfile: () => void;
}

const vehicleTypes = [
  { id: 'car', label: 'Car', sub: 'Petrol, Diesel, or EV', icon: '🚗' },
  { id: 'car_tow', label: 'Car + Gear', sub: 'Caravan, Trailer, or Tent', icon: '⛺' },
  { id: 'van', label: 'Vanlife', sub: 'SWB, LWB, or Tiny Home', icon: '🚐' },
  { id: 'motorhome', label: 'Motorhome', sub: 'Coachbuilt or Bus', icon: '🚌' },
  { id: 'moto_cycle', label: 'Biker/Cyclist', sub: 'Motorcycle or Bicycle', icon: '🏍️' },
  { id: 'offroad', label: '4x4 Overlander', sub: 'Off-road prepared', icon: '⛰️' },
] as const;

export const ProfileView: React.FC<ProfileViewProps> = ({
  activeProfile,
  handleLogout,
  handleUpdateProfile,
  handleDeleteProfile
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editableProfile, setEditableProfile] = useState<UserProfile | null>(activeProfile);

  if (!activeProfile) return null;

  const onUpdateProfile = () => {
    if (editableProfile) {
      handleUpdateProfile(editableProfile);
      setIsEditingProfile(false);
    }
  };

  return (
    <div className="relative z-10 pt-4 pb-32 max-w-4xl mx-auto px-6 overflow-y-auto overscroll-contain touch-pan-y">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-3xl font-black text-white tracking-tight">Profile & Gear</h2>
        <button 
          onClick={handleLogout}
          className="p-3 rounded-2xl bg-white/10 text-white/60 hover:text-red-400 hover:bg-red-400/10 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <LogOut size={20} />
        </button>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className="rounded-[2.5rem] bg-white p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center text-4xl shadow-inner">
              {vehicleTypes.find(v => v.id === activeProfile.vehicle.type)?.icon || '🚗'}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-[#1A237E] tracking-tight">{activeProfile.name}</h3>
                <button 
                  onClick={() => {
                    setEditableProfile(activeProfile);
                    setIsEditingProfile(true);
                  }}
                  className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                >
                  <Pencil size={18} />
                </button>
              </div>
              <p className="text-indigo-600 font-bold text-sm uppercase tracking-widest">{activeProfile.persona}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vehicle</p>
              <p className="text-sm font-bold text-[#1A237E]">{activeProfile.vehicle.power} {vehicleTypes.find(v => v.id === activeProfile.vehicle.type)?.label}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Crew</p>
              <p className="text-sm font-bold text-[#1A237E]">{activeProfile.group_size.adults} Adults, {activeProfile.group_size.children} Kids</p>
            </div>
          </div>
        </div>

        {/* Settings Groups */}
        <div className="space-y-4">
          <h4 className="text-xs font-black text-white/40 uppercase tracking-[0.3em] ml-4">Navigator Settings</h4>
          <div className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 overflow-hidden">
            <button 
              onClick={() => handleUpdateProfile({ settings: { ...activeProfile.settings, preferred_navigator: activeProfile.settings.preferred_navigator === 'Google Maps' ? 'Apple Maps' : 'Google Maps' } })}
              className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Globe size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Preferred Navigator</p>
                  <p className="text-xs text-white/40">{activeProfile.settings.preferred_navigator}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/20" />
            </button>
            <div className="h-px bg-white/5 mx-6" />
            <div className="w-full flex items-center justify-between p-6 text-left">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Smartphone size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Auto-Handoff</p>
                  <p className="text-xs text-white/40">Sync route to mobile device</p>
                </div>
              </div>
              <div className="w-12 h-6 bg-emerald-500 rounded-full relative p-1 cursor-pointer">
                <div className="w-4 h-4 bg-white rounded-full absolute right-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="pt-8">
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-4 rounded-2xl bg-red-500/10 text-red-500 font-bold text-sm hover:bg-red-500/20 transition-all border border-red-500/20"
          >
            Delete Profile & All Saved Routes
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditingProfile && editableProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingProfile(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-[#1A237E] tracking-tight">Edit Profile</h3>
                <button onClick={() => setIsEditingProfile(false)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                  <Trash2 className="w-6 h-6 rotate-45 text-slate-400" />
                </button>
              </div>

              <div className="space-y-8">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-[#1A237E] uppercase tracking-widest mb-2 ml-1">Profile Name</label>
                    <input 
                      value={editableProfile.name}
                      onChange={e => setEditableProfile({ ...editableProfile, name: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:outline-none font-bold text-[#1A237E] transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-black text-[#1A237E] uppercase tracking-widest mb-2 ml-1">Persona</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["The Electron Explorer", "The Value Voyager", "The Solo Nomad", "Kinship Krew", "Duo Discoverers", "Social Syndicate"].map((p) => (
                        <button
                          key={p}
                          onClick={() => setEditableProfile({ ...editableProfile, persona: p as Persona })}
                          className={cn(
                            "px-4 py-3 rounded-xl text-xs font-bold border-2 transition-all",
                            editableProfile.persona === p ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-white border-slate-100 text-slate-400"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Vehicle Settings */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Vehicle Settings</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {["Petrol", "Diesel", "EV"].map((p) => (
                      <button
                        key={p}
                        onClick={() => setEditableProfile({ ...editableProfile, vehicle: { ...editableProfile.vehicle, power: p as VehicleProfile } })}
                        className={cn(
                          "px-4 py-3 rounded-xl text-xs font-bold border-2 transition-all",
                          editableProfile.vehicle.power === p ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-white border-slate-100 text-slate-400"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  {editableProfile.vehicle.power === 'EV' && (
                    <div>
                      <label className="block text-xs font-black text-[#1A237E] uppercase tracking-widest mb-2 ml-1">Range Threshold (%)</label>
                      <input 
                        type="range"
                        min="5"
                        max="30"
                        value={editableProfile.preferences.rangeThreshold}
                        onChange={e => setEditableProfile({ ...editableProfile, preferences: { ...editableProfile.preferences, rangeThreshold: parseInt(e.target.value) } })}
                        className="w-full accent-indigo-600"
                      />
                      <div className="flex justify-between text-[10px] font-black text-slate-400 mt-1">
                        <span>5% (RISKY)</span>
                        <span>{editableProfile.preferences.rangeThreshold}%</span>
                        <span>30% (SAFE)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Road Preferences */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Road Preferences</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {["Efficiency", "Adventure"].map((p) => (
                      <button
                        key={p}
                        onClick={() => setEditableProfile({ ...editableProfile, preferences: { ...editableProfile.preferences, roadTolerance: p as RoadTolerance } })}
                        className={cn(
                          "px-4 py-3 rounded-xl text-xs font-bold border-2 transition-all",
                          editableProfile.preferences.roadTolerance === p ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-white border-slate-100 text-slate-400"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={onUpdateProfile}
                  className="w-full py-5 rounded-2xl bg-[#1A237E] text-white font-black text-lg hover:bg-[#1A237E]/90 transition-all active:scale-95 shadow-xl shadow-indigo-200 mt-4"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-[#1A237E] mb-2">Are you sure?</h3>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                This will permanently delete your profile and all associated saved routes. This action cannot be undone.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={handleDeleteProfile}
                  className="w-full py-4 rounded-2xl bg-red-600 text-white font-black text-sm hover:bg-red-700 transition-all active:scale-95"
                >
                  Yes, Delete Everything
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-4 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm hover:bg-slate-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

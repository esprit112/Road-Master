import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, PhoneCall, Zap, Fuel, MapPin, ChevronRight, Loader2, Wrench, Truck, Hospital, Stethoscope, Activity, Dog, Pill, Shield, Hotel, Navigation } from 'lucide-react';
import { EmergencyCategory, EmergencyResult, Region, RoadLawSummary, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { EMERGENCY_DB } from '../constants/emergency_db';

interface EmergencyViewProps {
  region: Region;
  countryCode: string;
  countryName: string;
  roadLaws: RoadLawSummary | null;
  emergencyResults: EmergencyResult[];
  selectedEmergencyCategory: EmergencyCategory | null;
  loading: boolean;
  handleEmergencySearch: (category: EmergencyCategory) => void;
  activeProfile: UserProfile | null;
}

const EmergencyHeader = ({ region, countryCode }: { region: Region, countryCode: string }) => {
  const getNumbers = (reg: Region, code: string) => {
    const dbEntry = EMERGENCY_DB[code];
    if (dbEntry) return dbEntry.numbers;
    
    if (reg === 'UK') return { primary: '999', medical: '111', police: '101' };
    if (reg === 'US') return { primary: '911' };
    return { primary: '112' }; // Default International/EU
  };

  const nums = getNumbers(region, countryCode);

  return (
    <div className="mb-6 space-y-3">
      <a 
        href={`tel:${nums.primary}`}
        className="flex w-full items-center justify-between rounded-2xl bg-[#D00000] p-5 text-white shadow-lg transition-transform active:scale-95"
      >
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-white/20 p-3"><ShieldAlert size={28} /></div>
          <div className="text-left">
            <p className="text-xs font-bold uppercase tracking-wider opacity-90">Life-Threatening Emergency</p>
            <p className="text-3xl font-black tracking-tight">Dial {nums.primary}</p>
          </div>
        </div>
        <PhoneCall size={32} className="opacity-80" />
      </a>

      {nums.medical && (
        <div className="grid grid-cols-2 gap-3">
          <a href={`tel:${nums.medical}`} className="flex flex-col justify-center rounded-2xl bg-white p-4 text-[#005EB8] shadow-md transition-transform active:scale-95">
            <div className="flex items-center gap-2 mb-1">
              <PhoneCall size={14} className="opacity-80" />
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Non-Emergency Medical</span>
            </div>
            <span className="text-xl font-black">Call {nums.medical}</span>
          </a>
          <a href={`tel:${nums.police}`} className="flex flex-col justify-center rounded-2xl bg-white p-4 text-[#001D3D] shadow-md transition-transform active:scale-95">
            <div className="flex items-center gap-2 mb-1">
              <PhoneCall size={14} className="opacity-80" />
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Non-Emergency Police</span>
            </div>
            <span className="text-xl font-black">Call {nums.police}</span>
          </a>
        </div>
      )}
    </div>
  );
};

export const EmergencyView: React.FC<EmergencyViewProps> = ({
  region,
  countryCode,
  countryName,
  roadLaws,
  emergencyResults,
  selectedEmergencyCategory,
  loading,
  handleEmergencySearch,
  activeProfile
}) => {
  const emergencyCategories: { name: EmergencyCategory; icon: any; color: string }[] = [
    { name: 'Mechanic', icon: Wrench, color: 'bg-blue-500' },
    { name: 'Breakdown', icon: Truck, color: 'bg-orange-500' },
    { name: 'Medical (Urgent)', icon: Hospital, color: 'bg-red-600' },
    { name: 'Medical (Routine)', icon: Stethoscope, color: 'bg-emerald-500' },
    { name: 'Dental', icon: Activity, color: 'bg-cyan-500' },
    { name: 'Veterinary', icon: Dog, color: 'bg-purple-500' },
    { name: 'Pharmacy', icon: Pill, color: 'bg-pink-500' },
    { name: 'Safety', icon: Shield, color: 'bg-slate-700' },
    { name: 'Emergency Stay', icon: Hotel, color: 'bg-indigo-500' },
  ];

  return (
    <div className="relative z-10 pt-4 pb-32 max-w-4xl mx-auto px-6 overflow-y-auto overscroll-contain touch-pan-y">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Emergency Support</h2>
          <p className="text-white/60 font-medium">Detected: {countryName} ({region})</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
          <ShieldAlert className="text-red-500" />
        </div>
      </div>

      <EmergencyHeader region={region} countryCode={countryCode} />

      {/* Dynamic Fuel/Charging Bar */}
      <div className="mb-8">
        {activeProfile?.vehicle.power === 'EV' ? (
          <button 
            onClick={() => handleEmergencySearch('Mechanic')}
            className="w-full flex items-center justify-between rounded-2xl bg-emerald-600 p-5 text-white shadow-lg transition-transform active:scale-95 min-h-[44px]"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-white/20 p-3"><Zap size={24} /></div>
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-wider opacity-90">Low Battery?</p>
                <p className="text-xl font-black">Find Nearest Rapid Charger</p>
              </div>
            </div>
            <ChevronRight size={24} />
          </button>
        ) : (
          <button 
            onClick={() => handleEmergencySearch('Mechanic')}
            className="w-full flex items-center justify-between rounded-2xl bg-amber-600 p-5 text-white shadow-lg transition-transform active:scale-95 min-h-[44px]"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-white/20 p-3"><Fuel size={24} /></div>
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-wider opacity-90">Low Fuel?</p>
                <p className="text-xl font-black">Find Nearest Petrol Station</p>
              </div>
            </div>
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Emergency Grid - 10 button grid (9 categories + 1 dynamic) */}
      <div className="grid grid-cols-3 gap-3 mb-12">
        {emergencyCategories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => handleEmergencySearch(cat.name)}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-md border border-white/10 transition-all active:scale-95 hover:bg-white/20 min-h-[44px]"
          >
            <div className={cn("rounded-xl p-3 text-white shadow-lg", cat.color)}>
              <cat.icon size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-white/80 text-center leading-tight">
              {cat.name.split(' ')[0]}
            </span>
          </button>
        ))}
        {/* 10th button is the dynamic one above, but we can add another or just keep it as is */}
      </div>

      {/* Results Area */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
            <p className="text-white/60 font-bold">Scanning local databases...</p>
          </motion.div>
        ) : emergencyResults.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-black text-white uppercase tracking-widest">
                {selectedEmergencyCategory} Results
              </h3>
              <span className="text-xs font-bold text-white/40">{emergencyResults.length} Found</span>
            </div>
            {emergencyResults?.map((result, idx) => (
              <div key={idx} className="rounded-3xl bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-black text-[#1A237E] mb-1">{result.name}</h4>
                    <div className="flex items-center gap-2 text-sm font-bold text-indigo-600">
                      <MapPin size={14} />
                      {result.distance_from_user} away
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                    result.open_now_status.includes('Open') ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  )}>
                    {result.open_now_status}
                  </div>
                </div>
                <div className="flex gap-3">
                  <a 
                    href={`tel:${result.phone_number}`}
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-100 text-[#1A237E] font-black text-sm hover:bg-slate-200 transition-all"
                  >
                    <PhoneCall size={18} />
                    Call
                  </a>
                  <a 
                    href={result.Maps_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                  >
                    <Navigation size={18} />
                    Navigate
                  </a>
                </div>
              </div>
            ))}
          </motion.div>
        ) : selectedEmergencyCategory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-white/40 font-bold">No results found for this category in your area.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Road Laws Summary */}
      {roadLaws && (
        <div className="mt-12 rounded-[2.5rem] bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Shield className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Local Road Laws</h3>
              <p className="text-indigo-400/60 text-xs font-bold uppercase tracking-widest">{countryName}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Driving Side</p>
              <p className="text-lg font-black text-white">{roadLaws.sideOfRoad}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">BAC Limit</p>
              <p className="text-lg font-black text-white">{roadLaws.bacLimit}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Required Gear</h4>
              <div className="flex flex-wrap gap-2">
                {roadLaws.requiredGear?.map((gear, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/80 text-xs font-bold border border-white/5">
                    {gear}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Local Nuances</h4>
              <ul className="space-y-2">
                {roadLaws.quirkyLaws?.map((law, i) => (
                  <li key={i} className="flex gap-3 text-sm text-white/60 font-medium">
                    <span className="text-indigo-500 font-black">•</span>
                    {law}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Loader2, MapPin, Sparkles, AlertTriangle, CheckCircle, Clock, Phone, ExternalLink, Plus, Hotel, GripVertical, Trash2, Flame } from 'lucide-react';
import { ItineraryView } from './ItineraryView';
import { MobileParametersDrawer } from './MobileParametersDrawer';
import { SmartImage } from './SmartImage';
import { TripInputs, RoadTripResponse, UserProfile, EditAction, OvernightPitstop } from '../types';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface PlannerViewProps {
  inputs: TripInputs;
  setInputs: (inputs: TripInputs) => void;
  roadTrip: RoadTripResponse | null;
  isGenerating: boolean;
  loadingMessage: string;
  contextualMessage: string;
  currentDayIndex: number;
  setSelectedDay: (day: number) => void;
  activeProfile: UserProfile;
  handleSubmit: (e?: React.FormEvent) => void;
  handleEditAction: (action: EditAction) => void;
  handleDragStart: (e: React.DragEvent, day: number, index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDrop: (e: React.DragEvent, dropIndex: number, day: number) => void;
  draggedStopIndex: { day: number; index: number } | null;
  dynamicOvernightStays: OvernightPitstop[];
  isFetchingOvernightStays: boolean;
  getEndOfDayLocation: (dayIndex: number) => { location: { lat: number; lng: number } | string, name: string } | null;
  setIsNavActive: (active: boolean) => void;
  calculatedDistance: string | null;
  setIsDrawerOpen: (open: boolean) => void;
  isDrawerOpen: boolean;
  handleAddManualStop: (manualStopInput: {name: string, postcode: string, day: number, type: 'pitstop' | 'road'}) => void;
  handleSaveRoute: (name: string, date: string) => void;
  userLocation: { lat: number; lng: number } | null;
  generateNavUrl: (waypoints: any[], navigator: string, location: any) => string;
  optimizeWaypoints: (itinerary: any[]) => any[];
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  inputs,
  setInputs,
  roadTrip,
  isGenerating,
  loadingMessage,
  contextualMessage,
  currentDayIndex,
  setSelectedDay,
  activeProfile,
  handleSubmit,
  handleEditAction,
  handleDragStart,
  handleDragOver,
  handleDrop,
  draggedStopIndex,
  dynamicOvernightStays,
  isFetchingOvernightStays,
  getEndOfDayLocation,
  setIsNavActive,
  calculatedDistance,
  setIsDrawerOpen,
  isDrawerOpen,
  handleAddManualStop,
  handleSaveRoute,
  userLocation,
  generateNavUrl,
  optimizeWaypoints
}) => {
  const [showManualStopModal, setShowManualStopModal] = useState(false);
  const [manualStopInput, setManualStopInput] = useState<{name: string, postcode: string, day: number, type: 'pitstop' | 'road'}>({ name: '', postcode: '', day: currentDayIndex + 1, type: 'pitstop' });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTripName, setSaveTripName] = useState('');
  const [saveTripDate, setSaveTripDate] = useState('');

  const onAddManualStop = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddManualStop(manualStopInput);
    setShowManualStopModal(false);
    setManualStopInput({ name: '', postcode: '', day: currentDayIndex + 1, type: 'pitstop' });
  };

  const handleShareRoute = () => {
    if (!roadTrip) return;
    try {
      const routeData = btoa(JSON.stringify(roadTrip));
      const shareUrl = `${window.location.origin}${window.location.pathname}?routeData=${encodeURIComponent(routeData)}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard!");
    } catch (e) {
      toast.error("Failed to generate share link.");
    }
  };

  return (
    <div className="relative z-10 pt-4 pb-32 overflow-y-auto overscroll-contain touch-pan-y">
      <div className="max-w-4xl mx-auto px-6">
        {/* Main Action Area */}
        <div className="flex flex-col gap-6 mb-12">
          {!roadTrip && !isGenerating && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/20 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
                <Compass className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Ready to Architect?</h2>
              <p className="text-white/70 mb-8 max-w-md mx-auto font-medium leading-relaxed">
                Define your parameters and let our AI engine architect a hyper-personalized road trip tailored to your vehicle and persona.
              </p>
              <button 
                onClick={() => setIsDrawerOpen(true)}
                className="w-full py-5 rounded-2xl bg-white text-indigo-900 font-black text-lg hover:bg-indigo-50 transition-all active:scale-95 shadow-xl min-h-[44px]"
              >
                Set Trip Parameters
              </button>
            </motion.div>
          )}

          {isGenerating && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
                <Loader2 className="w-16 h-16 text-white animate-spin relative z-10" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3 tracking-tight">{loadingMessage}</h3>
              <p className="text-white/60 font-medium italic max-w-xs mx-auto">"{contextualMessage}"</p>
            </motion.div>
          )}

          {roadTrip && !isGenerating && (
            <div className="space-y-6">
              {/* Horizontal Day Ribbon - Frosted Glass Style */}
              <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar snap-x flex-nowrap scrollbar-hide px-1">
                {Array.from({ length: roadTrip.itinerary_daily.length }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(i)}
                    className={cn(
                      "flex-shrink-0 px-8 py-4 rounded-[2rem] font-black text-sm transition-all snap-start min-h-[44px] border backdrop-blur-md",
                      currentDayIndex === i 
                        ? "bg-white text-indigo-900 shadow-2xl scale-105 border-white" 
                        : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    Day {i + 1}
                  </button>
                ))}
              </div>

              <ItineraryView 
                roadTrip={roadTrip}
                selectedDay={currentDayIndex}
                setSelectedDay={setSelectedDay}
                activeProfile={activeProfile}
                handleShareRoute={handleShareRoute}
                handleEditAction={handleEditAction}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDrop={handleDrop}
                draggedStopIndex={draggedStopIndex}
                dynamicOvernightStays={dynamicOvernightStays}
                isFetchingOvernightStays={isFetchingOvernightStays}
                getEndOfDayLocation={getEndOfDayLocation}
                setShowManualStopModal={setShowManualStopModal}
                setSaveTripName={setSaveTripName}
                setShowSaveModal={setShowSaveModal}
                setIsNavActive={setIsNavActive}
                userLocation={userLocation}
                generateNavUrl={generateNavUrl}
                optimizeWaypoints={optimizeWaypoints}
              />
            </div>
          )}
        </div>
      </div>

      {/* Manual Stop Modal */}
      <AnimatePresence>
        {showManualStopModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManualStopModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-[#1A237E] tracking-tight">Add Custom Stop</h3>
                <button onClick={() => setShowManualStopModal(false)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-slate-400" />
                </button>
              </div>

              <form onSubmit={onAddManualStop} className="space-y-6">
                <div className="flex p-1 bg-slate-100 rounded-2xl mb-6">
                  <button 
                    type="button"
                    onClick={() => setManualStopInput(prev => ({ ...prev, type: 'pitstop' }))}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                      manualStopInput.type === 'pitstop' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                    )}
                  >
                    Specific Pitstop
                  </button>
                  <button 
                    type="button"
                    onClick={() => setManualStopInput(prev => ({ ...prev, type: 'road' }))}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                      manualStopInput.type === 'road' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                    )}
                  >
                    Preferred Road
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-[#1A237E] uppercase tracking-widest mb-2 ml-1">Name / Location</label>
                    <input 
                      required
                      value={manualStopInput.name}
                      onChange={e => setManualStopInput(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={manualStopInput.type === 'pitstop' ? "e.g. The Ritz London" : "e.g. A82 Scenic Road"}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:outline-none font-bold text-[#1A237E] transition-all"
                    />
                  </div>
                  
                  {manualStopInput.type === 'pitstop' && (
                    <div>
                      <label className="block text-xs font-black text-[#1A237E] uppercase tracking-widest mb-2 ml-1">Postcode / Address</label>
                      <input 
                        required
                        value={manualStopInput.postcode}
                        onChange={e => setManualStopInput(prev => ({ ...prev, postcode: e.target.value }))}
                        placeholder="e.g. W1J 9BR"
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:outline-none font-bold text-[#1A237E] transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black text-[#1A237E] uppercase tracking-widest mb-2 ml-1">Day of Trip</label>
                    <select 
                      value={manualStopInput.day}
                      onChange={e => setManualStopInput(prev => ({ ...prev, day: parseInt(e.target.value) }))}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:outline-none font-bold text-[#1A237E] transition-all appearance-none"
                    >
                      {Array.from({ length: inputs.days }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>Day {d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 rounded-2xl bg-[#1A237E] text-white font-black text-lg hover:bg-[#1A237E]/90 transition-all active:scale-95 shadow-xl shadow-indigo-200 mt-4"
                >
                  Recalculate Route
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Save Route Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-[#1A237E] tracking-tight">Save Trip to Library</h3>
                <button onClick={() => setShowSaveModal(false)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-[#1A237E] uppercase tracking-widest mb-2 ml-1">Trip Name</label>
                  <input 
                    value={saveTripName}
                    onChange={e => setSaveTripName(e.target.value)}
                    placeholder="e.g. Summer Highlands Expedition"
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:outline-none font-bold text-[#1A237E] transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-[#1A237E] uppercase tracking-widest mb-2 ml-1">Trip Date (Optional)</label>
                  <input 
                    type="date"
                    value={saveTripDate}
                    onChange={e => setSaveTripDate(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:outline-none font-bold text-[#1A237E] transition-all"
                  />
                </div>

                <button 
                  onClick={() => {
                    handleSaveRoute(saveTripName, saveTripDate);
                    setShowSaveModal(false);
                  }}
                  className="w-full py-5 rounded-2xl bg-emerald-600 text-white font-black text-lg hover:bg-emerald-700 transition-all active:scale-95 shadow-xl shadow-emerald-200 mt-4"
                >
                  Confirm Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MobileParametersDrawer 
        activeProfile={activeProfile}
        inputs={inputs}
        setInputs={setInputs}
        loading={isGenerating}
        onArchitect={handleSubmit}
        calculatedDistance={calculatedDistance}
        contextualMessage={contextualMessage}
        isOpen={isDrawerOpen}
        setIsOpen={setIsDrawerOpen}
      />
    </div>
  );
};

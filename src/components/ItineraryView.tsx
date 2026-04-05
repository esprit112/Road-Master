import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ShieldAlert, 
  Navigation, 
  Activity, 
  Bookmark, 
  Share2, 
  MapPin, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Flame, 
  ExternalLink, 
  Phone, 
  Hotel, 
  Plus, 
  Loader2,
  GripVertical
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ItineraryDaySelector } from './ItineraryDaySelector';
import { SmartImage } from './SmartImage';
import { RoadTripResponse, UserProfile, TripInputs } from '../types';

interface ItineraryViewProps {
  roadTrip: RoadTripResponse;
  selectedDay: number;
  setSelectedDay: (day: number) => void;
  activeProfile: UserProfile;
  userLocation: { lat: number; lng: number } | null;
  generateNavUrl: (waypoints: any[], navigator: string, location: any) => string;
  optimizeWaypoints: (itinerary: any[]) => any[];
  handleShareRoute: () => void;
  handleEditAction: (action: any) => void;
  handleDragStart: (e: React.DragEvent, day: number, index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDrop: (e: React.DragEvent, index: number, day: number) => void;
  draggedStopIndex: { day: number; index: number } | null;
  dynamicOvernightStays: any[];
  isFetchingOvernightStays: boolean;
  getEndOfDayLocation: (day: number) => any;
  setShowManualStopModal: (show: boolean) => void;
  setSaveTripName: (name: string) => void;
  setShowSaveModal: (show: boolean) => void;
  setIsNavActive: (active: boolean) => void;
}

export function ItineraryView({
  roadTrip,
  selectedDay,
  setSelectedDay,
  activeProfile,
  userLocation,
  generateNavUrl,
  optimizeWaypoints,
  handleShareRoute,
  handleEditAction,
  handleDragStart,
  handleDragOver,
  handleDrop,
  draggedStopIndex,
  dynamicOvernightStays,
  isFetchingOvernightStays,
  getEndOfDayLocation,
  setShowManualStopModal,
  setSaveTripName,
  setShowSaveModal,
  setIsNavActive
}: ItineraryViewProps) {
  const currentDayData = roadTrip.itinerary_daily.find(d => d.day === selectedDay);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12">
      <div className="flex flex-col items-center gap-6 mb-12 text-center">
        <div className="p-4 rounded-3xl bg-indigo-50 shadow-inner">
          <Sparkles className="w-8 h-8 text-[#1A237E]" />
        </div>
        <div>
          <h2 className="text-4xl font-black text-[#1A237E] tracking-tight">Architect's Itinerary</h2>
          <p className="text-sm font-bold text-[#1A237E]/40 uppercase tracking-widest mt-1">Generated for {activeProfile.name}</p>
          
          {currentDayData && currentDayData.stops.length > 0 && (
            <div className="mt-6 space-y-4 flex flex-col items-center">
              {currentDayData.safety_warning && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-bold shadow-sm">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  {currentDayData.safety_warning}
                </div>
              )}
              <div className="flex flex-col w-full gap-3">
                <a 
                  href={generateNavUrl(optimizeWaypoints([{stops: currentDayData.stops || []}]), activeProfile.settings?.preferred_navigator || 'Google Maps', userLocation)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsNavActive(true)}
                  className="flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-[#1A237E] text-white font-black text-base hover:bg-[#1A237E]/90 transition-all active:scale-95 shadow-xl shadow-indigo-200 w-full"
                >
                  {activeProfile.settings?.preferred_navigator === 'Apple Maps' ? <Navigation className="w-5 h-5" /> : 
                   activeProfile.settings?.preferred_navigator === 'Waze' ? <Activity className="w-5 h-5" /> :
                   <img src="https://www.google.com/images/branding/product/ico/maps15_24dp.ico" alt="" className="w-5 h-5" />}
                  Launch Day {selectedDay} Route
                </a>
                {currentDayData.is_split && currentDayData.secondary_nav_link && (
                  <a 
                    href={currentDayData.secondary_nav_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsNavActive(true)}
                    className="flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-slate-100 text-[#1A237E] font-black text-base hover:bg-slate-200 transition-all active:scale-95 border border-slate-200 w-full"
                  >
                    Launch Part 2
                  </a>
                )}
              </div>
              {currentDayData.fallback_note && (
                <p className="text-xs font-bold text-slate-400 italic">
                  {currentDayData.fallback_note}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col w-full gap-6 mt-4">
          <ItineraryDaySelector 
            itinerary={roadTrip.itinerary_daily}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
          
          <div className="flex items-center justify-center gap-4 w-full">
            <button
              onClick={() => {
                setSaveTripName(`${activeProfile.name}'s ${roadTrip.ui_state.header_context.location_name} Adventure`);
                setShowSaveModal(true);
              }}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-[#1A237E]/10 text-[#1A237E] rounded-2xl font-black text-sm hover:bg-[#1A237E]/20 transition-all flex-1 border border-[#1A237E]/5"
            >
              <Bookmark className="w-5 h-5" />
              Save Trip
            </button>
            <button
              onClick={handleShareRoute}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-[#1A237E]/10 text-[#1A237E] rounded-2xl font-black text-sm hover:bg-[#1A237E]/20 transition-all flex-1 border border-[#1A237E]/5"
            >
              <Share2 className="w-5 h-5" />
              Share Route
            </button>
          </div>
        </div>
      </div>
      
      <div className="space-y-16">
        {currentDayData?.stops.map((stop, idx) => (
          <motion.div 
            key={`${selectedDay}-${idx}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            draggable
            onDragStart={(e: any) => handleDragStart(e, selectedDay, idx)}
            onDragOver={(e: any) => handleDragOver(e, idx)}
            onDrop={(e: any) => handleDrop(e, idx, selectedDay)}
            className={cn(
              "relative pl-10 border-l-4 border-indigo-100 group transition-all",
              draggedStopIndex?.day === selectedDay && draggedStopIndex?.index === idx ? "opacity-50 scale-95" : "opacity-100"
            )}
          >
            <div className="absolute -left-[14px] top-0 w-6 h-6 rounded-full bg-indigo-500 border-4 border-white shadow-md" />
            
            {/* Drag Handle */}
            <div className="absolute -left-14 top-0 p-3 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-[#1A237E]">
              <GripVertical className="w-6 h-6" />
            </div>

            <article className="flex flex-col gap-8 bg-white/40 backdrop-blur-sm p-6 rounded-[2.5rem] border border-white/20 shadow-sm hover:shadow-md transition-shadow">
              {/* Hero Image */}
              <div className="w-full aspect-[16/10] rounded-[2rem] overflow-hidden shadow-xl border border-white/20 relative">
                {stop.image_source === 'generic' && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest shadow-lg z-10">
                    Generic Image
                  </div>
                )}
                <SmartImage 
                  searchQuery={`${stop.name}, ${stop.location}`}
                  overrideSrc={stop.photo_uri}
                  fallbackSeed={stop.name}
                  alt={stop.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>

              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-3xl font-black text-[#1A237E] tracking-tight leading-none">{stop.name}</h3>
                      {stop.nav_url && (
                        <a 
                          href={stop.nav_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all shadow-sm"
                          title="Navigate to this stop"
                        >
                          <MapPin className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-indigo-600/60">
                      <MapPin className="w-4 h-4" />
                      {stop.location}
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditAction({ type: 'REMOVE_STOP', day: selectedDay, stopIndex: idx })}
                    className="p-3 rounded-2xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                    title="Remove this stop"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Metadata Tags */}
                <div className="flex flex-wrap gap-2.5">
                  {stop.discovery_tag && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider shadow-sm">
                      <Sparkles className="w-3.5 h-3.5" />
                      {stop.discovery_tag}
                    </div>
                  )}
                  
                  {stop.live_data && (
                    <>
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm",
                        stop.live_data.status === 'Verified' ? "bg-emerald-100 text-emerald-800" :
                        stop.live_data.status === 'Warning' ? "bg-red-100 text-red-800" :
                        "bg-slate-100 text-slate-800"
                      )}>
                        <CheckCircle className="w-3.5 h-3.5" />
                        {stop.live_data.status}
                      </div>

                      {stop.live_data.hours && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-wider shadow-sm">
                          <Clock className="w-3.5 h-3.5" />
                          {stop.live_data.hours}
                        </div>
                      )}
                      
                      {(stop.live_data.booking === 'Required' || stop.live_data.booking === 'Recommended') && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider shadow-sm">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Booking {stop.live_data.booking}
                        </div>
                      )}

                      {stop.live_data.booking_priority === 'high' && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-100 text-red-800 text-[10px] font-black uppercase tracking-wider shadow-sm">
                          <Flame className="w-3.5 h-3.5" />
                          High Demand
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Description */}
                <p className="text-[#1A237E]/80 leading-relaxed font-medium text-lg">{stop.description}</p>
                
                <div className="flex flex-wrap gap-4 pt-2">
                  {stop.phone && (
                    <a href={`tel:${stop.phone}`} className="flex items-center gap-2.5 text-xs font-bold text-slate-600 bg-slate-100/50 px-4 py-2 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200/50">
                      <Phone className="w-4 h-4" />
                      {stop.phone}
                    </a>
                  )}
                  {(stop.live_data?.official_link || (stop.image_source === 'website' && stop.website_url)) && (
                    <a 
                      href={stop.live_data?.official_link || stop.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-200/50 max-w-[250px] uppercase tracking-wider"
                    >
                      <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{stop.live_data?.official_link ? 'Official Website' : 'Source Link'}</span>
                    </a>
                  )}
                </div>
              </div>
            </article>
          </motion.div>
        ))}
      </div>

      {(dynamicOvernightStays.length > 0 || isFetchingOvernightStays) && (
        <div className="mt-24 pt-16 border-t-2 border-[#1A237E]/5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-[#1A237E] tracking-tight">
                🏁 Recommended Pitstops
              </h3>
              {getEndOfDayLocation(selectedDay) && (
                <p className="text-lg font-bold text-indigo-600/60 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Stays near {getEndOfDayLocation(selectedDay)?.name}
                </p>
              )}
            </div>
            <div className="px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-indigo-200">
              <Hotel className="w-5 h-5" />
              For {activeProfile.vehicle.type}
            </div>
          </div>

          {isFetchingOvernightStays ? (
            <div className="flex flex-col items-center justify-center py-20 bg-indigo-50/50 rounded-[3rem] border-2 border-dashed border-indigo-100">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-6" />
              <p className="text-lg font-black text-indigo-900 uppercase tracking-widest">Finding the best overnight stays...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Add Your Own Stop Card */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="group relative overflow-hidden rounded-[3rem] bg-indigo-50/50 border-4 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-100/50 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[350px] p-8 text-center"
                onClick={() => setShowManualStopModal(true)}
              >
                <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform rotate-3 group-hover:rotate-0">
                  <Plus className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-black text-indigo-900 mb-3">Add Your Own Stop</h4>
                <p className="text-base text-indigo-700/70 font-bold leading-relaxed">Have a pre-booked hotel or specific location? Add it here and we'll recalculate the route around it.</p>
              </motion.div>

              {dynamicOvernightStays.map((option, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="group relative overflow-hidden rounded-[3rem] bg-white border border-[#1A237E]/5 hover:border-[#1A237E]/20 transition-all hover:shadow-2xl"
                >
                  <div className="aspect-[16/10] overflow-hidden relative">
                    {option.image_source === 'generic' && (
                      <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest shadow-lg z-20">
                        Generic Image
                      </div>
                    )}
                    <SmartImage 
                      searchQuery={`${option.name}, ${getEndOfDayLocation(selectedDay)?.name || ''}`}
                      overrideSrc={option.photo_uri}
                      fallbackSeed={option.name}
                      alt={option.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#1A237E] shadow-xl z-10 border border-white/20">
                      {option.price_category}
                    </div>
                  </div>
                  
                  <div className="p-8 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="text-2xl font-black text-[#1A237E] tracking-tight group-hover:text-indigo-600 transition-colors">{option.name}</h4>
                      <div className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                        {option.type}
                      </div>
                    </div>
                    <p className="text-[#1A237E]/70 text-sm font-bold leading-relaxed">{option.description}</p>
                    <div className="pt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest">
                        <Sparkles className="w-4 h-4" />
                        {option.persona_fit}
                      </div>
                      <button 
                        onClick={() => handleEditAction({ type: 'ADD_STOP', day: selectedDay, stop: option })}
                        className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                        title="Add to Itinerary"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

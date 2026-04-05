import React from 'react';
import { motion } from 'motion/react';
import { Bookmark, Calendar, MapPin, ChevronRight, Trash2, History, Sparkles } from 'lucide-react';
import { SavedRoute, RoadTripResponse } from '../types';
import { SmartImage } from './SmartImage';
import { db } from '../db';
import toast from 'react-hot-toast';

interface SavedRoutesViewProps {
  savedRoutes: SavedRoute[] | undefined;
  onSelectRoute: (route: RoadTripResponse) => void;
}

export const SavedRoutesView: React.FC<SavedRoutesViewProps> = ({
  savedRoutes,
  onSelectRoute
}) => {
  const handleDeleteRoute = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await db.routes.delete(id);
      toast.success("Route removed from your library.");
    } catch (error) {
      console.error("Failed to delete route:", error);
      toast.error("Failed to delete route.");
    }
  };

  return (
    <div className="relative z-10 pt-4 pb-32 max-w-4xl mx-auto px-6 overflow-y-auto overscroll-contain touch-pan-y">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Saved Trips</h2>
          <p className="text-white/60 font-medium">Your personal road trip library</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
          <Bookmark className="text-indigo-400" />
        </div>
      </div>

      {!savedRoutes || savedRoutes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border border-white/20">
            <History className="w-12 h-12 text-white/40 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight drop-shadow-lg">Library Empty</h2>
          <p className="text-white/60 max-w-md font-medium drop-shadow-md">
            Architect your first trip and save it to see it here. Your adventures await!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {savedRoutes.map((route, idx) => (
            <motion.div 
              key={route.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => onSelectRoute(route.itinerary_data)}
              className="group relative overflow-hidden rounded-[2.5rem] bg-white border border-[#1A237E]/5 hover:border-[#1A237E]/20 transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer"
            >
              <div className="aspect-[16/9] overflow-hidden relative">
                <SmartImage 
                  searchQuery={route.thumbnail_hint}
                  fallbackSeed={route.thumbnail_hint}
                  alt={route.display_name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-4 right-4 flex gap-2">
                  <button 
                    onClick={(e) => handleDeleteRoute(e, route.id!)}
                    className="p-2 rounded-xl bg-white/95 backdrop-blur-sm text-red-500 shadow-sm hover:bg-red-50 transition-all active:scale-90"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider">
                    <Calendar className="w-3 h-3" />
                    {route.trip_date}
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    {route.itinerary_data.itinerary_daily.length} Days
                  </div>
                </div>
                <h4 className="text-xl font-black text-[#1A237E] mb-2 tracking-tight group-hover:text-indigo-600 transition-colors line-clamp-1">{route.display_name}</h4>
                <p className="text-sm text-[#1A237E]/60 line-clamp-2 mb-4 font-medium leading-relaxed">{route.summary}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <MapPin size={14} />
                    {route.itinerary_data.ui_state.header_context.location_name}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-black text-indigo-600 uppercase tracking-widest">
                    View Route
                    <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

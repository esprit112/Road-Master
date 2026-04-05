import { useState, useEffect } from 'react';
import { MapPin, Navigation, Fuel, Zap, Compass, Sparkles, ShieldAlert, User, Bookmark, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProfile } from './hooks/useProfile';
import { useTripPlanning } from './hooks/useTripPlanning';
import { useEmergency } from './hooks/useEmergency';
import { PlannerView } from './components/PlannerView';
import { EmergencyView } from './components/EmergencyView';
import { ProfileView } from './components/ProfileView';
import { SavedRoutesView } from './components/SavedRoutesView';
import { WelcomeScreen } from './components/WelcomeScreen';
import { CreateProfileScreen } from './components/CreateProfileScreen';
import { ChatAssistant } from './components/ChatAssistant';
import { SmartImage } from './components/SmartImage';
import { Toaster } from 'react-hot-toast';
import { db } from './db';
import { useLiveQuery } from 'dexie-react-hooks';
import toast from 'react-hot-toast';
import { cn } from './lib/utils';
import { RoadTripResponse, SavedRoute } from './types';

export default function App() {
  const { userState, isAuthReady, countryName, region, countryCode, roadLaws, handleProfileSelect, handleProfileCreated, handleUpdateProfile, handleDeleteProfile, handleLogout } = useProfile();
  const { tripState, loadingMessage, contextualMessage, dynamicOvernightStays, isFetchingOvernightStays, calculatedDistance, draggedStopIndex, setInputs, setRoadTrip, setSelectedDay, setIsNavActive, handleSubmit, handleEditAction, handleDragStart, handleDragOver, handleDrop, handleAddManualStop, getEndOfDayLocation, generateNavUrl, optimizeWaypoints } = useTripPlanning(userState.activeProfile, userState.userLocation);
  const { emergencyState, loading, handleEmergencySearch } = useEmergency(userState.userLocation, region);

  const [uiState, setUiState] = useState({
    activeMode: 'planner' as 'planner' | 'emergency' | 'saved' | 'profile',
    isHudOpen: false,
    notifications: [] as string[],
    isModalOpen: false,
    showCreateProfile: false,
    isDrawerOpen: false,
    showRouteTypeModal: false
  });

  const allRecentTrips = useLiveQuery(() => db.routes.reverse().limit(3).toArray(), []);
  const savedRoutes = useLiveQuery(() => userState.activeProfile ? db.routes.where('profileId').equals(userState.activeProfile.id!).reverse().sortBy('created_at') : [], [userState.activeProfile]);

  const handleSaveRoute = async (name: string, date: string) => {
    if (!userState.activeProfile || !tripState.roadTrip) return;
    try {
      await db.routes.add({
        profileId: userState.activeProfile.id!,
        route_id: `route_${Date.now()}`,
        display_name: name || `${userState.activeProfile.name}'s Adventure`,
        trip_date: date || 'TBD',
        summary: tripState.roadTrip.ui_state.header_context.title || `Exploring ${tripState.roadTrip.ui_state.header_context.location_name}`,
        thumbnail_hint: tripState.roadTrip.ui_state.header_context.image_hint,
        itinerary_data: tripState.roadTrip,
        created_at: new Date().toISOString()
      });
      toast.success("Route saved to library!");
    } catch (e) { toast.error("Failed to save route."); }
  };

  const handleResumeRoute = (route: SavedRoute) => {
    const profile = userState.profiles.find(p => p.id === route.profileId);
    if (profile) {
      handleProfileSelect(profile);
      setRoadTrip(route.itinerary_data);
      setUiState(p => ({ ...p, activeMode: 'planner' }));
    }
  };

  if (!isAuthReady) return <div className="fixed inset-0 flex items-center justify-center bg-slate-900"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>;
  if (uiState.showCreateProfile || (userState.profiles.length === 0 && !userState.activeProfile)) return <CreateProfileScreen onCreated={handleProfileCreated} />;
  if (!userState.activeProfile) return <WelcomeScreen profiles={userState.profiles} onSelect={handleProfileSelect} onCreateNew={() => setUiState(p => ({ ...p, showCreateProfile: true }))} savedRoutes={allRecentTrips || []} onResumeRoute={handleResumeRoute} />;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-indigo-500/30 overflow-y-auto overscroll-contain touch-pan-y pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <Toaster position="top-center" />
      <ChatAssistant isOpen={uiState.isHudOpen} onClose={() => setUiState(p => ({ ...p, isHudOpen: false }))} inputs={tripState.inputs} roadTrip={tripState.roadTrip} onUpdateRoute={(u) => setInputs(prev => ({ ...prev, ...u }))} onUpdateProfile={handleUpdateProfile} activeProfile={userState.activeProfile} userLocation={userState.userLocation} countryName={countryName} />
      
      <header className="fixed inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={tripState.roadTrip?.ui_state.header_context.location_name || 'default'} initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} className="absolute inset-0">
            <SmartImage searchQuery={tripState.roadTrip?.ui_state.header_context.image_hint || 'scenic road'} fallbackSeed="road" alt="background" className="w-full h-full object-cover scale-110" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/60" />
          </motion.div>
        </AnimatePresence>
      </header>

      <main className="relative z-10 min-h-screen">
        {uiState.activeMode === 'planner' && (
          <PlannerView 
            inputs={tripState.inputs}
            setInputs={setInputs}
            roadTrip={tripState.roadTrip}
            isGenerating={tripState.isGenerating}
            loadingMessage={loadingMessage}
            contextualMessage={contextualMessage}
            currentDayIndex={tripState.currentDayIndex}
            setSelectedDay={setSelectedDay}
            activeProfile={userState.activeProfile}
            handleSubmit={handleSubmit}
            handleEditAction={handleEditAction}
            handleDragStart={handleDragStart}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            draggedStopIndex={draggedStopIndex}
            dynamicOvernightStays={dynamicOvernightStays}
            isFetchingOvernightStays={isFetchingOvernightStays}
            getEndOfDayLocation={getEndOfDayLocation}
            setIsNavActive={setIsNavActive}
            calculatedDistance={calculatedDistance}
            setIsDrawerOpen={(o) => setUiState(p => ({ ...p, isDrawerOpen: o }))}
            isDrawerOpen={uiState.isDrawerOpen}
            handleAddManualStop={handleAddManualStop}
            handleSaveRoute={handleSaveRoute}
            userLocation={userState.userLocation}
            generateNavUrl={generateNavUrl}
            optimizeWaypoints={optimizeWaypoints}
          />
        )}
        {uiState.activeMode === 'emergency' && (
          <EmergencyView 
            region={region}
            countryCode={countryCode}
            countryName={countryName}
            roadLaws={roadLaws}
            emergencyResults={emergencyState.results}
            selectedEmergencyCategory={emergencyState.activeCategory}
            loading={loading}
            handleEmergencySearch={(c) => handleEmergencySearch(c, getEndOfDayLocation(tripState.currentDayIndex)?.location)}
            activeProfile={userState.activeProfile}
          />
        )}
        {uiState.activeMode === 'saved' && <SavedRoutesView savedRoutes={savedRoutes} onSelectRoute={(r) => { setRoadTrip(r); setUiState(p => ({ ...p, activeMode: 'planner' })); }} />}
        {uiState.activeMode === 'profile' && <ProfileView activeProfile={userState.activeProfile} handleLogout={handleLogout} handleUpdateProfile={handleUpdateProfile} handleDeleteProfile={handleDeleteProfile} />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-50 px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <div className="max-w-lg mx-auto bg-black/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-2 flex items-center justify-between shadow-2xl">
          {[ { id: 'planner', icon: Compass, label: 'Plan' }, { id: 'emergency', icon: ShieldAlert, label: 'SOS' }, { id: 'chat', icon: Sparkles, label: 'AI' }, { id: 'saved', icon: Bookmark, label: 'Trips' }, { id: 'profile', icon: User, label: 'Me' } ].map((item) => (
            <button key={item.id} onClick={() => item.id === 'chat' ? setUiState(p => ({ ...p, isHudOpen: true })) : setUiState(p => ({ ...p, activeMode: item.id as any }))} className={cn("relative flex flex-col items-center justify-center w-16 h-16 rounded-3xl transition-all min-h-[44px] min-w-[44px]", (uiState.activeMode === item.id || (item.id === 'chat' && uiState.isHudOpen)) ? "bg-white text-indigo-900 shadow-lg" : "text-white/40 hover:text-white hover:bg-white/5")}>
              <item.icon size={24} className={cn("transition-transform", (uiState.activeMode === item.id || (item.id === 'chat' && uiState.isHudOpen)) && "scale-110")} />
              <span className="text-[10px] font-black uppercase tracking-widest mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

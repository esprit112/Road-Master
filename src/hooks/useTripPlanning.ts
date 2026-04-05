import { useState, useEffect, useCallback } from 'react';
import { TripInputs, RoadTripResponse, UserProfile, OvernightPitstop, GroundingChunk, UserAddedPitstop, EditAction } from '../types';
import { generateRoadTrip, calculateDirectDistance, fetchDynamicOvernightStays } from '../services/geminiService';
import toast from 'react-hot-toast';

const loadingMessages = [
  "Consulting the stars and satellites...",
  "Scanning for the cleanest rest stops...",
  "Calculating elevation for maximum battery efficiency...",
  "Finding the perfect scenic detour...",
  "Checking the 48-hour weather forecast...",
  "Curating your storyteller minutes...",
  "Architecting your perfect journey..."
];

const personaLoadingMessages: Record<string, string[]> = {
  "Kinship Krew": [
    "Checking playground availability near the M6...",
    "Finding the best ice cream stops...",
    "Scouting for spacious family rest areas...",
    "Mapping out kid-approved detours..."
  ],
  "Duo Discoverers": [
    "Finding the most romantic sunset spots...",
    "Scouting for intimate dining hideaways...",
    "Mapping out scenic vistas for two...",
    "Searching for charming boutique stays..."
  ],
  "Social Syndicate": [
    "Syncing the group's adventure...",
    "Finding the best local pubs for the crew...",
    "Scouting for high-adventure group detours...",
    "Mapping out the ultimate road rally route..."
  ],
  "The Solo Nomad": [
    "Finding the path less traveled...",
    "Scouting for quiet, reflective corners...",
    "Mapping out the perfect solo playlist route...",
    "Searching for peaceful off-grid stays..."
  ],
  "The Electron Explorer": [
    "Verifying 150kW rapid-charger status...",
    "Optimizing for maximum range efficiency...",
    "Mapping out the greenest scenic bypasses...",
    "Checking charger availability in remote areas..."
  ],
  "The Value Voyager": [
    "Hunting for high-value detours...",
    "Finding the best bang-for-your-buck stops...",
    "Scouting for free local gems...",
    "Mapping out fuel-efficient shortcuts..."
  ]
};

export const useTripPlanning = (activeProfile: UserProfile | null, userLocation: { lat: number; lng: number } | null) => {
  const [inputs, setInputs] = useState<TripInputs>({
    days: 3,
    startPoint: '',
    endPoint: '',
    interests: '',
    serendipity: 'Direct/Efficient',
    routeType: null,
  });
  const [roadTrip, setRoadTrip] = useState<RoadTripResponse | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [contextualMessage, setContextualMessage] = useState('');
  const [dynamicOvernightStays, setDynamicOvernightStays] = useState<OvernightPitstop[]>([]);
  const [isFetchingOvernightStays, setIsFetchingOvernightStays] = useState(false);
  const [calculatedDistance, setCalculatedDistance] = useState<string | null>(null);
  const [grounding, setGrounding] = useState<GroundingChunk[]>([]);
  const [draggedStopIndex, setDraggedStopIndex] = useState<{day: number, index: number} | null>(null);
  const [isNavActive, setIsNavActive] = useState(false);

  // Hydration logic for shared routes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const routeDataParam = params.get('routeData');
    
    if (routeDataParam) {
      try {
        let decodedRoute = decodeURIComponent(atob(routeDataParam));
        let parsedRoute = JSON.parse(decodedRoute);
        
        if (parsedRoute && parsedRoute.itinerary_daily) {
          setRoadTrip(parsedRoute);
          // Clean up the URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        decodedRoute = '';
        parsedRoute = null;
      } catch (error) {
        console.error("Failed to parse shared route data:", error);
        toast.error("Invalid or corrupted shared route link.");
      }
    }
  }, []);

  // Loading message interval
  useEffect(() => {
    if (loading) {
      let i = 0;
      const interval = setInterval(() => {
        setLoadingMessage(loadingMessages[i % loadingMessages.length]);
        i++;
      }, 3000);
      setLoadingMessage(loadingMessages[0]);
      return () => clearInterval(interval);
    }
  }, [loading]);

  // Distance calculation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputs.startPoint && inputs.endPoint) {
        calculateDirectDistance(inputs.startPoint, inputs.endPoint, inputs.days)
          .then(setCalculatedDistance)
          .catch(() => setCalculatedDistance(null));
      } else {
        setCalculatedDistance(null);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [inputs.startPoint, inputs.endPoint, inputs.days]);

  const getEndOfDayLocation = useCallback((dayIndex: number): { location: { lat: number; lng: number } | string, name: string } | null => {
    if (!roadTrip || !roadTrip.itinerary_daily) return null;
    const dayData = roadTrip.itinerary_daily.find(d => d.day === dayIndex);
    if (!dayData || !dayData.stops || dayData.stops.length === 0) return null;
    const lastStop = dayData.stops[dayData.stops.length - 1];
    if (lastStop.coordinates) {
      return { location: lastStop.coordinates, name: lastStop.name };
    }
    return { location: lastStop.location, name: lastStop.name };
  }, [roadTrip]);

  // Fetch dynamic overnight stays
  useEffect(() => {
    const fetchStays = async () => {
      if (!roadTrip) return;
      const endLocationData = getEndOfDayLocation(selectedDay);
      if (!endLocationData) return;
      
      setIsFetchingOvernightStays(true);
      try {
        const stays = await fetchDynamicOvernightStays(
          endLocationData.location, 
          activeProfile?.vehicle.type || 'Car', 
          activeProfile?.persona || 'The Solo Nomad'
        );
        setDynamicOvernightStays(stays);
      } catch (error) {
        console.error("Failed to fetch dynamic overnight stays", error);
      } finally {
        setIsFetchingOvernightStays(false);
      }
    };

    fetchStays();
  }, [selectedDay, roadTrip, activeProfile, getEndOfDayLocation]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    setLoading(true);
    setRoadTrip(null);
    
    if (activeProfile) {
      const messages = personaLoadingMessages[activeProfile.persona] || personaLoadingMessages["The Solo Nomad"];
      setContextualMessage(messages[Math.floor(Math.random() * messages.length)]);
    }

    try {
      const result = await generateRoadTrip(inputs, activeProfile || undefined, userLocation);
      setRoadTrip(result);
      setGrounding(result.groundingChunks);
      setSelectedDay(1);
    } catch (error: any) {
      console.error(error);
      const isQuotaExceeded = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
      const errorMsg = isQuotaExceeded 
        ? "The 'Route Master Architect' is currently at maximum capacity. Please wait a moment and try again." 
        : "An error occurred while planning your trip. Please try again.";
      
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAction = async (action: EditAction) => {
    if (!roadTrip) return;
    
    setLoading(true);
    setLoadingMessage("Applying edits and recalculating route...");

    const updatedInputs = {
      ...inputs,
      edit_actions: [action],
      is_nav_active: isNavActive,
      current_itinerary: roadTrip
    };

    try {
      const result = await generateRoadTrip(updatedInputs, activeProfile || undefined, userLocation);
      setRoadTrip(result);
      setGrounding(result.groundingChunks);
      return result;
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to apply edits. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, day: number, index: number) => {
    setDraggedStopIndex({ day, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number, day: number) => {
    e.preventDefault();
    if (!draggedStopIndex || (draggedStopIndex.day === day && draggedStopIndex.index === dropIndex)) return;

    handleEditAction({
      type: 'REORDER_STOP',
      day: day,
      stopIndex: draggedStopIndex.index,
      newIndex: dropIndex
    });
    setDraggedStopIndex(null);
  };

  const handleAddManualStop = async (manualStopInput: {name: string, postcode: string, day: number, type: 'pitstop' | 'road'}) => {
    if (manualStopInput.type === 'road') {
      handleEditAction({
        type: 'ADD_CUSTOM_STOP',
        day: manualStopInput.day,
        details: {
          name: manualStopInput.name,
          type: 'road',
          description: `Preferred Road: ${manualStopInput.name}`
        }
      });
      return;
    }

    setLoading(true);
    setLoadingMessage("Recalculating itinerary around your fixed stop...");
    
    const newPitstop: UserAddedPitstop = {
      name: manualStopInput.name,
      postcode: manualStopInput.postcode,
      address: manualStopInput.postcode,
      coordinates: { lat: 0, lng: 0 }, 
      day: manualStopInput.day
    };

    const updatedInputs = {
      ...inputs,
      user_added_pitstops: [...(inputs.user_added_pitstops || []), newPitstop]
    };
    
    setInputs(updatedInputs);

    try {
      const result = await generateRoadTrip(updatedInputs, activeProfile || undefined, userLocation);
      setRoadTrip(result);
      setGrounding(result.groundingChunks);
      setSelectedDay(1);
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to recalculate route. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateNavUrl = (waypoints: any[], navigator: string, userLocation: { lat: number; lng: number } | null) => {
    if (waypoints.length === 0) return '';
    const destination = waypoints[waypoints.length - 1];
    const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : '';
    const intermediateWaypoints = waypoints.slice(0, -1).map(w => w.location).join('|');

    if (navigator === 'Apple Maps') {
      return `http://maps.apple.com/?daddr=${encodeURIComponent(destination.location)}&saddr=${encodeURIComponent(origin)}&dirflg=d`;
    } else if (navigator === 'Waze') {
      return `https://waze.com/ul?q=${encodeURIComponent(destination.location)}&navigate=yes`;
    } else {
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination.location)}&waypoints=${encodeURIComponent(intermediateWaypoints)}&travelmode=driving`;
    }
  };

  const optimizeWaypoints = (itinerary: any[]) => {
    if (!itinerary || itinerary.length === 0) return [];
    const allStops = itinerary.flatMap(day => day.stops || []);
    return allStops;
  };

  return {
    tripState: {
      inputs,
      roadTrip,
      currentDayIndex: selectedDay,
      isGenerating: loading,
      lastSaved: null // To be implemented if needed
    },
    loadingMessage,
    contextualMessage,
    dynamicOvernightStays,
    isFetchingOvernightStays,
    calculatedDistance,
    grounding,
    draggedStopIndex,
    isNavActive,
    setInputs,
    setRoadTrip,
    setSelectedDay,
    setIsNavActive,
    handleSubmit,
    handleEditAction,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleAddManualStop,
    getEndOfDayLocation,
    generateNavUrl,
    optimizeWaypoints
  };
};

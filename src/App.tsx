import { useState, useEffect, useCallback } from 'react';
import { 
  MapPin, 
  Navigation, 
  Fuel, 
  Zap, 
  Compass, 
  CloudSun, 
  DollarSign, 
  History, 
  Loader2, 
  ArrowRight,
  Map as MapIcon,
  Sparkles,
  Info,
  ShieldAlert,
  Wrench,
  Truck,
  Hospital,
  Stethoscope,
  Pill,
  Shield,
  Hotel,
  Tent,
  Dog,
  Scale,
  Activity,
  Phone,
  Check,
  X,
  ExternalLink,
  PhoneCall,
  User,
  LogOut,
  Settings,
  Pencil,
  Save,
  Trash2,
  Smartphone,
  Monitor,
  Globe,
  ChevronRight,
  ChevronLeft,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle,
  Plus,
  RefreshCw,
  Anchor,
  GripVertical,
  Bookmark,
  Calendar,
  Play,
  Share2
} from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { generateRoadTrip, calculateDirectDistance, fetchDynamicOvernightStays } from './services/geminiService';
import { searchEmergencyServices, detectRegion, getRoadLawSummary } from './services/emergencyService';
import { TripInputs, VehicleType, VehicleProfile, SerendipityLevel, GroundingChunk, Persona, RoadTripResponse, OvernightPitstop, EmergencyCategory, EmergencyResult, Region, RoadLawSummary, UserProfile, UserAddedPitstop, SavedRoute, SocialShare } from './types';
import { cn } from './lib/utils';
import { EMERGENCY_DB } from './constants/emergency_db';
import { PolyglotChat } from './components/PolyglotChat';
import { db } from './db';
import { useLiveQuery } from 'dexie-react-hooks';
import toast, { Toaster } from 'react-hot-toast';
import { WelcomeScreen } from './components/WelcomeScreen';
import { CreateProfileScreen } from './components/CreateProfileScreen';
import { MobileParametersDrawer } from './components/MobileParametersDrawer';
import { SmartImage } from './components/SmartImage';

const vehicleTypes = [
  { id: 'car', label: 'Car', sub: 'Petrol, Diesel, or EV', icon: '🚗' },
  { id: 'car_tow', label: 'Car + Gear', sub: 'Caravan, Trailer, or Tent', icon: '⛺' },
  { id: 'van', label: 'Vanlife', sub: 'SWB, LWB, or Tiny Home', icon: '🚐' },
  { id: 'motorhome', label: 'Motorhome', sub: 'Coachbuilt or Bus', icon: '🚌' },
  { id: 'moto_cycle', label: 'Biker/Cyclist', sub: 'Motorcycle or Bicycle', icon: '🏍️' },
  { id: 'offroad', label: '4x4 Overlander', sub: 'Off-road prepared', icon: '⛰️' },
] as const;

const EmergencyHeader = ({ region, countryCode }: { region: Region, countryCode: string }) => {
  // Logic to determine numbers based on detected region
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

const welcomeMessages: Record<Persona, (name: string) => { title: string; subtitle: string; cta: string }> = {
  "Kinship Krew": (name) => ({
    title: `READY FOR A FAMILY ADVENTURE, ${name.toUpperCase()}?`,
    subtitle: "We've mapped out the best kid-friendly stops and spacious stays for the whole krew.",
    cta: "Start the Family Log"
  }),
  "Duo Discoverers": (name) => ({
    title: `WHERE TO NEXT, ${name.toUpperCase()}?`,
    subtitle: "Discover intimate hideaways and scenic sunset spots tailored for two.",
    cta: "Find Our Escape"
  }),
  "Social Syndicate": (name) => ({
    title: `TIME FOR A ROAD RALLY, ${name.toUpperCase()}?`,
    subtitle: "Gather the group—we’ve found the best local pubs and high-adventure detours.",
    cta: "Gather the Syndicate"
  }),
  "The Solo Nomad": (name) => ({
    title: `THE OPEN ROAD IS CALLING, ${name.toUpperCase()}.`,
    subtitle: "Peace, quiet, and the perfect playlist. Let's architect your solo journey.",
    cta: "Explore Solo"
  }),
  "The Electron Explorer": (name) => ({
    title: `FULLY CHARGED, ${name.toUpperCase()}?`,
    subtitle: "Your route is optimized for the fastest chargers and the most efficient scenic bypasses.",
    cta: "Plug Into Adventure"
  }),
  "The Value Voyager": (name) => ({
    title: `FOUND A BARGAIN YET, ${name.toUpperCase()}?`,
    subtitle: "Maximizing the miles without breaking the bank. Your high-value itinerary is ready.",
    cta: "View My Savings"
  })
};

const personaLoadingMessages: Record<Persona, string[]> = {
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

export default function App() {
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);

  const [mode, setMode] = useState<'planner' | 'emergency' | 'saved' | 'profile'>('planner');
  const [inputs, setInputs] = useState<TripInputs>({
    days: 3,
    startPoint: '',
    endPoint: '',
    interests: '',
    serendipity: 'Direct/Efficient',
  });

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
          setMode('planner');
          // Clean up the URL so it doesn't stay huge
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // Memory Management: Clear large temporary strings/objects
        decodedRoute = '';
        parsedRoute = null;
      } catch (error) {
        console.error("Failed to parse shared route data:", error);
        toast.error("Invalid or corrupted shared route link.");
      }
    }
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const locationName = data.display_name || `${latitude}, ${longitude}`;
          const city = data.address?.city || data.address?.town || data.address?.village || locationName.split(',')[0];
          setInputs(prev => ({ ...prev, startPoint: locationName }));
          setUiState(prev => ({
            ...prev,
            header_context: {
              location_name: city,
              image_hint: `${city} cityscape`
            }
          }));
        } catch (error) {
          console.error("Error reverse geocoding:", error);
          setInputs(prev => ({ ...prev, startPoint: `${latitude}, ${longitude}` }));
        }
      }, (error) => {
        console.error("Geolocation error:", error);
      });
    }
  }, []);

  useEffect(() => {
    const loadProfiles = async () => {
      const profiles = await db.profiles.toArray();
      
      // Migration logic for old profiles
      const migratedProfiles = profiles.map(p => {
        const migrated = { ...p };
        if (!migrated.vehicle) {
          migrated.vehicle = {
            type: (p as any).vehicleType || 'car',
            power: (p as any).vehicleProfile || 'Petrol',
            isOversized: false,
          };
        }
        if (!migrated.preferences) {
          migrated.preferences = {
            rangeThreshold: 20,
            roadTolerance: 'Adventure',
            gradientLimit: 15,
            vibe: 'Social',
            hasPet: (p as any).petStatus || false,
            dietary: '',
          };
        }
        if (!migrated.group_size) {
          migrated.group_size = {
            adults: 2,
            children: 0
          };
        }
        return migrated;
      });

      setAllProfiles(migratedProfiles);
      
      const savedProfileId = localStorage.getItem('rm_active_profile_id');
      if (savedProfileId) {
        const profile = migratedProfiles.find(p => p.id === parseInt(savedProfileId));
        if (profile) setActiveProfile(profile);
      }
      
      setIsAuthReady(true);
    };
    loadProfiles();
  }, []);

  useEffect(() => {
    if (activeProfile) {
      localStorage.setItem('rm_active_profile_id', activeProfile.id?.toString() || '');
    } else {
      localStorage.removeItem('rm_active_profile_id');
    }
  }, [activeProfile]);

  const handleLogout = () => {
    setActiveProfile(null);
  };

  const handleProfileSelect = (profile: UserProfile) => {
    setActiveProfile(profile);
  };

  const handleProfileCreated = (profile: UserProfile) => {
    setAllProfiles(prev => [...prev, profile]);
    setActiveProfile(profile);
    setShowCreateProfile(false);
  };

  const getWelcomeContent = () => {
    if (!activeProfile) return { title: "Welcome, Pilot", subtitle: "Initialize your digital road identity to begin.", cta: "Architect My Trip" };
    const name = activeProfile.name;
    const persona = activeProfile.persona;
    
    if (welcomeMessages[persona]) {
      return welcomeMessages[persona](name);
    }
    
    return { 
      title: `WELCOME BACK, ${name.toUpperCase()}`, 
      subtitle: "Your next adventure is just a few parameters away.", 
      cta: "Architect My Trip" 
    };
  };

  const welcomeContent = getWelcomeContent();

  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [contextualMessage, setContextualMessage] = useState('');
  const [roadTrip, setRoadTrip] = useState<RoadTripResponse | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [dynamicOvernightStays, setDynamicOvernightStays] = useState<OvernightPitstop[]>([]);
  const [isFetchingOvernightStays, setIsFetchingOvernightStays] = useState(false);
  const [selectedLodging, setSelectedLodging] = useState<OvernightPitstop | null>(null);

  const getEndOfDayLocation = (dayIndex: number): { location: { lat: number; lng: number } | string, name: string } | null => {
    if (!roadTrip || !roadTrip.itinerary_daily) return null;
    const dayData = roadTrip.itinerary_daily.find(d => d.day === dayIndex);
    if (!dayData || !dayData.stops || dayData.stops.length === 0) return null;
    const lastStop = dayData.stops[dayData.stops.length - 1];
    if (lastStop.coordinates) {
      return { location: lastStop.coordinates, name: lastStop.name };
    }
    return { location: lastStop.location, name: lastStop.name };
  };
  const [calculatedDistance, setCalculatedDistance] = useState<string | null>(null);
  const [emergencyResults, setEmergencyResults] = useState<EmergencyResult[]>([]);
  const [selectedEmergencyCategory, setSelectedEmergencyCategory] = useState<EmergencyCategory | null>(null);
  const [region, setRegion] = useState<Region>('Other');
  const [countryCode, setCountryCode] = useState<string>('Other');
  const [countryName, setCountryName] = useState<string>('Unknown');
  const [roadLaws, setRoadLaws] = useState<RoadLawSummary | null>(null);
  const [grounding, setGrounding] = useState<GroundingChunk[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editableProfile, setEditableProfile] = useState<UserProfile | null>(null);
  const [uiState, setUiState] = useState<RoadTripResponse['ui_state']>({
    header_context: { location_name: 'Kingston upon Hull', image_hint: 'Kingston upon Hull cityscape' },
    nav_visibility: 'persistent',
    active_persona_badge: 'The Solo Nomad'
  });
  const [showManualStopModal, setShowManualStopModal] = useState(false);
  const [manualStopInput, setManualStopInput] = useState<{name: string, postcode: string, day: number, type: 'pitstop' | 'road'}>({ name: '', postcode: '', day: 1, type: 'pitstop' });
  const [draggedStopIndex, setDraggedStopIndex] = useState<{day: number, index: number} | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncDelta, setSyncDelta] = useState<string[]>([]);
  const [isNavActive, setIsNavActive] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTripName, setSaveTripName] = useState('');
  const [saveTripDate, setSaveTripDate] = useState('');

  const savedRoutes = useLiveQuery(
    () => activeProfile ? db.routes.where('profileId').equals(activeProfile.id!).reverse().sortBy('created_at') : [],
    [activeProfile]
  );

  const loadingMessages = [
    "Consulting the stars and satellites...",
    "Scanning for the cleanest rest stops...",
    "Calculating elevation for maximum battery efficiency...",
    "Finding the perfect scenic detour...",
    "Checking the 48-hour weather forecast...",
    "Curating your storyteller minutes...",
    "Architecting your perfect journey..."
  ];

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(loc);
        
        // Detect region and country
        detectRegion(loc).then((res) => {
          if (res.countryCode !== countryCode && countryCode !== 'Other') {
            // Border crossing detected!
            alert(`Welcome to ${res.countryName}! Emergency numbers and road laws have been updated.`);
          }
          setRegion(res.region);
          setCountryCode(res.countryCode);
          setCountryName(res.countryName);
          
          // Fetch road laws
          getRoadLawSummary(res.countryCode, res.countryName).then(setRoadLaws).catch(console.error);
        }).catch(console.error);
      });
    }
  }, [countryCode]);

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

  useEffect(() => {
    if (roadTrip && roadTrip.itinerary_daily) {
      const dayData = roadTrip.itinerary_daily.find(d => d.day === selectedDay);
      if (dayData && dayData.stops.length > 0) {
        const activeStop = dayData.stops[0];
        setUiState(prev => ({
          ...prev,
          header_context: {
            location_name: activeStop.name,
            image_hint: activeStop.name
          }
        }));
      }
    }
  }, [selectedDay, roadTrip]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputs.startPoint && inputs.endPoint) {
        calculateDirectDistance(inputs.startPoint, inputs.endPoint, inputs.days)
          .then(setCalculatedDistance)
          .catch(() => setCalculatedDistance(null));
      } else {
        setCalculatedDistance(null);
      }
    }, 1500); // Debounce
    return () => clearTimeout(timer);
  }, [inputs.startPoint, inputs.endPoint, inputs.days]);

  const getPersonaColor = (persona: Persona) => {
    switch (persona) {
      case 'The Electron Explorer': return 'var(--color-explorer)';
      case 'The Value Voyager': return 'var(--color-voyager)';
      case 'The Solo Nomad': return 'var(--color-nomad)';
      default: return 'var(--active)';
    }
  };

  const personaColor = activeProfile ? getPersonaColor(activeProfile.persona) : 'var(--active)';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRoadTrip(null);
    
    // Set initial persona loading message
    if (activeProfile) {
      const messages = personaLoadingMessages[activeProfile.persona] || personaLoadingMessages["The Solo Nomad"];
      setContextualMessage(messages[Math.floor(Math.random() * messages.length)]);
    }

    try {
      const result = await generateRoadTrip(inputs, activeProfile || undefined);
      setRoadTrip(result);
      setUiState(result.ui_state);
      setGrounding(result.groundingChunks);
      setSelectedDay(1);
      setIsDrawerOpen(false); // Close drawer on success
    } catch (error: any) {
      console.error(error);
      const isQuotaExceeded = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
      const errorMsg = isQuotaExceeded 
        ? "The 'Route Master Architect' is currently at maximum capacity. Please wait a moment and try again." 
        : "An error occurred while planning your trip. Please try again.";
      
      // Fallback empty response with error message
      setRoadTrip({
        itinerary_daily: [{ day: 1, stops: [{ name: 'Error', description: errorMsg, photo_uri: 'https://picsum.photos/seed/error/800/600', phone: '', location: '', image_source: 'generic' }] }],
        overnight_pitstop: [],
        safety_briefing: {
          emergency_numbers: { general: '999', medical: '112', police: '911' },
          legal_scout: { country: 'Unknown', side_of_road: 'Unknown', speed_units: 'Unknown', key_laws: [] },
          gradient_alerts: []
        },
        ui_state: {
          header_context: { location_name: inputs.startPoint || 'Unknown', image_hint: 'Scenic road trip' },
          nav_visibility: 'persistent',
          active_persona_badge: activeProfile?.persona || 'The Solo Nomad'
        },
        groundingChunks: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToMaps = () => {
    if (!selectedLodging) return;
    
    const start = inputs.startPoint || "Current Location";
    const end = inputs.endPoint;
    const hotel = selectedLodging.name;
    
    // Construct Google Maps URL with waypoint
    // https://www.google.com/maps/dir/?api=1&origin=START&destination=END&waypoints=WAYPOINT
    const baseUrl = "https://www.google.com/maps/dir/?api=1";
    const url = `${baseUrl}&origin=${encodeURIComponent(start)}&destination=${encodeURIComponent(end)}&waypoints=${encodeURIComponent(hotel)}`;
    
    window.open(url, '_blank');
    setSelectedLodging(null);
  };

  useEffect(() => {
    const fetchStays = async () => {
      if (!roadTrip || mode !== 'planner') return;
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
  }, [selectedDay, roadTrip, mode, activeProfile]);

  const handleEmergencySearch = async (category: EmergencyCategory) => {
    let searchOrigin: { lat: number; lng: number } | string | null = userLocation;
    
    if (category === 'Emergency Stay' && roadTrip) {
      const endLocationData = getEndOfDayLocation(selectedDay);
      if (endLocationData) {
        searchOrigin = endLocationData.location;
      }
    }

    if (!searchOrigin) {
      alert("Please enable location services to use Emergency Support.");
      return;
    }
    setLoading(true);
    setSelectedEmergencyCategory(category);
    setEmergencyResults([]);
    setLoadingMessage(`Searching for ${category} services nearby...`);
    try {
      const response = await searchEmergencyServices(category, searchOrigin, region);
      setEmergencyResults(response.results);
    } catch (error) {
      console.error(error);
      alert("Failed to find emergency services. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

  const handleUpdateRoute = (newInputs: Partial<TripInputs>) => {
    setInputs(prev => ({ ...prev, ...newInputs }));
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!activeProfile) return;
    try {
      const updatedProfile = { ...activeProfile, ...updates };
      await db.profiles.update(activeProfile.id!, updates);
      setActiveProfile(updatedProfile);
      setAllProfiles(prev => prev.map(p => p.id === activeProfile.id ? updatedProfile : p));
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  const handleDeleteProfile = async () => {
    if (!activeProfile) return;
    try {
      // Delete associated routes
      await db.routes.where('profileId').equals(activeProfile.id!).delete();
      // Delete the profile
      await db.profiles.delete(activeProfile.id!);
      
      const updatedProfiles = allProfiles.filter(p => p.id !== activeProfile.id);
      setAllProfiles(updatedProfiles);
      setActiveProfile(null);
      localStorage.removeItem('rm_active_profile_id');
      setShowDeleteConfirm(false);
      setMode('planner');
    } catch (error) {
      console.error("Failed to delete profile:", error);
    }
  };

  const handleAddManualStop = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowManualStopModal(false);
    
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
      setManualStopInput({ name: '', postcode: '', day: 1, type: 'pitstop' });
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
      const result = await generateRoadTrip(updatedInputs, activeProfile || undefined);
      setRoadTrip(result);
      setUiState(result.ui_state);
      setGrounding(result.groundingChunks);
      setSelectedDay(1);
    } catch (error: any) {
      console.error(error);
      alert("Failed to recalculate route. Please try again.");
    } finally {
      setLoading(false);
      setManualStopInput({ name: '', postcode: '', day: 1, type: 'pitstop' });
    }
  };

  const handleEditAction = async (action: any) => {
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
      const result = await generateRoadTrip(updatedInputs, activeProfile || undefined);
      setRoadTrip(result);
      setUiState(result.ui_state);
      setGrounding(result.groundingChunks);
      
      if (result.sync_state?.is_nav_active) {
        setSyncDelta(result.sync_state.pending_changes || []);
        setShowSyncModal(true);
      }
    } catch (error: any) {
      console.error(error);
      alert("Failed to apply edits. Please try again.");
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
      fromDay: draggedStopIndex.day,
      stopIndex: draggedStopIndex.index,
      newIndex: dropIndex
    });
    setDraggedStopIndex(null);
  };

  const handleSaveRoute = async () => {
    if (!activeProfile || !roadTrip) return;
    try {
      const routeId = `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const displayName = saveTripName || `${activeProfile.name}'s ${roadTrip.ui_state.header_context.location_name} Adventure`;
      
      // Temporary object to hold the large data structure before writing to DB
      let tempRouteData: any = { ...roadTrip };
      
      await db.routes.add({
        profileId: activeProfile.id!,
        route_id: routeId,
        display_name: displayName,
        trip_date: saveTripDate || 'TBD',
        summary: tempRouteData.ui_state.header_context.title || `${tempRouteData.itinerary_daily.length} days exploring ${tempRouteData.ui_state.header_context.location_name}`,
        thumbnail_hint: tempRouteData.ui_state.header_context.image_hint,
        itinerary_data: tempRouteData,
        created_at: new Date().toISOString()
      });
      
      // Memory Management: Clear large temporary object after writing to DB
      tempRouteData = null;
      
      toast.success(`Route '${displayName}' has been safely stored in your Saved Trips!`);
      setShowSaveModal(false);
      setSaveTripName('');
      setSaveTripDate('');
    } catch (error) {
      console.error("Failed to save route:", error);
      toast.error("Failed to save route. Please try again.");
    }
  };

  const loadSavedRoute = (savedRoute: SavedRoute) => {
    setRoadTrip(savedRoute.itinerary_data);
    setMode('planner');
    toast.success(`Resumed journey: ${savedRoute.display_name}`);
    // TODO: Trigger RE_VERIFY check here if needed
  };

  const handleDeleteRoute = async (id: number, displayName: string) => {
    console.log("Delete button clicked for:", displayName, id);
    try {
      await db.routes.delete(id);
      toast.success(`Route '${displayName}' deleted.`);
    } catch (error) {
      console.error("Failed to delete route:", error);
      toast.error("Failed to delete route.");
    }
  };

  const handleShare = async (shareData: SocialShare) => {
    console.log("Sharing data:", shareData);
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.og_metadata.title,
          text: shareData.share_text_short,
          url: shareData.nav_url
        });
        console.log('Successfully shared');
      } catch (error) {
        console.error('Error sharing:', error);
        // Fallback if share is cancelled or fails
        navigator.clipboard.writeText(shareData.share_text_long);
        toast.success("Share text copied to clipboard!");
      }
    } else {
      navigator.clipboard.writeText(shareData.share_text_long);
      toast.success("Share text copied to clipboard!");
    }
  };

  // Helper to optimize waypoints
  const optimizeWaypoints = (itinerary: any[]) => {
    const allStops = itinerary.flatMap(day => day.stops);
    if (allStops.length <= 10) return allStops;
    
    // Prioritize stops with discovery_tag, or longer unique names
    const sortedStops = [...allStops].sort((a, b) => {
      const aScore = (a.discovery_tag ? 10 : 0) + a.name.length;
      const bScore = (b.discovery_tag ? 10 : 0) + b.name.length;
      return bScore - aScore;
    });
    
    // Keep the original order for the selected top 10
    const top10 = sortedStops.slice(0, 10);
    return allStops.filter(stop => top10.includes(stop));
  };

  // Helper to generate navigation URL
  const generateNavUrl = (stops: any[], navApp: string, userLoc: {lat: number, lng: number} | null) => {
    if (stops.length === 0) return '';
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    let start = '';
    let waypointsList = [];
    let end = '';
    
    if (userLoc) {
      start = `${userLoc.lat},${userLoc.lng}`;
      waypointsList = stops.slice(0, -1);
      end = encodeURIComponent(stops[stops.length - 1].name);
    } else {
      start = encodeURIComponent(stops[0].name);
      waypointsList = stops.slice(1, -1);
      end = encodeURIComponent(stops[stops.length - 1].name);
    }
    
    if (navApp === 'Apple Maps' || (navApp === 'Apple Maps' && isIOS)) {
      const waypoints = waypointsList.map((s: any) => encodeURIComponent(s.name)).join(',');
      return `http://maps.apple.com/?saddr=${start}&daddr=${end}${waypoints ? `&nearby=${waypoints}` : ''}`;
    } else if (navApp === 'Waze') {
      const endStop = stops[stops.length - 1];
      const latLng = endStop.coordinates ? `${endStop.coordinates.lat},${endStop.coordinates.lng}` : '';
      return `https://waze.com/ul?q=${end}${latLng ? `&ll=${latLng}` : ''}&navigate=yes`;
    } else {
      const waypoints = waypointsList.map((s: any) => encodeURIComponent(s.name)).join('%7C');
      return `https://www.google.com/maps/dir/?api=1&origin=${start}&destination=${end}${waypoints ? `&waypoints=${waypoints}` : ''}`;
    }
  };

  const handleShareRoute = () => {
    console.log("Share button clicked");
    if (!roadTrip) {
      console.log("No road trip data");
      return;
    }
    
    const optimizedStops = optimizeWaypoints(roadTrip.itinerary_daily);
    const totalDays = roadTrip.itinerary_daily.length;
    const firstFewStops = optimizedStops.slice(0, 2).map((s: any) => s.name).join(', ');
    
    const navApp = activeProfile?.settings?.preferred_navigator || 'Google Maps';
    const navDeepLink = generateNavUrl(optimizedStops, navApp, userLocation);
    
    const shareTextShort = `Found some hidden gems! Open my ${totalDays}-day route in ${navApp} here:`;
    const shareTextLong = `${shareTextShort} ${navDeepLink}`;
    
    const shareData: SocialShare = {
      share_text_short: shareTextShort,
      share_text_long: shareTextLong,
      og_metadata: {
        title: `Join my ${totalDays}-day ${roadTrip.ui_state.header_context.title} Adventure`,
        description: `Stops include: ${firstFewStops}, and more...`,
        image_hint: roadTrip.ui_state.header_context.image_hint
      },
      nav_url: navDeepLink
    };
    
    if (navigator.share) {
      navigator.share({
        title: shareData.og_metadata.title,
        text: shareData.share_text_short,
        url: shareData.nav_url
      }).then(() => {
        console.log('Successfully shared');
      }).catch((error) => {
        console.error('Error sharing:', error);
        navigator.clipboard.writeText(shareData.share_text_long);
        toast.success(`Route copied to clipboard!`);
      });
    } else {
      navigator.clipboard.writeText(shareData.share_text_long);
      toast.success(`Route copied to clipboard!`);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text-main)] font-sans selection:bg-[var(--active)] selection:text-white">
      <Toaster position="top-center" />
      {!isAuthReady ? (
        <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900 z-[100]">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--active)]" />
        </div>
      ) : showCreateProfile || (allProfiles.length === 0 && !activeProfile) ? (
        <CreateProfileScreen onCreated={handleProfileCreated} />
      ) : !activeProfile ? (
        <WelcomeScreen 
          profiles={allProfiles} 
          onSelect={handleProfileSelect} 
          onCreateNew={() => setShowCreateProfile(true)} 
        />
      ) : (
        <>
          <PolyglotChat 
            inputs={inputs} 
            onUpdateRoute={handleUpdateRoute} 
            onUpdateProfile={handleUpdateProfile}
            activeProfile={activeProfile}
            userLocation={userLocation} 
            countryName={countryName} 
          />
          {/* Hero Section / Map Background */}
          <header className="fixed inset-0 z-0 overflow-hidden bg-[#0A0A0A]">
            <AnimatePresence mode="wait">
              <motion.div 
                key={uiState.header_context.location_name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                <SmartImage 
                  searchQuery={uiState.header_context.image_hint}
                  fallbackSeed={uiState.header_context.image_hint}
                  alt={uiState.header_context.location_name} 
                  className="w-full h-full object-cover scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/60" />
                <div className="absolute inset-x-0 top-0 pt-24 pb-12 px-6 bg-gradient-to-b from-black/60 to-transparent">
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col gap-1 relative"
                  >
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-[0.3em]">
                      {uiState.active_persona_badge}
                    </span>
                    <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-lg leading-tight max-w-[80%]">
                      {uiState.header_context.title || welcomeContent.title}
                    </h2>
                    <p className="text-xs font-medium text-white/70 drop-shadow-md max-w-[70%] leading-relaxed">
                      {welcomeContent.subtitle}
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </header>

          <main className="relative z-10 min-h-screen flex flex-col pt-48 pb-32 overflow-y-auto">
            <div className="px-2 md:px-4 w-[98%] md:w-full max-w-4xl mx-auto flex-1">
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                  <h1 className="text-4xl font-black tracking-tighter text-white drop-shadow-lg">
                    {mode === 'planner' ? 'ROUTE MASTER' : mode.toUpperCase()}
                  </h1>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-white/90">{activeProfile.name}</span>
                    </div>
                    <button 
                      onClick={() => {
                        setMode('profile');
                        setIsEditingProfile(true);
                        setEditableProfile(activeProfile);
                      }}
                      className="p-2 rounded-xl bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/10"
                      title="Edit Profile"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-3 rounded-2xl bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/10"
                    title="Switch Profile"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {/* Results Section */}
                <section className="w-full">
                  <AnimatePresence mode="wait">
                    {mode === 'planner' ? (
                      <motion.div 
                        key="planner-results"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="space-y-6"
                      >
                        {roadTrip ? (
                          <div className="space-y-8">
                            {/* Safety Briefing Banner */}
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-amber-50 border border-amber-100 rounded-3xl p-6 shadow-sm"
                            >
                              <div className="flex items-center gap-3 mb-4">
                                <ShieldAlert className="w-6 h-6 text-amber-600" />
                                <h3 className="text-lg font-black text-amber-900 uppercase tracking-tight">Safety Briefing</h3>
                              </div>
                              <div className="flex flex-col gap-6">
                                <div className="space-y-3">
                                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Local Road Laws ({roadTrip.safety_briefing.legal_scout.country})</p>
                                  <ul className="space-y-1">
                                    <li className="text-xs font-bold text-amber-800 flex items-center gap-2">
                                      <div className="w-1 h-1 rounded-full bg-amber-400" />
                                      Drive on the {roadTrip.safety_briefing.legal_scout.side_of_road}
                                    </li>
                                    <li className="text-xs font-bold text-amber-800 flex items-center gap-2">
                                      <div className="w-1 h-1 rounded-full bg-amber-400" />
                                      Speed measured in {roadTrip.safety_briefing.legal_scout.speed_units}
                                    </li>
                                    {roadTrip.safety_briefing.legal_scout.key_laws.map((law, i) => (
                                      <li key={i} className="text-xs font-bold text-amber-800 flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-amber-400" />
                                        {law}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                {roadTrip.safety_briefing.gradient_alerts.length > 0 && (
                                  <div className="space-y-3">
                                    <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">Gradient Alerts</p>
                                    <div className="space-y-2">
                                      {roadTrip.safety_briefing.gradient_alerts.map((alert, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2 bg-red-100/50 rounded-lg border border-red-200">
                                          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                          <p className="text-xs font-bold text-red-900">{alert}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>

                            <div className="rm-card p-8 md:p-12 bg-[#F8FAFC]/80 backdrop-blur-2xl border-none shadow-2xl">
                              {uiState.recalculation_summary && (
                                <motion.div 
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 shadow-sm mb-4 flex items-start gap-3"
                                >
                                  <RefreshCw className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                                  <p className="text-sm font-bold text-indigo-900 leading-snug">
                                    {uiState.recalculation_summary}
                                  </p>
                                </motion.div>
                              )}
                              
                              {roadTrip.manual_overrides && roadTrip.manual_overrides.length > 0 && (
                                <motion.div 
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm mb-4"
                                >
                                  <h4 className="font-black text-amber-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Anchor className="w-4 h-4" />
                                    Manual Overrides Active
                                  </h4>
                                  <div className="space-y-2">
                                    {roadTrip.manual_overrides.map((override, idx) => (
                                      <div key={idx} className="flex items-center justify-between bg-white/60 p-3 rounded-xl border border-amber-100/50">
                                        <div className="flex items-center gap-3">
                                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                                          <span className="font-bold text-amber-900 text-sm">{override.name}</span>
                                          <span className="text-[10px] uppercase font-black tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{override.type}</span>
                                        </div>
                                        <span className="text-xs font-medium text-amber-800/70">{override.impact}</span>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}

                              {uiState.verification_summary && (
                                <motion.div 
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm mb-8 flex items-start gap-3"
                                >
                                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                  <p className="text-sm font-bold text-emerald-900 leading-snug">
                                    {uiState.verification_summary}
                                  </p>
                                </motion.div>
                              )}
                              <div className="flex flex-col items-center gap-6 mb-8 text-center">
                                <div className="p-4 rounded-3xl bg-indigo-50 shadow-inner">
                                  <Sparkles className="w-8 h-8 text-[#1A237E]" />
                                </div>
                                <div>
                                  <h2 className="text-3xl font-black text-[#1A237E] tracking-tight">Architect's Itinerary</h2>
                                  <p className="text-xs font-bold text-[#1A237E]/40 uppercase tracking-widest">Generated for {activeProfile.name}</p>
                                  
                                  {(roadTrip.itinerary_daily.find(d => d.day === selectedDay)?.stops?.length ?? 0) > 0 && (
                                    <div className="mt-4 space-y-3 flex flex-col items-center">
                                      {roadTrip.itinerary_daily.find(d => d.day === selectedDay)?.safety_warning && (
                                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold">
                                          <ShieldAlert className="w-4 h-4 shrink-0" />
                                          {roadTrip.itinerary_daily.find(d => d.day === selectedDay)?.safety_warning}
                                        </div>
                                      )}
                                      <div className="flex flex-col w-full gap-2">
                                        <a 
                                          href={generateNavUrl(optimizeWaypoints([{stops: roadTrip.itinerary_daily.find(d => d.day === selectedDay)?.stops || []}]), activeProfile.settings?.preferred_navigator || 'Google Maps', userLocation)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={() => setIsNavActive(true)}
                                          className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#1A237E] text-white font-black text-sm hover:bg-[#1A237E]/90 transition-all active:scale-95 shadow-lg shadow-indigo-200 w-full"
                                        >
                                          {activeProfile.settings?.preferred_navigator === 'Apple Maps' ? <Navigation className="w-4 h-4" /> : 
                                           activeProfile.settings?.preferred_navigator === 'Waze' ? <Activity className="w-4 h-4" /> :
                                           <img src="https://www.google.com/images/branding/product/ico/maps15_24dp.ico" alt="" className="w-4 h-4" />}
                                          Launch Day {selectedDay} Route
                                        </a>
                                        {roadTrip.itinerary_daily.find(d => d.day === selectedDay)?.is_split && roadTrip.itinerary_daily.find(d => d.day === selectedDay)?.secondary_nav_link && (
                                          <a 
                                            href={roadTrip.itinerary_daily.find(d => d.day === selectedDay)?.secondary_nav_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setIsNavActive(true)}
                                            className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-slate-100 text-[#1A237E] font-black text-sm hover:bg-slate-200 transition-all active:scale-95 border border-slate-200 w-full"
                                          >
                                            Launch Part 2
                                          </a>
                                        )}
                                      </div>
                                      {roadTrip.itinerary_daily.find(d => d.day === selectedDay)?.fallback_note && (
                                        <p className="text-[10px] font-bold text-slate-400 italic">
                                          {roadTrip.itinerary_daily.find(d => d.day === selectedDay)?.fallback_note}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col w-full gap-4">
                                  <div className="flex items-center justify-center gap-2 bg-white/50 p-1.5 rounded-2xl border border-white/20 overflow-x-auto max-w-full no-scrollbar w-full">
                                    {roadTrip.itinerary_daily.map((day) => (
                                      <button 
                                        key={day.day}
                                        onClick={() => setSelectedDay(day.day)}
                                        className={cn(
                                          "px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-1",
                                          selectedDay === day.day 
                                            ? "bg-[#1A237E] text-white shadow-lg" 
                                            : "text-[#1A237E]/60 hover:bg-white/50"
                                        )}
                                      >
                                        Day {day.day}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="flex items-center justify-center gap-2 w-full">
                                    <button
                                      onClick={() => {
                                        setSaveTripName(`${activeProfile.name}'s ${roadTrip.ui_state.header_context.location_name} Adventure`);
                                        setShowSaveModal(true);
                                      }}
                                      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1A237E]/10 text-[#1A237E] rounded-xl font-bold text-sm hover:bg-[#1A237E]/20 transition-all flex-1"
                                    >
                                      <Bookmark className="w-4 h-4" />
                                      Save
                                    </button>
                                    <button
                                      onClick={handleShareRoute}
                                      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1A237E]/10 text-[#1A237E] rounded-xl font-bold text-sm hover:bg-[#1A237E]/20 transition-all flex-1"
                                    >
                                      <Share2 className="w-4 h-4" />
                                      Share
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-12">
                                {roadTrip.itinerary_daily.find(d => d.day === selectedDay)?.stops.map((stop, idx) => (
                                  <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e as any, selectedDay, idx)}
                                    onDragOver={(e) => handleDragOver(e as any, idx)}
                                    onDrop={(e) => handleDrop(e as any, idx, selectedDay)}
                                    className={cn(
                                      "relative pl-8 border-l-2 border-indigo-100 group transition-all",
                                      draggedStopIndex?.day === selectedDay && draggedStopIndex?.index === idx ? "opacity-50" : "opacity-100"
                                    )}
                                  >
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-sm" />
                                    
                                    {/* Drag Handle */}
                                    <div className="absolute -left-12 top-0 p-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-[#1A237E]">
                                      <GripVertical className="w-5 h-5" />
                                    </div>

                                    <article className="flex flex-col gap-6">
                                      {/* Hero Image */}
                                      <div className="w-full aspect-video rounded-3xl overflow-hidden shadow-lg border border-white/20 relative">
                                        {stop.image_source === 'generic' && (
                                          <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-2xl uppercase tracking-widest shadow-lg z-10">
                                            Generic Image
                                          </div>
                                        )}
                                        <SmartImage 
                                          searchQuery={stop.name}
                                          fallbackSeed={stop.name}
                                          alt={stop.name} 
                                          className="w-full h-full object-cover"
                                        />
                                      </div>

                                      <div className="space-y-4">
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex items-center gap-3">
                                            <h3 className="text-2xl font-black text-[#1A237E] tracking-tight">{stop.name}</h3>
                                            {stop.nav_url && (
                                              <a 
                                                href={stop.nav_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all"
                                                title="Navigate to this stop"
                                              >
                                                <MapPin className="w-4 h-4" />
                                              </a>
                                            )}
                                          </div>
                                          <button
                                            onClick={() => handleEditAction({ type: 'REMOVE_STOP', day: selectedDay, stopIndex: idx })}
                                            className="p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                                            title="Remove this stop"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                        
                                        {/* Metadata */}
                                        <div className="flex flex-wrap gap-2">
                                          {stop.discovery_tag && (
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                                              <Sparkles className="w-3 h-3" />
                                              {stop.discovery_tag}
                                            </div>
                                          )}
                                          
                                          {stop.live_data && (
                                            <>
                                              <div className={cn(
                                                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                                stop.live_data.status === 'Verified' ? "bg-emerald-100 text-emerald-800" :
                                                stop.live_data.status === 'Warning' ? "bg-red-100 text-red-800" :
                                                "bg-slate-100 text-slate-800"
                                              )}>
                                                <CheckCircle className="w-3 h-3" />
                                                {stop.live_data.status}
                                              </div>

                                              {stop.live_data.hours && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-wider">
                                                  <Clock className="w-3 h-3" />
                                                  {stop.live_data.hours}
                                                </div>
                                              )}
                                              
                                              {(stop.live_data.booking === 'Required' || stop.live_data.booking === 'Recommended') && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                                                  <AlertTriangle className="w-3 h-3" />
                                                  Booking {stop.live_data.booking}
                                                </div>
                                              )}

                                              {stop.live_data.booking_priority === 'high' && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-100 text-red-800 text-[10px] font-black uppercase tracking-wider">
                                                  <Flame className="w-3 h-3" />
                                                  High Demand
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>

                                        {/* Description */}
                                        <p className="text-[#1A237E]/70 leading-relaxed font-medium w-full">{stop.description}</p>
                                        
                                        <div className="flex flex-wrap gap-3">
                                          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">
                                            <MapPin className="w-3 h-3" />
                                            {stop.location}
                                          </div>
                                          {stop.phone && (
                                            <a href={`tel:${stop.phone}`} className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors">
                                              <Phone className="w-3 h-3" />
                                              {stop.phone}
                                            </a>
                                          )}
                                          {(stop.live_data?.official_link || (stop.image_source === 'website' && stop.website_url)) && (
                                            <a 
                                              href={stop.live_data?.official_link || stop.website_url} 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors max-w-[200px]"
                                            >
                                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                              <span className="truncate">{stop.live_data?.official_link ? 'Official Info' : stop.website_url}</span>
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </article>
                                  </motion.div>
                                ))}
                              </div>

                              {(dynamicOvernightStays.length > 0 || isFetchingOvernightStays) && (
                                <div className="mt-16 pt-12 border-t border-[#1A237E]/10">
                                  <div className="flex flex-col mb-8">
                                    <div className="flex items-center justify-between mb-2">
                                      <h3 className="text-2xl font-black text-[#1A237E] tracking-tight">
                                        🏁 Recommended Pitstops
                                      </h3>
                                      <div className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center gap-2 border border-indigo-100">
                                        <Hotel className="w-4 h-4" />
                                        Tailored for {activeProfile.vehicle.type}
                                      </div>
                                    </div>
                                    {getEndOfDayLocation(selectedDay) && (
                                      <p className="text-sm font-medium text-indigo-600/70">
                                        Showing stays near {getEndOfDayLocation(selectedDay)?.name}
                                      </p>
                                    )}
                                  </div>

                                  {isFetchingOvernightStays ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                                      <p className="text-sm font-bold text-indigo-900">Finding the best overnight stays...</p>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {/* Add Your Own Stop Card */}
                                      <motion.div 
                                        className="group relative overflow-hidden rounded-[2.5rem] bg-indigo-50 border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-100 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[300px] p-6 text-center"
                                        onClick={() => setShowManualStopModal(true)}
                                      >
                                        <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                                          <Plus className="w-8 h-8" />
                                        </div>
                                        <h4 className="text-xl font-black text-indigo-900 mb-2">Add Your Own Stop</h4>
                                        <p className="text-sm text-indigo-700/70 font-medium">Have a pre-booked hotel or specific location? Add it here and we'll recalculate the route around it.</p>
                                      </motion.div>

                                      {dynamicOvernightStays.map((option, idx) => (
                                      <motion.div 
                                        key={idx}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="group relative overflow-hidden rounded-[2.5rem] bg-white border border-[#1A237E]/5 hover:border-[#1A237E]/20 transition-all hover:shadow-2xl hover:-translate-y-1"
                                      >
                                        <div className="aspect-[16/9] overflow-hidden relative">
                                          {option.image_source === 'generic' && (
                                            <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-2xl uppercase tracking-widest shadow-lg z-20">
                                              Generic Image
                                            </div>
                                          )}
                                          <SmartImage 
                                            searchQuery={option.name}
                                            fallbackSeed={option.name}
                                            alt={option.name} 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                          />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#1A237E] shadow-sm z-10">
                                            {option.price_category}
                                          </div>
                                        </div>
                                        <div className="p-6">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">{option.type}</span>
                                            {option.image_source === 'website' && (
                                              <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">Official Site Image</span>
                                            )}
                                          </div>
                                          <h4 className="text-xl font-black text-[#1A237E] mb-2 tracking-tight">{option.name}</h4>
                                          {option.image_source === 'website' && option.website && (
                                            <div className="mb-3 flex items-center gap-2 text-[10px] text-emerald-600 font-bold bg-emerald-50/50 px-2 py-1 rounded-lg border border-emerald-100/50">
                                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                              <span className="truncate">{option.website}</span>
                                            </div>
                                          )}
                                          <p className="text-sm text-[#1A237E]/60 italic mb-4 flex-1">"{option.persona_fit}"</p>
                                          
                                          <div className="flex gap-2">
                                            <button 
                                              onClick={() => setSelectedLodging(option)}
                                              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#1A237E] text-white font-bold text-sm hover:bg-[#1A237E]/90 transition-all active:scale-95 shadow-lg shadow-indigo-200"
                                            >
                                              <MapPin className="w-4 h-4" />
                                              Add to Route
                                            </button>
                                            <a 
                                              href={option.website} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="p-3.5 rounded-2xl bg-slate-100 text-[#1A237E] hover:bg-slate-200 transition-all active:scale-95"
                                            >
                                              <ExternalLink className="w-5 h-5" />
                                            </a>
                                          </div>
                                        </div>
                                      </motion.div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border border-white/20">
                              <Compass className="w-12 h-12 text-white/40 animate-pulse" />
                            </div>
                            <h2 className="text-3xl font-black text-white mb-2 tracking-tight drop-shadow-lg">Ready to Architect?</h2>
                            <p className="text-white/60 max-w-md font-medium drop-shadow-md">
                              Open the trip parameters below to architect your hyper-personalized road trip.
                            </p>
                          </div>
                        )}
                      </motion.div>
                    ) : mode === 'emergency' ? (
                      <motion.div 
                        key="emergency-results"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="space-y-6 relative z-20"
                      >
                        <div className="fixed inset-0 z-[-1] bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950/90 backdrop-blur-xl" />
                        
                        <div className="p-8 bg-white/10 backdrop-blur-[16px] border border-white/10 shadow-2xl rounded-3xl">
                          <EmergencyHeader region={region} countryCode={countryCode} />
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                            {emergencyCategories.map((cat) => (
                              <button
                                key={cat.name}
                                onClick={() => handleEmergencySearch(cat.name)}
                                disabled={loading}
                                className={cn(
                                  "flex flex-col items-center gap-3 p-4 rounded-2xl transition-all text-center border active:scale-95",
                                  selectedEmergencyCategory === cat.name 
                                    ? "bg-white text-[#1F2937] border-white shadow-lg shadow-white/20" 
                                    : "bg-white/80 border-white/20 text-[#1F2937] hover:bg-white/90"
                                )}
                              >
                                <div className={cn("p-3 rounded-2xl", selectedEmergencyCategory === cat.name ? "bg-slate-100" : "bg-transparent")}>
                                  <cat.icon className={cn("w-6 h-6", selectedEmergencyCategory === cat.name ? "text-[#1F2937]" : "text-[#1F2937]")} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-tighter">{cat.name}</span>
                              </button>
                            ))}
                          </div>

                          {loading && loadingMessage && (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                              <Loader2 className="w-10 h-10 animate-spin text-white" />
                              <p className="text-sm font-bold text-white">{loadingMessage}</p>
                            </div>
                          )}

                          {emergencyResults.length > 0 && (
                            <div className="space-y-4">
                              <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                                <Shield className="w-5 h-5 text-red-400" />
                                Nearby {selectedEmergencyCategory} Services
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {emergencyResults.map((result, idx) => (
                                  <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-white/20 hover:bg-white/90 transition-all group"
                                  >
                                    <div className="flex justify-between items-start mb-3">
                                      <h4 className="font-black text-[#1F2937] group-hover:text-red-600 transition-colors">{result.name}</h4>
                                      <span className="text-[10px] font-black bg-white/50 px-2 py-1 rounded-full border border-white/30 text-[#1F2937]">{result.distance_from_user}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-4">
                                      <div className={cn("w-2 h-2 rounded-full", result.open_now_status.toLowerCase().includes('open') ? 'bg-emerald-500' : 'bg-red-500')} />
                                      <span className="text-xs font-bold text-[#1F2937]/80">{result.open_now_status}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <a 
                                        href={`tel:${result.phone_number}`}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-slate-200 text-[#1F2937] font-bold text-xs hover:bg-slate-50 transition-all"
                                      >
                                        <PhoneCall className="w-3 h-3" />
                                        Call
                                      </a>
                                      <a 
                                        href={result.Maps_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-all shadow-md shadow-red-100"
                                      >
                                        <MapPin className="w-3 h-3" />
                                        Directions
                                      </a>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ) : mode === 'saved' ? (
                      <motion.div 
                        key="saved-routes"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center gap-4 mb-8">
                          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                            <History className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <h2 className="text-3xl font-black text-white tracking-tight">Saved Journeys</h2>
                            <p className="text-white/60 font-medium">Your historical road trip architectures.</p>
                          </div>
                        </div>

                        {savedRoutes && savedRoutes.length > 0 ? (
                          <div className="grid gap-6">
                            {savedRoutes.map((route) => (
                              <motion.div 
                                key={route.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-[32px] overflow-hidden shadow-2xl border border-black/5 flex flex-col md:flex-row"
                              >
                                <div className="md:w-1/3 h-48 md:h-auto relative">
                                  <SmartImage 
                                    searchQuery={route.thumbnail_hint}
                                    fallbackSeed={route.thumbnail_hint}
                                    alt={route.thumbnail_hint}
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                  <div className="absolute bottom-4 left-4 right-4">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/20">
                                      <Calendar className="w-3 h-3" />
                                      {route.trip_date}
                                    </div>
                                  </div>
                                </div>
                                <div className="p-6 md:w-2/3 flex flex-col justify-between">
                                  <div>
                                    <h3 className="text-xl font-black text-[#1A237E] mb-2">{route.display_name}</h3>
                                    <p className="text-slate-600 text-sm font-medium mb-6">{route.summary}</p>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                      Saved {new Date(route.created_at).toLocaleDateString()}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => handleDeleteRoute(route.id!, route.display_name)}
                                        className="p-3 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all active:scale-95"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => loadSavedRoute(route)}
                                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#1A237E] text-white font-black text-sm hover:bg-[#1A237E]/90 transition-all active:scale-95 shadow-lg shadow-indigo-200"
                                      >
                                        <Play className="w-4 h-4" />
                                        Resume Journey
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 backdrop-blur-xl rounded-[32px] border border-white/10">
                            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
                              <Bookmark className="w-10 h-10 text-white/40" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2">No Saved Trips Yet</h3>
                            <p className="text-white/60 max-w-sm font-medium">
                              When you architect a route you love, save it to your library to access it anytime.
                            </p>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="profile-settings"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="space-y-6"
                      >
                        <div className="rm-card p-8 bg-[#F8FAFC]/80 backdrop-blur-2xl border-none shadow-2xl">
                          <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-100">
                            <div className="flex items-center gap-6">
                              <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center text-4xl shadow-inner">
                                {activeProfile.persona === 'The Electron Explorer' ? '⚡' : 
                                 activeProfile.persona === 'The Value Voyager' ? '💰' : '🏜️'}
                              </div>
                              <div>
                                <h2 className="text-3xl font-black text-[#1A237E] tracking-tight">{activeProfile.name}</h2>
                                <p className="text-indigo-600 font-bold uppercase tracking-widest text-xs">{activeProfile.persona}</p>
                              </div>
                            </div>
                            {isEditingProfile ? (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    if (editableProfile) handleUpdateProfile(editableProfile);
                                    setIsEditingProfile(false);
                                  }}
                                  className="p-3 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
                                  title="Save Changes"
                                >
                                  <Save className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => setIsEditingProfile(false)}
                                  className="p-3 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                                  title="Cancel"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    setIsEditingProfile(true);
                                    setEditableProfile(activeProfile);
                                  }}
                                  className="p-3 rounded-2xl bg-indigo-50 text-[#1A237E] hover:bg-indigo-100 transition-all"
                                  title="Edit Profile"
                                >
                                  <Pencil className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => setShowDeleteConfirm(true)}
                                  className="p-3 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                                  title="Delete Profile"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {showDeleteConfirm && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-red-100"
                              >
                                <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                                  <Trash2 className="w-8 h-8 text-red-600" />
                                </div>
                                <h3 className="text-2xl font-black text-[#1A237E] text-center mb-2 tracking-tight">Delete Profile?</h3>
                                <p className="text-slate-500 text-center mb-8 font-medium">
                                  This will permanently remove <span className="font-bold text-[#1A237E]">{activeProfile.name}</span> and all associated data. This action cannot be undone.
                                </p>
                                <div className="flex flex-col gap-3">
                                  <button 
                                    onClick={handleDeleteProfile}
                                    className="w-full py-4 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                                  >
                                    Delete
                                  </button>
                                  <button 
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="w-full py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </motion.div>
                            </div>
                          )}
                          
                          {isEditingProfile && editableProfile ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Current Vehicle</p>
                                <div className="flex gap-2">
                                  <select 
                                    value={editableProfile.vehicle.type}
                                    onChange={(e) => setEditableProfile({...editableProfile, vehicle: { ...editableProfile.vehicle, type: e.target.value as VehicleType }})}
                                    className="flex-1 p-3 rounded-xl bg-white border border-slate-200 text-sm font-bold text-[#1A237E] focus:ring-2 focus:ring-indigo-500 outline-none"
                                  >
                                    <option value="car">Car</option>
                                    <option value="car_tow">Car + Trailer</option>
                                    <option value="van">Van</option>
                                    <option value="motorhome">Motorhome</option>
                                    <option value="moto_cycle">Motorcycle</option>
                                    <option value="offroad">Off-road/4x4</option>
                                  </select>
                                  <select 
                                    value={editableProfile.vehicle.power}
                                    onChange={(e) => setEditableProfile({...editableProfile, vehicle: { ...editableProfile.vehicle, power: e.target.value as VehicleProfile }})}
                                    className="p-3 rounded-xl bg-white border border-slate-200 text-sm font-bold text-[#1A237E] focus:ring-2 focus:ring-indigo-500 outline-none"
                                  >
                                    <option value="Petrol">Petrol</option>
                                    <option value="Diesel">Diesel</option>
                                    <option value="EV">EV</option>
                                  </select>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Driving Style</p>
                                <select 
                                  value={editableProfile.drivingStyle}
                                  onChange={(e) => setEditableProfile({...editableProfile, drivingStyle: e.target.value as 'Scenic' | 'Fastest'})}
                                  className="w-full p-3 rounded-xl bg-white border border-slate-200 text-sm font-bold text-[#1A237E] focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                  <option value="Scenic">Scenic</option>
                                  <option value="Fastest">Fastest</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Road Tolerance</p>
                                <select 
                                  value={editableProfile.preferences.roadTolerance}
                                  onChange={(e) => setEditableProfile({...editableProfile, preferences: { ...editableProfile.preferences, roadTolerance: e.target.value as 'Efficiency' | 'Adventure' }})}
                                  className="w-full p-3 rounded-xl bg-white border border-slate-200 text-sm font-bold text-[#1A237E] focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                  <option value="Efficiency">Efficiency (M-roads)</option>
                                  <option value="Adventure">Adventure (B-roads)</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pet Status</p>
                                <select 
                                  value={editableProfile.preferences.hasPet ? 'true' : 'false'}
                                  onChange={(e) => setEditableProfile({...editableProfile, preferences: { ...editableProfile.preferences, hasPet: e.target.value === 'true' }})}
                                  className="w-full p-3 rounded-xl bg-white border border-slate-200 text-sm font-bold text-[#1A237E] focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                  <option value="true">Traveling with Pets</option>
                                  <option value="false">No Pets</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Interests</p>
                                <input 
                                  type="text"
                                  value={editableProfile.interests}
                                  onChange={(e) => setEditableProfile({...editableProfile, interests: e.target.value})}
                                  className="w-full p-3 rounded-xl bg-white border border-slate-200 text-sm font-bold text-[#1A237E] focus:ring-2 focus:ring-indigo-500 outline-none"
                                  placeholder="e.g. Photography, National Parks"
                                />
                              </div>

                              <div className="pt-4 border-t border-slate-100 space-y-4">
                                <div className="flex items-center gap-2">
                                  <Navigation className="w-4 h-4 text-indigo-600" />
                                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Navigation Preferences</p>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2">
                                  {['Google Maps', 'Apple Maps', 'Waze'].map((nav) => {
                                    const isDisabled = nav === 'Apple Maps' && editableProfile.settings?.os_platform === 'Android';
                                    const isActive = editableProfile.settings?.preferred_navigator === nav;
                                    
                                    return (
                                      <button
                                        key={nav}
                                        disabled={isDisabled}
                                        onClick={() => setEditableProfile({ ...editableProfile, settings: { ...editableProfile.settings!, preferred_navigator: nav as any } })}
                                        className={cn(
                                          "flex flex-col items-center gap-1 p-3 rounded-xl border transition-all",
                                          isActive 
                                            ? "bg-indigo-50 border-indigo-600 shadow-sm" 
                                            : "bg-white border-slate-200 text-slate-500",
                                          isDisabled && "opacity-50 grayscale pointer-events-none"
                                        )}
                                      >
                                        <div className="w-6 h-6 flex items-center justify-center">
                                          {nav === 'Google Maps' && <img src="https://www.google.com/images/branding/product/ico/maps15_24dp.ico" alt="" className="w-4 h-4" />}
                                          {nav === 'Apple Maps' && <Navigation className="w-4 h-4 text-blue-500" />}
                                          {nav === 'Waze' && <Activity className="w-4 h-4 text-cyan-400" />}
                                        </div>
                                        <span className="text-[9px] font-bold">{nav}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                      <Navigation className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div>
                                      <h3 className="text-xs font-bold text-slate-900">Auto Handoff</h3>
                                      <p className="text-[9px] text-slate-500">Prepare all links automatically.</p>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => setEditableProfile({ ...editableProfile, settings: { ...editableProfile.settings!, auto_handoff: !editableProfile.settings?.auto_handoff } })}
                                    className={cn(
                                      "w-10 h-5 rounded-full transition-all relative",
                                      editableProfile.settings?.auto_handoff ? "bg-emerald-500" : "bg-slate-300"
                                    )}
                                  >
                                    <div className={cn(
                                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                                      editableProfile.settings?.auto_handoff ? "left-6" : "left-1"
                                    )} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Current Vehicle</p>
                                <p className="text-lg font-bold text-[#1A237E]">{activeProfile.vehicle.type} ({activeProfile.vehicle.power})</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Driving Style</p>
                                <p className="text-lg font-bold text-[#1A237E]">{activeProfile.drivingStyle}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Road Tolerance</p>
                                <p className="text-lg font-bold text-[#1A237E]">{activeProfile.preferences.roadTolerance}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pet Status</p>
                                <p className="text-lg font-bold text-[#1A237E]">{activeProfile.preferences.hasPet ? 'Traveling with Pets' : 'No Pets'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Interests</p>
                                <p className="text-lg font-bold text-[#1A237E]">{activeProfile.interests || 'None specified'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Preferred Navigator</p>
                                <div className="flex items-center gap-2 text-lg font-bold text-[#1A237E]">
                                  {activeProfile.settings?.preferred_navigator === 'Google Maps' && <img src="https://www.google.com/images/branding/product/ico/maps15_24dp.ico" alt="" className="w-5 h-5" />}
                                  {activeProfile.settings?.preferred_navigator === 'Apple Maps' && <Navigation className="w-5 h-5 text-blue-500" />}
                                  {activeProfile.settings?.preferred_navigator === 'Waze' && <Activity className="w-5 h-5 text-cyan-400" />}
                                  {activeProfile.settings?.preferred_navigator}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Device Context</p>
                                <div className="flex items-center gap-2 text-lg font-bold text-[#1A237E]">
                                  {activeProfile.settings?.os_platform === 'iOS' || activeProfile.settings?.os_platform === 'MacOS' ? <Smartphone className="w-5 h-5 text-indigo-600" /> : <Monitor className="w-5 h-5 text-indigo-600" />}
                                  {activeProfile.settings?.os_platform}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <button 
                            onClick={handleLogout}
                            className="mt-12 w-full py-4 rounded-2xl bg-slate-100 text-[#1A237E] font-black text-sm hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                            <LogOut className="w-4 h-4" />
                            Switch or Logout Profile
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              </div>
            </div>
          </main>

          {/* Mobile Bottom Sheet Drawer */}
          {mode === 'planner' && (
            <MobileParametersDrawer 
              activeProfile={activeProfile}
              inputs={inputs}
              setInputs={setInputs}
              loading={loading}
              onArchitect={handleSubmit}
              calculatedDistance={calculatedDistance}
              ctaText={welcomeContent.cta}
              contextualMessage={contextualMessage}
              isOpen={isDrawerOpen}
              setIsOpen={setIsDrawerOpen}
            />
          )}

          {/* Bottom Navigation Bar */}
          <nav className={cn(
            "fixed bottom-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-xl border-t border-slate-200 px-6 pb-8 pt-4 flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-300",
            uiState.nav_visibility === 'hidden' ? "translate-y-full" : "translate-y-0"
          )}>
            <button 
              onClick={() => { setMode('planner'); setIsEditingProfile(false); }}
              className={cn(
                "flex flex-col items-center gap-1 transition-all active:scale-90",
                mode === 'planner' ? "text-[#1A237E]" : "text-slate-400"
              )}
            >
              <Compass className={cn("w-6 h-6", mode === 'planner' && "fill-indigo-50")} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Planner</span>
            </button>
            <button 
              onClick={() => { setMode('emergency'); setIsEditingProfile(false); }}
              className={cn(
                "flex flex-col items-center gap-1 transition-all active:scale-90",
                mode === 'emergency' ? "text-red-600" : "text-slate-400"
              )}
            >
              <ShieldAlert className={cn("w-6 h-6", mode === 'emergency' && "fill-red-50")} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Emergency</span>
            </button>
            <button 
              onClick={() => { setMode('saved'); setIsEditingProfile(false); }}
              className={cn(
                "flex flex-col items-center gap-1 transition-all active:scale-90",
                mode === 'saved' ? "text-[#1A237E]" : "text-slate-400"
              )}
            >
              <History className={cn("w-6 h-6", mode === 'saved' && "fill-indigo-50")} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Saved</span>
            </button>
            <button 
              onClick={() => { setMode('profile'); setIsEditingProfile(false); }}
              className={cn(
                "flex flex-col items-center gap-1 transition-all active:scale-90",
                mode === 'profile' ? "text-[#1A237E]" : "text-slate-400"
              )}
            >
              <User className={cn("w-6 h-6", mode === 'profile' && "fill-indigo-50")} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Profile</span>
            </button>
          </nav>

      {/* Lodging Selection Modal */}
      <AnimatePresence>
        {selectedLodging && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLodging(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-[#FF6321]" />
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#FF6321]/10 rounded-2xl flex items-center justify-center mb-6">
                  <Hotel className="w-8 h-8 text-[#FF6321]" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Add to Route?</h3>
                <p className="text-black/40 text-sm mb-8">
                  Would you like to add <span className="text-black font-bold">{selectedLodging.name}</span> as an overnight stop on your Google Maps route?
                </p>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                  <button 
                    onClick={() => setSelectedLodging(null)}
                    className="py-4 rounded-2xl font-bold text-sm bg-[#F9F9F9] hover:bg-black/5 transition-all"
                  >
                    No, Cancel
                  </button>
                  <button 
                    onClick={handleAddToMaps}
                    className="py-4 rounded-2xl font-bold text-sm bg-[#FF6321] text-white hover:bg-[#E5591D] transition-all shadow-lg shadow-[#FF6321]/20"
                  >
                    Yes, Add to Route
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Stats */}
      <footer className="bg-white border-t border-black/5 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FF6321] rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tighter">GEMINI ROAD ARCHITECT</span>
          </div>
          <div className="flex gap-8 text-xs font-bold uppercase tracking-widest text-black/30">
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4" />
              Real-time Weather
            </div>
            <div className="flex items-center gap-2">
              <Fuel className="w-4 h-4" />
              Fuel Intelligence
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              EV Optimized
            </div>
          </div>
        </div>
      </footer>

      {/* Lodging Selection Modal */}
      <AnimatePresence>
        {selectedLodging && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-black/5"
            >
              <div className="w-16 h-16 bg-[#FF6321]/10 rounded-2xl flex items-center justify-center mb-6">
                <MapIcon className="w-8 h-8 text-[#FF6321]" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Add to Route?</h3>
              <p className="text-black/60 mb-8">
                Would you like to add <span className="font-bold text-black">{selectedLodging.name}</span> to your Google Maps route?
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setSelectedLodging(null)}
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm bg-[#F9F9F9] text-black hover:bg-black/5 transition-all"
                >
                  <X className="w-4 h-4" />
                  No, Thanks
                </button>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(inputs.startPoint || 'My Location')}&destination=${encodeURIComponent(inputs.endPoint)}&waypoints=${encodeURIComponent(selectedLodging.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setSelectedLodging(null)}
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm bg-[#FF6321] text-white hover:bg-[#FF6321]/90 shadow-lg shadow-[#FF6321]/20 transition-all"
                >
                  <Check className="w-4 h-4" />
                  Yes, Add It
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Stop Modal */}
      <AnimatePresence>
        {showManualStopModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-black/5"
            >
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
                <MapPin className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-black text-indigo-900 mb-2">Add Stop or Route</h3>
              <p className="text-indigo-900/60 mb-6 text-sm font-medium">
                Have a pre-booked hotel, a must-see location, or a preferred road? Enter it below.
              </p>
              
              <form onSubmit={handleAddManualStop} className="space-y-4">
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="stopType" 
                      value="pitstop" 
                      checked={manualStopInput.type === 'pitstop'} 
                      onChange={() => setManualStopInput(prev => ({ ...prev, type: 'pitstop' }))}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold text-indigo-900">Fixed Stop</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="stopType" 
                      value="road" 
                      checked={manualStopInput.type === 'road'} 
                      onChange={() => setManualStopInput(prev => ({ ...prev, type: 'road' }))}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold text-indigo-900">Preferred Road</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900/50 mb-2">
                    {manualStopInput.type === 'pitstop' ? 'Location Name' : 'Road Name / Number'}
                  </label>
                  <input 
                    type="text" 
                    required
                    value={manualStopInput.name}
                    onChange={e => setManualStopInput(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={manualStopInput.type === 'pitstop' ? "e.g. The Torridon Hotel" : "e.g. A82 through Glencoe"}
                    className="w-full px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-900 font-medium"
                  />
                </div>
                {manualStopInput.type === 'pitstop' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900/50 mb-2">Postcode / Address</label>
                    <input 
                      type="text" 
                      required
                      value={manualStopInput.postcode}
                      onChange={e => setManualStopInput(prev => ({ ...prev, postcode: e.target.value }))}
                      placeholder="e.g. IV22 2EY"
                      className="w-full px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-900 font-medium"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900/50 mb-2">Day of Trip</label>
                  <input 
                    type="number" 
                    min="1"
                    max={inputs.days}
                    required
                    value={manualStopInput.day}
                    onChange={e => setManualStopInput(prev => ({ ...prev, day: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-900 font-medium"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <button 
                    type="button"
                    onClick={() => setShowManualStopModal(false)}
                    className="flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                  >
                    Recalculate
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sync Modal */}
      <AnimatePresence>
        {showSyncModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-black/5"
            >
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
                <RefreshCw className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-black text-indigo-900 mb-2">Sync Route Updates</h3>
              <p className="text-indigo-900/60 mb-6 text-sm font-medium">
                You've made changes to an active itinerary. Would you like to sync these updates to your navigation app?
              </p>
              
              <div className="bg-indigo-50 rounded-2xl p-4 mb-8">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900/50 mb-3">Changes Detected</h4>
                <ul className="space-y-2">
                  {syncDelta.map((change, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm font-medium text-indigo-900">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      {change}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowSyncModal(false)}
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm bg-[#F9F9F9] text-indigo-900 hover:bg-black/5 transition-all"
                >
                  <X className="w-4 h-4" />
                  Skip Sync
                </button>
                <a 
                  href={roadTrip?.sync_state?.updated_nav_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setShowSyncModal(false);
                    setIsNavActive(true);
                  }}
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <Navigation className="w-4 h-4" />
                  Sync Now
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Save Route Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-black/5"
            >
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
                <Bookmark className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-black text-indigo-900 mb-2">Archive to My Trips</h3>
              <p className="text-indigo-900/60 mb-6 text-sm font-medium">
                Save this custom-architected route for future retrieval.
              </p>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900/50 mb-2">Trip Name</label>
                  <input 
                    type="text"
                    value={saveTripName}
                    onChange={(e) => setSaveTripName(e.target.value)}
                    placeholder="e.g., Summer 2026 NC500"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-indigo-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900/50 mb-2">Start Date (Optional)</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="date"
                      value={saveTripDate}
                      onChange={(e) => setSaveTripDate(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-indigo-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowSaveModal(false)}
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm bg-[#F9F9F9] text-indigo-900 hover:bg-black/5 transition-all"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button 
                  onClick={handleSaveRoute}
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <Bookmark className="w-4 h-4" />
                  Archive
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
    )}
    </div>
  );
}

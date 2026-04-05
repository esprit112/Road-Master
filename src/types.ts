export type VehicleType = 'car' | 'car_tow' | 'van' | 'motorhome' | 'moto_cycle' | 'offroad';
export type VehicleProfile = 'Petrol' | 'Diesel' | 'EV';
export type SerendipityLevel = 'Direct/Efficient' | 'Hidden Gems/Quirky';
export type Persona = 
  | 'The Electron Explorer' 
  | 'The Value Voyager' 
  | 'The Solo Nomad'
  | 'Kinship Krew'
  | 'Duo Discoverers'
  | 'Social Syndicate';
export type RoadTolerance = 'Efficiency' | 'Adventure';
export type Vibe = 'Stealth' | 'Social';
export type RouteType = 'Point to Point' | 'Round Trip';

export interface UserProfile {
  id?: number;
  name: string;
  persona: Persona;
  group_size: {
    adults: number;
    children: number;
  };
  vehicle: {
    type: VehicleType;
    power: VehicleProfile;
    isOversized: boolean;
    is_large?: boolean; // For V2026.6 compatibility
  };
  preferences: {
    rangeThreshold: number; // For EV
    roadTolerance: RoadTolerance;
    gradientLimit: number;
    vibe: Vibe;
    hasPet: boolean;
    dietary: string;
    discovery_vibe?: string; // For V2026.6 compatibility
  };
  settings: {
    preferred_navigator: 'Google Maps' | 'Apple Maps' | 'Waze';
    os_platform: string;
    auto_handoff: boolean;
  };
  interests: string;
  drivingStyle: 'Scenic' | 'Fastest'; // Keeping for backward compatibility or internal logic
}

export interface SavedRoute {
  id?: number;
  profileId: number;
  route_id: string;
  display_name: string;
  trip_date: string;
  summary: string;
  thumbnail_hint: string;
  itinerary_data: RoadTripResponse;
  created_at: string;
}

export interface SocialShare {
  share_text_short: string;
  share_text_long: string;
  og_metadata: {
    title: string;
    description: string;
    image_hint: string;
  };
  nav_url: string;
}

export interface UserAddedPitstop {
  name: string;
  address: string;
  postcode?: string;
  coordinates?: { lat: number; lng: number };
  day: number;
}

export interface EditAction {
  type: 'REORDER_STOP' | 'REMOVE_STOP' | 'ADD_CUSTOM_STOP';
  day: number;
  stopIndex?: number;
  newIndex?: number;
  details?: any;
}

export interface TripInputs {
  days: number;
  startPoint: string;
  endPoint: string;
  interests: string;
  serendipity: SerendipityLevel;
  routeType: RouteType | null;
  preset?: string;
  user_added_pitstops?: UserAddedPitstop[];
  edit_actions?: EditAction[];
  is_nav_active?: boolean;
  current_itinerary?: RoadTripResponse;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  maps?: {
    uri?: string;
    title?: string;
  };
}

export interface LiveData {
  status: 'Verified' | 'Check Website' | 'Warning';
  hours: string;
  booking: 'Required' | 'Recommended' | 'Not Required';
  official_link: string;
  last_verified: string;
  booking_priority?: 'high' | 'normal';
}

export interface ItineraryStop {
  name: string;
  description: string;
  photo_uri: string;
  phone: string;
  location: string;
  image_source: 'website' | 'generic';
  website_url?: string;
  coordinates?: { lat: number; lng: number };
  nav_url?: string;
  discovery_tag?: string;
  live_data?: LiveData;
}

export interface OvernightPitstop {
  name: string;
  type: 'Hotel' | 'Campsite' | 'B&B' | 'Wild Camping';
  description: string;
  photo_uri: string;
  phone: string;
  website: string;
  price_category: string;
  persona_fit: string;
  image_source: 'website' | 'generic';
}

export interface SafetyBriefing {
  emergency_numbers: {
    general: string;
    medical: string;
    police: string;
  };
  legal_scout: {
    country: string;
    side_of_road: string;
    speed_units: string;
    key_laws: string[];
  };
  gradient_alerts: string[];
}

export interface UIState {
  header_context: {
    title?: string;
    location_name: string;
    image_hint: string;
  };
  nav_visibility: 'persistent' | 'hidden';
  active_persona_badge: Persona;
  loader_type?: Persona;
  contextual_message?: string;
  verification_summary?: string;
  recalculation_summary?: string;
}

export interface ManualOverride {
  stop_id: string;
  name: string;
  type: string;
  impact: string;
}

export interface SyncState {
  is_nav_active: boolean;
  pending_changes: string[];
  updated_nav_url: string;
}

export interface RoadTripResponse {
  itinerary_daily: {
    day: number;
    stops: ItineraryStop[];
    daily_nav_link?: string;
    secondary_nav_link?: string;
    is_split?: boolean;
    fallback_note?: string;
    safety_warning?: string;
  }[];
  overnight_pitstop: OvernightPitstop[];
  safety_briefing: SafetyBriefing;
  groundingChunks: GroundingChunk[];
  ui_state: UIState;
  warnings?: string[]; // Added for V2026.6 data constraints
  manual_overrides?: ManualOverride[];
  sync_state?: SyncState;
}

export type EmergencyCategory = 
  | 'Mechanic' 
  | 'Breakdown' 
  | 'Medical (Urgent)' 
  | 'Medical (Routine)' 
  | 'Dental' 
  | 'Veterinary' 
  | 'Pharmacy' 
  | 'Safety' 
  | 'Emergency Stay';

export interface EmergencyResult {
  name: string;
  distance_from_user: string;
  open_now_status: string;
  phone_number: string;
  Maps_link: string;
}

export type Region = 'UK' | 'US' | 'EU' | 'Other';

export interface RoadLawSummary {
  countryName: string;
  sideOfRoad: string;
  bacLimit: string;
  speedUnits: string;
  requiredGear: string[];
  quirkyLaws: string[];
}

export interface EmergencyResponse {
  results: EmergencyResult[];
}

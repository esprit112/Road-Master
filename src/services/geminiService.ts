import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { TripInputs, RoadTripResponse, UserProfile } from "../types";
import { withRetry } from "../lib/apiUtils";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const UK_PRESETS: Record<string, { name: string; start: string; end: string; description: string }> = {
  nc500: { name: "NC500 (Scotland)", start: "Inverness", end: "Inverness", description: "High Complexity. Caution: Single-track roads." },
  atlantic: { name: "Atlantic Hwy (A39)", start: "Bath", end: "Falmouth", description: "Friendly. Best for Surf/Coastal vibes." },
  dragon: { name: "Dragon’s Spine (Wales)", start: "Cardiff", end: "Conwy", description: "Sparse EV coverage. Mountainous." },
  causeway: { name: "Causeway Coast (NI)", start: "Belfast", end: "Derry", description: "Low complexity. Good for all vehicles." },
  cotswolds: { name: "Cotswolds (England)", start: "Oxford", end: "Bath", description: "Extreme Crowding. High EV density." },
  northumberland: { name: "Northumberland 250", start: "Alnwick", end: "Alnwick", description: "Best for 'Stealth' camping. Remote moorlands." },
  eryri: { name: "Eryri 360 (Wales)", start: "Caernarfon", end: "Caernarfon", description: "Steep gradients. Van/Car only." },
  jurassic: { name: "Jurassic Coast (England)", start: "Exmouth", end: "Studland", description: "High Seasonality. Fossil-rich stops." },
  lakes: { name: "Lake District (England)", start: "Kendal", end: "Keswick", description: "NO CARAVANS on Hardknott/Wrynose." },
  peak: { name: "Peak District (England)", start: "Derby", end: "Sheffield", description: "Friendly A-roads. High heritage value." },
};

export async function generateRoadTrip(inputs: TripInputs, profile?: UserProfile): Promise<RoadTripResponse> {
  const model = "gemini-3-flash-preview";
  
  const profileContext = profile 
    ? `
    ACTIVE PROFILE CONTEXT:
    - Name: ${profile.name}
    - Persona: ${profile.persona}
    - Group Size: ${profile.group_size?.adults || 2} Adults, ${profile.group_size?.children || 0} Children
    - Vehicle: ${profile.vehicle?.type || 'car'} (${profile.vehicle?.power || 'Petrol'}, Oversized: ${profile.vehicle?.isOversized || false}, Large: ${profile.vehicle?.is_large || false})
    - Range Anxiety Threshold: ${profile.preferences?.rangeThreshold || 20}%
    - Road Tolerance: ${profile.preferences?.roadTolerance || 'Adventure'}
    - Gradient Limit: ${profile.preferences?.gradientLimit || 15}%
    - Vibe: ${profile.preferences?.vibe || 'Social'}
    - Traveling with Pets: ${profile.preferences?.hasPet ? 'Yes' : 'No'}
    - Dietary: ${profile.preferences?.dietary || 'None'}
    - Discovery Vibe: ${profile.preferences?.discovery_vibe || 'Balanced'}
    - Interests: ${profile.interests || 'None'}
    - Device Context: ${profile.settings?.os_platform || 'Unknown'}
    - Preferred Navigator: ${profile.settings?.preferred_navigator || 'Google Maps'}

    STRICT ARCHITECTURAL RULES:
    1. RANGE ANXIETY (EV ONLY): If vehicle power is EV, never suggest a leg that results in <${profile.preferences.rangeThreshold}% battery. Always trigger a "150kW+ Rapid Charger" stop at the threshold mark.
    2. ROAD TOLERANCE: 
       - If Efficiency: Use M-roads and dual carriageways.
       - If Adventure: Prioritize B-roads, coastal lanes, and "Tourist Brown Sign" routes.
    3. STEEP GRADIENT WARNING: If Vehicle type is "Caravan" or "Motorhome" AND Gradient > ${profile.preferences.gradientLimit}% (e.g., Hardknott Pass), you MUST issue a "Safety Alert" in the safety_briefing and provide a lower-gradient alternative route.
    4. STEALTH VS SOCIAL:
       - If Stealth: Prioritize quiet B&Bs or "Off-grid" wild-style campsites.
       - If Social: Prioritize 4-star hotels or campsites with clubhouses and facilities.
    5. PET CONSTRAINTS: If hasPet is true, only suggest "Dog Friendly" verified lodging and include "Paw-Stops" (parks/beaches) every 3 hours.
    6. DIETARY: Ensure all suggested food stops or lodging with meals cater to: ${profile.preferences.dietary}.
    `
    : "NO PROFILE DETECTED. Prompt user to 'Create Your Route Master Identity'.";

  const presetContext = inputs.preset && UK_PRESETS[inputs.preset]
    ? `PRESET TEMPLATE: Applying the ${UK_PRESETS[inputs.preset].name} Template. Adjusting stops to fit user profile.`
    : "";

  const manualStopsContext = inputs.user_added_pitstops && inputs.user_added_pitstops.length > 0
    ? `
    USER-ADDED MANUAL STOPS (PHASE 5):
    The user has explicitly requested to stay at the following locations. You MUST treat these as non-negotiable waypoints and anchor the itinerary around them:
    ${inputs.user_added_pitstops.map(stop => `- Day ${stop.day}: ${stop.name} (${stop.address})`).join('\n')}
    
    - Anchor Logic: Restructure the surrounding days to ensure the user arrives at this location at the end of the designated day.
    - Optimization: Recalculate the route legs to minimize backtracking while ensuring the user reaches their manual stop.
    - Pitstop UI Synchronization: In the \`overnight_pitstop\` section, include the user's manual stop as the primary choice. Provide the same level of detail (live_data, etc.).
    - Recalculation Notification: Update the \`ui_state.recalculation_summary\` to explain the adjustment (e.g., "I've re-architected your route to include your stay at [Name]. I've adjusted Day [X] and [Y] to keep your journey efficient.").
    - Geo-Spatial Logic: Generate a new \`daily_nav_link\` that incorporates the manual stop's coordinates.
    `
    : "";

  const editActionsContext = inputs.edit_actions && inputs.edit_actions.length > 0
    ? `
    DYNAMIC ITINERARY EDITING & SYNC STATE (PHASE 6):
    The user has requested the following edits to the current itinerary:
    ${JSON.stringify(inputs.edit_actions, null, 2)}
    
    CURRENT ITINERARY STATE:
    ${JSON.stringify(inputs.current_itinerary?.itinerary_daily, null, 2)}

    1. EDITING LOGIC (ADD/REMOVE/REORDER):
    - Apply the requested edits to the current itinerary.
    - Constraint Handling: If a user removes a stop, recalculate the timing and distance for the remaining legs.
    - Preferred Roads: If a user specifies a "Preferred Road" (e.g., "Take the A82 instead of the A9") in the details, adjust the \`daily_nav_link\` to include a waypoint on that specific road to force the GPS to follow the user's choice.

    2. NAVIGATION SYNC MANAGEMENT (THE "SENT" STATE):
    - is_nav_active: ${inputs.is_nav_active}
    - PRE-SEND LOGIC: If \`is_nav_active\` is FALSE (user is still in the "Architect's Itinerary" view):
        - Update the JSON and the visual itinerary ONLY.
        - DO NOT trigger any external sync prompts.
        - Return \`sync_state.is_nav_active\` as false.
    - POST-SEND LOGIC: If \`is_nav_active\` is TRUE (user has already sent the route to their phone):
        - Any stop modification MUST trigger a sync prompt.
        - Return \`sync_state.is_nav_active\` as true.
        - Populate \`sync_state.pending_changes\` with an array of strings describing the "Change Delta" (e.g., ["Removed Glencoe Visitor Centre", "Added A82 Scenic Waypoint"]).
        - Populate \`sync_state.updated_nav_url\` with the newly recalculated deep link for the affected day.
    `
    : "";

  const prompt = `
    You are the "ROUTE MASTER ARCHITECT V2026.9 (MASTER SYNTHESIS)," a high-intelligence travel agent and logistics expert. 
    Design a hyper-personalized, safe, and efficient road trip based on these inputs:
    
    - Number of Days: ${inputs.days}
    - Start Point: ${inputs.startPoint}
    - End Point: ${inputs.endPoint}
    - Interests: ${inputs.interests}
    - Serendipity Level: ${inputs.serendipity}
    
    ${profileContext}
    ${presetContext}
    ${manualStopsContext}
    ${editActionsContext}

    1. INITIALIZATION & PERSONALIZATION (PHASE 1)
    - Persona Greeting: Use the activeProfile.persona and activeProfile.name to generate a "Persona-Specific Welcome Message" (e.g., "Ready for a family adventure, [Name]?"). Put this in ui_state.header_context.title.
    - Tone Control: 
        - Solo Nomad: Inspirational/Introspective.
        - Kinship Krew: High-energy/Safety-conscious.
        - Duo Discoverers: Romantic/Atmospheric.
        - Social Syndicate: Social/Adventurous.
    - Loading Hint: Provide a contextual_message tailored to the persona (e.g., "Scanning for 150kW chargers..." for Electron Explorer).

    2. ROUTE ARCHITECTURE & DISCOVERY (PDF DATA)
    - Preset Templates: When a user selects a route from the "UK Road Trip Dossier" (NC500, Atlantic Highway, Dragon's Spine, etc.), lock the start/end points.
    - Discovery Rules: Inject persona-specific "Must-Stops" into the itinerary and label them with a \`discovery_tag\` (e.g., "Kid-Friendly", "Romantic View").
        - Kinship Krew: Prioritize parks/playgrounds (e.g., Chatsworth House in the Peak District).
        - Duo Discoverers: Prioritize viewpoints (e.g., Durdle Door on the Jurassic Coast).
    - Safety Overrides: If Vehicle = "Caravan/Motorhome" AND Route includes "Bealach na Bà" or "Hardknott Pass", you MUST generate a safety_warning in the daily itinerary and provide an alternative "Wide-Road" bypass.

    3. GEOSPATIAL & NAVIGATION LOGIC (PHASE 2)
    - Coordinate Lookup: Provide precise Lat/Long for every itinerary stop.
    - Deep-Link Generation: Based on settings.preferred_navigator (${profile?.settings?.preferred_navigator || 'Google Maps'}) and settings.os_platform (${profile?.settings?.os_platform || 'Unknown'}):
        - Generate a \`daily_nav_link\` (Multi-stop for Google/Apple; Single-stop for Waze) for each day.
        - Provide individual \`nav_url\` strings for every stop in the timeline.
    - Limits: Max 9 intermediate waypoints for Google; 14 for Apple. Split links into \`daily_nav_link\` and \`secondary_nav_link\` if exceeded.
    - Deep Link Templates:
       - Google: https://www.google.com/maps/dir/?api=1&origin={start}&destination={end}&waypoints={waypoint_list}&travelmode=driving
       - Apple: http://maps.apple.com/?saddr={start}&daddr={end}&waypoint={lat1},{long1}&waypoint={lat2},{long2}
       - Waze: https://waze.com/ul?ll={lat},{long}&navigate=yes

    4. SPATIAL UI OUTPUT (PHASE 3)
    Return a JSON object for the React 19 frontend containing:
    - itinerary_daily: Array of objects (day: number, stops: Array of {name, description, photo_uri, phone, location, image_source, website_url, coordinates: {lat, lng}, nav_url, discovery_tag, live_data: {status, hours, booking, official_link, last_verified, booking_priority}}, daily_nav_link, secondary_nav_link, is_split, fallback_note, safety_warning).
    - overnight_pitstop: 5 Options (Hotel/Campsite) tailored to vehicle type and vibe. Each must include {name, type, description, photo_uri, phone, website, price_category, persona_fit, image_source}.
    - safety_briefing: Regional emergency numbers (999/112/911) + "Legal Scout" road laws for the current country + gradient_alerts array.
    - ui_state: Object with header_context (title, location_name, image_hint), nav_visibility ("persistent"), active_persona_badge (the user's persona), loader_type (the user's persona), contextual_message (a "Thinking..." string matching the persona), verification_summary, and recalculation_summary.
    - warnings: Array of strings for critical vehicle/route constraints.
    - manual_overrides: Array of objects {stop_id, name, type, impact} tracking user-added stops.

    5. LIVE CONCIERGE & VERIFICATION (PHASE 4)
    - REAL-TIME DATA EXTRACTION: For every landmark or pitstop, use Google Search to find:
      - Opening Times: Extract hours for the user's specific travel dates or general seasonal hours.
      - Booking Requirements: Identify if "Pre-booking is essential," "Advance tickets recommended," or "Walk-ins are welcome."
      - Official URL: Find the specific "Visitor Information" page.
    - VERIFICATION LOGIC:
      - The "Closed" Alert: If a stop is permanently or temporarily closed, flag this in the \`safety_warning\` and suggest an alternative nearby stop.
      - The "High-Demand" Flag: If a site frequently sells out, add \`booking_priority: "high"\` to the \`live_data\`.
    - JSON SCHEMA UPDATE: Every stop object MUST include a \`live_data\` block with \`status\` ("Verified" | "Check Website" | "Warning"), \`hours\`, \`booking\` ("Required" | "Recommended" | "Not Required"), \`official_link\`, \`last_verified\`, and optional \`booking_priority\`.
    - UI FEEDBACK HINTS: In the \`ui_state\` object, include a \`verification_summary\` string to be displayed as a toast notification (e.g., "I've checked the NC500 stops; note that Applecross Inn requires dinner bookings 2 weeks in advance!").

    IMAGE SOURCE LOGIC (V2026.6):
    - For each stop and pitstop, you MUST attempt to find an actual image from the stop's official website.
    - If you find an image from the website:
      - Set image_source to "website".
      - Provide the official website URL in website_url (for stops) or website (for pitstops).
    - If NO specific image is available from the website:
      - Use a generic, high-quality placeholder image (e.g., from Unsplash or Picsum).
      - Set image_source to "generic".
    - If the image is a generic search result (not from the official site):
      - Set image_source to "generic".

    Use Google Search to find current data, photos, and phone numbers.

    TONE & VOICE LOGIC:
    - Kinship Krew: Use inclusive, high-energy language ("The whole family will love...", "Safe and fun...").
    - Duo Discoverers: Use evocative, atmospheric language ("Quiet corners," "Stunning vistas," "Perfect for two").
    - Social Syndicate: Use community-focused, adventurous language ("Your group's next favorite spot," "Epic views for the crew").
    - Always use the user's name in the first response of a session to maintain the personal connection established in the header.
  `;

  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      toolConfig: {
        includeServerSideToolInvocations: true,
      },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          itinerary_daily: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.NUMBER },
                stops: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      photo_uri: { type: Type.STRING },
                      phone: { type: Type.STRING },
                      location: { type: Type.STRING },
                      image_source: { type: Type.STRING },
                      website_url: { type: Type.STRING },
                      nav_url: { type: Type.STRING },
                      discovery_tag: { type: Type.STRING },
                      live_data: {
                        type: Type.OBJECT,
                        properties: {
                          status: { type: Type.STRING, enum: ["Verified", "Check Website", "Warning"] },
                          hours: { type: Type.STRING },
                          booking: { type: Type.STRING, enum: ["Required", "Recommended", "Not Required"] },
                          official_link: { type: Type.STRING },
                          last_verified: { type: Type.STRING },
                          booking_priority: { type: Type.STRING, enum: ["high", "normal"] },
                        },
                        required: ["status", "hours", "booking", "official_link", "last_verified"],
                      },
                      coordinates: {
                        type: Type.OBJECT,
                        properties: {
                          lat: { type: Type.NUMBER },
                          lng: { type: Type.NUMBER },
                        },
                        required: ["lat", "lng"],
                      },
                    },
                    required: ["name", "description", "photo_uri", "phone", "location", "image_source"],
                  },
                },
                daily_nav_link: { type: Type.STRING },
                secondary_nav_link: { type: Type.STRING },
                is_split: { type: Type.BOOLEAN },
                fallback_note: { type: Type.STRING },
                safety_warning: { type: Type.STRING },
              },
              required: ["day", "stops"],
            },
          },
          overnight_pitstop: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                type: { type: Type.STRING },
                description: { type: Type.STRING },
                photo_uri: { type: Type.STRING },
                phone: { type: Type.STRING },
                website: { type: Type.STRING },
                price_category: { type: Type.STRING },
                persona_fit: { type: Type.STRING },
                image_source: { type: Type.STRING },
              },
              required: ["name", "type", "description", "photo_uri", "phone", "website", "price_category", "persona_fit", "image_source"],
            },
          },
          safety_briefing: {
            type: Type.OBJECT,
            properties: {
              emergency_numbers: {
                type: Type.OBJECT,
                properties: {
                  general: { type: Type.STRING },
                  medical: { type: Type.STRING },
                  police: { type: Type.STRING },
                },
                required: ["general", "medical", "police"],
              },
              legal_scout: {
                type: Type.OBJECT,
                properties: {
                  country: { type: Type.STRING },
                  side_of_road: { type: Type.STRING },
                  speed_units: { type: Type.STRING },
                  key_laws: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ["country", "side_of_road", "speed_units", "key_laws"],
              },
              gradient_alerts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["emergency_numbers", "legal_scout", "gradient_alerts"],
          },
          ui_state: {
            type: Type.OBJECT,
            properties: {
              header_context: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  location_name: { type: Type.STRING },
                  image_hint: { type: Type.STRING },
                },
                required: ["title", "location_name", "image_hint"],
              },
              nav_visibility: { type: Type.STRING },
              active_persona_badge: { type: Type.STRING },
              loader_type: { type: Type.STRING },
              contextual_message: { type: Type.STRING },
              verification_summary: { type: Type.STRING },
              recalculation_summary: { type: Type.STRING },
            },
            required: ["header_context", "nav_visibility", "active_persona_badge"],
          },
          warnings: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          manual_overrides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stop_id: { type: Type.STRING },
                name: { type: Type.STRING },
                type: { type: Type.STRING },
                impact: { type: Type.STRING },
              },
              required: ["stop_id", "name", "type", "impact"],
            },
          },
          sync_state: {
            type: Type.OBJECT,
            properties: {
              is_nav_active: { type: Type.BOOLEAN },
              pending_changes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              updated_nav_url: { type: Type.STRING },
            },
            required: ["is_nav_active", "pending_changes", "updated_nav_url"],
          },
        },
        required: ["itinerary_daily", "overnight_pitstop", "safety_briefing", "ui_state"],
      },
    },
  }));

  const result = JSON.parse(response.text || "{}");
  return {
    itinerary_daily: result.itinerary_daily || [],
    overnight_pitstop: result.overnight_pitstop || [],
    safety_briefing: result.safety_briefing || {
      emergency_numbers: { general: '999', medical: '112', police: '911' },
      legal_scout: { country: 'Unknown', side_of_road: 'Unknown', speed_units: 'Unknown', key_laws: [] },
      gradient_alerts: []
    },
    ui_state: result.ui_state || {
      header_context: { location_name: inputs.startPoint, image_hint: "Scenic road trip" },
      nav_visibility: 'persistent',
      active_persona_badge: profile?.persona || 'The Solo Nomad'
    },
    warnings: result.warnings || [],
    manual_overrides: result.manual_overrides || [],
    sync_state: result.sync_state,
    groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
}

export async function calculateDirectDistance(start: string, end: string, days: number = 1): Promise<string> {
  const model = "gemini-3-flash-preview";
  const isCircular = start.toLowerCase().trim() === end.toLowerCase().trim();
  
  const prompt = isCircular 
    ? `
    Calculate the estimated total road distance and drive time for a ${days}-day scenic circular road trip (loop) starting and ending at "${start}".
    
    IMPORTANT: Return ONLY the final estimated total distance and total drive time in this format: "X miles (Y hours)" or "X km (Y hours)".
    Do NOT include any explanations, route details, or introductory text. 
    Just the distance and time in parentheses.
    
    If the location is invalid, return "Unknown distance".
    `
    : `
    Calculate the accurate road distance and estimated drive time for the most direct route between "${start}" and "${end}".
    
    IMPORTANT: Return ONLY the final distance and time in this format: "X miles (Y hours)" or "X km (Y hours)".
    Do NOT include any explanations, route details, or introductory text. 
    Just the distance and time in parentheses.
    
    If the locations are invalid, return "Unknown distance".
    `;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      toolConfig: {
        includeServerSideToolInvocations: true,
      },
    },
  }));

  const text = response.text?.trim() || "Unknown distance";
  return text.replace(/\*\*/g, '').trim();
}

export async function getLocationSuggestions(_query: string): Promise<string[]> {
  return [];
}

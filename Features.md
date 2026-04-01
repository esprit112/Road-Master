# Features of Route Master App

## 1. User Profiles & Personas
- **Profile Management**: Create, edit, and delete multiple user profiles.
- **Personas**: Choose from distinct travel personas that influence route generation and tone of voice:
  - The Electron Explorer
  - The Value Voyager
  - The Solo Nomad
  - Kinship Krew
  - Duo Discoverers
  - Social Syndicate
- **Vehicle Configuration**: Select vehicle type (Car, Car + Gear, Vanlife, Motorhome, Biker/Cyclist, 4x4 Overlander) and power source (Petrol, Diesel, EV).
- **Preferences**: Set range thresholds for EVs, road tolerance (Efficiency vs. Adventure), gradient limits, vibe (Stealth vs. Social), pet-friendliness, and dietary requirements.
- **Settings**: Choose preferred navigation app (Google Maps, Apple Maps, Waze) and OS platform.

## 2. AI-Powered Trip Planner (Route Master)
- **Dynamic Route Generation**: Uses Gemini API to create highly personalized multi-day road trips based on user inputs (start/end points, days, interests, serendipity level).
- **UK Presets**: Select from curated UK road trip templates (e.g., NC500, Atlantic Highway, Dragon's Spine, Causeway Coast, Cotswolds, Northumberland 250, Eryri 360, Jurassic Coast, Lake District, Peak District).
- **Daily Itineraries**: Detailed day-by-day breakdowns including stops, descriptions, photos, phone numbers, and coordinates.
- **Live Concierge & Verification**: Extracts real-time data for opening times, booking requirements, and official URLs.
- **Distance & Time Estimation**: Calculates direct distance and estimated drive time between locations.
- **Manual Overrides**: "Add Your Own Stop" feature to anchor the itinerary around user-specified locations.
- **Navigation Deep Linking**: Generates multi-stop routing links for Google Maps and Apple Maps, and single-stop links for Waze.

## 3. Dynamic Overnight Stays
- **Location-Aware Recommendations**: Suggests overnight pitstops (Hotels, Campsites, B&Bs, Wild Camping) tailored to the vehicle type, vibe, and the end-of-day location.
- **Automatic Refresh**: Toggling between days automatically refreshes the overnight stay search results based on the new end-of-day location.

## 4. Emergency Support & Safety
- **Location-Aware Emergency Search**: Finds nearby emergency services (Mechanic, Breakdown, Medical, Dental, Veterinary, Pharmacy, Safety, Emergency Stay) based on the user's GPS location or the end-of-day location.
- **Regional Emergency Numbers**: Automatically displays the correct emergency numbers (e.g., 999/111/101 for UK, 911 for US, 112 for EU) based on the detected region.
- **Safety Briefing**: Provides gradient alerts and local road laws (side of road, speed units, key laws) for the current country.

## 5. Saved Routes & Sharing
- **Local Storage**: Saves generated routes to a local IndexedDB database (via Dexie) for offline access.
- **Route History**: View a list of saved routes with summaries, dates, and thumbnails.
- **Social Sharing**: Share routes with short/long text descriptions and navigation URLs.

## 6. Polyglot Chat (Voice Assistant)
- **Voice-Activated Co-Pilot**: Uses Gemini Live API for real-time voice interaction.
- **Context-Aware**: Understands the current itinerary, user profile, and location.
- **Route & Profile Updates**: Can update route parameters and user profile preferences via voice commands (with user confirmation).

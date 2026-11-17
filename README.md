# Road Master

A road-trip planner that plans the day, not just the route.

Give it a start, an end, a number of days and an idea of who is in the car. It returns a day-by-day itinerary with stops, driving estimates, somewhere to sleep, and the local rules you would rather know before the police tell you.

## What it does

**Plans around the driver, not just the map**
Six travel personas change both the suggestions and the tone: The Electron Explorer, The Value Voyager, The Solo Nomad, Kinship Krew, Duo Discoverers, Social Syndicate. Vehicle type (car, van, motorhome, motorbike, 4x4) and power (petrol, diesel, EV) then constrain what is realistic, including a minimum range for an EV.

**Builds the itinerary**
Gemini generates a multi-day route from start and end points, days available, interests and a serendipity level. Each day breaks into stops with descriptions, photographs, phone numbers and coordinates. Distances and drive times are estimated between them.

**Starts from somewhere worth going**
Ten UK templates are built in: North Coast 500, Atlantic Highway, Dragon's Spine, Causeway Coast, Cotswolds, Northumberland 250, Eryri 360, Jurassic Coast, Lake District and Peak District.

**Finds you a bed**
Overnight suggestions are tailored to vehicle type, vibe and where the day actually ends: hotels, campsites, B&Bs, or wild camping. Change day and the search moves with you.

**Keeps you legal and mobile**
The emergency view finds mechanics, breakdown help, medical, dental, veterinary, pharmacy and emergency stays near your position or the day's end. It shows the right emergency number for the country you are in (999, 111, 911, 112) and a short safety briefing: which side of the road, speed units, and the laws a visitor gets caught by.

**Remembers the trip**
Generated routes are saved to IndexedDB through Dexie, so they survive a reload and work without a connection. They can be shared as short or long text with navigation links.

**Talks**
A voice co-pilot uses the Gemini Live API. It knows the current itinerary, profile and location, and can change route parameters or profile preferences by voice, with confirmation required before anything is written.

**Hands over to navigation**
Multi-stop Google Maps and Apple Maps links, single-stop Waze links, and waypoint optimisation for the route you actually want to drive.

## Status

A working personal build, not a product. `npm run lint` typechecks the project; there is no automated test suite. Treat everything the model produces as a draft that needs checking.

## Running it

```bash
npm install
echo "GEMINI_API_KEY=your-key" > .env.local
npm run dev
```

Open http://localhost:3000. A Gemini API key is required and can be created at https://aistudio.google.com.

```
src/
  App.tsx                     shell, navigation, profile and route state
  components/                 planner, itinerary, emergency, saved routes, voice assistant
  hooks/                      profile, trip planning, emergency search
  services/                   Gemini calls and emergency lookups
  constants/emergency_db.ts   per-country numbers and road laws
  db.ts                       Dexie schema for saved routes and profiles
  types.ts                    shared types
Features.md                   the fuller feature list
```

## Limits, stated plainly

- **The API key is compiled into the browser bundle.** Vite injects `GEMINI_API_KEY` at build time, so anyone with the deployed page can extract it. This is a local demo; do not ship it publicly on your own key. Proxy the calls through a server first.
- **The model can be confidently wrong** about opening times, prices, booking requirements, phone numbers and whether a road is open. Every one of those is a lead to verify, not a fact.
- **Distance and time are estimates**, not routing. It is a planner, not a satnav, and it will not reroute you around a closed road.
- **Data lives in one browser.** Profiles and routes are in IndexedDB; clearing site data deletes them. No account, no sync, no backup.
- **Emergency information is a starting point.** Numbers and laws are checked, but they go out of date and this is not an emergency service.

## Licence

No licence file. The code is public to read; all rights are reserved, and it is not intended for reuse or deployment as it stands.

---

Built by [Martin Greer](https://github.com/esprit112).

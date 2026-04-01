import { GoogleGenAI, Type } from "@google/genai";
import { EmergencyCategory, EmergencyResponse, Region, RoadLawSummary } from "../types";
import { EMERGENCY_DB } from "../constants/emergency_db";
import { withRetry } from "../lib/apiUtils";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface DetectionResult {
  region: Region;
  countryCode: string;
  countryName: string;
}

export async function detectRegion(userLocation: { lat: number; lng: number }): Promise<DetectionResult> {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Based on these coordinates (Latitude ${userLocation.lat}, Longitude ${userLocation.lng}), 
    identify the country and region.
    Return only a JSON object: { "region": "UK" | "US" | "EU" | "Other", "countryCode": "ISO 3166-1 alpha-2 code", "countryName": "Full Country Name" }.
  `;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      tools: [{ googleSearch: {} }],
      toolConfig: {
        includeServerSideToolInvocations: true,
      },
    },
  }));

  try {
    const result = JSON.parse(response.text || '{}');
    return {
      region: result.region || 'Other',
      countryCode: result.countryCode || 'Other',
      countryName: result.countryName || 'Unknown'
    };
  } catch (e) {
    return { region: 'Other', countryCode: 'Other', countryName: 'Unknown' };
  }
}

export async function getRoadLawSummary(countryCode: string, countryName: string): Promise<RoadLawSummary> {
  const dbData = EMERGENCY_DB[countryCode];
  if (dbData) {
    return {
      countryName: dbData.name,
      sideOfRoad: dbData.laws.sideOfRoad,
      bacLimit: dbData.laws.bacLimit,
      speedUnits: dbData.laws.speedUnits,
      requiredGear: dbData.laws.requiredGear,
      quirkyLaws: dbData.laws.quirkyLaws
    };
  }

  // Fallback to AI for non-DB countries
  const model = "gemini-3-flash-preview";
  const prompt = `Provide a "Road Law Summary" for ${countryName} (${countryCode}).
    Include: Side of Road (Left/Right), BAC Limit, Speed Units (mph/km/h), 
    Mandatory Required Gear (list), and 2-3 Quirky/High-value local driving laws.
    Format as JSON: { "countryName": string, "sideOfRoad": string, "bacLimit": string, "speedUnits": string, "requiredGear": string[], "quirkyLaws": string[] }`;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      tools: [{ googleSearch: {} }],
      toolConfig: {
        includeServerSideToolInvocations: true,
      },
    },
  }));

  return JSON.parse(response.text || '{}') as RoadLawSummary;
}

const CATEGORY_QUERIES: Record<EmergencyCategory, string> = {
  'Mechanic': "Top-rated car repair and tire shops open now.",
  'Breakdown': "National and local breakdown recovery services.",
  'Medical (Urgent)': "Hospitals with 24/7 A&E / Emergency Rooms.",
  'Medical (Routine)': "GP Doctors and Walk-in Clinics.",
  'Dental': "Emergency dentists open now.",
  'Veterinary': "24/7 emergency vets / animal hospitals.",
  'Pharmacy': "Late-night pharmacies open now.",
  'Safety': "Local police stations and contact numbers.",
  'Emergency Stay': "Nearby hotels with immediate availability."
};

export async function searchEmergencyServices(
  category: EmergencyCategory, 
  userLocation: { lat: number; lng: number },
  region: Region
): Promise<EmergencyResponse> {
  const model = "gemini-3-flash-preview";
  const query = CATEGORY_QUERIES[category];

  const prompt = `
    You are the "Emergency Support Agent" for Gemini Road Architect.
    The user is in an emergency situation and needs immediate help for the category: "${category}".
    
    USER LOCATION: Latitude ${userLocation.lat}, Longitude ${userLocation.lng}.
    REGION: ${region}
    
    TASK:
    - Search for: "${query}"
    - Proximity Rule: Prioritize results within a 10km (6-mile) radius of the user's current GPS coordinates.
    - Return exactly the top 5 most relevant and open results.
    - SPECIALIST SERVICES: If the region is 'UK' or 'EU' and the location is mountainous (e.g., Highlands, Alps), ensure the description or results consider "Mountain Rescue" where relevant for emergency categories.
    
    DATA REQUIREMENTS:
    For every result, you MUST return:
    - name: String
    - distance_from_user: String (e.g., "1.2 km away")
    - open_now_status: String (e.g., "Open 24/7", "Closes at 10 PM")
    - phone_number: String
    - Maps_link: URL String
    
    OUTPUT FORMAT:
    Return a JSON object with a "results" array containing these objects.
  `;

  const response = await withRetry(() => ai.models.generateContent({
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
          results: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                distance_from_user: { type: Type.STRING },
                open_now_status: { type: Type.STRING },
                phone_number: { type: Type.STRING },
                Maps_link: { type: Type.STRING },
              },
              required: ["name", "distance_from_user", "open_now_status", "phone_number", "Maps_link"],
            },
          },
        },
        required: ["results"],
      },
    },
  }));

  const result = JSON.parse(response.text || '{"results": []}');
  return result;
}

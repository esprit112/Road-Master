import { Region } from "../types";

export interface EmergencyNumbers {
  primary: string;
  medical?: string;
  police?: string;
}

export interface RoadLaws {
  sideOfRoad: 'Left' | 'Right';
  bacLimit: string;
  speedUnits: 'mph' | 'km/h';
  requiredGear: string[];
  quirkyLaws: string[];
}

export interface CountryData {
  name: string;
  region: Region;
  numbers: EmergencyNumbers;
  laws: RoadLaws;
}

export const EMERGENCY_DB: Record<string, CountryData> = {
  'UK': {
    name: 'United Kingdom',
    region: 'UK',
    numbers: { primary: '999', medical: '111', police: '101' },
    laws: {
      sideOfRoad: 'Left',
      bacLimit: '0.08% (0.05% in Scotland)',
      speedUnits: 'mph',
      requiredGear: ['Insurance documents', 'Driving license'],
      quirkyLaws: ['Splashing pedestrians is a fine', 'Using a phone as a sat-nav is strictly regulated']
    }
  },
  'US': {
    name: 'United States',
    region: 'US',
    numbers: { primary: '911' },
    laws: {
      sideOfRoad: 'Right',
      bacLimit: '0.08%',
      speedUnits: 'mph',
      requiredGear: ['Registration', 'Insurance'],
      quirkyLaws: ['Right turn on red is generally allowed unless signed otherwise']
    }
  },
  'FR': {
    name: 'France',
    region: 'EU',
    numbers: { primary: '112', medical: '15', police: '17' },
    laws: {
      sideOfRoad: 'Right',
      bacLimit: '0.05%',
      speedUnits: 'km/h',
      requiredGear: ['Warning triangle', 'High-vis vest', 'Breathalyser (recommended)'],
      quirkyLaws: ['Headphones are banned while driving', 'Speed camera alerts on sat-navs are illegal']
    }
  },
  'DE': {
    name: 'Germany',
    region: 'EU',
    numbers: { primary: '112', police: '110' },
    laws: {
      sideOfRoad: 'Right',
      bacLimit: '0.05%',
      speedUnits: 'km/h',
      requiredGear: ['Warning triangle', 'First aid kit', 'High-vis vest'],
      quirkyLaws: ['Running out of fuel on the Autobahn is illegal', 'Winter tires are mandatory in winter conditions']
    }
  }
};

export const getEmergencyNumbers = (countryCode: string): EmergencyNumbers => {
  return EMERGENCY_DB[countryCode]?.numbers || { primary: '112' };
};

export const getRoadLaws = (countryCode: string): RoadLaws | null => {
  return EMERGENCY_DB[countryCode]?.laws || null;
};

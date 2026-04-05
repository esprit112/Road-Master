import { useState } from 'react';
import { EmergencyResult, EmergencyCategory, Region } from '../types';
import { searchEmergencyServices } from '../services/emergencyService';
import toast from 'react-hot-toast';

export const useEmergency = (userLocation: { lat: number; lng: number } | null, region: Region) => {
  const [emergencyResults, setEmergencyResults] = useState<EmergencyResult[]>([]);
  const [selectedEmergencyCategory, setSelectedEmergencyCategory] = useState<EmergencyCategory | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmergencySearch = async (category: EmergencyCategory, endOfDayLocation?: { lat: number; lng: number } | string) => {
    let searchOrigin: { lat: number; lng: number } | string | null = userLocation;
    
    if (category === 'Emergency Stay' && endOfDayLocation) {
      searchOrigin = endOfDayLocation;
    }

    if (!searchOrigin) {
      toast.error("Please enable location services to use Emergency Support.");
      return;
    }

    setLoading(true);
    setSelectedEmergencyCategory(category);
    setEmergencyResults([]);
    
    try {
      const response = await searchEmergencyServices(category, searchOrigin, region);
      setEmergencyResults(response.results);
    } catch (error) {
      console.error(error);
      toast.error("Failed to find emergency services. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return {
    emergencyState: {
      activeCategory: selectedEmergencyCategory,
      results: emergencyResults,
      regionInfo: region
    },
    loading,
    handleEmergencySearch,
    setEmergencyResults,
    setSelectedEmergencyCategory
  };
};

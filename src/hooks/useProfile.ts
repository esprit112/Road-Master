import { useState, useEffect } from 'react';
import { UserProfile, Region, RoadLawSummary } from '../types';
import { db } from '../db';
import { detectRegion, getRoadLawSummary } from '../services/emergencyService';
import toast from 'react-hot-toast';

export const useProfile = () => {
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [region, setRegion] = useState<Region>('Other');
  const [countryCode, setCountryCode] = useState<string>('Other');
  const [countryName, setCountryName] = useState<string>('Unknown');
  const [roadLaws, setRoadLaws] = useState<RoadLawSummary | null>(null);

  // Load profiles from Dexie
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

  // Persist active profile ID
  useEffect(() => {
    if (activeProfile) {
      localStorage.setItem('rm_active_profile_id', activeProfile.id?.toString() || '');
    } else {
      localStorage.removeItem('rm_active_profile_id');
    }
  }, [activeProfile]);

  // Geolocation and Region Detection
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(loc);
        
        detectRegion(loc).then((res) => {
          if (res.countryCode !== countryCode && countryCode !== 'Other') {
            toast(`Welcome to ${res.countryName}! Emergency numbers and road laws have been updated.`, { icon: '🌍' });
          }
          setRegion(res.region);
          setCountryCode(res.countryCode);
          setCountryName(res.countryName);
          
          getRoadLawSummary(res.countryCode, res.countryName).then(setRoadLaws).catch(console.error);
        }).catch(console.error);
      });
    }
  }, [countryCode]);

  const handleProfileSelect = (profile: UserProfile) => {
    setActiveProfile(profile);
  };

  const handleProfileCreated = (profile: UserProfile) => {
    setAllProfiles(prev => [...prev, profile]);
    setActiveProfile(profile);
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
      toast.error("Failed to update profile.");
    }
  };

  const handleDeleteProfile = async () => {
    if (!activeProfile) return;
    try {
      await db.routes.where('profileId').equals(activeProfile.id!).delete();
      await db.profiles.delete(activeProfile.id!);
      
      const updatedProfiles = allProfiles.filter(p => p.id !== activeProfile.id);
      setAllProfiles(updatedProfiles);
      setActiveProfile(null);
      localStorage.removeItem('rm_active_profile_id');
    } catch (error) {
      console.error("Failed to delete profile:", error);
      toast.error("Failed to delete profile.");
    }
  };

  const handleLogout = () => {
    setActiveProfile(null);
  };

  return {
    userState: {
      profiles: allProfiles,
      activeProfile,
      userLocation,
      preferences: activeProfile?.preferences || null
    },
    isAuthReady,
    region,
    countryCode,
    countryName,
    roadLaws,
    handleProfileSelect,
    handleProfileCreated,
    handleUpdateProfile,
    handleDeleteProfile,
    handleLogout,
    setUserLocation
  };
};

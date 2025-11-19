import { create } from 'zustand';

export interface Scan {
  id: number;
  type: string;
  threatLevel?: string;
  objectName?: string;
  latitude: number;
  longitude: number;
  altitude: number;
  description?: string;
  metadata?: any;
  created_at: string;
}

export interface Marker {
  id: number;
  markerType: string;
  latitude: number;
  longitude: number;
  altitude: number;
  title: string;
  description?: string;
  color: string;
  created_at: string;
}

export interface ImportantLocation {
  id: string;
  type: 'homebase' | 'lab' | 'shelter' | 'medcenter' | 'safepoint' | 'food' | 'water';
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  description: string;
  color: string;
  icon: string;
}

export interface NavigationPath {
  from: { lat: number; lng: number; alt: number };
  to: { lat: number; lng: number; alt: number };
  points: { lat: number; lng: number; alt: number }[];
}

interface AppState {
  scans: Scan[];
  markers: Marker[];
  importantLocations: ImportantLocation[];
  userLocation: { lat: number; lng: number; alt: number } | null;
  selectedScan: Scan | null;
  selectedMarker: Marker | null;
  selectedLocation: ImportantLocation | null;
  navigationPath: NavigationPath | null;
  isScanning: boolean;
  setScans: (scans: Scan[]) => void;
  addScan: (scan: Scan) => void;
  setMarkers: (markers: Marker[]) => void;
  addMarker: (marker: Marker) => void;
  setImportantLocations: (locations: ImportantLocation[]) => void;
  setUserLocation: (location: { lat: number; lng: number; alt: number }) => void;
  setSelectedScan: (scan: Scan | null) => void;
  setSelectedMarker: (marker: Marker | null) => void;
  setSelectedLocation: (location: ImportantLocation | null) => void;
  setNavigationPath: (path: NavigationPath | null) => void;
  setIsScanning: (isScanning: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  scans: [],
  markers: [],
  importantLocations: [],
  userLocation: null,
  selectedScan: null,
  selectedMarker: null,
  selectedLocation: null,
  navigationPath: null,
  isScanning: false,
  setScans: (scans) => set({ scans }),
  addScan: (scan) => set((state) => ({ scans: [scan, ...state.scans] })),
  setMarkers: (markers) => set({ markers }),
  addMarker: (marker) => set((state) => ({ markers: [marker, ...state.markers] })),
  setImportantLocations: (locations) => set({ importantLocations: locations }),
  setUserLocation: (location) => set({ userLocation: location }),
  setSelectedScan: (scan) => set({ selectedScan: scan }),
  setSelectedMarker: (marker) => set({ selectedMarker: marker }),
  setSelectedLocation: (location) => set({ selectedLocation: location }),
  setNavigationPath: (path) => set({ navigationPath: path }),
  setIsScanning: (isScanning) => set({ isScanning }),
}));

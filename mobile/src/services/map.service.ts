import { Place } from '../types';
import { MAP_PROVIDER } from '../utils/constants';

export const searchNearbyPlaces = async (
  latitude: number,
  longitude: number,
  type: 'pharmacy' | 'hospital'
): Promise<Place[]> => {
  // Using OpenStreetMap Nominatim (free)
  const query = type === 'pharmacy' ? 'pharmacy' : 'hospital';
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&lat=${latitude}&lon=${longitude}&radius=5000&limit=10`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    return data.map((item: any, index: number) => {
      const distanceKm = calculateDistance(
        latitude,
        longitude,
        parseFloat(item.lat),
        parseFloat(item.lon)
      );

      return {
        id: `place-${index}`,
        name: item.display_name.split(',')[0],
        address: item.display_name,
        type: type.toUpperCase() as 'PHARMACY' | 'HOSPITAL',
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        distanceKm: Number(distanceKm.toFixed(1)),
      };
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  } catch (error) {
    console.error('Map search error:', error);
    return [];
  }
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};






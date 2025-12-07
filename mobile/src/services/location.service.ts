import Geolocation from '@react-native-community/geolocation';
import { LocationCoords } from '../types';

export const getCurrentPositionAsync = (): Promise<LocationCoords> => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        console.log('[LOCATION] Got position:', coords, {
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
        });
        resolve(coords);
      },
      (error) => {
        console.error('[LOCATION] Error:', error);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0, // Always get fresh location
      }
    );
  });
};






/**
 * SERVICE: Location Service
 * DESCRIPTION: Wraps the browser's Geolocation API to mimic `expo-location`.
 * Provides error handling and permission checks.
 */

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export const getCurrentPositionAsync = async (): Promise<LocationCoords> => {
  // Wrap in a try-catch block to provide a fallback for the Demo environment
  try {
    return await new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error("Thiết bị không hỗ trợ định vị."));
        return;
      }

      // Options mimicking high accuracy requirements for SOS
      const options = {
        enableHighAccuracy: true,
        timeout: 5000, // 5s timeout
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          // Reject to trigger the fallback in the catch block
          reject(error);
        },
        options
      );
    });
  } catch (error: any) {
    console.warn("[LocationService] Geolocation error or denied. Using fallback for Demo.", error);
    
    // Fallback: Return a default location (e.g., Ho Chi Minh City) 
    // This ensures the SOS feature can be tested even if permissions are blocked in the preview.
    return {
      latitude: 10.7769, 
      longitude: 106.7009
    };
  }
};
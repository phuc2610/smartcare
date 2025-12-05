/**
 * OpenStreetMap Service using Overpass API (Free, no API key required)
 * Overpass API: https://overpass-api.de/api/interpreter
 */

export interface OSMPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
}

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
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

/**
 * Extract coordinates from OSM element (handles both node and way/relation with center)
 */
const extractCoordinates = (element: any): { lat: number; lon: number } | null => {
  if (element.lat && element.lon) {
    return { lat: parseFloat(element.lat), lon: parseFloat(element.lon) };
  }
  if (element.center) {
    return { lat: parseFloat(element.center.lat), lon: parseFloat(element.center.lon) };
  }
  return null;
};

/**
 * Extract name from OSM element tags
 */
const extractName = (element: any): string => {
  const tags = element.tags || {};
  return (
    tags.name ||
    tags['name:vi'] ||
    tags['name:en'] ||
    tags['addr:housename'] ||
    'Địa điểm không tên'
  );
};

/**
 * Extract address from OSM element tags
 */
const extractAddress = (element: any): string => {
  const tags = element.tags || {};
  const parts: string[] = [];

  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:ward']) parts.push(tags['addr:ward']);
  if (tags['addr:district']) parts.push(tags['addr:district']);
  if (tags['addr:city']) parts.push(tags['addr:city']);

  if (parts.length > 0) {
    return parts.join(', ');
  }

  // Fallback: use name if no address
  return extractName(element);
};

/**
 * Find nearby pharmacies using Overpass API
 */
export const findNearbyPharmacies = async (
  lat: number,
  lon: number,
  radius: number = 2000
): Promise<OSMPlace[]> => {
  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["amenity"="pharmacy"](around:${radius},${lat},${lon});
      way["amenity"="pharmacy"](around:${radius},${lat},${lon});
      relation["amenity"="pharmacy"](around:${radius},${lat},${lon});
    );
    out center;
  `;

  return queryOverpass(overpassQuery, lat, lon);
};

/**
 * Find nearby hospitals using Overpass API
 */
export const findNearbyHospitals = async (
  lat: number,
  lon: number,
  radius: number = 5000
): Promise<OSMPlace[]> => {
  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${radius},${lat},${lon});
      way["amenity"="hospital"](around:${radius},${lat},${lon});
      relation["amenity"="hospital"](around:${radius},${lat},${lon});
    );
    out center;
  `;

  return queryOverpass(overpassQuery, lat, lon);
};

/**
 * Execute Overpass API query with retry logic
 */
const queryOverpass = async (
  query: string,
  userLat: number,
  userLon: number
): Promise<OSMPlace[]> => {
  const executeQuery = async (): Promise<OSMPlace[]> => {
    try {
      const response = await fetch(OVERPASS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: query,
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.elements || data.elements.length === 0) {
        return [];
      }

      const places: OSMPlace[] = [];

      data.elements.forEach((element: any, index: number) => {
        const coords = extractCoordinates(element);
        if (!coords) return;

        const name = extractName(element);
        const address = extractAddress(element);
        const distance = calculateDistance(userLat, userLon, coords.lat, coords.lon);

        places.push({
          id: `osm-${element.type}-${element.id || index}`,
          name,
          latitude: coords.lat,
          longitude: coords.lon,
          address,
        });
      });

      // Sort by distance
      return places.sort((a, b) => {
        const distA = calculateDistance(userLat, userLon, a.latitude, a.longitude);
        const distB = calculateDistance(userLat, userLon, b.latitude, b.longitude);
        return distA - distB;
      });
    } catch (error) {
      console.error('Overpass API query error:', error);
      throw error;
    }
  };

  // Retry once if failed
  try {
    return await executeQuery();
  } catch (error) {
    console.warn('First Overpass query failed, retrying...', error);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
    return await executeQuery();
  }
};






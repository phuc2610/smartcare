
import React, { useEffect, useState } from 'react';
import { Place } from '../types';
import { getCurrentPositionAsync } from '../services/locationService';
import { MapPin, Navigation, Phone, Search, Loader2, Hospital } from 'lucide-react';

// --- MOCK GOOGLE PLACES API ---
// In a real app, this would fetch from a backend proxying Google Places API
const generateMockPlaces = (lat: number, lng: number): Place[] => {
  const names = [
    { name: "Nhà thuốc Long Châu", type: "PHARMACY" },
    { name: "Nhà thuốc Pharmacity", type: "PHARMACY" },
    { name: "Bệnh viện Đa Khoa Quận", type: "HOSPITAL" },
    { name: "Phòng khám Đa khoa Quốc tế", type: "HOSPITAL" },
    { name: "Nhà thuốc An Khang", type: "PHARMACY" },
  ];

  return names.map((p, idx) => ({
    id: `place-${idx}`,
    name: p.name,
    type: p.type as any,
    // Add random offset to simulate nearby locations
    latitude: lat + (Math.random() - 0.5) * 0.02,
    longitude: lng + (Math.random() - 0.5) * 0.02,
    address: `${Math.floor(Math.random() * 100) + 1} Nguyễn Văn Cừ, TP.HCM`,
    distanceKm: Number((Math.random() * 5).toFixed(1))
  })).sort((a, b) => a.distanceKm - b.distanceKm);
};

export const MapScreen = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    const initMap = async () => {
      try {
        const coords = await getCurrentPositionAsync();
        setUserLoc({ lat: coords.latitude, lng: coords.longitude });
        
        // Simulate API delay
        setTimeout(() => {
          const mockData = generateMockPlaces(coords.latitude, coords.longitude);
          setPlaces(mockData);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Map Error", error);
        setLoading(false);
      }
    };
    initMap();
  }, []);

  const openGoogleMaps = (lat: number, lng: number, label: string) => {
    // Deep link universal format
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${label}`, '_blank');
  };

  return (
    <div className="animate-fade-in pb-20">
      {/* Map Header */}
      <div className="bg-white p-4 rounded-b-2xl shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3 bg-gray-100 px-4 py-2 rounded-xl">
           <Search className="w-5 h-5 text-gray-400" />
           <input 
              type="text" 
              placeholder="Tìm nhà thuốc, bệnh viện..." 
              className="bg-transparent w-full outline-none text-sm font-medium"
              disabled // Mock only
           />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Đang tìm địa điểm quanh bạn...</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          
          {/* Visual Map Simulation (Radar View) */}
          <div className="relative w-full h-48 bg-primary-50 rounded-2xl overflow-hidden border border-primary-100 flex items-center justify-center mb-6">
            <div className="absolute w-64 h-64 border border-primary-200 rounded-full opacity-50 animate-pulse"></div>
            <div className="absolute w-32 h-32 border border-primary-300 rounded-full opacity-50"></div>
            
            {/* User Dot */}
            <div className="z-10 w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg relative">
                 <div className="absolute -inset-1 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
            </div>
            
            {/* Place Dots (Simplified projection) */}
            {places.map((p, idx) => (
                <div 
                    key={idx}
                    className={`absolute w-3 h-3 rounded-full border border-white shadow-sm ${p.type === 'HOSPITAL' ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{
                        top: `${50 + (Math.random() - 0.5) * 60}%`,
                        left: `${50 + (Math.random() - 0.5) * 80}%`
                    }}
                />
            ))}
            
            <span className="absolute bottom-2 right-2 text-[10px] text-primary-400 bg-white/80 px-2 rounded">
                Map Preview (Demo)
            </span>
          </div>

          <h3 className="font-bold text-gray-800">Kết quả gần nhất ({places.length})</h3>

          {/* Place List */}
          {places.map((place) => (
            <div 
              key={place.id}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 active:scale-[0.98] transition-transform"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${place.type === 'HOSPITAL' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                {place.type === 'HOSPITAL' ? <Hospital className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{place.name}</h4>
                    <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {place.distanceKm} km
                    </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{place.address}</p>
                
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => openGoogleMaps(place.latitude, place.longitude, place.name)}
                    className="flex-1 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg flex items-center justify-center gap-1"
                  >
                    <Navigation className="w-3 h-3" /> Chỉ đường
                  </button>
                  <button className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-bold rounded-lg">
                    <Phone className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

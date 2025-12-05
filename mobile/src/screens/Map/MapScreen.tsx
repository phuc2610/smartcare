import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getCurrentPositionAsync } from '../../services/location.service';
import { findNearbyPharmacies, findNearbyHospitals, OSMPlace } from '../../services/osm.service';
import { LocationCoords } from '../../types';
import { COLORS } from '../../utils/constants';
import { requestLocationPermission } from '../../utils/permissions';
import { AppHeader } from '../../components/AppHeader';

type FilterType = 'pharmacy' | 'hospital';

// Default location: Ho Chi Minh City
const DEFAULT_LOCATION: LocationCoords = {
  latitude: 10.8231,
  longitude: 106.6297,
};

export const MapScreen = () => {
  const [filter, setFilter] = useState<FilterType>('pharmacy');
  const [places, setPlaces] = useState<OSMPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LocationCoords>(DEFAULT_LOCATION);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    initMap();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadPlaces();
    }
  }, [filter, userLocation]);

  const initMap = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('Thông báo', 'Cần quyền vị trí để tìm địa điểm gần bạn. Sử dụng vị trí mặc định (TP.HCM).');
        setUserLocation(DEFAULT_LOCATION);
        setLoading(false);
        return;
      }

      const coords = await getCurrentPositionAsync();
      setUserLocation(coords);

      // Animate map to user location
      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          1000
        );
      }
    } catch (error) {
      console.error('Location Error:', error);
      Alert.alert('Thông báo', 'Không thể lấy vị trí. Sử dụng vị trí mặc định (TP.HCM).');
      setUserLocation(DEFAULT_LOCATION);
    } finally {
      setLoading(false);
    }
  };

  const loadPlaces = async () => {
    if (!userLocation) return;

    setLoading(true);
    setError(null);

    try {
      let results: OSMPlace[] = [];

      if (filter === 'pharmacy') {
        results = await findNearbyPharmacies(userLocation.latitude, userLocation.longitude, 2000);
      } else {
        results = await findNearbyHospitals(userLocation.latitude, userLocation.longitude, 5000);
      }

      setPlaces(results);
    } catch (error: any) {
      console.error('Load places error:', error);
      setError('Không thể tải địa điểm. Vui lòng thử lại sau.');
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlacePress = (place: OSMPlace) => {
    if (!mapRef.current) return;

    // Animate map to selected place
    mapRef.current.animateToRegion(
      {
        latitude: place.latitude,
        longitude: place.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );
  };

  const openGoogleMaps = (lat: number, lng: number, name: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(name)}`;
    Linking.openURL(url);
  };

  const calculateDistance = (place: OSMPlace): number => {
    const R = 6371; // Earth radius in km
    const dLat = ((place.latitude - userLocation.latitude) * Math.PI) / 180;
    const dLon = ((place.longitude - userLocation.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLocation.latitude * Math.PI) / 180) *
        Math.cos((place.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Bản đồ Y tế" />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm nhà thuốc, bệnh viện..."
            placeholderTextColor={COLORS.textSecondary}
            editable={false}
          />
        </View>
      </View>

      {/* Filter Segmented Control */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pharmacy' && styles.filterButtonActive]}
          onPress={() => setFilter('pharmacy')}
        >
          <Text
            style={[styles.filterText, filter === 'pharmacy' && styles.filterTextActive]}
          >
            💊 Nhà thuốc
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'hospital' && styles.filterButtonActive]}
          onPress={() => setFilter('hospital')}
        >
          <Text
            style={[styles.filterText, filter === 'hospital' && styles.filterTextActive]}
          >
            🏥 Bệnh viện
          </Text>
        </TouchableOpacity>
      </View>

      {/* Map - Using react-native-maps (works without Google API key in development) */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* User Location Marker */}
        <Marker
          coordinate={userLocation}
          title="Vị trí của bạn"
          pinColor="blue"
          identifier="user-location"
        />

        {/* Places Markers */}
        {places.map(place => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            title={place.name}
            description={place.address}
            pinColor={filter === 'hospital' ? 'red' : 'green'}
            identifier={place.id}
          />
        ))}
      </MapView>

      {/* Bottom Sheet - Places List */}
      <View style={styles.bottomSheet}>
        <View style={styles.bottomSheetHandle} />
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang tìm địa điểm...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadPlaces}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.placesTitle}>
              {filter === 'pharmacy' ? 'Nhà thuốc' : 'Bệnh viện'} gần đây ({places.length})
            </Text>
            <ScrollView style={styles.placesList} showsVerticalScrollIndicator={false}>
              {places.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    Không tìm thấy {filter === 'pharmacy' ? 'nhà thuốc' : 'bệnh viện'} nào trong khu vực.
                  </Text>
                </View>
              ) : (
                places.map(place => {
                  const distance = calculateDistance(place);
                  return (
                    <TouchableOpacity
                      key={place.id}
                      style={styles.placeCard}
                      onPress={() => handlePlacePress(place)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.placeIcon}>
                        <Text style={styles.placeIconText}>
                          {filter === 'hospital' ? '🏥' : '💊'}
                        </Text>
                      </View>
                      <View style={styles.placeContent}>
                        <Text style={styles.placeName} numberOfLines={1}>
                          {place.name}
                        </Text>
                        <Text style={styles.placeAddress} numberOfLines={2}>
                          {place.address}
                        </Text>
                        <Text style={styles.placeDistance}>{distance} km</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.directionsButton}
                        onPress={() => openGoogleMaps(place.latitude, place.longitude, place.name)}
                      >
                        <Text style={styles.directionsButtonText}>→</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginHorizontal: 4,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: '#fff',
  },
  map: {
    flex: 1,
  },
  bottomSheet: {
    height: 300,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    paddingTop: 8,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  placesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  placesList: {
    flex: 1,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  placeCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  placeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  placeIconText: {
    fontSize: 24,
  },
  placeContent: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    lineHeight: 16,
  },
  placeDistance: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  directionsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  directionsButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});


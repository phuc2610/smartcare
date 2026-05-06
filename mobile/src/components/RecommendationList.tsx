import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { Recommendation, HealthLogType } from '../types';
import { COLORS } from '../utils/constants';
import { getHealthRecommendations } from '../services/ai.service';
import { createHealthLog } from '../services/health.service';

const CACHE_KEY_PREFIX = 'health_recommendations_';
const CACHE_EXPIRY_DAYS = 7; // Cache for 7 days

interface CachedRecommendations {
  recommendations: Recommendation[];
  timestamp: number;
  medicalCondition: string;
}

export const RecommendationList = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const previousConditionRef = useRef<string | undefined>(undefined);
  const hasLoadedRef = useRef(false);

  const handleReload = async () => {
    if (!user?.medicalCondition) return;
    const cacheKey = `${CACHE_KEY_PREFIX}${user.medicalCondition}`;
    await AsyncStorage.removeItem(cacheKey);
    hasLoadedRef.current = false;
    previousConditionRef.current = undefined;
    setReloadTrigger(prev => prev + 1);
  };



  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user?.medicalCondition) {
        setRecommendations([]);
        previousConditionRef.current = undefined;
        hasLoadedRef.current = false;
        return;
      }

      const medicalCondition = user.medicalCondition;
      
      // If condition hasn't changed and we've already loaded, don't fetch again
      if (previousConditionRef.current === medicalCondition && hasLoadedRef.current) {
        return;
      }

      // Try to load from cache first
      const cacheKey = `${CACHE_KEY_PREFIX}${medicalCondition}`;
      let useCache = false;
      
      try {
        const cachedData = await AsyncStorage.getItem(cacheKey);
        if (cachedData) {
          const parsed: CachedRecommendations = JSON.parse(cachedData);
          const now = Date.now();
          const cacheAge = now - parsed.timestamp;
          const cacheExpiry = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
          
          // Use cache if it's still valid and for the same condition
          if (cacheAge < cacheExpiry && parsed.medicalCondition === medicalCondition) {
            setRecommendations(parsed.recommendations || []);
            previousConditionRef.current = medicalCondition;
            hasLoadedRef.current = true;
            useCache = true;
          }
        }
      } catch (error) {
        console.error('Failed to load from cache:', error);
      }

      // Only fetch from API if no valid cache
      if (!useCache) {
        setLoading(true);
        try {
          const data = await getHealthRecommendations(medicalCondition);
          const recommendationsData = data.recommendations || [];
          setRecommendations(recommendationsData);
          
          // Save to cache
          const cacheData: CachedRecommendations = {
            recommendations: recommendationsData,
            timestamp: Date.now(),
            medicalCondition: medicalCondition,
          };
          await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
          
          previousConditionRef.current = medicalCondition;
          hasLoadedRef.current = true;
        } catch (error) {
          console.error('Failed to fetch recommendations:', error);
          // Try to use cache even if expired as fallback
          try {
            const cachedData = await AsyncStorage.getItem(cacheKey);
            if (cachedData) {
              const parsed: CachedRecommendations = JSON.parse(cachedData);
              if (parsed.medicalCondition === medicalCondition) {
                setRecommendations(parsed.recommendations || []);
                previousConditionRef.current = medicalCondition;
                hasLoadedRef.current = true;
              } else {
                setRecommendations([]);
              }
            } else {
              setRecommendations([]);
            }
          } catch (cacheError) {
            setRecommendations([]);
          }
        } finally {
          setLoading(false);
        }
      }
    };

    fetchRecommendations();
  }, [user?.medicalCondition, reloadTrigger]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Gợi ý sức khỏe</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>AI đang phân tích...</Text>
        </View>
      </View>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Gợi ý sức khỏe</Text>
        <TouchableOpacity onPress={handleReload} style={styles.reloadButton}>
          <Icon name="refresh" size={16} color={COLORS.primary} />
          <Text style={styles.reloadText}>Đổi gợi ý</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {recommendations.map(item => (
          <View key={item.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
  },
  reloadText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  scroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  card: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#8E8E93',
  },
});







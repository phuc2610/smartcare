import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { Recommendation } from '../types';
import { COLORS } from '../utils/constants';
import { getHealthRecommendations } from '../services/ai.service';

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
  const previousConditionRef = useRef<string | undefined>(undefined);
  const hasLoadedRef = useRef(false);

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
  }, [user?.medicalCondition]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Gợi ý sức khỏe</Text>
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
      <Text style={styles.title}>Gợi ý sức khỏe</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {recommendations.map(item => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDescription}>{item.description}</Text>
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
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  scroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  card: {
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
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
    color: COLORS.textSecondary,
  },
});






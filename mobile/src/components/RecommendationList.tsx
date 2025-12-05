import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Recommendation } from '../types';
import { COLORS } from '../utils/constants';

const RECOMMENDATIONS_DB: Record<string, Recommendation[]> = {
  Diabetes: [
    {
      id: 'd1',
      type: 'DIET',
      title: 'Hạn chế tinh bột',
      description: 'Giảm cơm trắng, thay bằng gạo lứt hoặc yến mạch.',
      iconName: 'Utensils',
      color: 'bg-green-100 text-green-600',
    },
    {
      id: 'd2',
      type: 'EXERCISE',
      title: 'Đi bộ sau ăn',
      description: 'Đi bộ nhẹ 15p sau bữa tối giúp ổn định đường huyết.',
      iconName: 'Footprints',
      color: 'bg-orange-100 text-orange-600',
    },
  ],
  Hypertension: [
    {
      id: 'h1',
      type: 'DIET',
      title: 'Ăn nhạt',
      description: 'Giảm muối trong khẩu phần ăn (< 5g/ngày).',
      iconName: 'Soup',
      color: 'bg-blue-100 text-blue-600',
    },
  ],
  Normal: [
    {
      id: 'n1',
      type: 'LIFESTYLE',
      title: 'Uống đủ nước',
      description: 'Cố gắng uống đủ 2 lít nước mỗi ngày.',
      iconName: 'GlassWater',
      color: 'bg-blue-50 text-blue-500',
    },
  ],
};

export const RecommendationList = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    if (user?.medicalCondition) {
      const data = RECOMMENDATIONS_DB[user.medicalCondition] || RECOMMENDATIONS_DB['Normal'];
      setRecommendations(data);
    }
  }, [user]);

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
});






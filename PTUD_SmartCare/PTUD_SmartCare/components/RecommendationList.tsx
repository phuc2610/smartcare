import React, { useEffect, useState } from 'react';
import { Recommendation } from '../types';
import { getRecommendations, getRecentHealthLogs } from '../services/databaseService';
import { generatePersonalizedAdvice } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { Utensils, Footprints, Soup, Headphones, GlassWater, Lightbulb, RefreshCw, Sun, Moon, Apple } from 'lucide-react';

const IconMap: Record<string, any> = {
  Utensils, Footprints, Soup, Headphones, GlassWater, Lightbulb, Sun, Moon, Apple
};

export const RecommendationList = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);

  const fetchRecommendations = async (forceAi = false) => {
    if (!user) return;
    
    if (forceAi) {
        setLoading(true);
        try {
            // Get logs for context
            const logs = getRecentHealthLogs(user._id);
            // Call AI
            const aiData = await generatePersonalizedAdvice(user, logs);
            
            if (aiData && aiData.length > 0) {
                setRecommendations(aiData);
                setIsAiGenerated(true);
            } else {
                // Fallback if AI fails or returns empty
                const staticData = getRecommendations(user.medicalCondition);
                setRecommendations(staticData);
                setIsAiGenerated(false);
            }
        } catch (e) {
            console.error("Failed to fetch AI recs", e);
        } finally {
            setLoading(false);
        }
    } else {
        // Initial load: prefer static for speed, or cached
        const data = getRecommendations(user.medicalCondition);
        setRecommendations(data);
    }
  };

  useEffect(() => {
    fetchRecommendations(false);
  }, [user]);

  if (recommendations.length === 0 && !loading) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
            <Lightbulb className={`w-4 h-4 ${isAiGenerated ? 'text-purple-500' : 'text-yellow-500'}`} />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            {isAiGenerated ? 'Gợi ý dành riêng bạn' : 'Gợi ý sức khỏe'}
            </h3>
        </div>
        
        <button 
            onClick={() => fetchRecommendations(true)}
            disabled={loading}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            title="Làm mới với AI"
        >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-600' : ''}`} />
        </button>
      </div>
      
      {/* Horizontal ScrollView equivalent */}
      <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar">
        {loading ? (
             // Skeleton Loader
             [1, 2, 3].map(i => (
                <div key={i} className="min-w-[200px] h-32 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
             ))
        ) : (
            recommendations.map((item) => {
            const Icon = IconMap[item.iconName] || Lightbulb;
            return (
                <div 
                key={item.id}
                className={`min-w-[220px] bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col transition-all ${isAiGenerated ? 'border-purple-100 bg-purple-50/30' : ''}`}
                >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${item.color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-800 text-sm mb-1">{item.title}</h4>
                <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{item.description}</p>
                </div>
            );
            })
        )}
      </div>
    </div>
  );
};
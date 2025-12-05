import api from './api';
import { User, LocationCoords } from '../types';

export const triggerEmergencySOS = async (user: User, coords: LocationCoords) => {
  // In a real app, this would call backend API
  // For now, simulate API call
  const mapsLink = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
  const message = `🚨 KHẨN CẤP! ${user.name} đang gặp nguy hiểm.\nVị trí: ${mapsLink}`;
  console.log(`[SMS Gateway] Sending SOS:`, message);
  
  // TODO: Implement actual API call to backend
  // await api.post('/emergency/sos', { coords, userId: user._id });
  
  return { success: true };
};






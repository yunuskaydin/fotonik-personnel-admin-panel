import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { PersonelLoginData, AdminLoginData, LoginResponse } from '../types';

// Environment-based API URL configuration
const getApiBaseUrl = () => {
  // Development URLs
  if (__DEV__) {
    return Platform.OS === 'android' ? 'http://192.168.1.128:3000' : 'http://localhost:3000';
  }
  
  // Production URL - AWS Amplify
  return 'https://main.d1va1crvvuu8dy.amplifyapp.com';
};

export const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 saniye timeout
});

// Token'ı otomatik olarak header'a ekle
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  // Personel girişi
  personelLogin: async (data: PersonelLoginData): Promise<LoginResponse> => {
    const response = await api.post('/api/personel/login', data);
    
    // Response data kontrolü
    if (!response.data || !response.data.token) {
      throw new Error('API response\'da token bulunamadı');
    }
    
    return response.data;
  },

  // Admin girişi
  adminLogin: async (data: AdminLoginData): Promise<LoginResponse> => {
    const response = await api.post('/api/admin/login', data);
    
    // Response data kontrolü
    if (!response.data || !response.data.token) {
      throw new Error('API response\'da token bulunamadı');
    }
    
    return response.data;
  },

  // Çıkış yap
  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('userType');
  },
};

export default api;
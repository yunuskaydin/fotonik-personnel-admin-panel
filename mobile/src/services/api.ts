import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { PersonelLoginData, AdminLoginData, LoginResponse } from '../types';

// Android emülatör için 10.0.2.2, iOS simulator için localhost
const API_BASE_URL = Platform.OS === 'android' ? 'http://192.168.1.128:3000' : 'http://localhost:3000';

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
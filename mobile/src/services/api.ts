import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { PersonelLoginData, AdminLoginData, LoginResponse } from '../types';

// Environment-based API URL configuration
const getApiBaseUrl = () => {
  // Development URLs
  //if (__DEV__) {
   // return Platform.OS === 'android' ? 'http://192.168.1.128:3000' : 'http://localhost:3000';
  //}
  
  // Production URL - AWS Elastic Beanstalk
  return 'http://Fotonik-backend-env.eba-zqqvhjqa.eu-north-1.elasticbeanstalk.com';
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

  // Bağlantı testi
  testConnection: async () => {
    try {
      const response = await api.get('/', {
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      return true;
    } catch (error: any) {
      return false;
    }
  },
};

export default api;

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
  
  // Production URL - AWS Elastic Beanstalk
  return 'https://Fotonik-backend-env.eba-zqqvhjqa.eu-north-1.elasticbeanstalk.com';
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
    try {
      console.log('🔐 Personel login attempt:', { 
        email: data.email, 
        apiUrl: API_BASE_URL,
        fullUrl: `${API_BASE_URL}/api/personel/login`
      });
      
      const response = await api.post('/api/personel/login', data);
      
      console.log('✅ Personel login response:', response.data);
      
      // Response data kontrolü
      if (!response.data || !response.data.token) {
        throw new Error('API response\'da token bulunamadı');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Personel login error:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      throw error;
    }
  },

  // Admin girişi
  adminLogin: async (data: AdminLoginData): Promise<LoginResponse> => {
    try {
      console.log('🔐 Admin login attempt:', { 
        username: data.username, 
        apiUrl: API_BASE_URL,
        fullUrl: `${API_BASE_URL}/api/admin/login`
      });
      
      const response = await api.post('/api/admin/login', data);
      
      console.log('✅ Admin login response:', response.data);
      
      // Response data kontrolü
      if (!response.data || !response.data.token) {
        throw new Error('API response\'da token bulunamadı');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Admin login error:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      throw error;
    }
  },

  // Çıkış yap
  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('userType');
  },

  // Bağlantı testi
  testConnection: async () => {
    try {
      console.log('🔍 Testing connection to:', API_BASE_URL);
      const response = await api.get('/');
      console.log('✅ Connection test successful:', response.status);
      return true;
    } catch (error: any) {
      console.error('❌ Connection test failed:', error.message);
      return false;
    }
  },
};

export default api;

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdminLoginData } from '../types';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface AdminLoginScreenProps {
  navigation: any;
}

export default function AdminLoginScreen({ navigation }: AdminLoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Hata', 'Tüm alanları doldurun.');
      return;
    }

    setLoading(true);
    try {
      const loginData: AdminLoginData = { username: username.trim(), password };
      const response = await authService.adminLogin(loginData);
      
      // Response kontrolü
      if (!response || !response.token) {
        Alert.alert('Hata', 'Sunucudan geçersiz yanıt alındı. Token bulunamadı.');
        return;
      }
      
      // Token ve kullanıcı tipini kaydet
      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('userType', 'admin');
      
      // Admin dashboard'una yönlendir
      navigation.navigate('AdminDashboard');
      
    } catch (error: any) {
      
      if (error.code === 'ECONNABORTED') {
        Alert.alert('Hata', 'Bağlantı zaman aşımı. Lütfen tekrar deneyin.');
      } else if (error.message === 'Network Error') {
        Alert.alert('Hata', 'Ağ bağlantısı hatası. Sunucu çalışıyor mu kontrol edin.');
      } else if (error.response) {
        Alert.alert('Hata', error.response.data?.message || 'Giriş başarısız.');
      } else {
        Alert.alert('Hata', 'Bilinmeyen bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <LinearGradient
          colors={['#234060', '#234060']}
          style={styles.gradient}
        >
          {/* Geri Dön Butonu */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>Geri Dön</Text>
          </TouchableOpacity>

          <View style={styles.loginCard}>
            {/* Logo */}
            <Image
              source={require('../../assets/fotonik-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            
            {/* Başlık */}
            <Text style={styles.title}>Yönetim Paneli</Text>
            
            {/* Form */}
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Kullanıcı Adı"
                placeholderTextColor="#375d8c"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Şifre"
                placeholderTextColor="#375d8c"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
              
              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginCard: {
    backgroundColor: '#234060',
    borderRadius: 20,
    padding: 35,
    width: '100%',
    maxWidth: 410,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  logo: {
    width: 200,
    height: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 25,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    marginTop: 10,
  },
  input: {
    backgroundColor: '#e7f1fb',
    borderWidth: 1.5,
    borderColor: '#b4d7f7',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
    color: '#113355',
  },
  loginButton: {
    backgroundColor: '#1467b0',
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonDisabled: {
    backgroundColor: '#666',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 20,
    zIndex: 10,
  },
  backButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '600',
  },
});
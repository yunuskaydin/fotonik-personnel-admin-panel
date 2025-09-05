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
import { PersonelLoginData } from '../types';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface PersonelLoginScreenProps {
  navigation: any;
}

export default function PersonelLoginScreen({ navigation }: PersonelLoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Hata', 'Tüm alanları doldurun.');
      return;
    }

    setLoading(true);
    try {
      // Önce bağlantıyı test et
      const connectionOk = await authService.testConnection();
      if (!connectionOk) {
        Alert.alert('Hata', 'Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.');
        return;
      }

      const loginData: PersonelLoginData = { email: email.trim(), password };
      const response = await authService.personelLogin(loginData);
      
      // Token ve kullanıcı tipini kaydet
      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('userType', 'personel');
      
      // Personel dashboard'una yönlendir
      navigation.navigate('PersonelDashboard');
      
    } catch (error: any) {
      console.error('Personel login error:', error);
      
      let errorMessage = 'Giriş başarısız.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Bağlantı zaman aşımı. Lütfen tekrar deneyin.';
      } else if (error.message === 'Network Error') {
        errorMessage = 'Ağ bağlantısı hatası. Sunucu çalışıyor mu kontrol edin.';
      } else if (error.response) {
        errorMessage = error.response.data?.message || `Sunucu hatası (${error.response.status}).`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Hata', errorMessage);
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
          colors={['#001e3c', '#001e3c35']}
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
            <Text style={styles.title}>Personel Portalı</Text>
            
            {/* Form */}
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="E-posta"
                placeholderTextColor="#90cdfa"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Şifre"
                placeholderTextColor="#90cdfa"
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
            
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>
                Hesabın yok mu?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('PersonelRegister')}>
                <Text style={styles.registerLink}>
                  Kayıt ol
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
    backgroundColor: 'rgba(34,54,80,0.94)',
    borderRadius: 24,
    padding: 35,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#72cfff26',
  },
  logo: {
    width: 300,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#5ed4fc',
    marginBottom: 20,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    marginTop: 10,
  },
  input: {
    backgroundColor: '#223454ee',
    borderWidth: 1.7,
    borderColor: '#90cdfa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
    color: '#eaf4fe',
  },
  loginButton: {
    backgroundColor: '#45aaff',
    borderRadius: 16,
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
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    flexWrap: 'wrap',
  },
  registerText: {
    color: '#e6f1fb',
    textAlign: 'center',
  },
  registerLink: {
    color: '#70d5fd',
    textDecorationLine: 'underline',
    fontWeight: '600',
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
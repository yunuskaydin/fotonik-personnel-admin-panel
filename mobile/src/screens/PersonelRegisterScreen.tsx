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
import Ionicons from 'react-native-vector-icons/Ionicons';
import { API_BASE_URL } from '../services/api';

interface PersonelRegisterScreenProps {
  navigation: any;
}

export default function PersonelRegisterScreen({ navigation }: PersonelRegisterScreenProps) {
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [email, setEmail] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validation
    if (!ad.trim() || !soyad.trim() || !email.trim() || !password1 || !password2) {
      Alert.alert('Hata', 'Tüm alanları doldurun.');
      return;
    }

    if (password1 !== password2) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/personel/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ad: ad.trim(), 
          soyad: soyad.trim(), 
          email: email.trim(), 
          password: password1 
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Kayıt yapılamadı.');
      }

      Alert.alert(
        'Başarılı',
        'Kayıt başarılı! Lütfen giriş yapın.',
        [
          {
            text: 'Tamam',
            onPress: () => navigation.navigate('PersonelLogin')
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Kayıt yapılamadı.');
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
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>Geri Dön</Text>
          </TouchableOpacity>

          <View style={styles.registerCard}>
            {/* Logo */}
            <Image
              source={require('../../assets/fotonik-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            
            {/* Başlık */}
            <Text style={styles.title}>Personel Kaydı</Text>
            
            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Ad</Text>
                <TextInput
                  style={styles.input}
                  value={ad}
                  onChangeText={setAd}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Soyad</Text>
                <TextInput
                  style={styles.input}
                  value={soyad}
                  onChangeText={setSoyad}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>E-posta</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Şifre</Text>
                <TextInput
                  style={styles.input}
                  value={password1}
                  onChangeText={setPassword1}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Şifre (Tekrar)</Text>
                <TextInput
                  style={styles.input}
                  value={password2}
                  onChangeText={setPassword2}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              
              <TouchableOpacity
                style={[styles.registerButton, loading && styles.registerButtonDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                <Text style={styles.registerButtonText}>
                  {loading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.loginText}>
              Zaten hesabın var mı?{' '}
              <Text style={styles.loginLink} onPress={() => navigation.navigate('PersonelLogin')}>
                Giriş yap
              </Text>
            </Text>
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
  registerCard: {
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
    width: 200,
    height: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#5ed4fc',
    marginBottom: 25,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    marginTop: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#c6eaff',
    fontWeight: '500',
    fontSize: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#223454ee',
    borderWidth: 1.7,
    borderColor: '#6fc8fd',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#f2fafd',
  },
  registerButton: {
    backgroundColor: '#3fc8fa',
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#1d97e6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
    elevation: 5,
  },
  registerButtonDisabled: {
    backgroundColor: '#666',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  loginText: {
    color: '#e8f6ff',
    marginTop: 25,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  loginLink: {
    color: '#53cbff',
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

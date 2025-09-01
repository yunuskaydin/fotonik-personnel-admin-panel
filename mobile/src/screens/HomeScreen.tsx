import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const handleAdminPress = () => {
    navigation.navigate('AdminLogin');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#001e3c', '#001e3c35']}
        style={styles.gradient}
      >
        {/* Admin Icon - Sağ üst köşe */}
        <TouchableOpacity
          style={styles.adminIcon}
          onPress={handleAdminPress}
        >
          <Ionicons name="settings" size={24} color="#70d5fd" />
          <Text style={styles.adminText}>Admin</Text>
        </TouchableOpacity>

        {/* Ana içerik - Personel Login */}
        <View style={styles.mainContent}>
          <Image
            source={require('../../assets/fotonik-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          
          <Text style={styles.welcomeText}>Fotonik Personel Portalı</Text>
          <Text style={styles.subtitle}>Hoş geldiniz</Text>
          
          <TouchableOpacity
            style={styles.personelButton}
            onPress={() => navigation.navigate('PersonelLogin')}
          >
            <Text style={styles.personelButtonText}>Personel Girişi</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  adminIcon: {
    position: 'absolute',
    top: 60,
    right: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(34,54,80,0.8)',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#72cfff26',
  },
  adminText: {
    color: '#70d5fd',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 300,
    height: 120,
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#5ed4fc',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#e6f1fb',
    textAlign: 'center',
    marginBottom: 50,
  },
  personelButton: {
    backgroundColor: '#45aaff',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  personelButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
});
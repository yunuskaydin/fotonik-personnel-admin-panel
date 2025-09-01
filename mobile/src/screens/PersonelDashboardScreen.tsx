import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface PersonelDashboardScreenProps {
  navigation: any;
}

interface PersonelData {
  ad: string;
  soyad: string;
  email: string;
}

export default function PersonelDashboardScreen({ navigation }: PersonelDashboardScreenProps) {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [personelData, setPersonelData] = useState<PersonelData | null>(null);

  useEffect(() => {
    loadPersonelData();
  }, []);

  const loadPersonelData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('PersonelLogin');
        return;
      }

      // Decode JWT token to get user data
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const decoded = JSON.parse(jsonPayload);
        
        if (decoded.ad && decoded.soyad) {
          setPersonelData({
            ad: decoded.ad,
            soyad: decoded.soyad,
            email: decoded.email || 'Belirtilmemiş'
          });
        } else {
          // Fallback: Try to fetch from API
          await fetchPersonelDataFromAPI(token);
        }
      } catch (decodeError) {
        // If token decode fails, try API
        await fetchPersonelDataFromAPI(token);
      }
    } catch (error) {
      Alert.alert('Hata', 'Kullanıcı bilgileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonelDataFromAPI = async (token: string) => {
    try {
      const response = await fetch('http://10.0.2.2:3000/api/personel/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setPersonelData({
          ad: userData.ad || 'Personel',
          soyad: userData.soyad || 'Kullanıcı',
          email: userData.email || 'Belirtilmemiş'
        });
      } else {
        // If API fails, use fallback
        setPersonelData({
          ad: 'Personel',
          soyad: 'Kullanıcı',
          email: 'Belirtilmemiş'
        });
      }
    } catch (apiError) {
      // Fallback data if everything fails
      setPersonelData({
        ad: 'Personel',
        soyad: 'Kullanıcı',
        email: 'Belirtilmemiş'
      });
    }
  };

  const logout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('userType');
            navigation.navigate('Home');
          }
        }
      ]
    );
  };

  const menuItems = [
    { id: 'home', title: 'Anasayfa', icon: 'home-outline', emoji: '🏠' },
    { id: 'work', title: 'Üretim İşleri', icon: 'construct-outline', emoji: '🔧' },
    { id: 'history', title: 'Geçmiş', icon: 'library-outline', emoji: '📜' },
    { id: 'izin', title: 'İzin Talepleri', icon: 'document-text-outline', emoji: '📝' },
    { id: 'duyuru', title: 'Duyurular', icon: 'megaphone-outline', emoji: '📢' },
    { id: 'iletisim', title: 'Görüş/Öneri/Şikayet', icon: 'chatbubble-outline', emoji: '💬' },
  ];

  const renderHome = () => (
    <View style={styles.section}>
      <View style={styles.welcomeBanner}>
        <Text style={styles.welcomeText}>
          Hoş geldiniz, {personelData?.ad} {personelData?.soyad}
        </Text>
      </View>
      
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
        
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => setActiveSection('work')}
        >
          <Text style={styles.actionEmoji}>🔧</Text>
          <Text style={styles.actionTitle}>Üretim İşleri</Text>
          <Text style={styles.actionDesc}>Yeni iş başlat veya devam et</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => setActiveSection('izin')}
        >
          <Text style={styles.actionEmoji}>📝</Text>
          <Text style={styles.actionTitle}>İzin Talebi</Text>
          <Text style={styles.actionDesc}>Yeni izin talebi oluştur</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => setActiveSection('duyuru')}
        >
          <Text style={styles.actionEmoji}>📢</Text>
          <Text style={styles.actionTitle}>Duyurular</Text>
          <Text style={styles.actionDesc}>Son duyuruları görüntüle</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderComingSoon = (title: string, emoji: string) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{emoji} {title}</Text>
      <View style={styles.comingSoonContainer}>
        <Ionicons name="construct-outline" size={60} color="#154373" />
        <Text style={styles.comingSoonText}>Bu bölüm yakında aktif olacak</Text>
        <Text style={styles.comingSoonSubtext}>
          Web uygulamasında bu özelliği kullanabilirsiniz
        </Text>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return renderHome();
      case 'work':
        return renderComingSoon('Üretim İşleri', '🔧');
      case 'history':
        return renderComingSoon('Geçmiş', '📜');
      case 'izin':
        return renderComingSoon('İzin Talepleri', '📝');
      case 'duyuru':
        return renderComingSoon('Duyurular', '📢');
      case 'iletisim':
        return renderComingSoon('Görüş/Öneri/Şikayet', '💬');
      default:
        return renderHome();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#154373', '#154373']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Personel Portalı</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadPersonelData} />
          }
        >
          {renderContent()}
        </ScrollView>

        {/* Bottom Tab Navigation */}
        <View style={styles.bottomTabContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bottomTabContent}
            style={styles.bottomTabScroll}
          >
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.bottomTabItem}
                onPress={() => setActiveSection(item.id)}
              >
                <Ionicons 
                  name={item.icon as any} 
                  size={26} 
                  color={activeSection === item.id ? '#25b2ef' : '#8a9ba8'} 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 35,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    flex: 1,
    backgroundColor: '#f7fafd',
    marginBottom: 0,
  },
  section: {
    padding: 20,
  },
  welcomeBanner: {
    backgroundColor: '#e7f5fe',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1.5,
    borderColor: '#bae9fd',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0e2a47',
    textAlign: 'center',
  },
  quickActions: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0e2a47',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionCard: {
    backgroundColor: '#fafdff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: '#e5eaf2',
    shadowColor: '#25b2ef',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionEmoji: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#154373',
    textAlign: 'center',
    marginBottom: 8,
  },
  actionDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  comingSoonContainer: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#154373',
    marginTop: 15,
    textAlign: 'center',
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  bottomTabContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e4eaf2',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    height: 60,
  },
  bottomTabScroll: {
    flex: 1,
  },
  bottomTabContent: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    minWidth: '100%',
  },
  bottomTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    minWidth: 35,
  },
});

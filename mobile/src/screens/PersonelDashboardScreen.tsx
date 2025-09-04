import React, { useState, useEffect, useRef } from 'react';
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
  Linking,
  Image,
  TextInput,
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../services/api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as DocumentPicker from 'expo-document-picker';

interface PersonelDashboardScreenProps {
  navigation: any;
}

interface PersonelData {
  ad: string;
  soyad: string;
  email: string;
}

interface DuyuruItem {
  id: number;
  text: string;
  image?: string | null;
  video?: string | null;
  createdAt: string;
}

interface IletisimForm {
  tur: string;
  mesaj: string;
}

interface IzinTur {
  key: string;
  ad: string;
  toplam: number;
}

interface IzinItem {
  id: number;
  personelId: number | string;
  tur: string;
  baslangic: string;
  bitis: string;
  gun?: number;
  gerekce?: string;
  belge?: string | null;
  durum?: string;
  tarih?: string;
}

export default function PersonelDashboardScreen({ navigation }: PersonelDashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  
  // Swipe navigation refs
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [personelData, setPersonelData] = useState<PersonelData | null>(null);
  const [duyurular, setDuyurular] = useState<DuyuruItem[]>([]);
  const [iletisimForm, setIletisimForm] = useState<IletisimForm>({ tur: '', mesaj: '' });
  const [izinTurleri] = useState<IzinTur[]>([
    { key: 'yillik',   ad: 'Yıllık Ücretli İzin', toplam: 14 },
    { key: 'ucretsiz', ad: 'Ücretsiz İzin',       toplam: 30 },
    { key: 'mazeret',  ad: 'Mazeret İzni',        toplam: 7 },
    { key: 'rapor',    ad: 'Sağlık Raporu',       toplam: 20 },
  ]);
  const [kalanHak, setKalanHak] = useState<Record<string, number>>({});
  const [izinForm, setIzinForm] = useState({ tur: '', neden: '', baslangic: '', bitis: '' });
  const [izinler, setIzinler] = useState<IzinItem[]>([]);
  const [izinLoading, setIzinLoading] = useState(false);
  const [izinTurOpen, setIzinTurOpen] = useState(false);
  const [izinTurModalVisible, setIzinTurModalVisible] = useState(false);
  const [belge, setBelge] = useState<{ uri: string; name: string; type?: string } | null>(null);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [tempCal, setTempCal] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1, day: new Date().getDate() });

  useEffect(() => {
    loadPersonelData();
  }, []);

  useEffect(() => {
    const sectionNow = menuItems[currentPageIndex]?.id;
    if (sectionNow === 'duyuru') {
      loadDuyurular();
    }
    if (sectionNow === 'izin') {
      loadIzinData();
    }
    if (sectionNow === 'work') {
      loadAktifKartlar();
      restoreJob();
    }
    setActiveSection(sectionNow || 'home');
  }, [currentPageIndex]);

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

  const loadDuyurular = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/duyurular`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const list = await res.json();
        setDuyurular(list);
      }
    } catch {}
  };

  const sendIletisim = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      if (!iletisimForm.tur || !iletisimForm.mesaj.trim()) {
        Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/iletisim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tur: iletisimForm.tur,
          mesaj: iletisimForm.mesaj.trim()
        })
      });

      if (response.ok) {
        Alert.alert('Başarılı', 'Mesajınız başarıyla gönderildi.');
        setIletisimForm({ tur: '', mesaj: '' });
      } else {
        const error = await response.json().catch(() => ({ message: 'Hata oluştu' }));
        Alert.alert('Hata', error.message || 'Mesaj gönderilemedi.');
      }
    } catch (error) {
      console.error('İletişim hatası:', error);
      Alert.alert('Hata', 'Bağlantı hatası oluştu.');
    }
  };

  const loadIzinData = async () => {
    try {
      setIzinLoading(true);
      const token = await AsyncStorage.getItem('token');
      // kalan haklar
      try {
        const resK = await fetch(`${API_BASE_URL}/api/izin/kalan`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (resK.ok) {
          const kalan = await resK.json();
          // kalan objesi { "Yıllık Ücretli İzin": 12, ... }
          const map: Record<string, number> = {};
          izinTurleri.forEach(t => {
            const val = typeof kalan[t.ad] === 'number' ? kalan[t.ad] : t.toplam;
            map[t.key] = val;
          });
          setKalanHak(map);
        }
      } catch {}
      // izin listesi (kişiye özel dönüyor)
      try {
        const resL = await fetch(`${API_BASE_URL}/api/izin`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (resL.ok) {
          const list = await resL.json();
          setIzinler(list);
        } else {
          setIzinler([]);
        }
      } catch {
        setIzinler([]);
      }
    } finally {
      setIzinLoading(false);
    }
  };

  const sendIzin = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      if (!izinForm.tur || !izinForm.neden.trim() || !izinForm.baslangic || !izinForm.bitis) {
        Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
        return;
      }
      const fd = new FormData();
      fd.append('tur', izinForm.tur as any);
      fd.append('neden', izinForm.neden as any);
      fd.append('baslangic', izinForm.baslangic as any);
      fd.append('bitis', izinForm.bitis as any);
      const res = await fetch(`${API_BASE_URL}/api/izin`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: (() => {
          if (belge) {
            const file: any = {
              uri: belge.uri,
              name: belge.name,
              type: belge.type || 'application/octet-stream',
            };
            (fd as any).append('belge', file);
          }
          return fd as any;
        })(),
      });
      if (res.ok) {
        Alert.alert('Başarılı', 'İzin talebiniz kaydedildi.');
        setIzinForm({ tur: '', neden: '', baslangic: '', bitis: '' });
        setBelge(null);
        loadIzinData();
      } else {
        const err = await res.json().catch(() => ({ message: 'Hata oluştu.' }));
        Alert.alert('Hata', err.message || 'İzin talebi gönderilemedi.');
      }
    } catch (e) {
      Alert.alert('Hata', 'Bağlantı hatası oluştu.');
    }
  };

  // Calendar helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month - 1, 1).getDay();
  const getMonthName = (month: number) => ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'][month - 1];
  const formatYmd = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const openCalendar = (type: 'start'|'end') => {
    const current = type === 'start' ? izinForm.baslangic : izinForm.bitis;
    if (current && /^\d{4}-\d{2}-\d{2}$/.test(current)) {
      const [y,m,d] = current.split('-').map(v=>parseInt(v,10));
      setTempCal({ year: y, month: m, day: d });
    } else {
      const now = new Date();
      setTempCal({ year: now.getFullYear(), month: now.getMonth()+1, day: now.getDate() });
    }
    if (type==='start') setShowStartCalendar(true); else setShowEndCalendar(true);
  };
  const pickDate = (type: 'start'|'end', y: number, m: number, d: number) => {
    const val = formatYmd(y,m,d);
    if (type==='start') {
      setIzinForm({ ...izinForm, baslangic: val });
      setShowStartCalendar(false);
    } else {
      setIzinForm({ ...izinForm, bitis: val });
      setShowEndCalendar(false);
    }
  };

  // Dosyayı indirip paylaş/galeri seçenekleri sun
  const openUploadWithChooser = async (fileName: string) => {
    try {
      const url = `${API_BASE_URL}/uploads/${fileName}`;
      const ext = (fileName.split('.').pop() || '').toLowerCase();
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
        : ext === 'png' ? 'image/png'
        : ext === 'gif' ? 'image/gif'
        : ext === 'webp' ? 'image/webp'
        : ext === 'mp4' ? 'video/mp4'
        : ext === 'mov' ? 'video/quicktime'
        : 'application/octet-stream';

      const target = FileSystem.cacheDirectory + fileName;
      const dl = await FileSystem.downloadAsync(url, target);
      if (dl.status !== 200) return Alert.alert('Hata', 'Dosya indirilemedi');

      Alert.alert(
        'Dosya İşlemi',
        'Ne yapmak istersiniz?',
        [
          {
            text: 'Galeriye Kaydet',
            onPress: async () => {
              const perm = await MediaLibrary.requestPermissionsAsync(true as any);
              const granted = (perm as any).granted || (perm as any).accessPrivileges === 'all';
              if (!granted) {
                Alert.alert('İzin Verilmedi', 'Galeriye kaydetmek için izin gerekiyor.');
                return;
              }
              try {
                await MediaLibrary.saveToLibraryAsync(dl.uri);
                Alert.alert('Başarılı', 'Galeriye kaydedildi.');
              } catch {
                Alert.alert('Hata', 'Galeriye kaydedilemedi.');
              }
            }
          },
          {
            text: 'Paylaş/Aç',
            onPress: async () => {
              try {
                await Sharing.shareAsync(dl.uri, { mimeType: mime, dialogTitle: 'Uygulama seçin' });
              } catch {
                Alert.alert('Hata', 'Paylaşım açılamadı.');
              }
            }
          },
          { text: 'İptal', style: 'cancel' }
        ]
      );
    } catch (e) {
      Alert.alert('Hata', 'Dosya açılamadı');
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

  // Swipe navigation functions
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(contentOffsetX / width);
    if (pageIndex !== currentPageIndex && pageIndex >= 0 && pageIndex < menuItems.length) {
      setCurrentPageIndex(pageIndex);
    }
  };

  const scrollToPage = (pageIndex: number) => {
    scrollViewRef.current?.scrollTo({
      x: pageIndex * width,
      animated: true,
    });
  };

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

  // Üretim İşleri (aktif kartlar ve iş akışı)
  interface AktifKart { id: string; ad: string; hedef: number }
  const [aktifKartlar, setAktifKartlar] = useState<AktifKart[]>([]);
  const [inProgress, setInProgress] = useState<{ kartId: string; kartAd: string; startTs: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timer | null>(null);
  const [qty, setQty] = useState('');
  const [desc, setDesc] = useState('');

  const formatTime = (sec: number) => {
    const h = String(Math.floor(sec/3600)).padStart(2,'0');
    const m = String(Math.floor((sec%3600)/60)).padStart(2,'0');
    const s = String(sec%60).padStart(2,'0');
    return `${h}:${m}:${s}`;
  };

  const startTimer = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current as any); timerRef.current = null; }
  };

  const loadAktifKartlar = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/uretim/personel/aktif`, { headers: token ? { Authorization:`Bearer ${token}` } : undefined });
      const list = res.ok ? await res.json() : [];
      setAktifKartlar(Array.isArray(list) ? list : []);
    } catch {}
  };

  const restoreJob = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/uretim/personel/inprogress`, { headers: token ? { Authorization:`Bearer ${token}` } : undefined });
      if (res.ok) {
        const job = await res.json();
        if (job && job.kartId) {
          setInProgress({ kartId: job.kartId, kartAd: job.kartAd, startTs: job.startTs });
          setElapsed(Math.floor((Date.now() - job.startTs)/1000));
          startTimer();
        }
      }
    } catch {}
  };

  const startJob = async (id: string, ad: string) => {
    try {
      if (inProgress) { Alert.alert('Uyarı','Önceki işi bitirin.'); return; }
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/uretim/personel/baslat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kartId: id })
      });
      if (!res.ok) { const e = await res.json().catch(()=>({ hata: res.status })); Alert.alert('Hata', 'Başlatma hatası: ' + (e.hata||res.status)); return; }
      setInProgress({ kartId: id, kartAd: ad, startTs: Date.now() });
      setElapsed(0); setQty(''); setDesc(''); startTimer();
    } catch {}
  };

  const pauseJob = () => { stopTimer(); };
  const resumeJob = () => { startTimer(); };

  const finishJob = async () => {
    try {
      if (!inProgress) return;
      stopTimer();
      const adet = Number(qty);
      if (!adet) { Alert.alert('Hata','Lütfen adet girin'); return; }
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/uretim/personel/kayit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kartId: inProgress.kartId, adet, aciklama: desc.trim() })
      });
      if (!res.ok) { const e = await res.json().catch(()=>({ hata: res.status })); Alert.alert('Hata','Kayıt hatası: ' + (e.hata||res.status)); return; }
      Alert.alert('Başarılı','Kaydedildi');
      setInProgress(null); setElapsed(0); setQty(''); setDesc('');
      loadAktifKartlar();
    } catch {}
  };

  const renderWork = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🔧 Üretim İşleri</Text>
      <View style={{ marginTop: 6 }}>
        {aktifKartlar.length === 0 ? (
          <View style={styles.comingSoonContainer}>
            <Ionicons name="layers-outline" size={42} color="#154373" />
            <Text style={styles.comingSoonText}>Aktif kart yok</Text>
          </View>
        ) : (
          aktifKartlar.map(k => (
            <View key={k.id} style={[styles.actionCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }] }>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#0e2a47' }}>{k.ad}</Text>
                <Text style={{ color: '#6b7280', marginTop: 2 }}>Hedef: {k.hedef}</Text>
              </View>
              <TouchableOpacity style={styles.primaryButton} onPress={() => startJob(k.id, k.ad)}>
                <Ionicons name="play-outline" size={16} color="#fff" />
                <Text style={styles.primaryButtonText}>Başlat</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {inProgress && (
        <View style={[styles.actionCard, { marginTop: 10 }] }>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0e2a47' }}>{inProgress.kartAd}</Text>
          <Text style={{ color: '#6b7280', marginTop: 4 }}>Süre: <Text style={{ fontFamily: 'monospace' }}>{formatTime(elapsed)}</Text></Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={styles.secondaryButton} onPress={pauseJob}><Text style={styles.secondaryButtonText}>Duraklat</Text></TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={resumeJob}><Text style={styles.secondaryButtonText}>Devam Et</Text></TouchableOpacity>
            <TouchableOpacity style={styles.negativeButton} onPress={finishJob}><Text style={styles.negativeButtonText}>Bitir</Text></TouchableOpacity>
          </View>
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#0e2a47', marginBottom: 6 }}>Üretilen Adet</Text>
            <TextInput style={{ borderWidth: 1, borderColor: '#d0d0d0', borderRadius: 8, padding: 12, backgroundColor: '#fff' }} keyboardType="numeric" value={qty} onChangeText={setQty} placeholder="Adet" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#0e2a47', marginBottom: 6, marginTop: 10 }}>Açıklama</Text>
            <TextInput style={{ borderWidth: 1, borderColor: '#d0d0d0', borderRadius: 8, padding: 12, backgroundColor: '#fff' }} value={desc} onChangeText={setDesc} placeholder="Açıklama" />
          </View>
        </View>
      )}
    </View>
  );

  const renderDuyurular = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📢 Duyurular</Text>
      {duyurular.length === 0 ? (
        <View style={styles.comingSoonContainer}>
          <Ionicons name="megaphone-outline" size={60} color="#154373" />
          <Text style={styles.comingSoonText}>Henüz duyuru yok</Text>
        </View>
      ) : (
        duyurular.map((d) => (
          <View key={d.id} style={styles.actionCard}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0e2a47' }}>{d.text}</Text>
            {(d.image || d.video) && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'stretch' }}>
                {d.image ? (
                  <TouchableOpacity onPress={() => openUploadWithChooser(d.image!)} style={{ flex: 1 }} activeOpacity={0.85}>
                    <Image
                      source={{ uri: `${API_BASE_URL}/uploads/${d.image}` }}
                      style={{ width: '100%', height: 180, borderRadius: 8, backgroundColor: '#fff' }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : null}
                {d.video ? (
                  <TouchableOpacity onPress={() => openUploadWithChooser(d.video!)} style={{ flex: 1, height: 180, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
                    <Ionicons name="play-circle-outline" size={36} color="#25b2ef" />
                    <Text numberOfLines={1} style={{ color: '#6b7280', marginTop: 4 }}>{d.video}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
            <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 8 }}>{new Date(d.createdAt).toLocaleString()}</Text>
          </View>
        ))
      )}
    </View>
  );

  const renderIzin = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📝 İzin Talepleri</Text>

      <View style={styles.actionCard}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#0e2a47', marginBottom: 12 }}>
          Yeni İzin Talebi
        </Text>

        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>İzin Türü</Text>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownSelect}
            onPress={() => setIzinTurModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownSelectedText} numberOfLines={1}>
              {izinForm.tur
                ? `${(izinTurleri.find(t => t.key === izinForm.tur)?.ad) || ''} (Kalan: ${(kalanHak[izinForm.tur] ?? izinTurleri.find(t => t.key === izinForm.tur)?.toplam) ?? ''} gün)`
                : 'Lütfen seçiniz'}
            </Text>
            <Ionicons name={'chevron-down-outline'} size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* İzin Türü Modal (Admin yıl/ay seçici stilinde) */}
        <Modal
          visible={izinTurModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIzinTurModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIzinTurModalVisible(false)}
          >
            <View style={styles.monthDropdownContainer}>
              <View style={styles.monthDropdownHeader}>
                <Text style={styles.monthDropdownTitle}>İzin Türü Seç</Text>
                <TouchableOpacity 
                  onPress={() => setIzinTurModalVisible(false)}
                  style={styles.monthDropdownClose}
                >
                  <Ionicons name="close-outline" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <ScrollView 
                style={styles.monthDropdownScroll}
                showsVerticalScrollIndicator={true}
                indicatorStyle="default"
              >
                <TouchableOpacity
                  style={[styles.monthDropdownItem, !izinForm.tur && styles.monthDropdownItemSelected]}
                  onPress={() => { setIzinForm({ ...izinForm, tur: '' }); setIzinTurModalVisible(false); }}
                >
                  <Text style={[styles.monthDropdownItemText, !izinForm.tur && styles.monthDropdownItemTextSelected]}>Lütfen seçiniz</Text>
                  {!izinForm.tur && (
                    <Ionicons name="checkmark-outline" size={20} color="#25b2ef" />
                  )}
                </TouchableOpacity>
                {izinTurleri.map((t) => {
                  const kalan = (kalanHak[t.key] ?? t.toplam);
                  const selected = izinForm.tur === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.monthDropdownItem, selected && styles.monthDropdownItemSelected]}
                      onPress={() => { setIzinForm({ ...izinForm, tur: t.key }); setIzinTurModalVisible(false); }}
                    >
                      <Text style={[styles.monthDropdownItemText, selected && styles.monthDropdownItemTextSelected]}>{`${t.ad} (Kalan: ${kalan} gün)`}</Text>
                      {selected && (
                        <Ionicons name="checkmark-outline" size={20} color="#25b2ef" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>Gerekçe</Text>
        <View style={styles.iletisimMesajContainer}>
          <TextInput
            style={styles.iletisimMesajInput}
            placeholder="İzin açıklaması"
            value={izinForm.neden}
            onChangeText={(text) => setIzinForm({ ...izinForm, neden: text })}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>Başlangıç</Text>
            <TouchableOpacity style={styles.dateInput} activeOpacity={0.8} onPress={() => openCalendar('start')}>
              <Text style={styles.dateInputText}>{izinForm.baslangic || 'Tarih seçin'}</Text>
              <Ionicons name="calendar-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>Bitiş</Text>
            <TouchableOpacity style={styles.dateInput} activeOpacity={0.8} onPress={() => openCalendar('end')}>
              <Text style={styles.dateInputText}>{izinForm.bitis || 'Tarih seçin'}</Text>
              <Ionicons name="calendar-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 8 }}>
          Belge (opsiyonel)
        </Text>
        <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={styles.fileButton}
            activeOpacity={0.85}
            onPress={async () => {
              const result = await DocumentPicker.getDocumentAsync({ type: ['*/*'] });
              if ((result as any).canceled) return;
              const asset = (result as any).assets?.[0];
              if (asset?.uri && asset?.name) {
                setBelge({ uri: asset.uri, name: asset.name, type: asset.mimeType });
              }
            }}
          >
            <Ionicons name="attach-outline" size={18} color="#fff" />
            <Text style={styles.fileButtonText}>{belge ? 'Belgeyi Değiştir' : 'Belge Seç'}</Text>
          </TouchableOpacity>
          {belge ? (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1 }} numberOfLines={1}>{belge.name}</Text>
              <TouchableOpacity onPress={() => setBelge(null)} style={styles.fileRemoveBtn}>
                <Ionicons name="close" size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.iletisimGonderButton, { marginTop: 16 }, (!izinForm.tur || !izinForm.neden.trim() || !izinForm.baslangic || !izinForm.bitis) && styles.iletisimGonderButtonDisabled]}
          onPress={sendIzin}
          disabled={!izinForm.tur || !izinForm.neden.trim() || !izinForm.baslangic || !izinForm.bitis}
        >
          <Text style={styles.iletisimGonderButtonText}>Talebi Gönder</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { fontSize: 18, marginTop: 10 }]}>Geçmiş Talepler</Text>
      {izinLoading ? (
        <View style={styles.comingSoonContainer}><Text>Yükleniyor...</Text></View>
      ) : (
        (izinler || []).length === 0 ? (
          <View style={styles.comingSoonContainer}><Text>Talep bulunamadı</Text></View>
        ) : (
          izinler.map((i) => {
            const t = izinTurleri.find(x => x.key === i.tur);
            const gun = i.baslangic && i.bitis ? (Math.round(((new Date(i.bitis as any as string).getTime() - new Date(i.baslangic as any as string).getTime()) / (1000*60*60*24))) + 1) : i.gun || '' as any;
            return (
              <View key={i.id} style={styles.actionCard}>
                <Text style={{ fontWeight: '600', color: '#0e2a47' }}>{t ? t.ad : i.tur}</Text>
                <Text style={{ color: '#374151', marginTop: 4 }}>Tarih: {i.baslangic} - {i.bitis}</Text>
                {i.gerekce ? <Text style={{ color: '#374151', marginTop: 4 }}>Açıklama: {i.gerekce}</Text> : null}
                <Text style={{ color: '#374151', marginTop: 4 }}>Süre: {gun} gün</Text>
                <Text style={{ fontWeight: '700', color: i.durum === 'Onaylandı' ? '#059669' : i.durum === 'Reddedildi' ? '#dc2626' : '#a16207', marginTop: 6 }}>
                  Durum: {i.durum || '-'}
                </Text>
                {i.belge ? (
                  <TouchableOpacity onPress={() => openUploadWithChooser(i.belge!)} style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="attach-outline" size={18} color="#25b2ef" />
                    <Text style={{ color: '#25b2ef' }} numberOfLines={1}>{i.belge}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })
        )
      )}
    </View>
  );

  const renderCalendarModal = (type: 'start'|'end') => {
    const visible = type==='start'?showStartCalendar:showEndCalendar;
    const onClose = () => type==='start'?setShowStartCalendar(false):setShowEndCalendar(false);
    const daysInMonth = getDaysInMonth(tempCal.year, tempCal.month);
    const firstDay = getFirstDayOfMonth(tempCal.year, tempCal.month);
    const today = new Date();
    const selectedStr = type==='start' ? izinForm.baslangic : izinForm.bitis;
    const [selY, selM, selD] = selectedStr && /^\d{4}-\d{2}-\d{2}$/.test(selectedStr)
      ? selectedStr.split('-').map(v=>parseInt(v,10))
      : [today.getFullYear(), today.getMonth()+1, today.getDate()];
    const weeks: Array<Array<number|null>> = [];
    let currentWeek: Array<number|null> = Array(firstDay===0?0:firstDay-1).fill(null);
    for (let d=1; d<=daysInMonth; d++) {
      currentWeek.push(d);
      if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
    }
    if (currentWeek.length) { while(currentWeek.length<7) currentWeek.push(null); weeks.push(currentWeek); }
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.navButton} onPress={() => setTempCal({ year: tempCal.month===1?tempCal.year-1:tempCal.year, month: tempCal.month===1?12:tempCal.month-1, day: 1 })}>
                <Ionicons name="chevron-back" size={20} color="#1761a0" />
              </TouchableOpacity>
              <Text style={styles.monthYearText}>{getMonthName(tempCal.month)} {tempCal.year}</Text>
              <TouchableOpacity style={styles.navButton} onPress={() => setTempCal({ year: tempCal.month===12?tempCal.year+1:tempCal.year, month: tempCal.month===12?1:tempCal.month+1, day: 1 })}>
                <Ionicons name="chevron-forward" size={20} color="#1761a0" />
              </TouchableOpacity>
            </View>
            <View style={styles.weekHeader}>
              {['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map((d)=> (
                <Text key={d} style={styles.weekHeaderText}>{d}</Text>
              ))}
            </View>
            {weeks.map((w, wi) => (
              <View key={wi} style={styles.weekRow}>
                {w.map((d, di) => (
                  <TouchableOpacity key={di} style={[
                    styles.dayCell,
                    d===null ? styles.dayCellEmpty : null,
                    (d!==null && selY===tempCal.year && selM===tempCal.month && selD===d) ? styles.dayCellSelected : null
                  ]} disabled={d===null} onPress={() => d && pickDate(type, tempCal.year, tempCal.month, d)}>
                    <Text style={[
                      styles.dayCellText,
                      (d!==null && selY===tempCal.year && selM===tempCal.month && selD===d) ? styles.dayCellTextSelected : null
                    ]}>{d??''}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderIletisim = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>💬 Görüş / Öneri / Şikayet</Text>
      
      <View style={styles.actionCard}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#0e2a47', marginBottom: 15 }}>
          Mesajınızı gönderin
        </Text>
        
        <View style={{ marginBottom: 15 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
            Tür
          </Text>
          <View style={styles.iletisimTurContainer}>
            {['Görüş', 'Öneri', 'Şikayet'].map((tur) => (
              <TouchableOpacity
                key={tur}
                style={[
                  styles.iletisimTurButton,
                  iletisimForm.tur === tur && styles.iletisimTurButtonActive
                ]}
                onPress={() => setIletisimForm({ ...iletisimForm, tur })}
              >
                <Text style={[
                  styles.iletisimTurButtonText,
                  iletisimForm.tur === tur && styles.iletisimTurButtonTextActive
                ]}>
                  {tur}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
            Mesajınız
          </Text>
          <View style={styles.iletisimMesajContainer}>
            <TextInput
              style={styles.iletisimMesajInput}
              placeholder="Mesajınızı buraya yazın..."
              value={iletisimForm.mesaj}
              onChangeText={(text) => setIletisimForm({ ...iletisimForm, mesaj: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.iletisimGonderButton,
            (!iletisimForm.tur || !iletisimForm.mesaj.trim()) && styles.iletisimGonderButtonDisabled
          ]}
          onPress={sendIletisim}
          disabled={!iletisimForm.tur || !iletisimForm.mesaj.trim()}
        >
          <Text style={styles.iletisimGonderButtonText}>Gönder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );



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

        {/* Swipeable Content */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={styles.swipeContainer}
        >
          {menuItems.map((item, index) => (
            <View key={item.id} style={[styles.pageContainer, { width }]}>
              <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: (Math.max(insets.bottom, 5) + 8) + 72 }}
                refreshControl={
                  <RefreshControl refreshing={loading} onRefresh={loadPersonelData} />
                }
              >
                {(() => {
                  switch (item.id) {
                    case 'home':
                      return renderHome();
                    case 'work':
                      return renderWork();
                    case 'history':
                      return renderComingSoon('Geçmiş', '📜');
                    case 'izin':
                      return renderIzin();
                    case 'duyuru':
                      return renderDuyurular();
                    case 'iletisim':
                      return renderIletisim();
                    default:
                      return renderHome();
                  }
                })()}
                {renderCalendarModal('start')}
                {renderCalendarModal('end')}
              </ScrollView>
            </View>
          ))}
        </ScrollView>

        {/* Bottom Tab Navigation */}
        <View style={[styles.bottomTabContainer, { paddingBottom: Math.max(insets.bottom, 5) + 8 }] }>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bottomTabContent}
            style={styles.bottomTabScroll}
          >
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={styles.bottomTabItem}
                onPress={() => {
                  const pageIndex = menuItems.findIndex(menuItem => menuItem.id === item.id);
                  scrollToPage(pageIndex);
                }}
              >
                <Ionicons 
                  name={item.icon as any} 
                  size={26} 
                  color={currentPageIndex === index ? '#25b2ef' : '#8a9ba8'} 
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
  swipeContainer: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
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
  primaryButton: {
    backgroundColor: '#154373',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#444c59',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  secondaryButtonText: { color: '#fff', fontWeight: '600' },
  negativeButton: {
    backgroundColor: '#e30613',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  negativeButtonText: { color: '#fff', fontWeight: '700' },
  // Calendar styles
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 6,
  },
  weekHeaderText: {
    width: (width - 48) / 7,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 24,
    minWidth: '75%',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 6,
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0e2a47',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  dayCell: {
    width: (width - 48) / 7,
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  dayCellSelected: {
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#25b2ef',
  },
  dayCellEmpty: {
    backgroundColor: 'transparent',
  },
  dayCellText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  dayCellTextSelected: {
    color: '#1761a0',
    fontWeight: '800',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  dateInputText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  fileButton: {
    backgroundColor: '#25b2ef',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fileButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fileRemoveBtn: {
    padding: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    backgroundColor: '#fff1f2',
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
    paddingTop: 6,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
  // İletişim stilleri
  iletisimTurContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  iletisimTurButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  iletisimTurButtonActive: {
    backgroundColor: '#25b2ef',
    borderColor: '#25b2ef',
  },
  iletisimTurButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  iletisimTurButtonTextActive: {
    color: '#fff',
  },
  iletisimMesajContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  iletisimMesajInput: {
    padding: 12,
    fontSize: 16,
    color: '#374151',
    minHeight: 100,
  },
  iletisimGonderButton: {
    backgroundColor: '#25b2ef',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  iletisimGonderButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  iletisimGonderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Dropdown styles
  dropdownContainer: {
    marginBottom: 12,
  },
  dropdownSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  dropdownSelectedText: {
    flex: 1,
    marginRight: 8,
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownOptions: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownOptionText: {
    color: '#374151',
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Reuse admin dropdown modal styles naming
  monthDropdownContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: '75%',
  },
  monthDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  monthDropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0e2a47',
  },
  monthDropdownClose: {
    padding: 6,
  },
  monthDropdownScroll: {
    maxHeight: 230,
  },
  monthDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  monthDropdownItemSelected: {
    backgroundColor: '#f0f9ff',
  },
  monthDropdownItemText: {
    fontSize: 15,
    color: '#374151',
  },
  monthDropdownItemTextSelected: {
    color: '#1761a0',
    fontWeight: '700',
  },
});

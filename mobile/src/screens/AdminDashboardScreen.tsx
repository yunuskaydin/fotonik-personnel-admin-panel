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
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// API Base URL'i services'den import et
import { API_BASE_URL } from '../services/api';

interface AdminDashboardScreenProps {
  navigation: any;
}

interface Stats {
  toplam: number;
  rapor: string;
  izin: number;
}

interface IletisimMesaj {
  id: number;
  tarih: string;
  tur: string;
  mesaj: string;
  okundu: boolean;
}

interface IzinTalebi {
  id: number;
  personelId: number;
  tur: string;
  baslangic: string;
  bitis: string;
  gun: number;
  gerekce: string;
  belge?: string;
  durum: string;
  tarih: string;
  onayTarihi?: string;
  onaylayan?: string;
}

interface IzinTuru {
  key: string;
  ad: string;
  toplam: number;
}

interface Personel {
  id: number;
  ad: string;
  soyad: string;
  egitim: string;
  gorev: string;
  baslama: string;
  foto?: string;
}

interface OzlukBelge {
  id: number;
  personelId: number;
  tur: string;
  dosya: string;
}

// Üretim Kartları
interface UretimKart {
  id: string;
  ad: string;
  hedef: number;
  topAdet?: number;
  kalan?: number;
  aciklama?: string;
  aktif?: boolean;
  tamamlandi?: boolean;
}

interface DocumentFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

// Duyurular
interface DuyuruItem {
  id: number;
  text: string;
  image?: string | null;
  video?: string | null;
  createdAt: string;
}

const { width } = Dimensions.get('window');

export default function AdminDashboardScreen({ navigation }: AdminDashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<Stats>({ toplam: 0, rapor: '—', izin: 0 });
  const [loading, setLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState<{[key:string]: boolean}>({});
  const [visitedSections, setVisitedSections] = useState<{[key:string]: boolean}>({});

  const setSectionBusy = (key: string, val: boolean) => {
    setSectionLoading(prev => ({ ...prev, [key]: val }));
  };

  const SkeletonCard = () => (
    <View style={{ backgroundColor:'#f3f4f6', borderRadius:12, padding:16, marginBottom:12 }}>
      <View style={{ height:14, backgroundColor:'#e5e7eb', borderRadius:6, width:'55%' }} />
      <View style={{ height:10, backgroundColor:'#e5e7eb', borderRadius:6, width:'35%', marginTop:10 }} />
      <View style={{ height:10, backgroundColor:'#e5e7eb', borderRadius:6, width:'65%', marginTop:8 }} />
    </View>
  );

  const SkeletonList = ({ count=3 }:{count?:number}) => (
    <View style={{ paddingHorizontal:20, paddingTop:10 }}>
      {Array.from({length:count}).map((_,i)=>(<SkeletonCard key={i}/>))}
    </View>
  );

  const renderWithSkeleton = (key: string, render: () => React.ReactElement) => {
    const showSkeleton = !visitedSections[key] || sectionLoading[key];
    return showSkeleton ? <SkeletonList /> : render();
  };
  const [activeSection, setActiveSection] = useState('dashboard');
  const [personelList, setPersonelList] = useState<Personel[]>([]);
  
  // Swipe navigation refs
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  // İletişim state'leri
  const [iletisimMesajlari, setIletisimMesajlari] = useState<IletisimMesaj[]>([]);
  const [selectedMessageFilter, setSelectedMessageFilter] = useState('Tümü');
  
  // İzin Talepleri State'leri
  const [izinTalepleri, setIzinTalepleri] = useState<IzinTalebi[]>([]);
  const [izinTurleri, setIzinTurleri] = useState<IzinTuru[]>([]);
  const [izinFilters, setIzinFilters] = useState({
    ay: 'Tümü',
    yil: 'Tümü',
    personelId: '',
    tur: '',
    durum: ''
  });
  const [izinDisplayed, setIzinDisplayed] = useState<IzinTalebi[]>([]);
  const [izinQueried, setIzinQueried] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Duyurular state
  const [duyurular, setDuyurular] = useState<DuyuruItem[]>([]);
  const [duyuruModalVisible, setDuyuruModalVisible] = useState(false);
  const [editingDuyuru, setEditingDuyuru] = useState<DuyuruItem | null>(null);
  const [duyuruText, setDuyuruText] = useState('');
  const [duyuruImage, setDuyuruImage] = useState<DocumentFile | null>(null);
  const [duyuruVideo, setDuyuruVideo] = useState<DocumentFile | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPersonel, setEditingPersonel] = useState<Personel | null>(null);
  const [editForm, setEditForm] = useState({
    ad: '',
    soyad: '',
    egitim: '',
    gorev: '',
    baslama: ''
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate()
  });
  
  // Add Person Modal States
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm, setAddForm] = useState({
    ad: '',
    soyad: '',
    egitim: '',
    gorev: '',
    baslama: ''
  });
  const [addSelectedImage, setAddSelectedImage] = useState<string | null>(null);
  const [addShowDatePicker, setAddShowDatePicker] = useState(false);
  const [addTempDate, setAddTempDate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate()
  });

  // Özlük Belgeleri States
  const [selectedPersonelId, setSelectedPersonelId] = useState<number | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [selectedDocument, setSelectedDocument] = useState<DocumentFile | null>(null);
  const [ozlukBelgeleri, setOzlukBelgeleri] = useState<OzlukBelge[]>([]);
  const [ozlukLoading, setOzlukLoading] = useState(false);
  const [showPersonelPicker, setShowPersonelPicker] = useState(false);
  const [showDocumentTypePicker, setShowDocumentTypePicker] = useState(false);

  const documentTypes = [
    'Diploma',
    'Adli Sicil Kaydı',
    'Vesikalık',
    'Sağlık Raporu',
    'İkametgah',
    'Nüfus Cüzdanı Örneği',
    'Askerlik Durumu'
  ];

  // Track if this is the first load
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Üretim Kartları State'leri
  const [kartlar, setKartlar] = useState<UretimKart[]>([]);
  const [kartLoading, setKartLoading] = useState(false);
  const [kartModalVisible, setKartModalVisible] = useState(false);
  const [newKart, setNewKart] = useState({ ad: '', hedef: '', aciklama: '' });

  useEffect(() => {
    if (isFirstLoad) {
      // First load - use regular loading with indicator
      loadStats();
      setIsFirstLoad(false);
    } else {
      // Section changes - use quiet loading without indicator
      loadStatsQuiet();
    }

    const sectionNow = menuItems[currentPageIndex]?.id;
    if (!sectionNow) return;

    const firstVisit = !visitedSections[sectionNow];
    if (firstVisit) setSectionBusy(sectionNow, true);

    (async () => {
      try {
        if (sectionNow === 'personel') {
          if (isFirstLoad) await loadPersoneller(); else await loadPersonellerQuiet();
        } else if (sectionNow === 'ozluk') {
          // Reset özlük states when entering özlük section
          setSelectedPersonelId(null);
          setSelectedDocumentType('');
          setSelectedDocument(null);
          setOzlukBelgeleri([]);
          setShowPersonelPicker(false);
          setShowDocumentTypePicker(false);
          if (isFirstLoad) await loadPersoneller(); else await loadPersonellerQuiet();
        } else if (sectionNow === 'iletisim') {
          await loadIletisimMesajlari();
        } else if (sectionNow === 'izin') {
          // Reset to defaults on each enter
          setIzinFilters({ ay: 'Tümü', yil: 'Tümü', personelId: '', tur: '', durum: '' });
          setIzinDisplayed([]);
          setIzinQueried(false);
          await Promise.all([loadIzinTalepleri(), loadIzinTurleri()]);
        } else if (sectionNow === 'duyuru') {
          await loadDuyurular();
        } else if (sectionNow === 'kartlar') {
          await loadKartlar();
        } else if (sectionNow === 'raporlar') {
          await loadReportsMeta();
        }
      } finally {
        if (firstVisit) {
          setVisitedSections(prev => ({ ...prev, [sectionNow]: true }));
          setSectionBusy(sectionNow, false);
        }
      }
    })();
    
    // Update page index when activeSection changes via bottom navigation
    const pageIndex = currentPageIndex;
    if (pageIndex !== -1 && pageIndex !== currentPageIndex) {
      setCurrentPageIndex(pageIndex);
      scrollToPage(pageIndex);
    }
  }, [currentPageIndex]);

  useEffect(() => {
    if (selectedPersonelId && currentPageIndex === 2) { // 2 = özlük sekmesi
      loadOzlukBelgeleri(selectedPersonelId);
    }
  }, [selectedPersonelId, currentPageIndex]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('AdminLogin');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      const [personelRes, izinRes, uretimRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/personel`, { headers }),
        fetch(`${API_BASE_URL}/api/izin`, { headers }),
        fetch(`${API_BASE_URL}/api/uretim/istatistik`, { headers })
      ]);

      const personelData = await personelRes.json();
      const izinData = await izinRes.json();
      const uretimData = await uretimRes.json();

      setStats({
        toplam: personelData.length || 0,
        rapor: uretimData?.ozet?.totalReports || '—',
        izin: izinData.filter((i: any) => i.durum === 'Beklemede').length || 0
      });
    } catch (error) {
      Alert.alert('Hata', 'İstatistikler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  // Quiet version for section changes (no loading indicator)
  const loadStatsQuiet = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('AdminLogin');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      const [personelRes, izinRes, uretimRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/personel`, { headers }),
        fetch(`${API_BASE_URL}/api/izin`, { headers }),
        fetch(`${API_BASE_URL}/api/uretim/istatistik`, { headers })
      ]);

      const personelData = await personelRes.json();
      const izinData = await izinRes.json();
      const uretimData = await uretimRes.json();

      setStats({
        toplam: personelData.length || 0,
        rapor: uretimData?.ozet?.totalReports || '—',
        izin: izinData.filter((i: any) => i.durum === 'Beklemede').length || 0
      });
    } catch (error) {
      // Silent error handling for background loading
      console.error('Stats loading error:', error);
    }
  };

  const loadPersoneller = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('AdminLogin');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/personel`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPersonelList(data || []);
      } else {
        Alert.alert('Hata', 'Personel listesi yüklenemedi.');
      }
    } catch (error) {
      Alert.alert('Hata', 'Personel listesi yüklenirken hata oluştu.');
    }
  };

  // Quiet version for section changes (no loading indicator)
  const loadPersonellerQuiet = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('AdminLogin');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/personel`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPersonelList(data || []);
      }
    } catch (error) {
      // Silent error handling for background loading
      console.error('Personnel loading error:', error);
    }
  };

  // Üretim Kartları API
  const loadKartlar = async () => {
    try {
      setKartLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('AdminLogin');
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/uretim/kartlar`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKartlar(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Kartlar yüklenemedi', e);
    } finally {
      setKartLoading(false);
    }
  };

  const toggleKart = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      await fetch(`${API_BASE_URL}/api/uretim/kart/${id}/durum`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      loadKartlar();
    } catch (e) {}
  };

  const completeKart = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      await fetch(`${API_BASE_URL}/api/uretim/kart/${id}/tamamla`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      loadKartlar();
    } catch (e) {}
  };

  const deleteKart = async (id: string) => {
    Alert.alert('Onay', 'Kartı silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          if (!token) return;
          await fetch(`${API_BASE_URL}/api/uretim/kart/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          loadKartlar();
        } catch (e) {}
      } }
    ]);
  };

  const saveNewKart = async () => {
    try {
      if (!newKart.ad.trim() || !newKart.hedef) {
        Alert.alert('Uyarı', 'Ad ve hedef zorunludur');
        return;
      }
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      await fetch(`${API_BASE_URL}/api/uretim/kart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ad: newKart.ad.trim(), hedef: Number(newKart.hedef), aciklama: newKart.aciklama.trim() })
      });
      setKartModalVisible(false);
      setNewKart({ ad: '', hedef: '', aciklama: '' });
      loadKartlar();
    } catch (e) {}
  };

  const editPersonel = (personel: Personel) => {
    setEditingPersonel(personel);
    setEditForm({
      ad: personel.ad,
      soyad: personel.soyad,
      egitim: personel.egitim,
      gorev: personel.gorev,
      baslama: personel.baslama
    });
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingPersonel(null);
    setEditForm({
      ad: '',
      soyad: '',
      egitim: '',
      gorev: '',
      baslama: ''
    });
    setSelectedImage(null);
    setShowDatePicker(false);
    setTempDate({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      day: new Date().getDate()
    });
  };

  const pickImage = async () => {
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Hata', 'Fotoğraf seçmek için galeri erişim izni gerekli.');
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    // Request permission
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Hata', 'Fotoğraf çekmek için kamera erişim izni gerekli.');
      return;
    }

    // Take photo
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const selectPhotoSource = () => {
    Alert.alert(
      'Fotoğraf Seç',
      'Fotoğrafı nereden seçmek istiyorsunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Galeri', onPress: pickImage },
        { text: 'Kamera', onPress: takePhoto },
      ]
    );
  };

  const deletePhoto = () => {
    Alert.alert(
      'Fotoğraf Sil',
      'Bu fotoğrafı silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => {
            setSelectedImage('DELETE'); // Special flag to indicate deletion
          }
        },
      ]
    );
  };

  const confirmDateSelection = () => {
    const formattedDate = `${tempDate.year}-${String(tempDate.month).padStart(2, '0')}-${String(tempDate.day).padStart(2, '0')}`;
    setEditForm({...editForm, baslama: formattedDate});
    setShowDatePicker(false);
  };

  const showDatePickerModal = () => {
    // Parse current date from editForm.baslama if it exists
    if (editForm.baslama) {
      const parts = editForm.baslama.split('-');
      if (parts.length === 3) {
        setTempDate({
          year: parseInt(parts[0]),
          month: parseInt(parts[1]),
          day: parseInt(parts[2])
        });
      }
    }
    setShowDatePicker(true);
  };

  const cancelDateSelection = () => {
    setShowDatePicker(false);
  };

  // Add Person Functions
  const openAddModal = () => {
    setAddModalVisible(true);
  };

  const closeAddModal = () => {
    setAddModalVisible(false);
    setAddForm({
      ad: '',
      soyad: '',
      egitim: '',
      gorev: '',
      baslama: ''
    });
    setAddSelectedImage(null);
    setAddShowDatePicker(false);
    setAddTempDate({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      day: new Date().getDate()
    });
  };

  const addShowDatePickerModal = () => {
    if (addForm.baslama) {
      const parts = addForm.baslama.split('-');
      if (parts.length === 3) {
        setAddTempDate({
          year: parseInt(parts[0]),
          month: parseInt(parts[1]),
          day: parseInt(parts[2])
        });
      }
    }
    setAddShowDatePicker(true);
  };

  const addConfirmDateSelection = () => {
    const formattedDate = `${addTempDate.year}-${String(addTempDate.month).padStart(2, '0')}-${String(addTempDate.day).padStart(2, '0')}`;
    setAddForm({...addForm, baslama: formattedDate});
    setAddShowDatePicker(false);
  };

  const addCancelDateSelection = () => {
    setAddShowDatePicker(false);
  };

  const addPickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Hata', 'Fotoğraf seçmek için galeri erişim izni gerekli.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAddSelectedImage(result.assets[0].uri);
    }
  };

  const addTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Hata', 'Fotoğraf çekmek için kamera erişim izni gerekli.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAddSelectedImage(result.assets[0].uri);
    }
  };

  const addSelectPhotoSource = () => {
    Alert.alert(
      'Fotoğraf Seç',
      'Fotoğrafı nereden seçmek istiyorsunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Galeri', onPress: addPickImage },
        { text: 'Kamera', onPress: addTakePhoto },
      ]
    );
  };

  const saveNewPersonel = async () => {
    if (!addForm.ad.trim() || !addForm.soyad.trim() || !addForm.egitim.trim() || !addForm.gorev.trim() || !addForm.baslama) {
      Alert.alert('Hata', 'Tüm alanları doldurun.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('AdminLogin');
        return;
      }

      const formData = new FormData();
      formData.append('ad', addForm.ad.trim());
      formData.append('soyad', addForm.soyad.trim());
      formData.append('egitim', addForm.egitim.trim());
      formData.append('gorev', addForm.gorev.trim());
      formData.append('baslama', addForm.baslama);

      // Personel ekleme verisi gönderiliyor

      if (addSelectedImage) {
        const filename = addSelectedImage.split('/').pop() || 'photo.jpg';
        const fileType = filename.split('.').pop();
        
        formData.append('foto', {
          uri: addSelectedImage,
          type: `image/${fileType}`,
          name: filename,
        } as any);
      }

      const response = await fetch(`${API_BASE_URL}/api/personel/add`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        Alert.alert('Başarılı', 'Yeni personel eklendi.');
        closeAddModal();
        loadPersoneller();
        loadStats();
      } else {
        const errorData = await response.text();

        Alert.alert('Hata', `Personel eklenemedi. HTTP ${response.status}: ${errorData || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      Alert.alert('Hata', `Ağ hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return months[month - 1];
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(tempDate.year, tempDate.month);
    const firstDay = getFirstDayOfMonth(tempDate.year, tempDate.month);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.calendarDay}>
          <Text></Text>
        </View>
      );
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = day === tempDate.day;
      days.push(
        <TouchableOpacity
          key={day}
          style={[styles.calendarDay, isSelected && styles.selectedDay]}
          onPress={() => setTempDate({...tempDate, day})}
        >
          <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return days;
  };

  const renderAddCalendarDays = () => {
    const daysInMonth = getDaysInMonth(addTempDate.year, addTempDate.month);
    const firstDay = getFirstDayOfMonth(addTempDate.year, addTempDate.month);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.calendarDay}>
          <Text></Text>
        </View>
      );
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = day === addTempDate.day;
      days.push(
        <TouchableOpacity
          key={day}
          style={[styles.calendarDay, isSelected && styles.selectedDay]}
          onPress={() => setAddTempDate({...addTempDate, day})}
        >
          <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return days;
  };

  const savePersonelEdit = async () => {
    if (!editingPersonel) return;
    
    if (!editForm.ad.trim() || !editForm.soyad.trim() || !editForm.egitim.trim() || !editForm.gorev.trim() || !editForm.baslama) {
      Alert.alert('Hata', 'Tüm alanları doldurun.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('AdminLogin');
        return;
      }

      const formData = new FormData();
      formData.append('ad', editForm.ad.trim());
      formData.append('soyad', editForm.soyad.trim());
      formData.append('egitim', editForm.egitim.trim());
      formData.append('gorev', editForm.gorev.trim());
      formData.append('baslama', editForm.baslama);

      // Handle photo changes
      if (selectedImage === 'DELETE') {
        // Send special flag to delete photo
        formData.append('deletePhoto', 'true');
      } else if (selectedImage && selectedImage !== 'DELETE') {
        // Add new photo
        const filename = selectedImage.split('/').pop() || 'photo.jpg';
        const fileType = filename.split('.').pop();
        
        formData.append('foto', {
          uri: selectedImage,
          type: `image/${fileType}`,
          name: filename,
        } as any);
      }

      const response = await fetch(`${API_BASE_URL}/api/personel/${editingPersonel.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        Alert.alert('Başarılı', 'Personel bilgileri güncellendi.');
        closeEditModal();
        loadPersoneller(); // Reload the list
        loadStats(); // Update stats
      } else {
        Alert.alert('Hata', 'Personel güncellenemedi.');
      }
    } catch (error) {
      Alert.alert('Hata', 'Güncelleme sırasında hata oluştu.');
    }
  };

  const deletePersonel = (id: number) => {
    Alert.alert(
      'Personel Sil',
      'Bu personeli silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) {
                navigation.navigate('AdminLogin');
                return;
              }

              const response = await fetch(`${API_BASE_URL}/api/personel/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });

              if (response.ok) {
                Alert.alert('Başarılı', 'Personel silindi.');
                loadPersoneller(); // Reload the list
                loadStats(); // Update stats
              } else {
                Alert.alert('Hata', 'Personel silinemedi.');
              }
            } catch (error) {
              Alert.alert('Hata', 'Silme işlemi sırasında hata oluştu.');
            }
          }
        }
      ]
    );
  };

  // Özlük Belgeleri Functions
  const loadOzlukBelgeleri = async (personelId: number) => {
    setOzlukLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('AdminLogin');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/ozluk/${personelId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setOzlukBelgeleri(data || []);
      } else {
        Alert.alert('Hata', 'Belgeler yüklenemedi.');
      }
    } catch (error) {
      Alert.alert('Hata', 'Belgeler yüklenirken hata oluştu.');
    } finally {
      setOzlukLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedDocument({
          uri: asset.uri,
          name: asset.name,
          size: asset.size || 0,
          mimeType: asset.mimeType || 'application/octet-stream'
        });
      }
    } catch (error) {
      Alert.alert('Hata', 'Dosya seçilirken hata oluştu.');
    }
  };

  const uploadDocument = async () => {
    if (!selectedPersonelId || !selectedDocumentType || !selectedDocument) {
      Alert.alert('Hata', 'Tüm alanları doldurun.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('AdminLogin');
        return;
      }

      const formData = new FormData();
      formData.append('personelId', selectedPersonelId.toString());
      formData.append('tur', selectedDocumentType);

      // Read file as base64 and append
      const fileInfo = await FileSystem.getInfoAsync(selectedDocument.uri);
      if (fileInfo.exists) {
        formData.append('dosya', {
          uri: selectedDocument.uri,
          type: selectedDocument.mimeType,
          name: selectedDocument.name,
        } as any);
      }

      const response = await fetch(`${API_BASE_URL}/api/ozluk`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData
      });

      if (response.ok) {
        Alert.alert('Başarılı', 'Belge yüklendi.');
        setSelectedDocument(null);
        setSelectedDocumentType('');
        loadOzlukBelgeleri(selectedPersonelId);
      } else {
        const errorText = await response.text();
        Alert.alert('Hata', `Belge yüklenemedi: ${errorText}`);
      }
    } catch (error) {
      Alert.alert('Hata', `Belge yüklenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
  };

  const deleteOzlukBelge = (belgeId: number) => {
    Alert.alert(
      'Belge Sil',
      'Bu belgeyi silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) {
                navigation.navigate('AdminLogin');
                return;
              }

              const response = await fetch(`${API_BASE_URL}/api/ozluk/${belgeId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });

              if (response.ok) {
                Alert.alert('Başarılı', 'Belge silindi.');
                if (selectedPersonelId) {
                  loadOzlukBelgeleri(selectedPersonelId);
                }
              } else {
                Alert.alert('Hata', 'Belge silinemedi.');
              }
            } catch (error) {
              Alert.alert('Hata', 'Silme işlemi sırasında hata oluştu.');
            }
          }
        }
      ]
    );
  };

  // İletişim API fonksiyonları
  const loadIletisimMesajlari = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/iletisim`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIletisimMesajlari(data);
      } else {
        const errorText = await response.text();
        console.error('İletişim mesajları yüklenemedi. Status:', response.status, 'Error:', errorText);
      }
    } catch (error) {
      console.error('İletişim API error:', error);
    }
  };

  const markAsRead = async (messageId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/iletisim/${messageId}/okundu`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        await loadIletisimMesajlari(); // Refresh the list
      } else {
        Alert.alert('Hata', 'Mesaj okundu olarak işaretlenemedi');
      }
    } catch (error) {
      console.error('Mark as read error:', error);
      Alert.alert('Hata', 'Bir hata oluştu');
    }
  };

  const deleteMessage = async (messageId: number) => {
    Alert.alert(
      'Mesajı Sil',
      'Bu mesajı silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const response = await fetch(`${API_BASE_URL}/api/iletisim/${messageId}`, {
                method: 'DELETE',
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                await loadIletisimMesajlari(); // Refresh the list
                Alert.alert('Başarılı', 'Mesaj silindi');
              } else {
                Alert.alert('Hata', 'Mesaj silinemedi');
              }
            } catch (error) {
              console.error('Delete message error:', error);
              Alert.alert('Hata', 'Bir hata oluştu');
            }
          }
        }
      ]
    );
  };

  // İzin Talepleri API fonksiyonları
  const loadIzinTalepleri = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      const [izinlerResponse, personellerResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/izin/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/personel`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (izinlerResponse.ok && personellerResponse.ok) {
        const izinler = await izinlerResponse.json();
        const personeller = await personellerResponse.json();
        
        setIzinTalepleri(izinler);
        setPersonelList(personeller);
        setIzinDisplayed([]); // başlangıçta listeyi boş tut
      }
    } catch (error) {
      console.error('İzin talepleri yükleme hatası:', error);
    }
  };

  const loadIzinTurleri = async () => {
    const izinTurleri = [
      { key: "yillik", ad: "Yıllık Ücretli İzin", toplam: 14 },
      { key: "ucretsiz", ad: "Ücretsiz İzin", toplam: 30 },
      { key: "mazeret", ad: "Mazeret İzni", toplam: 7 },
      { key: "rapor", ad: "Sağlık Raporu", toplam: 20 }
    ];
    setIzinTurleri(izinTurleri);
  };

  const updateIzinStatus = async (izinId: number, durum: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/izin/${izinId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ durum })
      });
      
      if (response.ok) {
        const successMessage =
          durum === 'Onaylandı'
            ? 'İzin talebi onaylandı'
            : durum === 'Reddedildi'
              ? 'İzin talebi reddedildi'
              : 'İzin talebi beklemeye alındı';
        Alert.alert('Başarılı', successMessage);
        await loadIzinTalepleri();
        await loadStats(); // İstatistikleri güncelle
      } else {
        const errorText = await response.text().catch(() => '');
        Alert.alert('Hata', `İzin durumu güncellenemedi (HTTP ${response.status})${errorText ? `\n${errorText}` : ''}`);
      }
    } catch (error) {
      Alert.alert('Hata', 'Bir hata oluştu');
    }
  };

  // Duyurular API
  const loadDuyurular = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/duyurular`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const list = await res.json();
        setDuyurular(list);
      }
    } catch {}
  };

  const openDuyuruModal = (item?: DuyuruItem) => {
    if (item) {
      setEditingDuyuru(item);
      setDuyuruText(item.text);
    } else {
      setEditingDuyuru(null);
      setDuyuruText('');
    }
    setDuyuruImage(null);
    setDuyuruVideo(null);
    setDuyuruModalVisible(true);
  };

  const closeDuyuruModal = () => setDuyuruModalVisible(false);

  const pickDuyuruImage = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/*'] });
    if (result.canceled) return;
    const asset = (result as any).assets?.[0];
    if (asset) {
      setDuyuruImage({ uri: asset.uri, name: asset.name || 'image', size: asset.size || 0, mimeType: asset.mimeType || 'image/*' });
    }
  };

  const pickDuyuruVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['video/*'] });
    if (result.canceled) return;
    const asset = (result as any).assets?.[0];
    if (asset) {
      setDuyuruVideo({ uri: asset.uri, name: asset.name || 'video', size: asset.size || 0, mimeType: asset.mimeType || 'video/*' });
    }
  };

  const saveDuyuru = async () => {
    try {
      if (!duyuruText.trim() && !duyuruImage && !duyuruVideo) {
        Alert.alert('Uyarı', 'Metin veya görsel/video ekleyin');
        return;
      }
      const token = await AsyncStorage.getItem('token');
      const form = new FormData();
      form.append('text', duyuruText.trim());
      if (duyuruImage) {
        form.append('image', { uri: duyuruImage.uri, name: duyuruImage.name, type: duyuruImage.mimeType } as any);
      }
      if (duyuruVideo) {
        form.append('video', { uri: duyuruVideo.uri, name: duyuruVideo.name, type: duyuruVideo.mimeType } as any);
      }
      const url = editingDuyuru ? `${API_BASE_URL}/api/duyurular/${editingDuyuru.id}` : `${API_BASE_URL}/api/duyurular`;
      const method = editingDuyuru ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: form });
      if (!res.ok) {
        const err = await res.text().catch(() => '');
        Alert.alert('Hata', `Duyuru kaydedilemedi (HTTP ${res.status})${err ? `\n${err}` : ''}`);
        return;
      }
      closeDuyuruModal();
      loadDuyurular();
    } catch (e) {
      Alert.alert('Hata', 'Duyuru kaydedilemedi');
    }
  };

  const deleteDuyuru = async (id: number) => {
    Alert.alert('Duyuruyu Sil', 'Silmek istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/duyurular/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return Alert.alert('Hata', 'Duyuru silinemedi');
        loadDuyurular();
      }}
    ]);
  };

  const confirmIzinStatusChange = (izinId: number, durum: 'Onaylandı' | 'Reddedildi' | 'Beklemede') => {
    const title = durum === 'Onaylandı' ? 'İzni Onayla' : durum === 'Reddedildi' ? 'İzni Reddet' : 'Durumu Geri Al';
    const message =
      durum === 'Onaylandı'
        ? 'Bu izin talebini onaylamak istediğinize emin misiniz?'
        : durum === 'Reddedildi'
          ? 'Bu izin talebini reddetmek istediğinize emin misiniz?'
          : 'Bu izin talebini tekrar Beklemede durumuna almak istediğinize emin misiniz?';
    Alert.alert(title, message, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Evet', style: 'destructive', onPress: () => updateIzinStatus(izinId, durum) }
    ]);
  };

  const getKalanHaklar = async (personelId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/izin/kalan/${personelId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        return await response.json();
      }
      return {};
    } catch (error) {
      console.error('Kalan haklar yükleme hatası:', error);
      return {};
    }
  };

  // Dosyayı indirip kullanıcıya açma uygulaması seçtir
  const openUploadWithChooser = async (fileName: string) => {
    try {
      const url = `${API_BASE_URL}/uploads/${fileName}`;
      const fileExt = (fileName.split('.').pop() || '').toLowerCase();
      const mime = fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg'
        : fileExt === 'png' ? 'image/png'
        : fileExt === 'gif' ? 'image/gif'
        : fileExt === 'webp' ? 'image/webp'
        : fileExt === 'mp4' ? 'video/mp4'
        : fileExt === 'mov' ? 'video/quicktime'
        : 'application/octet-stream';

      const fileUri = FileSystem.cacheDirectory + fileName;
      const dl = await FileSystem.downloadAsync(url, fileUri);
      if (dl.status !== 200) {
        Alert.alert('Hata', 'Dosya indirilemedi');
        return;
      }
      Alert.alert(
        'Dosya İşlemi',
        'Ne yapmak istersiniz?',
        [
          {
            text: 'Galeriye Kaydet',
            onPress: async () => {
              // İzin: yazma odaklı iste (iOS için writeOnly diyalogu)
              const perm = await MediaLibrary.requestPermissionsAsync(true as any);
              const granted = perm.granted || (perm as any).accessPrivileges === 'all';
              if (!granted) {
                Alert.alert('İzin Verilmedi', 'Galeriye kaydetmek için medya erişim izni gerekiyor.');
                return;
              }
              try {
                // iOS/Android için kitaplığa kaydet
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

  // İzin Talepleri Filter Fonksiyonları
  const getFilteredIzinTalepleri = () => {
    return izinTalepleri.filter(izin => {
      const baslangicTarihi = new Date(izin.baslangic);
      const bitisTarihi = new Date(izin.bitis);
      
      // Ay kontrolü - izin birden fazla aya yayılabilir
      let ayKontrolPassed = false;
      if (izinFilters.ay === 'Tümü') {
        ayKontrolPassed = true;
      } else {
        // İzin süresince geçen tüm ayları kontrol et
        const current = new Date(baslangicTarihi);
        while (current <= bitisTarihi) {
          const currentMonth = String(current.getMonth() + 1).padStart(2, '0');
          if (currentMonth === izinFilters.ay) {
            ayKontrolPassed = true;
            break;
          }
          // Bir sonraki aya geç
          current.setMonth(current.getMonth() + 1);
          current.setDate(1); // Ayın ilk günü
        }
      }
      
      // Yıl kontrolü - benzer şekilde birden fazla yıla yayılabilir
      let yilKontrolPassed = false;
      if (izinFilters.yil === 'Tümü') {
        yilKontrolPassed = true;
      } else {
        const baslangicYil = String(baslangicTarihi.getFullYear());
        const bitisYil = String(bitisTarihi.getFullYear());
        yilKontrolPassed = baslangicYil === izinFilters.yil || bitisYil === izinFilters.yil;
      }
      
      return (
        ayKontrolPassed &&
        yilKontrolPassed &&
        (izinFilters.personelId === '' || String(izin.personelId) === izinFilters.personelId) &&
        (izinFilters.tur === '' || izin.tur === izinFilters.tur) &&
        (izinFilters.durum === '' || izin.durum === izinFilters.durum)
      );
    });
  };

  const applyIzinFiltersNow = () => {
    const list = getFilteredIzinTalepleri();
    setIzinDisplayed(list);
    setIzinQueried(true);
  };

  const getPersonelName = (personelId: number) => {
    const personel = personelList.find(p => p.id === personelId);
    return personel ? `${personel.ad} ${personel.soyad}` : 'Bilinmeyen';
  };

  const getIzinTuruName = (turKey: string) => {
    const tur = izinTurleri.find(t => t.key === turKey);
    return tur ? tur.ad : turKey;
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = ['Tümü'];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(String(i));
    }
    return years;
  };

  const monthOptions = [
    { value: 'Tümü', label: 'Tümü' },
    { value: '01', label: 'Ocak' },
    { value: '02', label: 'Şubat' },
    { value: '03', label: 'Mart' },
    { value: '04', label: 'Nisan' },
    { value: '05', label: 'Mayıs' },
    { value: '06', label: 'Haziran' },
    { value: '07', label: 'Temmuz' },
    { value: '08', label: 'Ağustos' },
    { value: '09', label: 'Eylül' },
    { value: '10', label: 'Ekim' },
    { value: '11', label: 'Kasım' },
    { value: '12', label: 'Aralık' }
  ];

     const downloadOzlukBelge = async (dosyaAdi: string) => {
     try {
       const url = `${API_BASE_URL}/uploads/${dosyaAdi}`;
       const fileExtension = dosyaAdi.split('.').pop()?.toLowerCase();
       
       if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '')) {
                  // For images: Open directly in browser without downloading
                  try {
                    await Linking.openURL(url);
                  } catch (error) {
                    console.error('Image open error:', error);
                    Alert.alert('Hata', 'Resim açılamadı.');
                  }
                } else if (fileExtension === 'pdf') {
                  // For PDF files: Give user options
                  Alert.alert(
                    'PDF Nasıl Açılsın?',
                    'PDF dosyasını nasıl açmak istiyorsunuz?',
                    [
                      {
                        text: 'İptal',
                        style: 'cancel'
                      },
                      {
                        text: 'Tarayıcıda Aç',
                        onPress: async () => {
                          try {
                            await Linking.openURL(url);
                          } catch (openError) {
                            console.error('Browser open error:', openError);
                            Alert.alert('Hata', 'Tarayıcıda açılamadı.');
                          }
                        }
                      },
                      {
                        text: 'Uygulama Seç',
                        onPress: async () => {
                          try {
                            // Download first, then let user choose app
                            const fileUri = FileSystem.documentDirectory + dosyaAdi;
                            const downloadResult = await FileSystem.downloadAsync(url, fileUri);
                            
                            if (downloadResult.status === 200) {
                              const isAvailable = await Sharing.isAvailableAsync();
                              if (isAvailable) {
                                await Sharing.shareAsync(downloadResult.uri);
                              } else {
                                Alert.alert('Hata', 'Paylaşım özelliği kullanılamıyor.');
                              }
                            } else {
                              Alert.alert('Hata', 'Dosya indirilemedi.');
                            }
                          } catch (shareError) {
                            console.error('Share error:', shareError);
                            Alert.alert('Hata', 'Dosya paylaşılamadı.');
                          }
                        }
                      }
                    ]
                  );
                } else {
                  // For other files (DOC, XLS, etc.): Give user options
                  Alert.alert(
                    `${fileExtension?.toUpperCase()} Dosyası Nasıl Açılsın?`,
                    'Dosyayı nasıl açmak istiyorsunuz?',
                    [
                      {
                        text: 'İptal',
                        style: 'cancel'
                      },
                      {
                        text: 'Tarayıcıda Aç',
                        onPress: async () => {
                          try {
                            await Linking.openURL(url);
                          } catch (openError) {
                            console.error('Browser open error:', openError);
                            Alert.alert('Hata', 'Tarayıcıda açılamadı.');
                          }
                        }
                      },
                      {
                        text: 'Uygulama Seç',
                        onPress: async () => {
                          try {
                            // Download first, then let user choose app
                            const fileUri = FileSystem.documentDirectory + dosyaAdi;
                            const downloadResult = await FileSystem.downloadAsync(url, fileUri);
                            
                            if (downloadResult.status === 200) {
                              const isAvailable = await Sharing.isAvailableAsync();
                              if (isAvailable) {
                                await Sharing.shareAsync(downloadResult.uri);
                              } else {
                                Alert.alert('Hata', 'Paylaşım özelliği kullanılamıyor.');
                              }
                            } else {
                              Alert.alert('Hata', 'Dosya indirilemedi.');
                            }
                          } catch (shareError) {
                            console.error('Share error:', shareError);
                            Alert.alert('Hata', 'Dosya paylaşılamadı.');
                          }
                        }
                      }
                    ]
                  );
                                 }
     } catch (error) {
       console.error('Download/View error:', error);
       Alert.alert('Hata', 'Dosya işlemi başarısız oldu.');
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
    { id: 'dashboard', title: 'Dashboard', icon: 'home-outline' },
    { id: 'personel', title: 'Personeller', icon: 'people-outline' },
    { id: 'ozluk', title: 'Özlük Belgeleri', icon: 'folder-outline' },
    { id: 'izin', title: 'İzin Talepleri', icon: 'document-text-outline' },
    { id: 'duyuru', title: 'Duyurular', icon: 'megaphone-outline' },
    { id: 'kartlar', title: 'Üretim Kartları', icon: 'layers-outline' },
    { id: 'raporlar', title: 'Üretim Raporları', icon: 'stats-chart-outline' },
    { id: 'iletisim', title: 'Gelen Mesajlar', icon: 'mail-outline' },
  ];

  // Swipe navigation functions
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(contentOffsetX / width);
    if (pageIndex !== currentPageIndex && pageIndex >= 0 && pageIndex < menuItems.length) {
      setCurrentPageIndex(pageIndex);
      // setActiveSection tetiklemesini kaldırıyoruz; aktif görünüm currentPageIndex üzerinden belirleniyor
    }
  };

  const scrollToPage = (pageIndex: number) => {
    scrollViewRef.current?.scrollTo({
      x: pageIndex * width,
      animated: true,
    });
  };

  const renderDashboard = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Hoş Geldiniz</Text>
      {(!visitedSections['dashboard'] || sectionLoading['dashboard']) ? (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}><View style={{ height:14, backgroundColor:'#e5e7eb', borderRadius:6, width:'60%' }} /><View style={{ height:28, backgroundColor:'#e5e7eb', borderRadius:8, width:'40%', marginTop:10 }} /></View>
          <View style={styles.statCard}><View style={{ height:14, backgroundColor:'#e5e7eb', borderRadius:6, width:'60%' }} /><View style={{ height:28, backgroundColor:'#e5e7eb', borderRadius:8, width:'40%', marginTop:10 }} /></View>
          <View style={styles.statCard}><View style={{ height:14, backgroundColor:'#e5e7eb', borderRadius:6, width:'60%' }} /><View style={{ height:28, backgroundColor:'#e5e7eb', borderRadius:8, width:'40%', marginTop:10 }} /></View>
        </View>
      ) : (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Toplam Personel</Text>
            <Text style={styles.statValue}>{stats.toplam}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Bugünkü Rapor</Text>
            <Text style={styles.statValue}>{stats.rapor}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Aktif İzin Talebi</Text>
            <Text style={styles.statValue}>{stats.izin}</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderPersoneller = () => (
    <View style={styles.section}>
      {/* Fixed Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>👥 Personeller</Text>
        <TouchableOpacity style={styles.addPersonButton} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Scrollable Content */}
      {sectionLoading.personel ? (
        <SkeletonList count={4} />
      ) : personelList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={60} color="#1761a0" />
          <Text style={styles.emptyText}>Henüz personel kaydı yok</Text>
          <Text style={styles.emptySubtext}>
            Web uygulamasından personel ekleyebilirsiniz
          </Text>
        </View>
      ) : (
        <View style={styles.personelListContainer}>
          <ScrollView
            style={styles.personelScrollContainer}
            showsVerticalScrollIndicator={true}
            indicatorStyle="black"
            scrollIndicatorInsets={{ right: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={() => {
                  loadStats();
                  loadPersoneller();
                }}
                colors={['#1761a0']}
                tintColor="#1761a0"
              />
            }
            bounces={true}
            scrollEventThrottle={16}
            nestedScrollEnabled={true}
          >
            {personelList.map((personel) => (
              <View key={personel.id} style={styles.personelCard}>
                <View style={styles.personelInfo}>
                  {personel.foto ? (
                    <Image
                      source={{ uri: `${API_BASE_URL}/uploads/${personel.foto}` }}
                      style={styles.personelPhoto}
                      defaultSource={require('../../assets/fotonik-logo.png')}
                    />
                  ) : (
                    <View style={styles.personelAvatar}>
                      <Text style={styles.personelInitials}>
                        {personel.ad.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.personelDetails}>
                    <Text style={styles.personelName}>{personel.ad} {personel.soyad}</Text>
                    <Text style={styles.personelField}>Eğitim: {personel.egitim}</Text>
                    <Text style={styles.personelField}>Unvan: {personel.gorev}</Text>
                    <Text style={styles.personelDate}>Başlama: {personel.baslama}</Text>
                  </View>
                  <View style={styles.personelActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => editPersonel(personel)}
                    >
                      <Ionicons name="pencil" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deletePersonel(personel.id)}
                    >
                      <Ionicons name="trash" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderOzlukBelgeleri = () => {
    const selectedPersonel = personelList.find(p => p.id === selectedPersonelId);
    
    return (
      <View style={styles.section}>
        {/* Fixed Header */}
        <Text style={styles.sectionTitle}>📁 Özlük Belgeleri</Text>
        
        {/* Scrollable Content */}
        <ScrollView 
          style={styles.ozlukScrollContainer}
          showsVerticalScrollIndicator={true}
          indicatorStyle="black"
          scrollIndicatorInsets={{ right: 1 }}
        >
        
        {/* Personnel Selection */}
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Personel Seç</Text>
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => setShowPersonelPicker(true)}
          >
            <Text style={styles.dropdownText}>
              {selectedPersonel ? `${selectedPersonel.ad} ${selectedPersonel.soyad}` : 'Bir personel seçin'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Upload Form - Only show when personnel is selected */}
        {selectedPersonelId && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Yeni Belge Yükle</Text>
            
            {/* Document Type Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Belge Türü</Text>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setShowDocumentTypePicker(true)}
              >
                <Text style={styles.dropdownText}>
                  {selectedDocumentType || 'Belge türü seçin'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* File Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Dosya</Text>
              <TouchableOpacity 
                style={styles.filePickerButton}
                onPress={pickDocument}
              >
                <Ionicons name="document-attach" size={20} color="#fff" />
                <Text style={styles.filePickerText}>
                  {selectedDocument ? selectedDocument.name : 'Dosya Seç'}
                </Text>
              </TouchableOpacity>
              {selectedDocument && (
                <Text style={styles.fileInfo}>
                  Boyut: {Math.round(selectedDocument.size / 1024)} KB
                </Text>
              )}
            </View>

            {/* Upload Button */}
            <TouchableOpacity 
              style={[
                styles.uploadButton, 
                (!selectedDocumentType || !selectedDocument) && styles.uploadButtonDisabled
              ]}
              onPress={uploadDocument}
              disabled={!selectedDocumentType || !selectedDocument}
            >
              <Text style={styles.uploadButtonText}>Yükle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Documents List */}
        {selectedPersonelId && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Yüklenen Belgeler</Text>
            {ozlukLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Belgeler yükleniyor...</Text>
              </View>
            ) : ozlukBelgeleri.length === 0 ? (
              <View style={styles.emptyDocumentsContainer}>
                <Ionicons name="folder-open-outline" size={40} color="#999" />
                <Text style={styles.emptyDocumentsText}>Henüz belge yüklenmemiş</Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.documentsScroll}
                showsVerticalScrollIndicator={true}
                indicatorStyle="black"
                scrollIndicatorInsets={{ right: 1 }}
              >
                {ozlukBelgeleri.map((belge) => (
                  <View key={belge.id} style={styles.documentItem}>
                    <View style={styles.documentInfo}>
                      <Ionicons name="document" size={24} color="#1761a0" />
                      <Text style={styles.documentType}>{belge.tur}</Text>
                    </View>
                    <View style={styles.documentActions}>
                      <TouchableOpacity 
                        style={styles.downloadButton}
                        onPress={() => downloadOzlukBelge(belge.dosya)}
                      >
                        <Ionicons name="download" size={16} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.deleteDocButton}
                        onPress={() => deleteOzlukBelge(belge.id)}
                      >
                        <Ionicons name="trash" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Personnel Picker Modal */}
        <Modal
          visible={showPersonelPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPersonelPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Personel Seç</Text>
                <TouchableOpacity onPress={() => setShowPersonelPicker(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView 
                style={styles.pickerContent}
                showsVerticalScrollIndicator={true}
                indicatorStyle="black"
                scrollIndicatorInsets={{ right: 1 }}
              >
                <TouchableOpacity 
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedPersonelId(null);
                    setOzlukBelgeleri([]);
                    setShowPersonelPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>Personel seçimi temizle</Text>
                </TouchableOpacity>
                {personelList.map((personel) => (
                  <TouchableOpacity 
                    key={personel.id}
                    style={[
                      styles.pickerItem,
                      selectedPersonelId === personel.id && styles.pickerItemSelected
                    ]}
                    onPress={() => {
                      setSelectedPersonelId(personel.id);
                      setShowPersonelPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      selectedPersonelId === personel.id && styles.pickerItemTextSelected
                    ]}>
                      {personel.ad} {personel.soyad}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Document Type Picker Modal */}
        <Modal
          visible={showDocumentTypePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDocumentTypePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Belge Türü Seç</Text>
                <TouchableOpacity onPress={() => setShowDocumentTypePicker(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView 
                style={styles.pickerContent}
                showsVerticalScrollIndicator={true}
                indicatorStyle="black"
                scrollIndicatorInsets={{ right: 1 }}
              >
                {documentTypes.map((type) => (
                  <TouchableOpacity 
                    key={type}
                    style={[
                      styles.pickerItem,
                      selectedDocumentType === type && styles.pickerItemSelected
                    ]}
                    onPress={() => {
                      setSelectedDocumentType(type);
                      setShowDocumentTypePicker(false);
                    }}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      selectedDocumentType === type && styles.pickerItemTextSelected
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
        </ScrollView>
      </View>
    );
  };

  const renderComingSoon = (title: string) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.comingSoonContainer}>
        <Ionicons name="construct-outline" size={60} color="#1761a0" />
        <Text style={styles.comingSoonText}>Bu bölüm yakında aktif olacak</Text>
        <Text style={styles.comingSoonSubtext}>
          Web uygulamasında bu özelliği kullanabilirsiniz
        </Text>
      </View>
    </View>
  );

  const renderKartlar = () => (
    <View style={styles.section}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={styles.sectionTitle}>🗂️ Üretim Kartları</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setKartModalVisible(true)}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Yeni Kart</Text>
        </TouchableOpacity>
      </View>

      {kartLoading ? (
        <Text style={{ color: '#6b7280' }}>Yükleniyor...</Text>
      ) : kartlar.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="layers-outline" size={42} color="#1761a0" />
          <Text style={styles.emptyText}>Henüz kart yok</Text>
          <Text style={styles.emptySubtext}>Yeni kart oluşturmak için sağ üstteki butonu kullanın</Text>
        </View>
      ) : (
        <View>
          {kartlar.map(k => (
            <View key={k.id} style={styles.izinCard}>
              <Text style={styles.izinPersonelName}>{k.ad}</Text>
              <Text style={{ color: '#6b7280', marginTop: 2 }}>
                Hedef: {k.hedef} | Üretildi: {k.topAdet || 0} | Kalan: {typeof k.kalan !== 'undefined' ? k.kalan : (k.hedef - (k.topAdet || 0))}
              </Text>
              <Text style={{ color: '#6b7280', marginTop: 2 }}>{k.aciklama || '–'}</Text>
              <View style={[styles.izinActions, { marginTop: 8 }]}>
                <TouchableOpacity style={[styles.izinActionButton, styles.secondaryButton]} onPress={() => toggleKart(k.id)}>
                  <Ionicons name="swap-horizontal-outline" size={16} color="#fff" />
                  <Text style={styles.izinActionText}>{k.aktif ? 'Pasif Yap' : 'Aktif Yap'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.izinActionButton, k.tamamlandi ? styles.secondaryButton : styles.approveButton]} onPress={() => completeKart(k.id)}>
                  <Ionicons name="checkmark-done-outline" size={16} color="#fff" />
                  <Text style={styles.izinActionText}>{k.tamamlandi ? 'Yeniden Aç' : 'Tamamla'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.izinActionButton, styles.rejectButton]} onPress={() => deleteKart(k.id)}>
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={styles.izinActionText}>Sil</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Yeni Kart Modal */}
      <Modal visible={kartModalVisible} transparent animationType="slide" onRequestClose={() => setKartModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { height: '55%' }]}> 
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Üretim Kartı</Text>
              <TouchableOpacity onPress={() => setKartModalVisible(false)}><Ionicons name="close-outline" size={28} color="#6b7280" /></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 12 }} keyboardShouldPersistTaps="handled">
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Kart Adı</Text>
                <TextInput style={styles.input} value={newKart.ad} onChangeText={(t) => setNewKart({ ...newKart, ad: t })} placeholder="Kart adı" />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Hedef Adet</Text>
                <TextInput style={styles.input} value={newKart.hedef} onChangeText={(t) => setNewKart({ ...newKart, hedef: t.replace(/[^0-9]/g, '') })} keyboardType="numeric" placeholder="Hedef" />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Açıklama</Text>
                <TextInput style={styles.input} value={newKart.aciklama} onChangeText={(t) => setNewKart({ ...newKart, aciklama: t })} placeholder="Açıklama" />
              </View>
              <View style={{ height: 8 }} />
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 12, paddingBottom: 12 }}>
              <TouchableOpacity style={[styles.izinActionButton, styles.rejectButton]} onPress={() => setKartModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={16} color="#fff" />
                <Text style={styles.izinActionText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.izinActionButton, styles.approveButton]} onPress={saveNewKart}>
                <Ionicons name="save-outline" size={16} color="#fff" />
                <Text style={styles.izinActionText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );

  // ÜRETİM RAPORLARI
  interface RaporDetay { kartAd: string; personelAd: string; adet: number; sure: number; verim: number; tarih: string; aciklama?: string }
  const ALL = '__ALL__';
  const [raporFilters, setRaporFilters] = useState({ yil: '', ay: '', kartId: '', personelId: '' });
  const [raporCards, setRaporCards] = useState<{ id: string; ad: string }[]>([]);
  const [raporPersons, setRaporPersons] = useState<{ id: number; ad: string; soyad?: string }[]>([]);
  const [raporDetay, setRaporDetay] = useState<RaporDetay[]>([]);
  const [raporOzet, setRaporOzet] = useState<{ topAdet: number; topSure: number } | null>(null);
  const [raporLoading, setRaporLoading] = useState(false);
  const [openYear, setOpenYear] = useState(false);
  const [openMonth, setOpenMonth] = useState(false);
  const [openCard, setOpenCard] = useState(false);
  const [openPerson, setOpenPerson] = useState(false);

  const loadReportsMeta = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const [kcRes, rkRes, authRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/uretim/kartlar`,{ headers:{ Authorization:`Bearer ${token}` }}),
        fetch(`${API_BASE_URL}/api/uretim/raporlar/kartlar`,{ headers:{ Authorization:`Bearer ${token}` }}),
        fetch(`${API_BASE_URL}/api/personel`,{ headers:{ Authorization:`Bearer ${token}` }})
      ]);
      const cards = kcRes.ok?await kcRes.json():[];
      const rapCards = rkRes.ok?await rkRes.json():[];
      const persons = authRes.ok?await authRes.json():[];
      const seen = new Set<string>();
      const merged = cards.concat(rapCards).filter((c:any)=>{ if(seen.has(c.id)) return false; seen.add(c.id); return true; });
      setRaporCards(merged.map((c:any)=>({ id:c.id, ad:c.ad })));
      setRaporPersons(persons.map((p:any)=>({ id:p.id, ad:p.ad||p.soyad })));
    } catch {}
  };

  const fetchReports = async () => {
    try {
      setRaporLoading(true);
      const token = await AsyncStorage.getItem('token');
      const paramsObj: any = {
        yil: raporFilters.yil === ALL ? '' : raporFilters.yil,
        ay: raporFilters.ay === ALL ? '' : raporFilters.ay,
        kartId: raporFilters.kartId === ALL ? '' : raporFilters.kartId,
        personelId: raporFilters.personelId === ALL ? '' : raporFilters.personelId,
      };
      const params = new URLSearchParams(paramsObj);
      const res = await fetch(`${API_BASE_URL}/api/uretim/istatistik?${params.toString()}`,{ headers:{ Authorization:`Bearer ${token}` }});
      if(!res.ok) { Alert.alert('Hata','Rapor alınamadı'); return; }
      const { ozet, detay } = await res.json();
      setRaporOzet(ozet); setRaporDetay(detay||[]);
    } catch {} finally { setRaporLoading(false); }
  };

  const renderUretimRaporlari = () => (
    <View style={styles.section}>
      {(() => { return null; })()}
      <Text style={styles.sectionTitle}>📊 Üretim Raporları</Text>
      {(() => {
        // Ay isimleri (görünen etiket), değerler API için 01-12
        // ALL özel değeri tümü içindir
        return null;
      })()}
      <View style={styles.card}>
        <View style={{ flexDirection:'row', gap:10 }}>
          <View style={{ flex:1 }}>
            <Text style={styles.filterLabel}>Ay:</Text>
            <TouchableOpacity onPress={()=>setOpenMonth(true)} style={styles.dropdownButton}>
              <Text style={styles.filterDropdownText}>{(() => {
                const months = [
                  { val: ALL, label: 'Tümü' },
                  { val: '01', label: 'Ocak' },
                  { val: '02', label: 'Şubat' },
                  { val: '03', label: 'Mart' },
                  { val: '04', label: 'Nisan' },
                  { val: '05', label: 'Mayıs' },
                  { val: '06', label: 'Haziran' },
                  { val: '07', label: 'Temmuz' },
                  { val: '08', label: 'Ağustos' },
                  { val: '09', label: 'Eylül' },
                  { val: '10', label: 'Ekim' },
                  { val: '11', label: 'Kasım' },
                  { val: '12', label: 'Aralık' },
                ];
                const val = raporFilters.ay;
                if (val === '' || val === ALL) return 'Tümü';
                return (months.find(m=>m.val===val)?.label) || val;
              })()}</Text>
              <Ionicons name="chevron-down-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <View style={{ flex:1 }}>
            <Text style={styles.filterLabel}>Yıl:</Text>
            <TouchableOpacity onPress={()=>setOpenYear(true)} style={styles.dropdownButton}>
              <Text style={styles.filterDropdownText}>{raporFilters.yil === '' || raporFilters.yil === ALL ? 'Tümü' : raporFilters.yil}</Text>
              <Ionicons name="chevron-down-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection:'row', gap:10, marginTop:10 }}>
          <View style={{ flex:1 }}>
            <Text style={styles.filterLabel}>Kart:</Text>
            <TouchableOpacity onPress={()=>setOpenCard(true)} style={styles.dropdownButton}>
              <Text style={styles.filterDropdownText}>{raporFilters.kartId === '' || raporFilters.kartId === ALL ? 'Tümü' : (raporCards.find(c=>c.id===raporFilters.kartId)?.ad || 'Kart')}</Text>
              <Ionicons name="chevron-down-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <View style={{ flex:1 }}>
            <Text style={styles.filterLabel}>Personel:</Text>
            <TouchableOpacity onPress={()=>setOpenPerson(true)} style={styles.dropdownButton}>
              <Text style={styles.filterDropdownText}>{raporFilters.personelId === '' || raporFilters.personelId === ALL ? 'Tümü' : (raporPersons.find(p=>String(p.id)===raporFilters.personelId)?.ad || 'Personel')}</Text>
              <Ionicons name="chevron-down-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection:'row', marginTop:12 }}>
          <TouchableOpacity style={[styles.primaryButton, { flex:1 }]} onPress={fetchReports}>
            <Text style={styles.primaryButtonText}>Raporu Getir</Text>
          </TouchableOpacity>
        </View>
      </View>
      {raporOzet && (
        <Text style={{ fontWeight:'700', marginTop:10 }}>Toplam Adet: {raporOzet.topAdet} | Toplam Süre: {raporOzet.topSure} dk</Text>
      )}
      <View style={{ marginTop:8 }}>
        {raporLoading ? (
          <Text style={{ color:'#6b7280' }}>Yükleniyor...</Text>
        ) : (
          raporDetay.map((r,idx)=>(
            <View key={idx} style={styles.card}>
              <Text style={styles.cardTitle}>{r.kartAd}</Text>
              <Text style={{ color:'#6b7280' }}>Personel: {r.personelAd}</Text>
              <Text style={{ color:'#6b7280' }}>Adet: {r.adet} | Süre: {r.sure} | Verim: {r.verim}</Text>
              <Text style={{ color:'#6b7280' }}>Tarih: {new Date(r.tarih).toLocaleString()}</Text>
              <Text style={{ color:'#6b7280' }}>{r.aciklama||'–'}</Text>
            </View>
          ))
        )}
      </View>
      {/* Year Dropdown */}
      <Modal visible={openYear} transparent animationType="fade" onRequestClose={()=>setOpenYear(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { height: '50%' }] }>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yıl Seç</Text>
              <TouchableOpacity onPress={()=>setOpenYear(false)}><Ionicons name="close-outline" size={28} color="#6b7280" /></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 12 }}>
              {(()=>{ const y = new Date().getFullYear(); const arr = [ALL,''+y]; for(let i=1;i<=10;i++) arr.push(String(y-i)); return arr; })().map(val=> (
                <TouchableOpacity key={val||'all'} onPress={()=>{ setRaporFilters({...raporFilters, yil: val }); setOpenYear(false); }} style={{ paddingVertical:12 }}>
                  <Text style={{ color: val!==ALL? '#374151':'#1761a0', fontWeight: val!==ALL? '500':'700' }}>{val!==ALL? val : 'Tümü'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Month Dropdown */}
      <Modal visible={openMonth} transparent animationType="fade" onRequestClose={()=>setOpenMonth(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { height: '50%' }] }>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ay Seç</Text>
              <TouchableOpacity onPress={()=>setOpenMonth(false)}><Ionicons name="close-outline" size={28} color="#6b7280" /></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 12 }}>
              {[
                { val: ALL, label: 'Tümü' },
                { val: '01', label: 'Ocak' },
                { val: '02', label: 'Şubat' },
                { val: '03', label: 'Mart' },
                { val: '04', label: 'Nisan' },
                { val: '05', label: 'Mayıs' },
                { val: '06', label: 'Haziran' },
                { val: '07', label: 'Temmuz' },
                { val: '08', label: 'Ağustos' },
                { val: '09', label: 'Eylül' },
                { val: '10', label: 'Ekim' },
                { val: '11', label: 'Kasım' },
                { val: '12', label: 'Aralık' },
              ].map(m => (
                <TouchableOpacity key={m.val||'all'} onPress={()=>{ setRaporFilters({...raporFilters, ay: m.val }); setOpenMonth(false); }} style={{ paddingVertical:12 }}>
                  <Text style={{ color: m.val!==ALL? '#374151':'#1761a0', fontWeight: m.val!==ALL? '500':'700' }}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Card Dropdown */}
      <Modal visible={openCard} transparent animationType="fade" onRequestClose={()=>setOpenCard(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { height: '60%' }] }>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kart Seç</Text>
              <TouchableOpacity onPress={()=>setOpenCard(false)}><Ionicons name="close-outline" size={28} color="#6b7280" /></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 12 }}>
              <TouchableOpacity onPress={()=>{ setRaporFilters({...raporFilters, kartId: ALL }); setOpenCard(false); }} style={{ paddingVertical:12 }}>
                <Text style={{ color:'#1761a0', fontWeight:'700' }}>Tümü</Text>
              </TouchableOpacity>
              {raporCards.map(c => (
                <TouchableOpacity key={c.id} onPress={()=>{ setRaporFilters({...raporFilters, kartId: c.id }); setOpenCard(false); }} style={{ paddingVertical:12 }}>
                  <Text style={{ color:'#374151' }}>{c.ad}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Person Dropdown */}
      <Modal visible={openPerson} transparent animationType="fade" onRequestClose={()=>setOpenPerson(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { height: '60%' }] }>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Personel Seç</Text>
              <TouchableOpacity onPress={()=>setOpenPerson(false)}><Ionicons name="close-outline" size={28} color="#6b7280" /></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 12 }}>
              <TouchableOpacity onPress={()=>{ setRaporFilters({...raporFilters, personelId: ALL }); setOpenPerson(false); }} style={{ paddingVertical:12 }}>
                <Text style={{ color:'#1761a0', fontWeight:'700' }}>Tümü</Text>
              </TouchableOpacity>
              {raporPersons.map(p => (
                <TouchableOpacity key={p.id} onPress={()=>{ setRaporFilters({...raporFilters, personelId: String(p.id) }); setOpenPerson(false); }} style={{ paddingVertical:12 }}>
                  <Text style={{ color:'#374151' }}>{p.ad}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderIletisim = () => {
    const messageTypes = ['Tümü', 'Görüş', 'Öneri', 'Şikayet'];
    
    const filteredMessages = selectedMessageFilter === 'Tümü' 
      ? iletisimMesajlari 
      : iletisimMesajlari.filter(msg => msg.tur === selectedMessageFilter);

    const getMessageTypeColor = (type: string) => {
      switch (type) {
        case 'Şikayet': return '#ef4444';
        case 'Öneri': return '#3b82f6';
        case 'Görüş': return '#6b7280';
        default: return '#6b7280';
      }
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return (
      <View style={styles.section}>
        {/* Compact Header */}
        <Text style={styles.iletisimTitle}>📬 Gelen Mesajlar </Text>
        
        {/* Compact Filter Buttons */}
        <View style={styles.compactFilterContainer}>
          {messageTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.compactFilterButton,
                selectedMessageFilter === type && styles.compactFilterButtonActive
              ]}
              onPress={() => setSelectedMessageFilter(type)}
            >
              <Text style={[
                styles.compactFilterText,
                selectedMessageFilter === type && styles.compactFilterTextActive
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Messages List */}
        <ScrollView 
          style={styles.compactMessagesContainer}
          showsVerticalScrollIndicator={true}
          indicatorStyle="black"
          scrollIndicatorInsets={{ right: 1 }}
        >
          {filteredMessages.length === 0 ? (
            <View style={styles.compactEmptyContainer}>
              <Ionicons name="mail-outline" size={40} color="#ccc" />
              <Text style={styles.compactEmptyText}>
                {selectedMessageFilter === 'Tümü' ? 'Henüz mesaj yok' : `${selectedMessageFilter} mesajı bulunamadı`}
              </Text>
            </View>
          ) : (
            filteredMessages.map((message) => (
              <View key={message.id} style={[
                styles.compactMessageCard,
                { borderLeftColor: getMessageTypeColor(message.tur) }
              ]}>
                <View style={styles.compactMessageHeader}>
                  <View style={styles.compactTypeContainer}>
                    <View style={[styles.compactTypeBadge, { backgroundColor: getMessageTypeColor(message.tur) }]}>
                      <Text style={styles.compactTypeText}>{message.tur}</Text>
                    </View>
                    {!message.okundu && (
                      <View style={styles.compactUnreadBadge}>
                        <Text style={styles.compactUnreadText}>Yeni</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.compactMessageDate}>{formatDate(message.tarih)}</Text>
                </View>
                
                <Text style={styles.compactMessageContent}>{message.mesaj}</Text>
                
                <View style={styles.compactMessageActions}>
                  {!message.okundu && (
                    <TouchableOpacity
                      style={styles.compactReadButton}
                      onPress={() => markAsRead(message.id)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color="#22c55e" />
                      <Text style={styles.compactReadText}>Okundu</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.compactDeleteButton}
                    onPress={() => deleteMessage(message.id)}
                  >
                    <Ionicons name="trash-outline" size={14} color="#ef4444" />
                    <Text style={styles.compactDeleteText}>Sil</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  const renderIzinTalepleri = () => {
    const filteredIzinTalepleri = getFilteredIzinTalepleri();

    const getDurumColor = (durum: string) => {
      switch (durum) {
        case 'Onaylandı': return '#22c55e';
        case 'Reddedildi': return '#ef4444';
        case 'Beklemede': return '#f59e0b';
        default: return '#6b7280';
      }
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('tr-TR');
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 İzin Talepleri</Text>
        
        {/* Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Ay:</Text>
              <TouchableOpacity 
                style={styles.izinFilterButton}
                onPress={() => setShowMonthDropdown(true)}
              >
                <Text style={styles.izinFilterButtonText}>
                  {monthOptions.find(m => m.value === izinFilters.ay)?.label || 'Tümü'}
                </Text>
                <Ionicons name="chevron-down-outline" size={16} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Yıl:</Text>
              <TouchableOpacity 
                style={styles.izinFilterButton}
                onPress={() => setShowYearDropdown(true)}
              >
                <Text style={styles.izinFilterButtonText}>{izinFilters.yil}</Text>
                <Ionicons name="chevron-down-outline" size={16} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Personel:</Text>
              <TouchableOpacity 
                style={styles.izinFilterButton}
                onPress={() => setShowPersonDropdown(true)}
              >
                <Text style={styles.izinFilterButtonText}>
                  {izinFilters.personelId ? getPersonelName(Number(izinFilters.personelId)) : 'Tümü'}
                </Text>
                <Ionicons name="chevron-down-outline" size={16} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Durum:</Text>
              <TouchableOpacity 
                style={styles.izinFilterButton}
                onPress={() => setShowStatusDropdown(true)}
              >
                <Text style={styles.izinFilterButtonText}>
                  {izinFilters.durum || 'Tümü'}
                </Text>
                <Ionicons name="chevron-down-outline" size={16} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Apply button inside filter card */}
          <View style={{ flexDirection:'row', marginTop: 10 }}>
            <TouchableOpacity style={[styles.primaryButton, { flex:1 }]} onPress={applyIzinFiltersNow}>
              <Text style={styles.primaryButtonText}>İzin Taleplerini Getir</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* İzin Talepleri Listesi */}
        <ScrollView style={styles.izinListContainer}>
          {izinQueried && izinDisplayed.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={40} color="#ccc" />
              <Text style={styles.emptyText}>İzin talebi bulunamadı</Text>
            </View>
          ) : (
            izinDisplayed.map((izin) => (
              <View key={izin.id} style={styles.izinCard}>
                <View style={styles.izinHeader}>
                  <Text style={styles.izinPersonelName}>
                    {getPersonelName(izin.personelId)}
                  </Text>
                  <View style={[styles.izinDurumBadge, { backgroundColor: getDurumColor(izin.durum) }]}>
                    <Text style={styles.izinDurumText}>{izin.durum}</Text>
                  </View>
                </View>

                <View style={styles.izinDetails}>
                  <Text style={styles.izinDetailText}>
                    <Text style={styles.izinDetailLabel}>İzin Türü: </Text>
                    {getIzinTuruName(izin.tur)}
                  </Text>
                  <Text style={styles.izinDetailText}>
                    <Text style={styles.izinDetailLabel}>Tarih: </Text>
                    {formatDate(izin.baslangic)} - {formatDate(izin.bitis)} ({izin.gun} gün)
                  </Text>
                  {izin.gerekce && (
                    <Text style={styles.izinDetailText}>
                      <Text style={styles.izinDetailLabel}>Gerekçe: </Text>
                      {izin.gerekce}
                    </Text>
                  )}
                  {izin.belge && (
                    <TouchableOpacity 
                      style={styles.belgeButton}
                      onPress={() => downloadOzlukBelge(izin.belge!)}
                    >
                      <Ionicons name="document-attach-outline" size={16} color="#3b82f6" />
                      <Text style={styles.belgeButtonText}>Belgeyi Görüntüle</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.izinActions}>
                  {izin.durum === 'Beklemede' ? (
                    <>
                      <TouchableOpacity
                        style={[styles.izinActionButton, styles.approveButton]}
                        onPress={() => confirmIzinStatusChange(izin.id, 'Onaylandı')}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                        <Text style={styles.izinActionText}>Onayla</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.izinActionButton, styles.rejectButton]}
                        onPress={() => confirmIzinStatusChange(izin.id, 'Reddedildi')}
                      >
                        <Ionicons name="close-circle-outline" size={16} color="#fff" />
                        <Text style={styles.izinActionText}>Reddet</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[styles.izinActionButton, { backgroundColor: '#6b7280' }]}
                      onPress={() => confirmIzinStatusChange(izin.id, 'Beklemede')}
                    >
                      <Ionicons name="refresh-circle-outline" size={16} color="#fff" />
                      <Text style={styles.izinActionText}>Geri Al</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Ay Dropdown Modal */}
        <Modal
          visible={showMonthDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMonthDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowMonthDropdown(false)}
          >
            <View style={styles.monthDropdownContainer}>
              <View style={styles.monthDropdownHeader}>
                <Text style={styles.monthDropdownTitle}>Ay Seç</Text>
                <TouchableOpacity 
                  onPress={() => setShowMonthDropdown(false)}
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
                {monthOptions.map((monthOption) => (
                  <TouchableOpacity
                    key={monthOption.value}
                    style={[
                      styles.monthDropdownItem,
                      izinFilters.ay === monthOption.value && styles.monthDropdownItemSelected
                    ]}
                    onPress={() => {
                      setIzinFilters({...izinFilters, ay: monthOption.value});
                      setShowMonthDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.monthDropdownItemText,
                      izinFilters.ay === monthOption.value && styles.monthDropdownItemTextSelected
                    ]}>
                      {monthOption.label}
                    </Text>
                    {izinFilters.ay === monthOption.value && (
                      <Ionicons name="checkmark-outline" size={20} color="#25b2ef" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Yıl Dropdown Modal */}
        <Modal
          visible={showYearDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowYearDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowYearDropdown(false)}
          >
            <View style={styles.monthDropdownContainer}>
              <View style={styles.monthDropdownHeader}>
                <Text style={styles.monthDropdownTitle}>Yıl Seç</Text>
                <TouchableOpacity 
                  onPress={() => setShowYearDropdown(false)}
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
                {generateYearOptions().map((yil) => (
                  <TouchableOpacity
                    key={yil}
                    style={[
                      styles.monthDropdownItem,
                      izinFilters.yil === yil && styles.monthDropdownItemSelected
                    ]}
                    onPress={() => {
                      setIzinFilters({...izinFilters, yil});
                      setShowYearDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.monthDropdownItemText,
                      izinFilters.yil === yil && styles.monthDropdownItemTextSelected
                    ]}>
                      {yil}
                    </Text>
                    {izinFilters.yil === yil && (
                      <Ionicons name="checkmark-outline" size={20} color="#25b2ef" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Personel Dropdown Modal */}
        <Modal
          visible={showPersonDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPersonDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPersonDropdown(false)}
          >
            <View style={styles.monthDropdownContainer}>
              <View style={styles.monthDropdownHeader}>
                <Text style={styles.monthDropdownTitle}>Personel Seç</Text>
                <TouchableOpacity 
                  onPress={() => setShowPersonDropdown(false)}
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
                  key={'all'}
                  style={[
                    styles.monthDropdownItem,
                    izinFilters.personelId === '' && styles.monthDropdownItemSelected
                  ]}
                  onPress={() => {
                    setIzinFilters({...izinFilters, personelId: ''});
                    setShowPersonDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.monthDropdownItemText,
                    izinFilters.personelId === '' && styles.monthDropdownItemTextSelected
                  ]}>
                    Tümü
                  </Text>
                  {izinFilters.personelId === '' && (
                    <Ionicons name="checkmark-outline" size={20} color="#25b2ef" />
                  )}
                </TouchableOpacity>
                {personelList.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.monthDropdownItem,
                      String(p.id) === izinFilters.personelId && styles.monthDropdownItemSelected
                    ]}
                    onPress={() => {
                      setIzinFilters({...izinFilters, personelId: String(p.id)});
                      setShowPersonDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.monthDropdownItemText,
                      String(p.id) === izinFilters.personelId && styles.monthDropdownItemTextSelected
                    ]}>
                      {`${p.ad} ${p.soyad}`}
                    </Text>
                    {String(p.id) === izinFilters.personelId && (
                      <Ionicons name="checkmark-outline" size={20} color="#25b2ef" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Durum Dropdown Modal */}
        <Modal
          visible={showStatusDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowStatusDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowStatusDropdown(false)}
          >
            <View style={styles.monthDropdownContainer}>
              <View style={styles.monthDropdownHeader}>
                <Text style={styles.monthDropdownTitle}>Durum Seç</Text>
                <TouchableOpacity 
                  onPress={() => setShowStatusDropdown(false)}
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
                {['', 'Beklemede', 'Onaylandı', 'Reddedildi'].map((durum) => (
                  <TouchableOpacity
                    key={durum || 'all'}
                    style={[
                      styles.monthDropdownItem,
                      (izinFilters.durum === durum || (durum === '' && izinFilters.durum === '')) && styles.monthDropdownItemSelected
                    ]}
                    onPress={() => {
                      setIzinFilters({...izinFilters, durum});
                      setShowStatusDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.monthDropdownItemText,
                      (izinFilters.durum === durum || (durum === '' && izinFilters.durum === '')) && styles.monthDropdownItemTextSelected
                    ]}>
                      {durum || 'Tümü'}
                    </Text>
                    {(izinFilters.durum === durum || (durum === '' && izinFilters.durum === '')) && (
                      <Ionicons name="checkmark-outline" size={20} color="#25b2ef" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  const renderDuyurular = () => {
    return (
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={styles.sectionTitle}>📢 Duyurular</Text>
          <TouchableOpacity style={[styles.izinActionButton, styles.approveButton]} onPress={() => openDuyuruModal()}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.izinActionText}>Yeni Duyuru</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.izinListContainer}>
          {duyurular.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="megaphone-outline" size={40} color="#ccc" />
              <Text style={styles.emptyText}>Duyuru bulunamadı</Text>
            </View>
          ) : (
            duyurular.map(d => (
              <View key={d.id} style={styles.izinCard}>
                <Text style={styles.izinPersonelName}>{d.text}</Text>
                {(d.image || d.video) && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'stretch' }}>
                    {d.image ? (
                      <TouchableOpacity
                        onPress={() => openUploadWithChooser(d.image!)}
                        style={{ flex: 1 }}
                        activeOpacity={0.85}
                      >
                        <Image
                          source={{ uri: `${API_BASE_URL}/uploads/${d.image}` }}
                          style={{ width: '100%', height: 180, borderRadius: 8 }}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ) : null}
                    {d.video ? (
                      <TouchableOpacity
                        onPress={() => openUploadWithChooser(d.video!)}
                        style={{ flex: 1, height: 180, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}
                      >
                        <Ionicons name="play-circle-outline" size={42} color="#3b82f6" />
                        <Text style={{ color: '#6b7280', marginTop: 6 }} numberOfLines={1}>
                          {d.video}
                        </Text>
                        <Text style={{ color: '#3b82f6', marginTop: 2, fontWeight: '600' }}>Videoyu Aç</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
                <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>{new Date(d.createdAt).toLocaleString()}</Text>

                <View style={[styles.izinActions, { marginTop: 10 }]}>
                  <TouchableOpacity style={[styles.izinActionButton, styles.approveButton]} onPress={() => openDuyuruModal(d)}>
                    <Ionicons name="create-outline" size={16} color="#fff" />
                    <Text style={styles.izinActionText}>Düzenle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.izinActionButton, styles.rejectButton]} onPress={() => deleteDuyuru(d.id)}>
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                    <Text style={styles.izinActionText}>Sil</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <Modal visible={duyuruModalVisible} transparent animationType="slide" onRequestClose={closeDuyuruModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingDuyuru ? 'Duyuruyu Düzenle' : 'Yeni Duyuru'}</Text>
                <TouchableOpacity onPress={closeDuyuruModal}><Ionicons name="close-outline" size={28} color="#6b7280" /></TouchableOpacity>
              </View>
              <ScrollView 
                style={{ padding: 12, maxHeight: 420 }}
                contentContainerStyle={{ paddingBottom: 12 }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                <TextInput
                  value={duyuruText}
                  onChangeText={setDuyuruText}
                  placeholder="Duyuru metni"
                  style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, minHeight: 100, maxHeight: 260, textAlignVertical: 'top' }}
                  multiline
                  scrollEnabled
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={styles.downloadButton} onPress={pickDuyuruImage}>
                      <Ionicons name="image-outline" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.downloadButton} onPress={pickDuyuruVideo}>
                      <Ionicons name="videocam-outline" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={[styles.izinActionButton, styles.rejectButton]} onPress={closeDuyuruModal}>
                      <Ionicons name="close-circle-outline" size={16} color="#fff" />
                      <Text style={styles.izinActionText}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.izinActionButton, styles.approveButton]} onPress={saveDuyuru}>
                      <Ionicons name="save-outline" size={16} color="#fff" />
                      <Text style={styles.izinActionText}>Kaydet</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {(duyuruImage || duyuruVideo) && (
                  <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>
                    Ek: {duyuruImage?.name || duyuruVideo?.name}
                  </Text>
                )}
                
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderWithSkeleton('dashboard', renderDashboard);
      case 'personel':
        return renderWithSkeleton('personel', renderPersoneller);
      case 'ozluk':
        return renderWithSkeleton('ozluk', renderOzlukBelgeleri);
      case 'izin':
        return renderWithSkeleton('izin', renderIzinTalepleri);
      case 'duyuru':
        return renderWithSkeleton('duyuru', renderDuyurular);
      case 'kartlar':
        return renderWithSkeleton('kartlar', renderKartlar);
      case 'raporlar':
        return renderWithSkeleton('raporlar', renderUretimRaporlari);
      case 'iletisim':
        return renderWithSkeleton('iletisim', renderIletisim);
      default:
        return renderDashboard();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#234060', '#234060']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Admin Paneli</Text>
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
                refreshControl={
                  <RefreshControl
                    refreshing={loading || (menuItems[index].id === 'kartlar' && kartLoading)}
                    onRefresh={() => {
                      loadStats();
                      const sec = menuItems[index].id;
                      if (sec === 'kartlar') {
                        loadKartlar();
                      } else if (sec === 'raporlar') {
                        // reset dropdowns to defaults
                        setRaporFilters({ yil: '', ay: '', kartId: '', personelId: '' });
                        loadReportsMeta();
                        setRaporDetay([]);
                        setRaporOzet(null);
                      }
                    }}
                  />
                }
              >
                {(() => {
                  switch (item.id) {
                    case 'dashboard':
                      return renderWithSkeleton('dashboard', renderDashboard);
                    case 'personel':
                      return renderWithSkeleton('personel', renderPersoneller);
                    case 'ozluk':
                      return renderWithSkeleton('ozluk', renderOzlukBelgeleri);
                    case 'izin':
                      return renderWithSkeleton('izin', renderIzinTalepleri);
                    case 'duyuru':
                      return renderWithSkeleton('duyuru', renderDuyurular);
                    case 'kartlar':
                      return renderWithSkeleton('kartlar', renderKartlar);
                    case 'raporlar':
                      return renderWithSkeleton('raporlar', renderUretimRaporlari);
                    case 'iletisim':
                      return renderWithSkeleton('iletisim', renderIletisim);
                    default:
                      return renderDashboard();
                  }
                })()}
              </ScrollView>
            </View>
          ))}
        </ScrollView>

        {/* Bottom Tab Navigation */}
        <View style={[styles.bottomTabContainer, { paddingBottom: Math.max(insets.bottom, 2) + 2 }]}>
          <View style={styles.bottomTabContent}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={styles.bottomTabItem}
                onPress={() => {
                  const pageIndex = menuItems.findIndex(menuItem => menuItem.id === item.id);
                  // Sadece sayfaya kaydır; aktif sekmeyi scroll eventi belirlesin
                  scrollToPage(pageIndex);
                }}
              >
                <Ionicons 
                  name={item.icon as any} 
                  size={22} 
                  color={currentPageIndex === index ? '#25b2ef' : '#8a9ba8'} 
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Edit Modal */}
        <Modal
          visible={editModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={closeEditModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Personel Düzenle</Text>
                <TouchableOpacity onPress={closeEditModal} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalScrollContent}
                showsVerticalScrollIndicator={true}
                indicatorStyle="black"
                scrollIndicatorInsets={{ right: 1 }}
                nestedScrollEnabled={true}
              >
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Ad</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.ad}
                    onChangeText={(text) => setEditForm({...editForm, ad: text})}
                    placeholder="Ad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Soyad</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.soyad}
                    onChangeText={(text) => setEditForm({...editForm, soyad: text})}
                    placeholder="Soyad"
                  />
                </View>



                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Eğitim</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.egitim}
                    onChangeText={(text) => setEditForm({...editForm, egitim: text})}
                    placeholder="Eğitim"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Unvan</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.gorev}
                    onChangeText={(text) => setEditForm({...editForm, gorev: text})}
                    placeholder="Unvan"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Başlama Tarihi</Text>
                  <TouchableOpacity 
                    style={styles.datePickerButton} 
                    onPress={showDatePickerModal}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.datePickerText}>
                      {editForm.baslama || 'Tarih Seçin'}
                    </Text>
                    <Ionicons name="calendar" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputContainer, { marginBottom: 30 }]}>
                  <Text style={styles.inputLabel}>Fotoğraf</Text>
                  <View style={styles.photoRowContainer}>
                    <View style={styles.currentPhotoContainer}>
                      {selectedImage === 'DELETE' ? (
                        <View style={styles.editPhotoPlaceholder}>
                          <Ionicons name="person" size={40} color="#999" />
                        </View>
                      ) : selectedImage && selectedImage !== 'DELETE' ? (
                        <Image source={{ uri: selectedImage }} style={styles.editPhotoPreview} />
                      ) : editingPersonel?.foto ? (
                        <Image 
                          source={{ uri: `${API_BASE_URL}/uploads/${editingPersonel.foto}` }} 
                          style={styles.editPhotoPreview}
                          defaultSource={require('../../assets/fotonik-logo.png')}
                        />
                      ) : (
                        <View style={styles.editPhotoPlaceholder}>
                          <Ionicons name="person" size={40} color="#999" />
                        </View>
                      )}
                    </View>
                    
                    {(selectedImage === 'DELETE' ? false : (selectedImage || editingPersonel?.foto)) && (
                      <TouchableOpacity style={styles.deletePhotoButtonCenter} onPress={deletePhoto}>
                        <Ionicons name="trash" size={16} color="#fff" />
                        <Text style={styles.deletePhotoText}>Sil</Text>
                      </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity style={styles.selectPhotoButtonRight} onPress={selectPhotoSource}>
                      <Ionicons name="camera" size={16} color="#fff" />
                      <Text style={styles.selectPhotoText}>Yükle</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
              
              {/* Fixed Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeEditModal}>
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={savePersonelEdit}>
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
              
              {/* Custom Date Picker Modal */}
              <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={cancelDateSelection}
              >
                <View style={styles.datePickerOverlay}>
                  <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerHeader}>
                      <Text style={styles.datePickerTitle}>Tarih Seç</Text>
                    </View>
                    
                    <View style={styles.datePickerContent}>
                      {/* Month/Year Navigation */}
                      <View style={styles.calendarHeader}>
                        <TouchableOpacity 
                          style={styles.navButton} 
                          onPress={() => setTempDate({...tempDate, month: tempDate.month === 1 ? 12 : tempDate.month - 1, year: tempDate.month === 1 ? tempDate.year - 1 : tempDate.year})}
                        >
                          <Ionicons name="chevron-back" size={20} color="#1761a0" />
                        </TouchableOpacity>
                        
                        <Text style={styles.monthYearText}>
                          {getMonthName(tempDate.month)} {tempDate.year}
                        </Text>
                        
                        <TouchableOpacity 
                          style={styles.navButton} 
                          onPress={() => setTempDate({...tempDate, month: tempDate.month === 12 ? 1 : tempDate.month + 1, year: tempDate.month === 12 ? tempDate.year + 1 : tempDate.year})}
                        >
                          <Ionicons name="chevron-forward" size={20} color="#1761a0" />
                        </TouchableOpacity>
                      </View>
                      
                      {/* Days of Week Header */}
                      <View style={styles.daysHeader}>
                        {['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map((day) => (
                          <Text key={day} style={styles.dayHeaderText}>{day}</Text>
                        ))}
                      </View>
                      
                      {/* Calendar Grid */}
                      <View style={styles.calendarGrid}>
                        {renderCalendarDays()}
                      </View>
                    </View>
                    
                    <View style={styles.datePickerButtons}>
                      <TouchableOpacity style={styles.datePickerCancelButton} onPress={cancelDateSelection}>
                        <Text style={styles.datePickerCancelText}>İptal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.datePickerConfirmButton} onPress={confirmDateSelection}>
                        <Text style={styles.datePickerConfirmText}>Tamam</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </View>
          </View>
        </Modal>

        {/* Add Person Modal */}
        <Modal
          visible={addModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={closeAddModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Yeni Personel Ekle</Text>
                <TouchableOpacity onPress={closeAddModal} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalScrollContent}
                showsVerticalScrollIndicator={true}
                indicatorStyle="black"
                scrollIndicatorInsets={{ right: 1 }}
                nestedScrollEnabled={true}
              >
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Ad</Text>
                  <TextInput
                    style={styles.input}
                    value={addForm.ad}
                    onChangeText={(text) => setAddForm({...addForm, ad: text})}
                    placeholder="Ad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Soyad</Text>
                  <TextInput
                    style={styles.input}
                    value={addForm.soyad}
                    onChangeText={(text) => setAddForm({...addForm, soyad: text})}
                    placeholder="Soyad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Eğitim</Text>
                  <TextInput
                    style={styles.input}
                    value={addForm.egitim}
                    onChangeText={(text) => setAddForm({...addForm, egitim: text})}
                    placeholder="Eğitim"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Unvan</Text>
                  <TextInput
                    style={styles.input}
                    value={addForm.gorev}
                    onChangeText={(text) => setAddForm({...addForm, gorev: text})}
                    placeholder="Unvan"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Başlama Tarihi</Text>
                  <TouchableOpacity 
                    style={styles.datePickerButton} 
                    onPress={addShowDatePickerModal}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.datePickerText}>
                      {addForm.baslama || 'Tarih Seçin'}
                    </Text>
                    <Ionicons name="calendar" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputContainer, { marginBottom: 30 }]}>
                  <Text style={styles.inputLabel}>Fotoğraf</Text>
                  <View style={styles.photoRowContainer}>
                    <View style={styles.currentPhotoContainer}>
                      {addSelectedImage ? (
                        <Image source={{ uri: addSelectedImage }} style={styles.editPhotoPreview} />
                      ) : (
                        <View style={styles.editPhotoPlaceholder}>
                          <Ionicons name="person" size={40} color="#999" />
                        </View>
                      )}
                    </View>
                    
                    <TouchableOpacity style={styles.selectPhotoButtonRight} onPress={addSelectPhotoSource}>
                      <Ionicons name="camera" size={16} color="#fff" />
                      <Text style={styles.selectPhotoText}>Fotoğraf Seç</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
              
              {/* Fixed Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeAddModal}>
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveNewPersonel}>
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
              
              {/* Add Person Date Picker Modal */}
              <Modal
                visible={addShowDatePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={addCancelDateSelection}
              >
                <View style={styles.datePickerOverlay}>
                  <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerHeader}>
                      <Text style={styles.datePickerTitle}>Tarih Seç</Text>
                    </View>
                    
                    <View style={styles.datePickerContent}>
                      <View style={styles.calendarHeader}>
                        <TouchableOpacity 
                          style={styles.navButton} 
                          onPress={() => setAddTempDate({...addTempDate, month: addTempDate.month === 1 ? 12 : addTempDate.month - 1, year: addTempDate.month === 1 ? addTempDate.year - 1 : addTempDate.year})}
                        >
                          <Ionicons name="chevron-back" size={20} color="#1761a0" />
                        </TouchableOpacity>
                        
                        <Text style={styles.monthYearText}>
                          {getMonthName(addTempDate.month)} {addTempDate.year}
                        </Text>
                        
                        <TouchableOpacity 
                          style={styles.navButton} 
                          onPress={() => setAddTempDate({...addTempDate, month: addTempDate.month === 12 ? 1 : addTempDate.month + 1, year: addTempDate.month === 12 ? addTempDate.year + 1 : addTempDate.year})}
                        >
                          <Ionicons name="chevron-forward" size={20} color="#1761a0" />
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.daysHeader}>
                        {['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map((day) => (
                          <Text key={day} style={styles.dayHeaderText}>{day}</Text>
                        ))}
                      </View>
                      
                      <View style={styles.calendarGrid}>
                        {renderAddCalendarDays()}
                      </View>
                    </View>
                    
                    <View style={styles.datePickerButtons}>
                      <TouchableOpacity style={styles.datePickerCancelButton} onPress={addCancelDateSelection}>
                        <Text style={styles.datePickerCancelText}>İptal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.datePickerConfirmButton} onPress={addConfirmDateSelection}>
                        <Text style={styles.datePickerConfirmText}>Tamam</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

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
    paddingTop: 2,
    paddingLeft: 0,
    paddingRight: 12,
  },
  bottomTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingLeft: 6,
    paddingRight: 0,
    minHeight: 44,
  },
  bottomTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    minWidth: 38,
    minHeight: 36,
    flex: 1,
    marginHorizontal: 1,
  },
  content: {
    flex: 1,
    backgroundColor: '#f6f8fa',
    marginBottom: 0,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#134b79',
    textAlign: 'center',
    marginBottom: 8,
  },
  addPersonButton: {
    backgroundColor: '#1761a0',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButton: {
    backgroundColor: '#1761a0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#1761a0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  statsContainer: {
    flexDirection: 'column',
    gap: 15,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    width: '100%',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1761a0',
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
    color: '#134b79',
    marginTop: 15,
    textAlign: 'center',
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyContainer: {
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
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#134b79',
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  personelContainer: {
    flex: 1,
  },
  personelListContainer: {
    height: 550, // Increased height for 5 cards
    width: '100%',
  },
  personelScrollContainer: {
    height: '100%',
  },
  ozlukScrollContainer: {
    flex: 1,
    paddingTop: 10,
  },
  personelCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  personelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personelPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
    backgroundColor: '#f0f0f0',
  },
  personelAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1761a0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  personelInitials: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  personelDetails: {
    flex: 1,
  },
  personelActions: {
    flexDirection: 'column',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#f59e0b',
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#134b79',
    marginBottom: 4,
  },
  personelField: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  personelDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: width * 0.95,
    height: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#134b79',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 30,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#134b79',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6b7280',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#1761a0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  photoRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  currentPhotoContainer: {
    width: 80,
  },
  editPhotoPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
  },
  editPhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  selectPhotoButton: {
    backgroundColor: '#1761a0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
  selectPhotoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deletePhotoButton: {
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  deletePhotoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deletePhotoButtonFull: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  deletePhotoButtonSide: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
  },
  deletePhotoButtonCenter: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 90,
  },
  selectPhotoButtonRight: {
    backgroundColor: '#1761a0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: width * 0.8,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    zIndex: 1001,
  },
  datePickerHeader: {
    backgroundColor: '#1761a0',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
  },
  datePickerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  datePickerContent: {
    padding: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1761a0',
  },
  daysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  dayHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    width: 40,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarDay: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 1,
  },
  selectedDay: {
    backgroundColor: '#1761a0',
    borderRadius: 20,
  },
  dayText: {
    fontSize: 16,
    color: '#333',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  datePickerButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  datePickerCancelButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#eee',
  },
  datePickerCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerConfirmButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#1761a0',
    borderBottomRightRadius: 12,
  },
  datePickerConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Özlük Belgeleri Styles
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#134b79',
    marginBottom: 16,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  filterDropdownText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  filePickerButton: {
    backgroundColor: '#1761a0',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  filePickerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fileInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  uploadButton: {
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  uploadButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  emptyDocumentsContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyDocumentsText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  documentsScroll: {
    maxHeight: 300,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  documentType: {
    fontSize: 14,
    color: '#134b79',
    fontWeight: '500',
  },
  documentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  downloadButton: {
    backgroundColor: '#3b82f6',
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteDocButton: {
    backgroundColor: '#ef4444',
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: width * 0.85,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#134b79',
  },
  pickerContent: {
    maxHeight: 400,
  },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerItemSelected: {
    backgroundColor: '#eaf3fb',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#333',
  },
  pickerItemTextSelected: {
    color: '#1761a0',
    fontWeight: '600',
  },

  // İletişim styles
  filterContainer: {
    marginTop: 4,
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  filterButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 2,
    borderRadius: 20,
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minHeight: 28,
    maxHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#1761a0',
    borderColor: '#1761a0',
  },
  filterButtonText: {
    color: '#6c757d',
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: -4,
  },
  emptyMessageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginTop: 20,
  },
  emptyMessageText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 12,
    textAlign: 'center',
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  messageTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  messageDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  messageContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  messageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  markReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  markReadText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
  },
  messageDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  messageDeleteButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },

  // Compact İletişim styles
  iletisimTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#134b79',
    textAlign: 'center',
    marginBottom: 6,
  },
  compactFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    justifyContent: 'space-around',
  },
  compactFilterButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minHeight: 28,
  },
  compactFilterButtonActive: {
    backgroundColor: '#1761a0',
    borderColor: '#1761a0',
  },
  compactFilterText: {
    color: '#6c757d',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  compactFilterTextActive: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  compactMessagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  compactEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    marginTop: 20,
  },
  compactEmptyText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8,
    textAlign: 'center',
  },
  compactMessageCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  compactMessageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  compactTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  compactTypeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  compactUnreadBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  compactUnreadText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600',
  },
  compactMessageDate: {
    fontSize: 11,
    color: '#6c757d',
  },
  compactMessageContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 10,
  },
  compactMessageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  compactReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  compactReadText: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '600',
  },
  compactDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  compactDeleteText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '600',
  },

  // İzin Talepleri Styles
  filtersContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  izinFilterButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  izinFilterButtonText: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  izinListContainer: {
    flex: 1,
  },
  izinCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  izinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  izinPersonelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  izinDurumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  izinDurumText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  izinDetails: {
    marginBottom: 12,
  },
  izinDetailText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  izinDetailLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  belgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  belgeButtonText: {
    color: '#3b82f6',
    fontSize: 12,
    marginLeft: 4,
  },
  izinActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  izinActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  approveButton: {
    backgroundColor: '#22c55e',
  },
  secondaryButton: {
    backgroundColor: '#444c59',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  izinActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Month Dropdown Styles
  monthDropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: width * 0.75,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  monthDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#f9fafb',
  },
  monthDropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  monthDropdownClose: {
    padding: 4,
  },
  monthDropdownScroll: {
    maxHeight: 300,
  },
  monthDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  monthDropdownItemSelected: {
    backgroundColor: '#eff6ff',
  },
  monthDropdownItemText: {
    fontSize: 16,
    color: '#374151',
  },
  monthDropdownItemTextSelected: {
    color: '#25b2ef',
    fontWeight: '600',
  },

  // Swipe navigation styles
  swipeContainer: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
  },
});

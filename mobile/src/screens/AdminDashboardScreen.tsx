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
  Image,
  Modal,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Ionicons from 'react-native-vector-icons/Ionicons';

interface AdminDashboardScreenProps {
  navigation: any;
}

interface Stats {
  toplam: number;
  rapor: string;
  izin: number;
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

export default function AdminDashboardScreen({ navigation }: AdminDashboardScreenProps) {
  const [stats, setStats] = useState<Stats>({ toplam: 0, rapor: '—', izin: 0 });
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [personelList, setPersonelList] = useState<Personel[]>([]);
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

  useEffect(() => {
    loadStats();
    if (activeSection === 'personel') {
      loadPersoneller();
    }
  }, [activeSection]);

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
        fetch('http://10.0.2.2:3000/api/personel', { headers }),
        fetch('http://10.0.2.2:3000/api/izin', { headers }),
        fetch('http://10.0.2.2:3000/api/uretim/istatistik', { headers })
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

  const loadPersoneller = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('AdminLogin');
        return;
      }

      const response = await fetch('http://10.0.2.2:3000/api/personel', {
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

      console.log('Sending data:', {
        ad: addForm.ad.trim(),
        soyad: addForm.soyad.trim(),
        egitim: addForm.egitim.trim(),
        gorev: addForm.gorev.trim(),
        baslama: addForm.baslama,
        hasPhoto: !!addSelectedImage
      });

      if (addSelectedImage) {
        const filename = addSelectedImage.split('/').pop() || 'photo.jpg';
        const fileType = filename.split('.').pop();
        
        formData.append('foto', {
          uri: addSelectedImage,
          type: `image/${fileType}`,
          name: filename,
        } as any);
      }

      const response = await fetch('http://10.0.2.2:3000/api/personel/add', {
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
        console.log('Server error:', response.status, errorData);
        Alert.alert('Hata', `Personel eklenemedi. HTTP ${response.status}: ${errorData || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.log('Network error:', error);
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

      const response = await fetch(`http://10.0.2.2:3000/api/personel/${editingPersonel.id}`, {
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

              const response = await fetch(`http://10.0.2.2:3000/api/personel/${id}`, {
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
    { id: 'iletisim', title: 'İletişim', icon: 'mail-outline' },
  ];

  const renderDashboard = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Hoş Geldiniz</Text>
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
    </View>
  );

  const renderPersoneller = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>👥 Personeller</Text>
        <TouchableOpacity style={styles.addPersonButton} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      {personelList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={60} color="#1761a0" />
          <Text style={styles.emptyText}>Henüz personel kaydı yok</Text>
          <Text style={styles.emptySubtext}>
            Web uygulamasından personel ekleyebilirsiniz
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.personelScrollContainer}
          showsVerticalScrollIndicator={false}
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
        >
          {personelList.map((personel) => (
            <View key={personel.id} style={styles.personelCard}>
              <View style={styles.personelInfo}>
                {personel.foto ? (
                  <Image
                    source={{ uri: `http://10.0.2.2:3000/uploads/${personel.foto}` }}
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
      )}
    </View>
  );

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

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'personel':
        return renderPersoneller();
      case 'ozluk':
        return renderComingSoon('📁 Özlük Belgeleri');
      case 'izin':
        return renderComingSoon('📝 İzin Talepleri');
      case 'duyuru':
        return renderComingSoon('📢 Duyurular');
      case 'kartlar':
        return renderComingSoon('🗂️ Üretim Kartları');
      case 'raporlar':
        return renderComingSoon('📊 Üretim Raporları');
      case 'iletisim':
        return renderComingSoon('📬 İletişim');
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



        {/* Content */}
        <ScrollView
          style={styles.content}
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
                style={styles.modalContent}
                showsVerticalScrollIndicator={false}
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

                <View style={styles.inputContainer}>
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
                          source={{ uri: `http://10.0.2.2:3000/uploads/${editingPersonel.foto}` }} 
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
                      <Text style={styles.selectPhotoText}>Fotoğraf Seç</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={closeEditModal}>
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={savePersonelEdit}>
                    <Text style={styles.saveButtonText}>Kaydet</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
              
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
                style={styles.modalContent}
                showsVerticalScrollIndicator={false}
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

                <View style={styles.inputContainer}>
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

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={closeAddModal}>
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={saveNewPersonel}>
                    <Text style={styles.saveButtonText}>Kaydet</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
              
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
  content: {
    flex: 1,
    backgroundColor: '#f6f8fa',
    marginBottom: 0,
  },
  section: {
    padding: 20,
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
    marginBottom: 20,
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
  personelScrollContainer: {
    maxHeight: 700,
    flex: 1,
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
    width: width * 0.9,
    maxHeight: '90%',
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
    marginTop: 20,
    gap: 12,
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
});

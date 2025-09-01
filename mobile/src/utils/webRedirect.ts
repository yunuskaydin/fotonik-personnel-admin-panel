import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const redirectToWebApp = async () => {
  try {
    const userType = await AsyncStorage.getItem('userType');
    const baseUrl = 'http://localhost:3000';
    
    if (userType === 'admin') {
      // Admin paneline yönlendir
      await Linking.openURL(`${baseUrl}/admin/`);
    } else if (userType === 'personel') {
      // Personel paneline yönlendir
      await Linking.openURL(`${baseUrl}/personel/index.html`);
    }
  } catch (error) {
    // Hata durumunda sessizce başarısız ol
  }
};
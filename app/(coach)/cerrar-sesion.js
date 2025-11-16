import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function CerrarSesionCoach() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      try {
        console.log('🚀 Cerrando sesión de coach...');
        await AsyncStorage.multiRemove(['userToken', 'userData', 'userRole']);
        console.log('✅ Storage limpiado');
        router.replace('/');
        
      } catch (error) {
        console.error('❌ Error en logout:', error);
        router.replace('/');
      }
    };

    logout();
  }, []);

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#1a1a1a' 
    }}>
      <ActivityIndicator size="large" color="#fdeb4d" />
      <Text style={{ color: 'white', marginTop: 10 }}>Cerrando sesión...</Text>
    </View>
  );
}
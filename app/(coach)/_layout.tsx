import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function CoachLayout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (!userDataString) {
        router.replace('/');
        return;
      }

      const userData = JSON.parse(userDataString);
      if (userData.role === 'coach') {
        setIsCoach(true);
      } else {
        console.log('Usuario no es coach, redirigiendo...');
        router.replace('/(drawer)/(tabs)/rutinas');
      }
    } catch (error) {
      console.error('Error verificando rol:', error);
      router.replace('/');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 10 }}>Verificando acceso...</Text>
      </View>
    );
  }

  if (!isCoach) {
    return null; 
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#3B82F6',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Dashboard Coach',
        }} 
      />
      <Stack.Screen name="notes" options={{ title: 'Mis Notas' }} />
      <Stack.Screen name="clients" options={{ headerShown: false }} />
    </Stack>
  );
}
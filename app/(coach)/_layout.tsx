import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function CoachLayout() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allow, setAllow] = useState(false);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const userDataStr = await AsyncStorage.getItem('userData');
      const userRoleStored = await AsyncStorage.getItem('userRole');
      
      if (!token) {
        setAllow(false);
        router.replace('/');
        return;
      }

      const role = userDataStr ? JSON.parse(userDataStr).role : userRoleStored;
      if (role !== 'coach') {
        setAllow(false);
        router.replace('/');
        return;
      }
      setAllow(true);

    } catch (e) {
      setAllow(false);
      router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 10 }}>Verificando acceso...</Text>
      </View>
    );
  }

  if (!allow) return <View />; 

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#3B82F6' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Dashboard Coach' }} />
      <Stack.Screen name="clients" options={{ headerShown: false }} />
      <Stack.Screen 
        name="crear-sesion-meet" 
        options={{ 
          title: 'Agendar Sesión Meet',
          presentation: 'modal' 
        }} 
      />
    </Stack>
  );
}
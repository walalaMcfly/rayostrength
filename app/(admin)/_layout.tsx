import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';

export default function AdminLayout() {
  const router = useRouter();

  useEffect(() => {
    const verify = async () => {
      const role = await AsyncStorage.getItem('userRole');
      if (role !== 'admin') {
        Alert.alert('Acceso denegado', 'No tienes permisos de administrador');
        await AsyncStorage.multiRemove(['userRole', 'userToken', 'userData']);
       router.replace('/');
      }
    };
    verify();
  }, []);

 const handleLogout = async () => {
  console.log('[LOGOUT] Botón presionado');
  Alert.alert(
    'Cerrar sesión',
    '¿Seguro?',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí',
        onPress: async () => {
          console.log('[LOGOUT] Confirmado');
          try {
            const keysBefore = await AsyncStorage.getAllKeys();
            console.log('[LOGOUT] Keys antes:', keysBefore);
            await AsyncStorage.multiRemove(['userRole', 'userToken', 'userData']);
            const keysAfter = await AsyncStorage.getAllKeys();
            console.log('[LOGOUT] Keys después:', keysAfter);
            console.log('[LOGOUT] Navegando a /');
            router.replace('/(admin)');
          } catch (e) {
            console.error('[LOGOUT] Error:', e);
          }
        },
      },
    ]
  );
};

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#fdec4d',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#2a2a2a',
        },
        headerStyle: { backgroundColor: '#1a1a1a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#dc2626',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              marginRight: 15,
            }}
          >
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 5 }}>
              Salir
            </Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="coaches"
        options={{
          title: 'Coaches',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="usuarios"
        options={{
          title: 'Usuarios',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
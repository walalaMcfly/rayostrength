import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { Alert } from 'react-native';

export default function DrawerLayout() {
  const router = useRouter();

  const handleCerrarSesion = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que quieres cerrar sesión?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        { 
          text: "Cerrar Sesión", 
          onPress: () => router.replace('/'),
          style: "destructive"
        }
      ]
    );
  };

  return (
    <Drawer
      screenOptions={{
        headerStyle: {
          backgroundColor: '#D1B000',
        },
        headerTintColor: '#fff',
        drawerActiveTintColor: '#D1B000',
        drawerInactiveTintColor: '#333',
        drawerStyle: {
          backgroundColor: '#fff',
        },
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '600',
        },
      }}
    >
      {/* PANTALLA PRINCIPAL CON TABS */}
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerLabel: 'Inicio',
          title: 'Mi Entrenamiento',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      {/* OPCIONES DEL MENÚ */}
      <Drawer.Screen
        name="perfil"
        options={{
          drawerLabel: 'Perfil',
          title: 'Mi Perfil',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="MeetScreen"
        options={{
          drawerLabel: 'Video llamadas',
          title: 'Sesiones con Coach',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="videocam-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen
        name="notificaciones"
        options={{
          drawerLabel: 'Notificaciones',
          title: 'Notificaciones',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="tema"
        options={{
          drawerLabel: 'Tema',
          title: 'Configuración de Tema',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="color-palette-outline" size={size} color={color} />
          ),
        }}
      />

      {/* CERRAR SESIÓN (SOLO EN DRAWER) */}
      <Drawer.Screen
        name="cerrar-sesion"
        options={{
          drawerLabel: 'Cerrar Sesión',
          title: 'Cerrar Sesión',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="log-out-outline" size={size} color={color} />
          ),
        }}
        listeners={{
          drawerItemPress: (e) => {
            e.preventDefault();
            handleCerrarSesion();
          },
        }}
      />
    </Drawer>
  );
}
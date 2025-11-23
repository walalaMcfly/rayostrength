import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
          style: "cancel",
        },
        {
          text: "Cerrar Sesión",
          style: "destructive",
          onPress: async () => {
            try {
              // 🔥 Elimina los datos guardados del usuario
              await AsyncStorage.multiRemove([
                'userToken',
                'userData',
                'userRole',
              ]);

              console.log("🧹 Sesión cerrada");

              // 🔥 Redirige al login
              router.replace('/');
            } catch (error) {
              console.log("❌ Error al cerrar sesión:", error);
            }
          },
        },
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

      {/* TABS PRINCIPALES */}
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

      {/* PERFIL */}
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

      {/* VIDEO LLAMADAS */}
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

      {/* NOTIFICACIONES */}
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

      {/* TEMA */}
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

      {/* CERRAR SESIÓN */}
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
            e.preventDefault(); // ❗ No navegar a una pantalla
            handleCerrarSesion(); // 🔥 Solo ejecutar logout
          },
        }}
      />

    </Drawer>
  );
}

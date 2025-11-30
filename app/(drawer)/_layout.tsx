import { Ionicons } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerStyle: { backgroundColor: '#D1B000' },
        headerTintColor: '#fff',
        drawerActiveTintColor: '#D1B000',
        drawerInactiveTintColor: '#333',
        drawerStyle: { backgroundColor: '#fff' },
        drawerLabelStyle: { fontSize: 16, fontWeight: '600' },
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


      {/* CERRAR SESIÓN  */}
      <Drawer.Screen
        name="cerrarsesion"
        options={{
          drawerLabel: 'Cerrar Sesión',
          title: 'Cerrar Sesión',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="log-out-outline" size={size} color={color} />
          ),
        }}
      />

    </Drawer>
  );
}

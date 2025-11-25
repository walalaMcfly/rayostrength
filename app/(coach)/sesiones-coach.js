import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const API_URL = 'https://rayostrength-production.up.railway.app/api';

const colors = {
  primary: '#3B82F6',
  background: '#F3F4F6',
  text: '#1F2937',
  white: '#FFFFFF',
  gray: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

export default function SesionesCoach() {
  const [sesiones, setSesiones] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarSesiones = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/meet/sesiones-coach`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSesiones(data.sesiones || []);
      }
    } catch (error) {
      console.error('Error cargando sesiones:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(() => {
    cargarSesiones();
  });

  const completarSesion = async (idSesion) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/meet/completar-sesion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ idSesion })
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('✅ Sesión Completada', 'La sesión ha sido marcada como completada y desaparecerá de la lista del usuario.');
        cargarSesiones();
      } else {
        Alert.alert('Error', data.message || 'No se pudo completar la sesión');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo completar la sesión');
    }
  };

  const formatFecha = (fechaString) => {
    return new Date(fechaString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Cargando sesiones...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Mis Sesiones Programadas</Text>
      
      {sesiones.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No tienes sesiones programadas</Text>
        </View>
      ) : (
        sesiones.map((sesion) => (
          <View key={sesion.id_sesion} style={styles.sesionCard}>
            <Text style={styles.sesionTitulo}>{sesion.titulo}</Text>
            <Text style={styles.sesionCliente}>Cliente: {sesion.usuario_nombre} {sesion.usuario_apellido}</Text>
            <Text style={styles.sesionFecha}>📅 {formatFecha(sesion.fecha_sesion)}</Text>
            <Text style={styles.sesionDuracion}>⏱️ {sesion.duracion_minutos} minutos</Text>
            
            {sesion.descripcion && (
              <Text style={styles.sesionDescripcion}>{sesion.descripcion}</Text>
            )}

            <TouchableOpacity 
              style={styles.completarButton}
              onPress={() => completarSesion(sesion.id_sesion)}
            >
              <Text style={styles.completarButtonText}>✅ Marcar como Completada</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.gray,
  },
  sesionCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sesionTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  sesionCliente: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 6,
  },
  sesionFecha: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  sesionDuracion: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  sesionDescripcion: {
    fontSize: 14,
    color: colors.gray,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  completarButton: {
    backgroundColor: colors.success,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  completarButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
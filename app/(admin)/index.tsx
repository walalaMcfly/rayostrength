import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

const API_URL = 'https://rayostrength-production.up.railway.app/api';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    usuariosActivos: 0,
    coachesActivos: 0,
    rutinasAsignadas: 0,
    sesionesHoy: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/admin/estadisticas`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.estadisticas) {
        setStats(data.estadisticas);
      }
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };



  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fdec4d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con botón de logout */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Panel de Administración</Text>
          <Text style={styles.subtitle}>RayoStrength</Text>
        </View>
      </View>
      

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fdec4d"
          />
        }
      >

        
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#2563eb' }]}>
            <Ionicons name="people-outline" size={32} color="#fff" />
            <Text style={styles.statNumber}>{stats.usuariosActivos}</Text>
            <Text style={styles.statLabel}>Usuarios Activos</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#7c3aed' }]}>
            <Ionicons name="barbell-outline" size={32} color="#fff" />
            <Text style={styles.statNumber}>{stats.coachesActivos}</Text>
            <Text style={styles.statLabel}>Coaches Activos</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#059669' }]}>
            <Ionicons name="document-text-outline" size={32} color="#fff" />
            <Text style={styles.statNumber}>{stats.rutinasAsignadas}</Text>
            <Text style={styles.statLabel}>Rutinas Asignadas</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#dc2626' }]}>
            <Ionicons name="fitness-outline" size={32} color="#fff" />
            <Text style={styles.statNumber}>{stats.sesionesHoy}</Text>
            <Text style={styles.statLabel}>Sesiones Hoy</Text>
          </View>
        </View>

        

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Acciones Rápidas</Text>
          <Text style={styles.infoText}>
            • Gestiona coaches desde la pestaña "Coaches"{'\n'}
            • Administra usuarios desde "Usuarios"{'\n'}
            • Desliza para actualizar estadísticas
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50, 
    backgroundColor: '#1a1a1a',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  logoutText: {
    color: '#fdec4d',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
  },
  statCard: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  infoSection: {
    margin: 20,
    padding: 20,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 22,
  },
});
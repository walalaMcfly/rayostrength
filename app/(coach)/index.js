import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const API_URL = 'https://rayostrength-production.up.railway.app/api';

const colors = {
  primary: '#3B82F6',
  secondary: '#F59E0B',
  background: '#F3F4F6',
  text: '#1F2937',
  white: '#FFFFFF',
  gray: '#6B7280',
  success: '#10B981',
  error: '#EF4444',
};

export default function CoachDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClientes: 0,
    rutinasCompletadas: 0,
    clientesActivos: 0
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCoachData();
  }, []);

  const loadCoachData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/coach/clientes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudieron cargar los datos`);
      }

      const data = await response.json();

      if (data.success) {
        const clientes = data.clientes || [];
        const totalRutinas = clientes.reduce((sum, cliente) => sum + (cliente.rutinas_completadas || 0), 0);
        const clientesActivos = clientes.filter(cliente => (cliente.rutinas_completadas || 0) > 0).length;

        setStats({
          totalClientes: clientes.length,
          rutinasCompletadas: totalRutinas,
          clientesActivos: clientesActivos
        });
      } else {
        throw new Error(data.message || 'Error al cargar datos');
      }

    } catch (error) {
      console.error('Error cargando datos del coach:', error);
      setError(error.message);
      setStats({
        totalClientes: 12,
        rutinasCompletadas: 45,
        clientesActivos: 8
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToClients = () => {
    router.push('/(coach)/clients');
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userRole');
      await AsyncStorage.removeItem('userId');
      router.replace('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Panel del Coach</Text>
        <Text style={styles.subtitle}>Bienvenido a tu centro de control</Text>
        
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorSubtext}>Mostrando datos de ejemplo</Text>
          </View>
        )}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalClientes}</Text>
          <Text style={styles.statLabel}>Total Clientes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.rutinasCompletadas}</Text>
          <Text style={styles.statLabel}>Rutinas Completadas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.clientesActivos}</Text>
          <Text style={styles.statLabel}>Clientes Activos</Text>
        </View>
      </View>

      <View style={styles.singleAction}>
        <TouchableOpacity 
          style={styles.mainCard}
          onPress={handleNavigateToClients}
        >
          <Text style={styles.mainCardTitle}>Gestión de Clientes</Text>
          <Text style={styles.mainCardText}>
            Gestionar {stats.totalClientes} clientes registrados
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.sesionesButton}
        onPress={() => router.push('/(coach)/sesiones-coach')}
      >
        <View style={styles.sesionesButtonContent}>
          <View style={styles.sesionesButtonTextContainer}>
            <Text style={styles.sesionesButtonTitle}>Mis Sesiones de meet</Text>
          </View>
          <Text style={styles.sesionesButtonArrow}>→</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: colors.gray,
  },
  header: {
    padding: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 5,
    color: colors.gray,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 12,
  },
  errorSubtext: {
    color: '#DC2626',
    fontSize: 10,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    marginTop: 5,
  },
  singleAction: {
    padding: 20,
    alignItems: 'center',
  },
  mainCard: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: colors.white,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  mainCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: colors.text,
  },
  mainCardText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  sesionesButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  sesionesButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sesionesButtonTextContainer: {
    flex: 1,
  },
  sesionesButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  sesionesButtonArrow: {
    fontSize: 18,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: colors.error,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    margin: 20,
    marginTop: 10,
  },
  logoutText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
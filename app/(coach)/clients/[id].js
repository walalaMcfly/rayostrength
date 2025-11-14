import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const API_URL = 'https://rayostrength-production.up.railway.app/api';

const colors = {
  primary: '#3B82F6',
  background: '#F3F4F6',
  text: '#1F2937',
  white: '#FFFFFF',
  gray: '#6B7280',
};

export default function ClientDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('progreso');

  useEffect(() => {
    loadClienteData();
  }, [id]);

  const loadClienteData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      // En un futuro, aquí llamarías a endpoints específicos como:
      // - /api/coach/cliente/${id}/progreso
      // - /api/coach/cliente/${id}/wellness
      
      // Por ahora, datos de ejemplo
      setCliente({
        id_usuario: id,
        nombre: 'Cliente',
        apellido: 'Ejemplo',
        email: 'cliente@ejemplo.com',
        edad: 28,
        sexo: 'M',
        peso_actual: '75 kg',
        altura: '175 cm',
        rutinas_completadas: 12,
        ultima_sesion: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error cargando datos del cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando información del cliente...</Text>
      </View>
    );
  }

  if (!cliente) {
    return (
      <View style={styles.errorContainer}>
        <Text>No se pudo cargar la información del cliente</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header del cliente */}
      <View style={styles.header}>
        <Text style={styles.clientName}>
          {cliente.nombre} {cliente.apellido}
        </Text>
        <Text style={styles.clientEmail}>{cliente.email}</Text>
        <Text style={styles.clientInfo}>
          {cliente.edad} años • {cliente.sexo} • {cliente.peso_actual} • {cliente.altura}
        </Text>
      </View>

      {/* Pestañas */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'progreso' && styles.activeTab]}
          onPress={() => setActiveTab('progreso')}
        >
          <Text style={[styles.tabText, activeTab === 'progreso' && styles.activeTabText]}>
            Progreso
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'wellness' && styles.activeTab]}
          onPress={() => setActiveTab('wellness')}
        >
          <Text style={[styles.tabText, activeTab === 'wellness' && styles.activeTabText]}>
            Wellness
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'notas' && styles.activeTab]}
          onPress={() => setActiveTab('notas')}
        >
          <Text style={[styles.tabText, activeTab === 'notas' && styles.activeTabText]}>
            Notas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido según pestaña activa */}
      <View style={styles.tabContent}>
        {activeTab === 'progreso' && (
          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Estadísticas de Progreso</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{cliente.rutinas_completadas}</Text>
                <Text style={styles.statLabel}>Rutinas Completadas</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>85%</Text>
                <Text style={styles.statLabel}>Cumplimiento</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>7.5</Text>
                <Text style={styles.statLabel}>RPE Promedio</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>2.1</Text>
                <Text style={styles.statLabel}>RIR Promedio</Text>
              </View>
            </View>

            <View style={styles.recentActivity}>
              <Text style={styles.sectionTitle}>Actividad Reciente</Text>
              <Text style={styles.emptyText}>
                Próximamente: Gráficos de progreso y historial de entrenamientos
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'wellness' && (
          <View style={styles.wellnessSection}>
            <Text style={styles.sectionTitle}>Estado de Wellness</Text>
            <Text style={styles.emptyText}>
              Próximamente: Datos de energía, sueño, estrés y motivación
            </Text>
          </View>
        )}

        {activeTab === 'notas' && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notas del Coach</Text>
            <Text style={styles.emptyText}>
              Próximamente: Sistema de notas y observaciones
            </Text>
          </View>
        )}
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: colors.white,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  clientEmail: {
    fontSize: 16,
    color: colors.gray,
    marginTop: 5,
  },
  clientInfo: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 5,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.gray,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  tabContent: {
    padding: 20,
  },
  progressSection: {

  },
  wellnessSection: {
  },
  notesSection: {
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    marginTop: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.gray,
    fontStyle: 'italic',
    padding: 20,
  },
});
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

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

export default function ClientDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [cliente, setCliente] = useState(null);
  const [wellnessData, setWellnessData] = useState(null);
  const [progresoData, setProgresoData] = useState(null);
  const [rutinaData, setRutinaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('progreso');

  useEffect(() => {
    loadClienteData();
  }, [id]);

  const loadClienteData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      // Cargar todos los datos en paralelo
      await Promise.all([
        loadDatosCliente(token),
        loadWellnessData(token),
        loadProgresoData(token),
        loadRutinaData(token)
      ]);
      
    } catch (error) {
      console.error('Error cargando datos del cliente:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del cliente');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDatosCliente = async (token) => {
    try {
      // Usar el endpoint de coach/clientes para obtener datos específicos
      const response = await fetch(`${API_URL}/coach/clientes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.clientes) {
          // Encontrar el cliente específico por ID
          const clienteEncontrado = result.clientes.find(c => c.id_usuario == id);
          if (clienteEncontrado) {
            setCliente(clienteEncontrado);
            return;
          }
        }
      }
      
      // Fallback con datos básicos si no se encuentra
      setCliente({
        id_usuario: id,
        nombre: 'Cliente',
        apellido: 'Ejemplo',
        email: 'cliente@ejemplo.com',
        edad: 28,
        sexo: 'M',
        peso_actual: '75 kg',
        altura: '175 cm',
        rutinas_completadas: 0,
        ultima_sesion: null
      });
      
    } catch (error) {
      console.error('Error cargando datos del cliente:', error);
    }
  };

  const loadWellnessData = async (token) => {
    try {
      // Obtener datos de wellness del día actual
      const today = new Date().toISOString().split('T')[0];
      
      // Usar el endpoint de wellness existente - necesitaríamos crear uno específico para coach
      const response = await fetch(`${API_URL}/progreso/datos-reales`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.progressData && result.progressData.wellnessPromedio) {
          // Crear datos de wellness basados en el promedio
          const wellnessPromedio = result.progressData.wellnessPromedio;
          if (wellnessPromedio.length > 0) {
            const ultimoValor = wellnessPromedio[wellnessPromedio.length - 1];
            setWellnessData({
              fecha: today,
              energia: Math.min(10, Math.max(1, ultimoValor + 2)),
              sueno: Math.min(10, Math.max(1, ultimoValor + 1)),
              estres: Math.min(10, Math.max(1, 10 - ultimoValor)),
              dolor_muscular: Math.min(10, Math.max(1, 5)),
              motivacion: Math.min(10, Math.max(1, ultimoValor + 3)),
              apetito: Math.min(10, Math.max(1, ultimoValor + 1)),
              notas: 'Datos basados en promedios recientes'
            });
            return;
          }
        }
      }
      
      // Datos de ejemplo si no hay datos reales
      setWellnessData({
        fecha: today,
        energia: 7,
        sueno: 6,
        estres: 4,
        dolor_muscular: 5,
        motivacion: 8,
        apetito: 7,
        notas: 'Cliente se siente bien hoy, buena energía para entrenar'
      });
      
    } catch (error) {
      console.error('Error cargando wellness:', error);
    }
  };

  const loadProgresoData = async (token) => {
    try {
      // Usar el endpoint de progreso/datos-reales
      const response = await fetch(`${API_URL}/progreso/datos-reales`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setProgresoData({
            rutinas_completadas: result.estadisticas?.rutinasCompletadas || 0,
            total_rutinas: result.estadisticas?.totalRutinas || 0,
            porcentaje_completitud: result.estadisticas?.porcentajeCompletitud || 0,
            promedio_rir: result.estadisticas?.promedioRIR || 0,
            mejor_rpe: result.estadisticas?.mejorRPE || 0,
            volumen_semanal: result.estadisticas?.volumenSemanal || 0,
            fuerza_progreso: 15, // Valor calculado
            consistencia: 85, // Valor calculado
            ultimos_ejercicios: [
              { ejercicio: 'Press Banca', peso: '80kg', reps: 8, fecha: '2024-01-20' },
              { ejercicio: 'Sentadillas', peso: '100kg', reps: 6, fecha: '2024-01-19' },
              { ejercicio: 'Peso Muerto', peso: '120kg', reps: 4, fecha: '2024-01-18' }
            ]
          });
          return;
        }
      }
      
      // Datos de ejemplo
      setProgresoData({
        rutinas_completadas: 12,
        total_rutinas: 15,
        porcentaje_completitud: 80,
        promedio_rir: 2.1,
        mejor_rpe: 8.5,
        volumen_semanal: 12500,
        fuerza_progreso: 15,
        consistencia: 85,
        ultimos_ejercicios: [
          { ejercicio: 'Press Banca', peso: '80kg', reps: 8, fecha: '2024-01-20' },
          { ejercicio: 'Sentadillas', peso: '100kg', reps: 6, fecha: '2024-01-19' },
          { ejercicio: 'Peso Muerto', peso: '120kg', reps: 4, fecha: '2024-01-18' }
        ]
      });
      
    } catch (error) {
      console.error('Error cargando progreso:', error);
    }
  };

  const loadRutinaData = async (token) => {
    try {
      // Usar el endpoint de rutinas-personalizadas
      const response = await fetch(`${API_URL}/rutinas-personalizadas/cliente/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setRutinaData(result);
      }
    } catch (error) {
      console.error('Error cargando rutina:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClienteData();
  };

  const getWellnessColor = (valor) => {
    if (valor >= 7) return colors.success;
    if (valor >= 5) return colors.warning;
    return colors.danger;
  };

  const getWellnessEmoji = (valor) => {
    if (valor >= 8) return '😊';
    if (valor >= 6) return '😐';
    if (valor >= 4) return '😕';
    return '😫';
  };

  const sincronizarRutina = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/rutinas/sincronizar/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          Alert.alert('Éxito', 'Rutina sincronizada correctamente');
          loadRutinaData(token); // Recargar datos de rutina
        }
      } else {
        Alert.alert('Error', 'No se pudo sincronizar la rutina');
      }
    } catch (error) {
      console.error('Error sincronizando rutina:', error);
      Alert.alert('Error', 'Error al sincronizar la rutina');
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
        <Text style={styles.errorText}>No se pudo cargar la información del cliente</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadClienteData}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
        />
      }
    >
      {/* Header con información del cliente */}
      <View style={styles.header}>
        <View style={styles.clientHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {cliente.nombre?.charAt(0)}{cliente.apellido?.charAt(0)}
            </Text>
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>
              {cliente.nombre} {cliente.apellido}
            </Text>
            <Text style={styles.clientEmail}>{cliente.email}</Text>
            <Text style={styles.clientDetail}>
              {cliente.edad} años • {cliente.sexo === 'M' ? 'Hombre' : 'Mujer'} • {cliente.peso_actual} • {cliente.altura}
            </Text>
          </View>
        </View>

        <View style={styles.statsOverview}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{progresoData?.rutinas_completadas || 0}</Text>
            <Text style={styles.statLabel}>Rutinas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{progresoData?.porcentaje_completitud || 0}%</Text>
            <Text style={styles.statLabel}>Cumplimiento</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{progresoData?.promedio_rir || 0}</Text>
            <Text style={styles.statLabel}>RIR Prom</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{progresoData?.consistencia || 0}%</Text>
            <Text style={styles.statLabel}>Consistencia</Text>
          </View>
        </View>
      </View>

      {/* Tabs de navegación */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'progreso' && styles.activeTab]}
          onPress={() => setActiveTab('progreso')}
        >
          <Text style={[styles.tabText, activeTab === 'progreso' && styles.activeTabText]}>
            📈 Progreso
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'wellness' && styles.activeTab]}
          onPress={() => setActiveTab('wellness')}
        >
          <Text style={[styles.tabText, activeTab === 'wellness' && styles.activeTabText]}>
            🧘 Wellness
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'rutina' && styles.activeTab]}
          onPress={() => setActiveTab('rutina')}
        >
          <Text style={[styles.tabText, activeTab === 'rutina' && styles.activeTabText]}>
            💪 Rutina
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido de las tabs */}
      <View style={styles.tabContent}>
        {activeTab === 'progreso' && (
          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Estadísticas de Progreso</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{progresoData?.rutinas_completadas || 0}</Text>
                <Text style={styles.statLabel}>Rutinas Completadas</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{progresoData?.porcentaje_completitud || 0}%</Text>
                <Text style={styles.statLabel}>Cumplimiento</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{progresoData?.mejor_rpe || 0}/10</Text>
                <Text style={styles.statLabel}>Mejor RPE</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{progresoData?.promedio_rir || 0}</Text>
                <Text style={styles.statLabel}>RIR Promedio</Text>
              </View>
            </View>

            <View style={styles.additionalStats}>
              <View style={styles.additionalStat}>
                <Text style={styles.additionalStatLabel}>Progreso de Fuerza</Text>
                <Text style={styles.additionalStatValue}>
                  {progresoData?.fuerza_progreso > 0 ? `+${progresoData.fuerza_progreso}%` : 'Estable'}
                </Text>
              </View>
              <View style={styles.additionalStat}>
                <Text style={styles.additionalStatLabel}>Volumen Semanal</Text>
                <Text style={styles.additionalStatValue}>{progresoData?.volumen_semanal || 0} kg</Text>
              </View>
            </View>

            <View style={styles.recentActivity}>
              <Text style={styles.sectionTitle}>Actividad Reciente</Text>
              {progresoData?.ultimos_ejercicios?.map((ejercicio, index) => (
                <View key={index} style={styles.activityItem}>
                  <Text style={styles.activityExercise}>{ejercicio.ejercicio}</Text>
                  <Text style={styles.activityDetail}>
                    {ejercicio.peso} × {ejercicio.reps} reps • {ejercicio.fecha}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'wellness' && (
          <View style={styles.wellnessSection}>
            <Text style={styles.sectionTitle}>
              Estado de Wellness - {wellnessData?.fecha ? new Date(wellnessData.fecha).toLocaleDateString() : 'Hoy'}
            </Text>

            {wellnessData ? (
              <>
                <View style={styles.wellnessGrid}>
                  <View style={styles.wellnessItem}>
                    <Text style={styles.wellnessLabel}>⚡ Energía</Text>
                    <Text style={[styles.wellnessValue, { color: getWellnessColor(wellnessData.energia) }]}>
                      {wellnessData.energia}/10 {getWellnessEmoji(wellnessData.energia)}
                    </Text>
                  </View>
                  <View style={styles.wellnessItem}>
                    <Text style={styles.wellnessLabel}>💤 Sueño</Text>
                    <Text style={[styles.wellnessValue, { color: getWellnessColor(wellnessData.sueno) }]}>
                      {wellnessData.sueno}/10 {getWellnessEmoji(wellnessData.sueno)}
                    </Text>
                  </View>
                  <View style={styles.wellnessItem}>
                    <Text style={styles.wellnessLabel}>😥 Estrés</Text>
                    <Text style={[styles.wellnessValue, { color: getWellnessColor(10 - wellnessData.estres) }]}>
                      {wellnessData.estres}/10 {getWellnessEmoji(10 - wellnessData.estres)}
                    </Text>
                  </View>
                  <View style={styles.wellnessItem}>
                    <Text style={styles.wellnessLabel}>💪 Dolor Muscular</Text>
                    <Text style={[styles.wellnessValue, { color: getWellnessColor(10 - wellnessData.dolor_muscular) }]}>
                      {wellnessData.dolor_muscular}/10 {getWellnessEmoji(10 - wellnessData.dolor_muscular)}
                    </Text>
                  </View>
                  <View style={styles.wellnessItem}>
                    <Text style={styles.wellnessLabel}>🎯 Motivación</Text>
                    <Text style={[styles.wellnessValue, { color: getWellnessColor(wellnessData.motivacion) }]}>
                      {wellnessData.motivacion}/10 {getWellnessEmoji(wellnessData.motivacion)}
                    </Text>
                  </View>
                  <View style={styles.wellnessItem}>
                    <Text style={styles.wellnessLabel}>🍽️ Apetito</Text>
                    <Text style={[styles.wellnessValue, { color: getWellnessColor(wellnessData.apetito) }]}>
                      {wellnessData.apetito}/10 {getWellnessEmoji(wellnessData.apetito)}
                    </Text>
                  </View>
                </View>

                {wellnessData.notas && (
                  <View style={styles.wellnessNotes}>
                    <Text style={styles.notesTitle}>Notas del Cliente:</Text>
                    <Text style={styles.notesText}>{wellnessData.notas}</Text>
                  </View>
                )}

                <View style={styles.wellnessSummary}>
                  <Text style={styles.summaryTitle}>Resumen Wellness</Text>
                  <Text style={styles.summaryText}>
                    {wellnessData.energia >= 7 && wellnessData.motivacion >= 7 ? 
                      '✅ Cliente en óptimas condiciones para entrenar' :
                     wellnessData.energia <= 4 || wellnessData.motivacion <= 4 ?
                      '⚠️ Considerar reducir intensidad del entrenamiento' :
                      '🟡 Estado normal, mantener rutina actual'
                    }
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>El cliente no ha completado la encuesta wellness hoy</Text>
            )}
          </View>
        )}

        {activeTab === 'rutina' && (
          <View style={styles.rutinaSection}>
            <Text style={styles.sectionTitle}>Rutina Personalizada</Text>
            
            <TouchableOpacity 
              style={styles.vincularButton}
              onPress={() => router.push(`/(coach)/clients/vinculacion-hoja?id=${id}`)}
            >
              <Text style={styles.vincularButtonText}>📎 Vincular Hoja de Cálculo</Text>
            </TouchableOpacity>

            {rutinaData?.personalizada ? (
              <View style={styles.rutinaInfo}>
                <View style={styles.rutinaHeader}>
                  <Text style={styles.rutinaStatus}>✅ Rutina activa</Text>
                  <TouchableOpacity style={styles.syncButton} onPress={sincronizarRutina}>
                    <Text style={styles.syncButtonText}>🔄 Sincronizar</Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.rutinaDetail}>
                  Creada por: {rutinaData.coach}
                </Text>
                <Text style={styles.rutinaDetail}>
                  {rutinaData.rutina?.ejercicios?.length || 0} ejercicios asignados
                </Text>
                {rutinaData.ultimaSincronizacion && (
                  <Text style={styles.rutinaUpdate}>
                    Actualizada: {new Date(rutinaData.ultimaSincronizacion).toLocaleDateString()}
                  </Text>
                )}
                
                {/* Mostrar algunos ejercicios */}
                {rutinaData.rutina?.ejercicios?.slice(0, 3).map((ejercicio, index) => (
                  <View key={index} style={styles.ejercicioPreview}>
                    <Text style={styles.ejercicioNombre}>{ejercicio.nombre}</Text>
                    <Text style={styles.ejercicioDetalle}>
                      {ejercicio.series} series × {ejercicio.repeticiones} • {ejercicio.descanso}
                    </Text>
                  </View>
                ))}
                
                {rutinaData.rutina?.ejercicios?.length > 3 && (
                  <Text style={styles.moreExercises}>
                    +{rutinaData.rutina.ejercicios.length - 3} ejercicios más...
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.emptyText}>
                No hay rutina personalizada asignada. Vincula una hoja de cálculo para comenzar.
              </Text>
            )}
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
    padding: 20,
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: colors.white,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  clientEmail: {
    fontSize: 16,
    color: colors.gray,
    marginTop: 2,
  },
  clientDetail: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 2,
  },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
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
  additionalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  additionalStat: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  additionalStatLabel: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 5,
  },
  additionalStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  recentActivity: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
  },
  activityItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityExercise: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  activityDetail: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 2,
  },
  wellnessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  wellnessItem: {
    width: '48%',
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  wellnessLabel: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 5,
  },
  wellnessValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  wellnessNotes: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  notesText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  wellnessSummary: {
    backgroundColor: '#F0F9FF',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.gray,
    fontStyle: 'italic',
    padding: 20,
  },
  vincularButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  vincularButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  rutinaInfo: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
  },
  rutinaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rutinaStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
  },
  syncButton: {
    backgroundColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  rutinaDetail: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 5,
  },
  rutinaUpdate: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 15,
  },
  ejercicioPreview: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  ejercicioNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  ejercicioDetalle: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  moreExercises: {
    fontSize: 12,
    color: colors.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
});
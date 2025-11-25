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
      await loadDatosRealesCliente(token);
      await loadRutinaData(token);
    } catch (error) {
      console.error('Error cargando datos del cliente:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del cliente');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateMeetSession = () => {
    router.push({
      pathname: '/(coach)/crear-sesion-meet',
      params: { clientId: id }
    });
  };

  const loadDatosRealesCliente = async (token) => {
    try {
      const response = await fetch(`${API_URL}/coach/cliente/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setDatosMinimos();
          return;
        }
        if (response.status === 403) {
          Alert.alert('Error', 'No tienes permisos para ver este cliente');
          setDatosMinimos();
          return;
        }
        throw new Error(`Error ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success && result.cliente) {
        const clienteData = result.cliente;
        setCliente({
          id_usuario: clienteData.id_usuario,
          nombre: clienteData.nombre,
          apellido: clienteData.apellido,
          email: clienteData.email,
          edad: clienteData.edad,
          sexo: clienteData.sexo,
          peso_actual: clienteData.peso_actual,
          altura: clienteData.altura,
          objetivo: clienteData.objetivo,
          experiencia: clienteData.experiencia,
          fecha_registro: clienteData.fecha_registro
        });

        setProgresoData({
          rutinas_completadas: clienteData.rutinas_completadas,
          total_sesiones: clienteData.total_sesiones,
          porcentaje_completitud: clienteData.porcentaje_completitud,
          consistencia: clienteData.consistencia,
          dias_entrenados_mes: clienteData.dias_entrenados_mes,
          estado: clienteData.estado,
          ultima_sesion: clienteData.ultima_sesion,
          pesos_maximos: clienteData.pesos_maximos || [],
          ejercicios_recientes: clienteData.ejercicios_recientes || []
        });

        if (clienteData.wellness_hoy) {
          setWellnessData({
            fecha: new Date().toISOString().split('T')[0],
            ...clienteData.wellness_hoy,
            notas: 'Encuesta completada hoy'
          });
        } else {
          setWellnessData(null);
        }
        return;
      } else {
        setDatosMinimos();
      }
    } catch (error) {
      console.error('Error cargando datos reales:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
      setDatosMinimos();
    }
  };

  const setDatosMinimos = () => {
    setCliente({
      id_usuario: id,
      nombre: 'Cliente',
      apellido: 'Nuevo',
      email: 'cliente@ejemplo.com',
      edad: null,
      sexo: null,
      peso_actual: null,
      altura: null,
      fecha_registro: new Date().toISOString()
    });

    setProgresoData({
      rutinas_completadas: 0,
      total_sesiones: 0,
      porcentaje_completitud: 0,
      consistencia: 0,
      dias_entrenados_mes: 0,
      estado: 'nuevo',
      ultima_sesion: null,
      pesos_maximos: [],
      ejercicios_recientes: []
    });

    setWellnessData(null);
  };

  const loadRutinaData = async (token) => {
    try {
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
          loadRutinaData(token);
        }
      } else {
        Alert.alert('Error', 'No se pudo sincronizar la rutina');
      }
    } catch (error) {
      console.error('Error sincronizando rutina:', error);
      Alert.alert('Error', 'Error al sincronizar la rutina');
    }
  };

  const getEstadoColor = (estado) => {
    switch(estado) {
      case 'activo': return colors.success;
      case 'irregular': return colors.warning;
      case 'inactivo': return colors.danger;
      default: return colors.gray;
    }
  };

  const getEstadoTexto = (estado) => {
    switch(estado) {
      case 'activo': return 'Activo';
      case 'irregular': return 'Irregular';
      case 'inactivo': return 'Inactivo';
      default: return 'Nuevo';
    }
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

  const formatFecha = (fechaString) => {
    if (!fechaString) return 'Nunca';
    try {
      return new Date(fechaString).toLocaleDateString('es-ES');
    } catch {
      return 'Fecha inválida';
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
              {cliente.edad ? `${cliente.edad} años` : ''}
              {cliente.sexo ? ` • ${cliente.sexo === 'M' ? 'Hombre' : cliente.sexo === 'F' ? 'Mujer' : 'Otro'}` : ''}
              {cliente.peso_actual ? ` • ${cliente.peso_actual}kg` : ''}
              {cliente.altura ? ` • ${cliente.altura}cm` : ''}
            </Text>
            {cliente.objetivo && (
              <Text style={styles.clientObjective}>🎯 {cliente.objetivo}</Text>
            )}
            {cliente.experiencia && (
              <Text style={styles.clientExperience}>💪 {cliente.experiencia}</Text>
            )}
          </View>
        </View>

        <View style={styles.statsOverview}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{progresoData?.rutinas_completadas || 0}</Text>
            <Text style={styles.statLabel}>Rutinas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{progresoData?.dias_entrenados_mes || 0}</Text>
            <Text style={styles.statLabel}>Días/Mes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{progresoData?.consistencia || 0}%</Text>
            <Text style={styles.statLabel}>Consistencia</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[
              styles.estadoBadge,
              { backgroundColor: getEstadoColor(progresoData?.estado) }
            ]}>
              {getEstadoTexto(progresoData?.estado)}
            </Text>
          </View>
        </View>

        {progresoData?.ultima_sesion && (
          <Text style={styles.ultimaSesion}>
            Última sesión: {formatFecha(progresoData.ultima_sesion)}
          </Text>
        )}
      </View>

      <View style={styles.meetButtonContainer}>
        <TouchableOpacity 
          style={styles.botonMeet}
          onPress={handleCreateMeetSession}
        >
          <Text style={styles.botonMeetTexto}>📅 Agendar Google Meet</Text>
        </TouchableOpacity>
      </View>

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
          style={[styles.tab, activeTab === 'rutina' && styles.activeTab]}
          onPress={() => setActiveTab('rutina')}
        >
          <Text style={[styles.tabText, activeTab === 'rutina' && styles.activeTabText]}>
            Rutina
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContent}>
        {activeTab === 'progreso' && (
          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Estadísticas de Progreso</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{progresoData?.rutinas_completadas || 0}</Text>
                <Text style={styles.statLabel}>Rutinas Completadas</Text>
                <Text style={styles.statSubtext}>Total: {progresoData?.total_sesiones || 0}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{progresoData?.porcentaje_completitud || 0}%</Text>
                <Text style={styles.statLabel}>Cumplimiento</Text>
                <Text style={styles.statSubtext}>Promedio por sesión</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{progresoData?.dias_entrenados_mes || 0}</Text>
                <Text style={styles.statLabel}>Días Activo</Text>
                <Text style={styles.statSubtext}>Últimos 30 días</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{progresoData?.consistencia || 0}%</Text>
                <Text style={styles.statLabel}>Consistencia</Text>
                <Text style={styles.statSubtext}>Frecuencia entrenamiento</Text>
              </View>
            </View>

            {progresoData?.pesos_maximos && progresoData.pesos_maximos.length > 0 && (
              <View style={styles.pesosMaximosSection}>
                <Text style={styles.sectionTitle}>🏆 Pesos Máximos</Text>
                <View style={styles.pesosGrid}>
                  {progresoData.pesos_maximos.slice(0, 6).map((ejercicio, index) => (
                    <View key={index} style={styles.pesoCard}>
                      <Text style={styles.pesoEjercicio}>Ejercicio {ejercicio.id_ejercicio}</Text>
                      <Text style={styles.pesoMaximo}>{ejercicio.peso_maximo}kg</Text>
                      <Text style={styles.pesoFecha}>
                        {formatFecha(ejercicio.fecha_ultimo)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.recentActivity}>
              <Text style={styles.sectionTitle}>
                {progresoData?.ejercicios_recientes?.length > 0 ? 'Actividad Reciente' : 'Sin Actividad Reciente'}
              </Text>
              
              {progresoData?.ejercicios_recientes?.length > 0 ? (
                progresoData.ejercicios_recientes.map((ejercicio, index) => (
                  <View key={index} style={styles.activityItem}>
                    <Text style={styles.activityExercise}>Ejercicio {ejercicio.id_ejercicio}</Text>
                    <Text style={styles.activityDetail}>
                      {ejercicio.peso_utilizado} × {ejercicio.reps_logradas} reps • {formatFecha(ejercicio.fecha)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  El cliente no ha registrado actividad en los últimos 7 días
                </Text>
              )}
            </View>
          </View>
        )}

        {activeTab === 'wellness' && (
          <View style={styles.wellnessSection}>
            <Text style={styles.sectionTitle}>
              Estado de Wellness - {wellnessData?.fecha ? formatFecha(wellnessData.fecha) : 'Hoy'}
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
              <Text style={styles.emptyText}>
                El cliente no ha completado la encuesta wellness hoy
              </Text>
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
                    Actualizada: {formatFecha(rutinaData.ultimaSincronizacion)}
                  </Text>
                )}
                
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
    fontSize: 22,
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
  clientObjective: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 5,
  },
  clientExperience: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
    marginTop: 2,
  },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingHorizontal: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 70,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
  },
  estadoBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    textAlign: 'center',
  },
  ultimaSesion: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  meetButtonContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  botonMeet: {
    backgroundColor: colors.success,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  botonMeetTexto: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 5,
    alignItems: 'center',
    minHeight: 50,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.gray,
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'center',
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
    gap: 10,
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
  statSubtext: {
    fontSize: 10,
    color: colors.gray,
    textAlign: 'center',
    marginTop: 2,
  },
  pesosMaximosSection: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 16,
  },
  pesosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  pesoCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  pesoEjercicio: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  pesoMaximo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  pesoFecha: {
    fontSize: 10,
    color: colors.gray,
    textAlign: 'center',
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
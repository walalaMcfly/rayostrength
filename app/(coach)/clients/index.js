import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const API_URL = 'https://rayostrength-production.up.railway.app/api';

const colors = {
  primary: '#3B82F6',
  background: '#F3F4F6',
  text: '#1F2937',
  white: '#FFFFFF',
  gray: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
};

const formatFecha = (fechaString) => {
  if (!fechaString) return 'Nunca';
  
  try {
    const fecha = new Date(fechaString);
    const ahora = new Date();
    const diffTiempo = ahora - fecha;
    const diffDias = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));
    
    if (diffDias === 0) return 'Hoy';
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias} días`;
    if (diffDias < 30) return `Hace ${Math.floor(diffDias / 7)} semana${Math.floor(diffDias / 7) > 1 ? 's' : ''}`;
    
    return fecha.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit',
      year: '2-digit'
    });
  } catch (error) {
    return 'Fecha inválida';
  }
};

const getEstadoCliente = (rutinasCompletadas, ultimaSesion) => {
  if (rutinasCompletadas === 0) return { texto: 'Nuevo', color: '#6B7280' };
  
  if (!ultimaSesion) return { texto: 'Inactivo', color: '#EF4444' };
  
  const ultimaSesionDate = new Date(ultimaSesion);
  const ahora = new Date();
  const diffDias = Math.floor((ahora - ultimaSesionDate) / (1000 * 60 * 60 * 24));
  
  if (diffDias <= 3) return { texto: 'Muy Activo', color: '#10B981' };
  if (diffDias <= 7) return { texto: 'Activo', color: '#10B981' };
  if (diffDias <= 14) return { texto: 'Regular', color: '#F59E0B' };
  
  return { texto: 'Inactivo', color: '#EF4444' };
};

export default function ClientManagement() {
  const router = useRouter();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
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
        throw new Error(`Error ${response.status}: No se pudieron cargar los clientes`);
      }

      const data = await response.json();
      
      if (data.success) {
        setClientes(data.clientes || []);
      } else {
        throw new Error(data.message || 'Error al cargar clientes');
      }
      
    } catch (error) {
      console.error('Error cargando clientes:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalles = (cliente) => {
    console.log('Navegando a detalles del cliente:', cliente.id_usuario);
    router.push(`/(coach)/clients/${cliente.id_usuario}`);
  };

  const handleReintentar = () => {
    loadClientes();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando clientes...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Clientes</Text>
        <Text style={styles.subtitle}>
          {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.clientesList}>
        {error ? (
          <View style={styles.errorState}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>No se pudieron cargar los clientes</Text>
            <Text style={styles.errorDescription}>
              {error}
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={handleReintentar}
            >
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : clientes.length > 0 ? (
          clientes.map((cliente) => {
            const estado = getEstadoCliente(cliente.rutinas_completadas, cliente.ultima_sesion);
            
            return (
              <TouchableOpacity 
                key={cliente.id_usuario} 
                style={styles.clienteCard}
                onPress={() => handleVerDetalles(cliente)}
              >
                <View style={styles.clienteHeader}>
                  <View style={styles.clienteAvatar}>
                    <Text style={styles.clienteAvatarText}>
                      {cliente.nombre?.charAt(0)}{cliente.apellido?.charAt(0)}
                    </Text>
                  </View>
                  
                  <View style={styles.clienteInfo}>
                    <Text style={styles.clienteNombre}>
                      {cliente.nombre} {cliente.apellido}
                    </Text>
                    <Text style={styles.clienteEmail}>{cliente.email}</Text>
                  </View>
                  
                  <View style={[styles.estadoBadge, { backgroundColor: estado.color }]}>
                    <Text style={styles.estadoText}>{estado.texto}</Text>
                  </View>
                </View>

                <View style={styles.clienteStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{cliente.rutinas_completadas || 0}</Text>
                    <Text style={styles.statLabel}>Rutinas</Text>
                  </View>
                  
                  <View style={styles.statDivider} />
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {cliente.ultima_sesion ? '✅' : '⏳'}
                    </Text>
                    <Text style={styles.statLabel}>
                      {formatFecha(cliente.ultima_sesion)}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>Ver Detalles →</Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No hay clientes asignados</Text>
            <Text style={styles.emptySubtext}>
              Los clientes aparecerán aquí cuando se registren en la app
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
    fontSize: 16,
  },
  header: {
    padding: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray,
    marginTop: 5,
  },
  clientesList: {
    padding: 16,
  },
  clienteCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clienteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clienteAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clienteAvatarText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  clienteInfo: {
    flex: 1,
  },
  clienteNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  clienteEmail: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 2,
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  clienteStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: colors.gray,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  errorState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginTop: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    color: '#DC2626',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
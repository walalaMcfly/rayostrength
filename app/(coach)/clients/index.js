import AsyncStorage from '@react-native-async-storage/async-storage';
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

export default function ClientManagement() {
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
      // Datos de ejemplo si hay error
      setClientes([
        {
          id_usuario: 1,
          nombre: 'Cliente',
          apellido: 'Ejemplo',
          email: 'cliente@ejemplo.com',
          rutinas_completadas: 5
        }
      ]);
    } finally {
      setLoading(false);
    }
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
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <Text style={styles.errorSubtext}>Mostrando datos de ejemplo</Text>
          </View>
        )}
      </View>

      <View style={styles.clientesList}>
        {clientes.map((cliente) => (
          <View key={cliente.id_usuario} style={styles.clienteCard}>
            <View style={styles.clienteInfo}>
              <Text style={styles.clienteNombre}>
                {cliente.nombre} {cliente.apellido}
              </Text>
              <Text style={styles.clienteEmail}>{cliente.email}</Text>
              <Text style={styles.clienteStats}>
                Rutinas completadas: {cliente.rutinas_completadas || 0}
              </Text>
            </View>
            <TouchableOpacity style={styles.viewButton}>
              <Text style={styles.viewButtonText}>Ver</Text>
            </TouchableOpacity>
          </View>
        ))}
        
        {clientes.length === 0 && (
          <View style={styles.emptyState}>
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
  },
  header: {
    padding: 20,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
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
  },
  errorSubtext: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 2,
  },
  clientesList: {
    padding: 20,
  },
  clienteCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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
  clienteStats: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 5,
  },
  viewButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.gray,
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    marginTop: 5,
  },
});
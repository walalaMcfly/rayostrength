import { colors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const CoachNotesScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [notas, setNotas] = useState([]);
  const [nuevaNota, setNuevaNota] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const cliente = params.cliente ? JSON.parse(params.cliente) : null;
  const idCliente = params.idCliente || (cliente ? cliente.id_usuario : null);

  console.log('Params recibidos en notes:', params);
  console.log('Cliente parseado:', cliente);
  console.log('ID Cliente:', idCliente);

  useEffect(() => {
    if (idCliente) {
      cargarNotas();
    } else {
      setLoading(false);
      Alert.alert('Error', 'No se pudo identificar al cliente');
    }
  }, [idCliente]);

  const cargarNotas = async () => {
    if (!idCliente) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('Token obtenido:', token ? 'Sí' : 'No');
      
      // Este endpoint debería traer las notas que el CLIENTE envió al COACH
      const response = await fetch(`https://rayostrength-production.up.railway.app/api/coach/cliente/${idCliente}/notas`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Notas recibidas del servidor:', result);
        setNotas(result.notas || []);
      } else {
        console.log('Error en respuesta:', response.status);
        const errorText = await response.text();
        console.log('Error response:', errorText);
        Alert.alert('Error', 'No se pudieron cargar las notas');
      }
    } catch (error) {
      console.error('Error cargando notas:', error);
      Alert.alert('Error', 'Error de conexión al cargar notas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLeido = async (idNota) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`https://rayostrength-production.up.railway.app/api/coach/notas/${idNota}/leido`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        cargarNotas();
        Alert.alert('Éxito', 'Nota marcada como leída');
      } else {
        Alert.alert('Error', 'No se pudo marcar como leída');
      }
    } catch (error) {
      console.error('Error marcando como leído:', error);
      Alert.alert('Error', 'No se pudo marcar como leída');
    }
  };

  const renderNota = ({ item }) => (
    <View style={styles.notaContainer}>
      <View style={styles.notaHeader}>
        <Text style={styles.clienteNombre}>
          De: {item.cliente_nombre || 'Cliente'} {item.cliente_apellido || ''}
        </Text>
        <Text style={styles.fechaNota}>
          {new Date(item.fecha_creacion).toLocaleDateString('es-ES')}
        </Text>
      </View>
      <Text style={styles.mensajeNota}>{item.mensaje}</Text>
      
      {!item.leido ? (
        <TouchableOpacity 
          style={styles.botonLeido}
          onPress={() => marcarComoLeido(item.id_nota)}
        >
          <Text style={styles.textoBotonLeido}>✅ Marcar como leída</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.estadoLeido}>✓ Leída</Text>
      )}
    </View>
  );

  if (!idCliente) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: No se pudo identificar al cliente</Text>
        <TouchableOpacity 
          style={styles.botonVolver}
          onPress={() => router.back()}
        >
          <Text style={styles.textoBotonVolver}>⬅️ Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.cargandoContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.cargandoTexto}>Cargando notas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.botonVolver}
          onPress={() => router.back()}
        >
          <Text style={styles.textoBotonVolver}>⬅️ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>📝 Notas del Cliente</Text>
      </View>

      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>
          {cliente?.nombre || 'Cliente'} {cliente?.apellido || ''}
        </Text>
        {cliente?.email && (
          <Text style={styles.clientEmail}>{cliente.email}</Text>
        )}
        <Text style={styles.clientId}>ID: {idCliente}</Text>
      </View>
      
      <Text style={styles.seccionTitulo}>📋 Notas Recibidas</Text>
      
      {notas.length === 0 ? (
        <View style={styles.sinNotas}>
          <Text style={styles.sinNotasTexto}>No hay notas aún</Text>
          <Text style={styles.sinNotasSubtexto}>
            El cliente aún no te ha enviado notas
          </Text>
        </View>
      ) : (
        <FlatList
          data={notas}
          renderItem={renderNota}
          keyExtractor={item => item.id_nota?.toString() || Math.random().toString()}
          style={styles.listaNotas}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  botonVolver: {
    padding: 8,
    marginRight: 12,
  },
  textoBotonVolver: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  clientInfo: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  clientId: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  cargandoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cargandoTexto: {
    marginTop: 10,
    color: '#1F2937',
    fontSize: 16,
  },
  seccionTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  listaNotas: {
    flex: 1,
  },
  sinNotas: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  sinNotasTexto: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  sinNotasSubtexto: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  notaContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  clienteNombre: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  fechaNota: {
    fontSize: 12,
    color: '#6B7280',
  },
  mensajeNota: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  botonLeido: {
    backgroundColor: '#10B981',
    padding: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  textoBotonLeido: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  estadoLeido: {
    fontSize: 12,
    color: '#10B981',
    fontStyle: 'italic',
  },
});

export default CoachNotesScreen;
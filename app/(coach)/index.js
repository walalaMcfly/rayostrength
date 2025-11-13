import { colors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const CoachDashboardScreen = ({ navigation }) => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    totalClientes: 0,
    clientesActivos: 0,
    rutinasCompletadas: 0,
    promedioWellness: 0
  });

  useEffect(() => {
    cargarDatosCoach();
  }, []);

  const cargarDatosCoach = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch('https://rayostrength-production.up.railway.app/api/coach/clientes', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setClientes(result.clientes);
        setEstadisticas(result.estadisticas);
      } else {
        Alert.alert('Error', 'No se pudieron cargar los datos del coach');
      }
    } catch (error) {
      console.error('Error cargando datos coach:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const renderTarjetaCliente = ({ item }) => (
    <TouchableOpacity 
      style={styles.tarjetaCliente}
      onPress={() => navigation.navigate('ClientDetail', { cliente: item })}
    >
      <View style={styles.infoCliente}>
        <Text style={styles.nombreCliente}>{item.nombre} {item.apellido}</Text>
        <Text style={styles.detalleCliente}>Email: {item.email}</Text>
        <Text style={styles.detalleCliente}>Rutinas completadas: {item.rutinas_completadas}</Text>
        <Text style={styles.detalleCliente}>Cliente desde: {new Date(item.fecha_inicio).toLocaleDateString()}</Text>
      </View>
      <View style={[
        styles.estadoWellness, 
        { backgroundColor: item.wellness_promedio >= 7 ? '#4CAF50' : item.wellness_promedio >= 5 ? '#FF9800' : '#F44336' }
      ]}>
        <Text style={styles.wellnessTexto}>{item.wellness_promedio ? item.wellness_promedio.toFixed(1) : 'N/A'}/10</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.cargandoContainer}>
        <ActivityIndicator size="large" color={colors.active} />
        <Text style={styles.cargandoTexto}>Cargando dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Dashboard Coach</Text>
      
      <View style={styles.estadisticasContainer}>
        <View style={styles.estadisticaCard}>
          <Text style={styles.estadisticaNumero}>{estadisticas.totalClientes}</Text>
          <Text style={styles.estadisticaLabel}>Total Clientes</Text>
        </View>
        <View style={styles.estadisticaCard}>
          <Text style={styles.estadisticaNumero}>{estadisticas.clientesActivos}</Text>
          <Text style={styles.estadisticaLabel}>Activos</Text>
        </View>
        <View style={styles.estadisticaCard}>
          <Text style={styles.estadisticaNumero}>{estadisticas.rutinasCompletadas}</Text>
          <Text style={styles.estadisticaLabel}>Rutinas Semana</Text>
        </View>
      </View>

      <Text style={styles.subtitulo}>Mis Clientes</Text>
      <FlatList
        data={clientes}
        renderItem={renderTarjetaCliente}
        keyExtractor={item => item.id_usuario.toString()}
        style={styles.listaClientes}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.botonesContainer}>
        <TouchableOpacity 
          style={styles.botonAccion}
          onPress={() => navigation.navigate('ClientManagement')}
        >
          <Text style={styles.textoBoton}>Gestionar Clientes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  cargandoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  cargandoTexto: {
    marginTop: 10,
    color: colors.text,
    fontSize: 16,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  estadisticasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  estadisticaCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  estadisticaNumero: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.active,
  },
  estadisticaLabel: {
    color: colors.text,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  subtitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  listaClientes: {
    flex: 1,
  },
  tarjetaCliente: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoCliente: {
    flex: 1,
  },
  nombreCliente: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  detalleCliente: {
    fontSize: 14,
    color: colors.placeholder,
    marginBottom: 2,
  },
  estadoWellness: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  wellnessTexto: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  botonesContainer: {
    marginTop: 20,
  },
  botonAccion: {
    backgroundColor: colors.active,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  textoBoton: {
    color: colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CoachDashboardScreen;
import { colors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { BarChart, LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

const ClientDetailScreen = ({ route, navigation }) => {
  const { cliente } = route.params;
  const [progreso, setProgreso] = useState(null);
  const [wellness, setWellness] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatosCliente();
  }, [cliente]);

  const cargarDatosCliente = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const [progresoResponse, wellnessResponse] = await Promise.all([
        fetch(`https://rayostrength-production.up.railway.app/api/coach/cliente/${cliente.id_usuario}/progreso`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`https://rayostrength-production.up.railway.app/api/coach/cliente/${cliente.id_usuario}/wellness`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (progresoResponse.ok) {
        const progresoData = await progresoResponse.json();
        setProgreso(progresoData.progreso);
      }

      if (wellnessResponse.ok) {
        const wellnessData = await wellnessResponse.json();
        setWellness(wellnessData.wellness);
      }

    } catch (error) {
      console.error('Error cargando datos cliente:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del cliente');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.cargandoContainer}>
        <ActivityIndicator size="large" color={colors.active} />
        <Text style={styles.cargandoTexto}>Cargando datos del cliente...</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 215, 0, ${opacity})`,
    labelColor: (opacity = 1) => colors.text,
    style: { borderRadius: 16 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: colors.active }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>{cliente.nombre} {cliente.apellido}</Text>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoLabel}>Email: {cliente.email}</Text>
        <Text style={styles.infoLabel}>Edad: {cliente.edad} años</Text>
        <Text style={styles.infoLabel}>Peso: {cliente.peso_actual} kg</Text>
        <Text style={styles.infoLabel}>Altura: {cliente.altura} cm</Text>
        <Text style={styles.infoLabel}>Cliente desde: {new Date(cliente.fecha_inicio).toLocaleDateString()}</Text>
      </View>

      {progreso && (
        <View style={styles.seccion}>
          <Text style={styles.subtitulo}>Progreso de Entrenamiento</Text>
          <View style={styles.estadisticasGrid}>
            <View style={styles.estadisticaCard}>
              <Text style={styles.estadisticaNumero}>{progreso.rutinasCompletadas}</Text>
              <Text style={styles.estadisticaLabel}>Rutinas Completadas</Text>
            </View>
            <View style={styles.estadisticaCard}>
              <Text style={styles.estadisticaNumero}>{progreso.porcentajeCompletitud}%</Text>
              <Text style={styles.estadisticaLabel}>Tasa de Completitud</Text>
            </View>
            <View style={styles.estadisticaCard}>
              <Text style={styles.estadisticaNumero}>{progreso.volumenSemanal}</Text>
              <Text style={styles.estadisticaLabel}>Volumen Semanal</Text>
            </View>
            <View style={styles.estadisticaCard}>
              <Text style={styles.estadisticaNumero}>{progreso.promedioRIR}</Text>
              <Text style={styles.estadisticaLabel}>RIR Promedio</Text>
            </View>
          </View>
        </View>
      )}

      {progreso && progreso.rutinasSemanales && (
        <View style={styles.seccion}>
          <Text style={styles.subtitulo}>Rutinas Completadas (Semanales)</Text>
          <BarChart
            data={{
              labels: ['S1', 'S2', 'S3', 'S4', 'S5'],
              datasets: [{ data: progreso.rutinasSemanales }]
            }}
            width={screenWidth - 32}
            height={220}
            chartConfig={chartConfig}
            style={styles.grafico}
          />
        </View>
      )}

      {wellness.length > 0 && (
        <View style={styles.seccion}>
          <Text style={styles.subtitulo}>Estado Wellness (Últimos 7 días)</Text>
          <LineChart
            data={{
              labels: wellness.map(w => new Date(w.fecha).getDate().toString()),
              datasets: [{
                data: wellness.map(w => (w.energia + w.sueno + w.motivacion) / 3)
              }]
            }}
            width={screenWidth - 32}
            height={220}
            chartConfig={chartConfig}
            style={styles.grafico}
          />
        </View>
      )}

      <View style={styles.accionesContainer}>
        <TouchableOpacity 
          style={styles.botonAccion}
          onPress={() => navigation.navigate('ClientProgress', { cliente })}
        >
          <Text style={styles.textoBoton}>Ver Progreso Detallado</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.botonAccion, { backgroundColor: '#2196F3' }]}
          onPress={() => navigation.navigate('CoachNotes', { cliente })}
        >
          <Text style={styles.textoBoton}>Ver Notas del Coach</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  seccion: {
    marginBottom: 24,
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  estadisticasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  estadisticaCard: {
    width: '48%',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  estadisticaNumero: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.active,
  },
  estadisticaLabel: {
    color: colors.text,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  grafico: {
    borderRadius: 16,
  },
  accionesContainer: {
    marginTop: 20,
  },
  botonAccion: {
    backgroundColor: colors.active,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  textoBoton: {
    color: colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ClientDetailScreen;
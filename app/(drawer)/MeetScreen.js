import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    Alert,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { colors } from '../../constants/theme';

const BASE_URL = 'https://rayostrength-production.up.railway.app';

export default function MeetScreen() {
  const [sesiones, setSesiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cargarSesiones();
  }, []);

  const cargarSesiones = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/api/meet/sesiones-usuario`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setSesiones(result.sesiones);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las sesiones');
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarSesiones();
  };

  const unirseSesion = (enlaceMeet) => {
    Linking.openURL(enlaceMeet).catch(() => {
      Alert.alert('Error', 'No se pudo abrir Google Meet');
    });
  };

  const formatearFecha = (fechaString) => {
    const fecha = new Date(fechaString);
    return fecha.toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (cargando) {
    return (
      <View style={styles.container}>
        <Text>Cargando sesiones...</Text>
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
          colors={[colors.active]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.titulo}>Sesiones con tu Coach</Text>
        <Text style={styles.subtitulo}>
          Tus sesiones programadas de Google Meet
        </Text>
      </View>

      {sesiones.length === 0 ? (
        <View style={styles.sinSesiones}>
          <Text style={styles.sinSesionesTexto}>
            No tienes sesiones programadas
          </Text>
          <Text style={styles.sinSesionesSubtexto}>
            Tu coach te asignará sesiones pronto
          </Text>
        </View>
      ) : (
        sesiones.map((sesion) => (
          <View key={sesion.id_sesion} style={styles.sesionCard}>
            <View style={styles.sesionHeader}>
              <Text style={styles.sesionTitulo}>{sesion.titulo}</Text>
              <View style={styles.estadoPill}>
                <Text style={styles.estadoTexto}>Programada</Text>
              </View>
            </View>
            
            <Text style={styles.sesionCoach}>
              Coach: {sesion.coach_nombre} {sesion.coach_apellido}
            </Text>
            
            <Text style={styles.sesionFecha}>
              {formatearFecha(sesion.fecha_sesion)}
            </Text>
            
            {sesion.descripcion && (
              <Text style={styles.sesionDescripcion}>
                {sesion.descripcion}
              </Text>
            )}
            
            <Text style={styles.sesionDuracion}>
              Duración: {sesion.duracion_minutos} minutos
            </Text>
            
            <TouchableOpacity 
              style={styles.botonUnirse}
              onPress={() => unirseSesion(sesion.enlace_meet)}
            >
              <Text style={styles.botonUnirseTexto}>Unirse a Google Meet</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitulo}>Como unirse a la sesión</Text>
        <Text style={styles.infoTexto}>
          1. Presiona Unirse a Google Meet
          2. Se abrirá la app de Google Meet
          3. Une te a la videollamada
          4. Espera a que tu coach se una
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 16,
    color: colors.placeholder,
    lineHeight: 22,
  },
  sinSesiones: {
    padding: 40,
    alignItems: 'center',
  },
  sinSesionesTexto: {
    color: colors.text,
    fontSize: 16,
    marginBottom: 8,
  },
  sinSesionesSubtexto: {
    color: colors.placeholder,
    fontSize: 14,
    textAlign: 'center',
  },
  sesionCard: {
    backgroundColor: colors.card,
    margin: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sesionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sesionTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  estadoPill: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoTexto: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  sesionCoach: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 8,
  },
  sesionFecha: {
    color: colors.active,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  sesionDescripcion: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  sesionDuracion: {
    color: colors.placeholder,
    fontSize: 14,
    marginBottom: 16,
  },
  botonUnirse: {
    backgroundColor: colors.active,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  botonUnirseTexto: {
    color: colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: colors.card,
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
  },
  infoTitulo: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoTexto: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
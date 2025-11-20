import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from 'react-native';
import { colors } from '../../constants/theme';

const NOTIFICATION_KEY = 'notificaciones_pago_activas';

export default function Notificaciones() {
  const [notificacionesActivas, setNotificacionesActivas] = useState(false);

  useEffect(() => {
    cargarEstadoNotificaciones();
  }, []);

  const cargarEstadoNotificaciones = async () => {
    try {
      const estado = await AsyncStorage.getItem(NOTIFICATION_KEY);
      setNotificacionesActivas(estado === 'true');
    } catch (error) {
      console.log('Error cargando estado:', error);
    }
  };

  const activarRecordatorios = async () => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_KEY, 'true');
      setNotificacionesActivas(true);

      setTimeout(() => {
        Alert.alert("Recordatorio de Pago", "Es hora de realizar el pago de tu mensualidad");
      }, 2073600000);

      Alert.alert('Recordatorios Activados', 'Recibirás alertas de recordatorio.', [{ text: 'Entendido' }]);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron activar los recordatorios.');
    }
  };

  const desactivarRecordatorios = async () => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_KEY, 'false');
      setNotificacionesActivas(false);
      Alert.alert('Recordatorios Desactivados', 'Ya no recibirás recordatorios.', [{ text: 'Entendido' }]);
    } catch (error) {
      console.log('Error desactivando recordatorios:', error);
    }
  };

  const manejarInterruptor = (nuevoValor) => {
    if (nuevoValor) {
      Alert.alert('Activar Recordatorios', '¿Quieres activar los recordatorios automáticos?', [
        { text: 'Cancelar', style: 'cancel', onPress: () => setNotificacionesActivas(false) },
        { text: 'Activar', onPress: activarRecordatorios }
      ]);
    } else {
      Alert.alert('Desactivar Recordatorios', '¿Quieres dejar de recibir recordatorios?', [
        { text: 'Cancelar', style: 'cancel', onPress: () => setNotificacionesActivas(true) },
        { text: 'Desactivar', onPress: desactivarRecordatorios }
      ]);
    }
  };

  const probarRecordatorio = () => {
    Alert.alert("Prueba", "Recordatorio de pago", [{ text: 'OK' }]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido}>
      <View style={styles.header}>
        <Text style={styles.tituloPrincipal}>Recordatorios de Pago</Text>
        <Text style={styles.subtitulo}>Sistema de recordatorios para tu mensualidad</Text>
      </View>

      <View style={styles.tarjeta}>
        <View style={styles.fila}>
          <View style={styles.textoContainer}>
            <Text style={styles.tituloTarjeta}>Recordatorios Automáticos</Text>
            <Text style={styles.descripcionTarjeta}>Alertas programadas cada 24 días</Text>
          </View>
          <Switch
            value={notificacionesActivas}
            onValueChange={manejarInterruptor}
            trackColor={{ false: '#767577', true: colors.active }}
            thumbColor={notificacionesActivas ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>

        {notificacionesActivas && (
          <View style={styles.estadoActivo}>
            <Text style={styles.estadoTexto}>Recordatorios activos</Text>
            <Text style={styles.estadoSubtexto}>Proximo recordatorio en 24 días</Text>
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
  contenido: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  tituloPrincipal: {
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
  tarjeta: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textoContainer: {
    flex: 1,
    marginRight: 16,
  },
  tituloTarjeta: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  descripcionTarjeta: {
    fontSize: 14,
    color: colors.placeholder,
    lineHeight: 20,
  },
  estadoActivo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  estadoTexto: {
    color: '#22c55e',
    fontWeight: '600',
    fontSize: 14,
  },
  estadoSubtexto: {
    color: '#22c55e',
    fontSize: 12,
    marginTop: 2,
  },
  botonSecundario: {
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  textoBotonSecundario: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
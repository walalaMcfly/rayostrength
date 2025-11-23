import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

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

const BASE_URL = 'https://rayostrength-production.up.railway.app';

export default function CrearSesionMeet({ navigation, route }) {
  const { cliente } = route.params;
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [enlaceMeet, setEnlaceMeet] = useState('');
  const [fecha, setFecha] = useState(new Date());
  const [duracion, setDuracion] = useState('60');
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
  const [cargando, setCargando] = useState(false);

  const generarEnlaceMeet = () => {
    const meetLink = `https://meet.google.com/nuevo-enlace-${Math.random().toString(36).substring(7)}`;
    setEnlaceMeet(meetLink);
    Alert.alert('Enlace generado', 'Copia este enlace y crea la reunión en Google Calendar');
  };

  const crearSesion = async () => {
    if (!titulo || !enlaceMeet) {
      Alert.alert('Error', 'Completa titulo y enlace de Meet');
      return;
    }

    setCargando(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/api/meet/crear-sesion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idUsuario: cliente.id_usuario,
          titulo,
          descripcion,
          enlaceMeet,
          fechaSesion: fecha.toISOString(),
          duracion: parseInt(duracion)
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('Listo', 'Sesión agendada correctamente', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Agendar Google Meet</Text>
        <Text style={styles.subtitulo}>Para: {cliente.nombre} {cliente.apellido}</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Título</Text>
        <TextInput
          style={styles.input}
          placeholder="Consulta de técnica"
          value={titulo}
          onChangeText={setTitulo}
        />

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Objetivos de la sesión..."
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
        />

        <Text style={styles.label}>Fecha y hora</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setMostrarDatePicker(true)}>
          <Text style={styles.dateButtonText}>{fecha.toLocaleString()}</Text>
        </TouchableOpacity>

        {mostrarDatePicker && (
          <DateTimePicker
            value={fecha}
            mode="datetime"
            display="default"
            onChange={(event, selectedDate) => {
              setMostrarDatePicker(false);
              if (selectedDate) setFecha(selectedDate);
            }}
          />
        )}

        <Text style={styles.label}>Duración (minutos)</Text>
        <TextInput
          style={styles.input}
          placeholder="60"
          value={duracion}
          onChangeText={setDuracion}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Enlace de Google Meet</Text>
        <View style={styles.enlaceContainer}>
          <TextInput
            style={[styles.input, styles.enlaceInput]}
            placeholder="https://meet.google.com/..."
            value={enlaceMeet}
            onChangeText={setEnlaceMeet}
          />
          <TouchableOpacity style={styles.generateButton} onPress={generarEnlaceMeet}>
            <Text style={styles.generateButtonText}>Generar</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.button, cargando && styles.buttonDisabled]}
          onPress={crearSesion}
          disabled={cargando}
        >
          <Text style={styles.buttonText}>
            {cargando ? 'Creando...' : 'Agendar Sesión'}
          </Text>
        </TouchableOpacity>
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
    backgroundColor: colors.card,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  subtitulo: {
    fontSize: 16,
    color: colors.placeholder,
  },
  formContainer: {
    padding: 20,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 15,
    color: colors.text,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 15,
  },
  dateButtonText: {
    color: colors.text,
    fontSize: 16,
  },
  enlaceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  enlaceInput: {
    flex: 1,
    marginRight: 10,
  },
  generateButton: {
    backgroundColor: colors.active,
    padding: 15,
    borderRadius: 8,
  },
  generateButtonText: {
    color: colors.card,
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.active,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
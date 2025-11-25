import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

export default function CrearSesionMeet() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const clientId = params.clientId;

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [enlaceMeet, setEnlaceMeet] = useState('');
  const [fechaSesion, setFechaSesion] = useState(new Date());
  const [horaSesion, setHoraSesion] = useState(new Date());
  const [duracion, setDuracion] = useState('60');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const duraciones = [
    { label: '30 min', value: '30' },
    { label: '45 min', value: '45' },
    { label: '1 hora', value: '60' },
    { label: '1h 30min', value: '90' },
    { label: '2 horas', value: '120' }
  ];

  const handleCrearSesion = async () => {
    if (!titulo || !enlaceMeet) {
      Alert.alert('Error', 'Completa los campos obligatorios');
      return;
    }

    if (!enlaceMeet.includes('meet.google.com')) {
      Alert.alert('Error', 'Ingresa un enlace válido de Google Meet');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const fechaCompleta = new Date(fechaSesion);
      fechaCompleta.setHours(horaSesion.getHours());
      fechaCompleta.setMinutes(horaSesion.getMinutes());
      
      const fechaFormateada = fechaCompleta.toISOString().slice(0, 16).replace('T', ' ');

      const response = await fetch(`${API_URL}/meet/crear-sesion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          idUsuario: parseInt(clientId),
          titulo,
          descripcion,
          enlaceMeet,
          fechaSesion: fechaFormateada,
          duracion: parseInt(duracion)
        })
      });

      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Error en la respuesta del servidor');
      }

      if (!response.ok) {
        throw new Error(data.message || `Error ${response.status}`);
      }

      if (data.success) {
        Alert.alert(
          '✅ Sesión Creada', 
          `El usuario verá esta sesión en su app.\n\nFecha: ${formatFechaCorta(fechaSesion)}\nHora: ${formatHora(horaSesion)}\nDuración: ${duracion} min`,
          [{ text: 'Aceptar', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo crear la sesión');
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatFechaCorta = (date) => {
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  };

  const formatHora = (date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const calcularHoraFin = () => {
    const horaFin = new Date(horaSesion);
    horaFin.setMinutes(horaFin.getMinutes() + parseInt(duracion));
    return formatHora(horaFin);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFechaSesion(selectedDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setHoraSesion(selectedTime);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Agendar Meet</Text>
      
      <Text style={styles.label}>Título *</Text>
      <TextInput
        placeholder="Evaluación, Consulta..."
        value={titulo}
        onChangeText={setTitulo}
        style={styles.input}
        maxLength={30}
      />

      <Text style={styles.label}>Descripción</Text>
      <TextInput
        placeholder="Objetivo de la sesión..."
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
        style={[styles.input, styles.textArea]}
      />

      <Text style={styles.label}>Enlace Meet *</Text>
      <TextInput
        placeholder="https://meet.google.com/..."
        value={enlaceMeet}
        onChangeText={setEnlaceMeet}
        style={styles.input}
      />

      <Text style={styles.label}>Fecha *</Text>
      <TouchableOpacity 
        style={styles.dateButton}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.dateButtonText}>
          📅 {formatFecha(fechaSesion)}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Hora *</Text>
      <TouchableOpacity 
        style={styles.dateButton}
        onPress={() => setShowTimePicker(true)}
      >
        <Text style={styles.dateButtonText}>
          🕒 {formatHora(horaSesion)}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Duración</Text>
      <View style={styles.duracionContainer}>
        {duraciones.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[
              styles.duracionButton,
              duracion === item.value && styles.duracionButtonSelected
            ]}
            onPress={() => setDuracion(item.value)}
          >
            <Text style={[
              styles.duracionButtonText,
              duracion === item.value && styles.duracionButtonTextSelected
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.resumenContainer}>
        <Text style={styles.resumenTitle}>Resumen:</Text>
        <Text style={styles.resumenText}>{formatFecha(fechaSesion)}</Text>
        <Text style={styles.resumenText}>{formatHora(horaSesion)} - {calcularHoraFin()}</Text>
        <Text style={styles.resumenText}>{duracion} minutos</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          onPress={handleCrearSesion}
          style={[styles.primaryButton, loading && styles.disabledButton]}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Creando...' : 'Agendar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={fechaSesion}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={horaSesion}
          mode="time"
          display="default"
          onChange={onTimeChange}
          is24Hour={true}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  dateButtonText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  duracionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  duracionButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 10,
    borderRadius: 6,
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
  },
  duracionButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  duracionButtonText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  duracionButtonTextSelected: {
    color: colors.white,
    fontWeight: 'bold',
  },
  resumenContainer: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginBottom: 20,
  },
  resumenTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  resumenText: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 2,
  },
  buttonContainer: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: colors.gray,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: colors.danger,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
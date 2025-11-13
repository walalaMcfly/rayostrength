import { colors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const CoachNotesScreen = ({ route, navigation }) => {
  const { cliente } = route.params;
  const [notas, setNotas] = useState([]);
  const [nuevaNota, setNuevaNota] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    cargarNotas();
  }, []);

  const cargarNotas = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`https://rayostrength-production.up.railway.app/api/coach/cliente/${cliente.id_usuario}/notas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setNotas(result.notas);
      }
    } catch (error) {
      console.error('Error cargando notas:', error);
      Alert.alert('Error', 'No se pudieron cargar las notas');
    } finally {
      setLoading(false);
    }
  };

  const enviarNota = async () => {
    if (!nuevaNota.trim()) {
      Alert.alert('Error', 'La nota no puede estar vacía');
      return;
    }

    setEnviando(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch('https://rayostrength-production.up.railway.app/api/coach/notas', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_cliente: cliente.id_usuario,
          mensaje: nuevaNota
        }),
      });

      const result = await response.json();

      if (result.success) {
        setNuevaNota('');
        cargarNotas();
        Alert.alert('Éxito', 'Nota enviada correctamente');
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error enviando nota:', error);
      Alert.alert('Error', 'No se pudo enviar la nota');
    } finally {
      setEnviando(false);
    }
  };

  const renderNota = ({ item }) => (
    <View style={styles.notaContainer}>
      <View style={styles.notaHeader}>
        <Text style={styles.coachNombre}>{item.coach_nombre} {item.coach_apellido}</Text>
        <Text style={styles.fechaNota}>
          {new Date(item.fecha_creacion).toLocaleDateString()} - {new Date(item.fecha_creacion).toLocaleTimeString()}
        </Text>
      </View>
      <Text style={styles.mensajeNota}>{item.mensaje}</Text>
      {item.leido && (
        <Text style={styles.estadoLeido}>✓ Leído por el cliente</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.cargandoContainer}>
        <ActivityIndicator size="large" color={colors.active} />
        <Text style={styles.cargandoTexto}>Cargando notas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Notas para {cliente.nombre}</Text>
      
      <View style={styles.formContainer}>
        <Text style={styles.label}>Nueva Nota</Text>
        <TextInput
          style={styles.input}
          placeholder="Escribe una nota para el cliente..."
          placeholderTextColor={colors.placeholder}
          value={nuevaNota}
          onChangeText={setNuevaNota}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        
        <TouchableOpacity 
          style={[styles.boton, enviando && styles.botonDeshabilitado]}
          onPress={enviarNota}
          disabled={enviando}
        >
          <Text style={styles.textoBoton}>
            {enviando ? 'Enviando...' : 'Enviar Nota'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitulo}>Notas Anteriores</Text>
      <FlatList
        data={notas}
        renderItem={renderNota}
        keyExtractor={item => item.id_nota.toString()}
        style={styles.listaNotas}
        showsVerticalScrollIndicator={false}
      />
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    marginBottom: 16,
    minHeight: 100,
  },
  boton: {
    backgroundColor: colors.active,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  botonDeshabilitado: {
    backgroundColor: colors.placeholder,
  },
  textoBoton: {
    color: colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  listaNotas: {
    flex: 1,
  },
  notaContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  notaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  coachNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  fechaNota: {
    fontSize: 12,
    color: colors.placeholder,
  },
  mensajeNota: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  estadoLeido: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default CoachNotesScreen;
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { colors } from "../../../constants/theme";


const BASE_URL = 'https://rayostrength-production.up.railway.app';

export default function RutinasScreen() {
  const router = useRouter();
  const [notasCliente, setNotasCliente] = useState({});
  const [setsCompletados, setSetsCompletados] = useState({});
  const [rutinas, setRutinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userToken, setUserToken] = useState('');
  const [refreshing, setRefreshing] = useState(false); 

  
  useEffect(() => {
    const obtenerToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        console.log('🔑 Token obtenido:', token ? '✅' : '❌ No encontrado');
        setUserToken(token);
      } catch (error) {
        console.error('Error obteniendo token:', error);
        Alert.alert('Error', 'No se pudo obtener la sesión');
      }
    };

    obtenerToken();
  }, []);

  
  useEffect(() => {
    if (userToken) {
      cargarRutinas();
    }
  }, [userToken]);

  const cargarRutinas = async () => {
    try {
      setLoading(true);
      console.log('🔗 Iniciando carga de rutinas...');

     
      const response = await fetch(`${BASE_URL}/api/rutinas/Rayostrenght`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`, 
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Status:', response.status);

      if (response.status === 401) {
        throw new Error('Token inválido o expirado');
      }

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Datos recibidos:', result);

      if (result.success) {
        setRutinas(result.rutinas);
      } else {
        Alert.alert('Error', result.message || 'Error al cargar rutinas');
      }
    } catch (error) {
      console.error('❌ Error cargando rutinas:', error);
      
      if (error.message.includes('Token') || error.message.includes('401')) {
        Alert.alert('Sesión expirada', 'Por favor inicia sesión nuevamente');
        await AsyncStorage.removeItem('userToken');
        router.replace('/');
      } else {
        Alert.alert('Error', 'No se pudieron cargar las rutinas: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const marcarRutinaCompletada = async () => {
  try {
    const totalEjercicios = rutinas.length;
    const ejerciciosCompletados = rutinas.filter(ejercicio => {
      const setsCompletados = Object.values(setsCompletados[ejercicio.id] || {}).filter(Boolean).length;
      return setsCompletados === ejercicio.series;
    }).length;

    await fetch(`${BASE_URL}/api/progreso/sesion`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        semana_rutina: 'Rayostrenght', // o la semana actual
        total_ejercicios: totalEjercicios,
        ejercicios_completados: ejerciciosCompletados,
        duracion_total_minutos: 60, // Podrías calcular esto
        volumen_total: 1500, // Podrías calcular esto
        rpe_promedio: 7, // Podrías calcular esto
        rir_promedio: 2, // Podrías calcular esto
        notas_usuario: 'Rutina completada hoy'
      }),
    });

    Alert.alert('¡Felicidades!', 'Rutina marcada como completada');
  } catch (error) {
    console.error('Error marcando rutina completada:', error);
    Alert.alert('Error', 'No se pudo marcar la rutina como completada');
  }
};

// Y agregar el botón en tu JSX:
<TouchableOpacity style={styles.completarButton} onPress={marcarRutinaCompletada}>
  <Text style={styles.completarButtonText}>✅ Marcar Rutina Completada</Text>
</TouchableOpacity>

  
  const onRefresh = async () => {
    setRefreshing(true);
    await cargarRutinas();
    setRefreshing(false);
  };
const toggleSet = async (ejercicioId, setNumber) => {
  const nuevosSets = { ...setsCompletados };
  if (!nuevosSets[ejercicioId]) nuevosSets[ejercicioId] = {};
  
  nuevosSets[ejercicioId][setNumber] = !nuevosSets[ejercicioId]?.[setNumber];
  setSetsCompletados(nuevosSets);

  try {
    // Contar cuántos sets están completados
    const setsCompletadosCount = Object.values(nuevosSets[ejercicioId] || {}).filter(Boolean).length;
    
    // Encontrar el ejercicio actual
    const ejercicio = rutinas.find(e => e.id === ejercicioId);
    
    // Guardar progreso en la base de datos
    await fetch(`${BASE_URL}/api/progreso/guardar-ejercicio`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id_ejercicio: ejercicioId,
        nombre_ejercicio: ejercicio?.nombre,
        sets_completados: setsCompletadosCount,
        reps_logradas: ejercicio?.reps,
        peso_utilizado: ejercicio?.peso,
        rir_final: ejercicio?.rir,
        rpe_final: ejercicio?.rpe,
        notas: notasCliente[ejercicioId] || ''
      }),
    });

    console.log(`✅ Guardado progreso: ${ejercicio?.nombre} - ${setsCompletadosCount} sets`);

    // Si se completaron todos los sets, verificar si se completó toda la rutina
    if (setsCompletadosCount === ejercicio?.series) {
      verificarRutinaCompletada();
    }

  } catch (error) {
    console.error('Error guardando progreso:', error);
  }
};

const verificarRutinaCompletada = async () => {
  try {
    const ejerciciosCompletados = rutinas.filter(ejercicio => {
      const setsDelEjercicio = setsCompletados[ejercicio.id] || {};
      const setsCompletadosCount = Object.values(setsDelEjercicio).filter(Boolean).length;
      return setsCompletadosCount === ejercicio.series;
    }).length;

    const porcentajeCompletitud = (ejerciciosCompletados / rutinas.length) * 100;
    console.log(`📊 Progreso rutina: ${ejerciciosCompletados}/${rutinas.length} (${porcentajeCompletitud}%)`);

    if (porcentajeCompletitud >= 80 && ejerciciosCompletados < rutinas.length) {
      Alert.alert(
        "¿Rutina completada?",
        `Has completado ${ejerciciosCompletados} de ${rutinas.length} ejercicios. ¿Quieres marcar la rutina como completada?`,
        [
          { text: "No, aún no", style: "cancel" },
          { 
            text: "Sí, completada", 
            onPress: () => registrarSesionCompletada(ejerciciosCompletados) 
          }
        ]
      );
    }
    if (ejerciciosCompletados === rutinas.length) {
      registrarSesionCompletada(ejerciciosCompletados);
    }

  } catch (error) {
    console.error('Error verificando rutina completada:', error);
  }
};


const registrarSesionCompletada = async (ejerciciosCompletados) => {
  try {
    const volumenTotal = rutinas.reduce((total, ejercicio) => {
      const peso = parseInt(ejercicio.peso) || 0;
      const series = ejercicio.series || 0;
      const reps = parseInt(ejercicio.reps) || 0;
      return total + (peso * series * reps);
    }, 0);

    const rpePromedio = rutinas.reduce((total, ejercicio) => total + (ejercicio.rpe || 0), 0) / rutinas.length;
    const rirPromedio = rutinas.reduce((total, ejercicio) => total + (ejercicio.rir || 0), 0) / rutinas.length;

    await fetch(`${BASE_URL}/api/progreso/registrar-sesion`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        semana_rutina: 'Rayostrenght',
        total_ejercicios: rutinas.length,
        ejercicios_completados: ejerciciosCompletados,
        duracion_total_minutos: 60, 
        volumen_total: volumenTotal,
        rpe_promedio: rpePromedio,
        rir_promedio: rirPromedio,
        notas_usuario: 'Rutina completada exitosamente'
      }),
    });

    Alert.alert("🎉 ¡Rutina Completada!", "Tu progreso ha sido guardado correctamente");

  } catch (error) {
    console.error('Error registrando sesión completada:', error);
    Alert.alert("Error", "No se pudo guardar la sesión completada");
  }
};

<TouchableOpacity 
  style={styles.botonCompletarRutina}
  onPress={() => {
    const ejerciciosCompletados = rutinas.filter(ejercicio => {
      const setsCompletadosCount = Object.values(setsCompletados[ejercicio.id] || {}).filter(Boolean).length;
      return setsCompletadosCount === ejercicio.series;
    }).length;
    registrarSesionCompletada(ejerciciosCompletados);
  }}
>
  <Text style={styles.textoBotonCompletarRutina}>✅ Marcar Rutina como Completada</Text>
</TouchableOpacity>

const guardarNotas = async (ejercicioId, texto) => {
  const nuevasNotas = { ...notasCliente, [ejercicioId]: texto };
  setNotasCliente(nuevasNotas);

  try {
    await fetch(`${BASE_URL}/api/progreso/ejercicio`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id_ejercicio: ejercicioId,
        nombre_ejercicio: rutinas.find(e => e.id === ejercicioId)?.nombre,
        sets_completados: Object.values(setsCompletados[ejercicioId] || {}).filter(Boolean).length,
        reps_logradas: rutinas.find(e => e.id === ejercicioId)?.reps,
        peso_utilizado: rutinas.find(e => e.id === ejercicioId)?.peso,
        rir_final: rutinas.find(e => e.id === ejercicioId)?.rir,
        rpe_final: rutinas.find(e => e.id === ejercicioId)?.rpe,
        notas: texto
      }),
    });
  } catch (error) {
    console.error('Error guardando notas:', error);
  }
};
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.exerciseName}>{item.nombre}</Text>

      {item.videoUrl && (
        <TouchableOpacity onPress={() => Linking.openURL(item.videoUrl)}>
          <View style={styles.row}>
            <Ionicons name="play-circle" size={20} color={colors.icon} />
            <Text style={styles.videoText}>Ver video</Text>
          </View>
        </TouchableOpacity>
      )}

      <Text style={styles.details}>
        Series {item.series} / Reps {item.reps} / Tempo {item.tempo} / RIR{" "}
        {item.rir} / RPE @{item.rpe} / Peso {item.peso}
      </Text>

      <View style={styles.setsRow}>
        {[1, 2, 3, 4].slice(0, item.series).map((setNum) => (
          <TouchableOpacity
            key={setNum}
            style={[
              styles.setButton,
              {
                backgroundColor: setsCompletados[item.id]?.[setNum]
                  ? colors.active
                  : colors.inactive,
              },
            ]}
            onPress={() => toggleSet(item.id, setNum)}
          >
            <Text style={{ color: colors.text }}>Set {setNum}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.feedbackBox}>
        <Text style={styles.feedbackLabel}>Nota Cliente:</Text>
        <TextInput
          placeholder="¿Cómo me sentí?"
          placeholderTextColor={colors.placeholder}
          value={notasCliente[item.id] || ""}
          onChangeText={(text) => guardarNotas(item.id, text)}
          style={styles.feedbackInput}
          multiline
        />
      </View>

      {item.notaCoach && (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackLabel}>Nota Coach:</Text>
          <Text style={{ color: colors.text }}>{item.notaCoach}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.active} />
        <Text style={styles.loadingText}>Cargando rutinas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rutinas}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshing={refreshing} 
        onRefresh={onRefresh} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: colors.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  videoText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.link,
  },
  details: {
    fontSize: 14,
    marginBottom: 10,
    color: colors.text,
  },
  setsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  setButton: {
    flex: 1,
    marginHorizontal: 4,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  feedbackBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  feedbackLabel: {
    fontWeight: "600",
    marginBottom: 4,
    color: colors.text,
  },
  feedbackInput: {
    fontSize: 14,
    minHeight: 40,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: colors.text,
  },

botonCompletarRutina: {
  backgroundColor: colors.active,
  padding: 16,
  borderRadius: 12,
  alignItems: 'center',
  marginTop: 20,
  marginHorizontal: 16,
  marginBottom: 24,
},
textoBotonCompletarRutina: {
  color: colors.card,
  fontSize: 16,
  fontWeight: 'bold',
},
});
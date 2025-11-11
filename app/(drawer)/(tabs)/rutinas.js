import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
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
  const [realesData, setRealesData] = useState({});
  const [showModalCompletar, setShowModalCompletar] = useState(false);
  const [ejercicioEditando, setEjercicioEditando] = useState(null);
  const [repsTemp, setRepsTemp] = useState('');
  const [pesoTemp, setPesoTemp] = useState('');

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

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarRutinas();
    setRefreshing(false);
  };

  const abrirModalDatosReales = (ejercicio) => {
    setEjercicioEditando(ejercicio);
    setRepsTemp(realesData[ejercicio.id]?.repsReales || ejercicio.reps || '');
    setPesoTemp(realesData[ejercicio.id]?.pesoReal || ejercicio.peso || '');
  };

const guardarDatosReales = async (ejercicioId, pesoReal, repsReal) => {
  try {
    console.log('📤 Enviando datos reales:', { 
      ejercicioId, 
      pesoReal, 
      repsReal 
    });

    const token = await AsyncStorage.getItem('userToken');
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const payload = {
      id_ejercicio: ejercicioId,
      peso_utilizado: pesoReal ? parseFloat(pesoReal) : null,
      reps_logradas: repsReal ? parseInt(repsReal) : null
    };

    console.log('📦 Payload:', payload);

    const response = await fetch('https://rayostrength-production.up.railway.app/api/progreso/actualizar-ejercicio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    console.log('🔍 Status de respuesta:', response.status);

    const responseText = await response.text();
    console.log('📄 Respuesta cruda:', responseText.substring(0, 500));

    // Verificar si es HTML (error del servidor)
    if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
      console.error('❌ Servidor devolvió HTML - Error 500/404');
      throw new Error('Error interno del servidor. Contacta al administrador.');
    }

    // Intentar parsear JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Error parseando JSON:', parseError);
      console.error('📄 Contenido recibido:', responseText);
      throw new Error('Respuesta inválida del servidor');
    }

    // Verificar si la respuesta indica éxito
    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || `Error ${response.status}`);
    }

    console.log('✅ Datos guardados exitosamente:', data);
    return data;

  } catch (error) {
    console.error('❌ Error completo guardarDatosReales:', error);
    Alert.alert(
      'Error al guardar',
      error.message || 'No se pudieron guardar los datos. Verifica tu conexión.',
      [{ text: 'OK' }]
    );
    
    throw error;
  }
};

  const toggleSet = async (ejercicioId, setNumber) => {
    const nuevosSets = { ...setsCompletados };
    if (!nuevosSets[ejercicioId]) nuevosSets[ejercicioId] = {};
    
    nuevosSets[ejercicioId][setNumber] = !nuevosSets[ejercicioId]?.[setNumber];
    setSetsCompletados(nuevosSets);

    try {
      const setsCompletadosCount = Object.values(nuevosSets[ejercicioId] || {}).filter(Boolean).length;
      const ejercicio = rutinas.find(e => e.id === ejercicioId);
      
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
          reps_logradas: realesData[ejercicioId]?.repsReales || ejercicio?.reps,
          peso_utilizado: realesData[ejercicioId]?.pesoReal || ejercicio?.peso,
          rir_final: ejercicio?.rir,
          rpe_final: ejercicio?.rpe,
          notas: notasCliente[ejercicioId] || `Sets completados: ${setsCompletadosCount}`
        }),
      });

      console.log(`✅ Progreso guardado: ${ejercicio?.nombre} - ${setsCompletadosCount} sets`);

      // Verificar si se completó el ejercicio
      if (setsCompletadosCount === ejercicio?.series) {
        verificarRutinaCompletada();
      }

    } catch (error) {
      console.error('Error guardando progreso:', error);
    }
  };

  const probarEndpointProgreso = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    console.log('🔍 Token disponible:', !!token);

    const testData = {
      id_ejercicio: 'test-' + Date.now(),
      peso_utilizado: 50,
      reps_logradas: 10
    };

    console.log('🧪 Probando endpoint progreso...', testData);

    const response = await fetch('https://rayostrength-production.up.railway.app/api/progreso/actualizar-ejercicio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(testData),
    });

    const text = await response.text();
    console.log('📋 Status:', response.status);
    console.log('📄 Respuesta:', text);

    // Intentar parsear
    try {
      const data = JSON.parse(text);
      console.log('✅ JSON parseado:', data);
    } catch (e) {
      console.error('❌ No se pudo parsear JSON:', e.message);
    }

  } catch (error) {
    console.error('❌ Error en prueba:', error);
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
        const peso = parseFloat(realesData[ejercicio.id]?.pesoReal || ejercicio.peso) || 0;
        const series = ejercicio.series || 0;
        const reps = parseFloat(realesData[ejercicio.id]?.repsReales || ejercicio.reps) || 0;
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
          rpe_promedio: rpePromedio.toFixed(1),
          rir_promedio: rirPromedio.toFixed(1),
          notas_usuario: 'Rutina completada exitosamente con datos reales'
        }),
      });

      Alert.alert("🎉 ¡Rutina Completada!", "Tu progreso ha sido guardado correctamente");
      setShowModalCompletar(false);

    } catch (error) {
      console.error('Error registrando sesión completada:', error);
      Alert.alert("Error", "No se pudo guardar la sesión completada");
    }
  };

  const guardarNotas = async (ejercicioId, texto) => {
    const nuevasNotas = { ...notasCliente, [ejercicioId]: texto };
    setNotasCliente(nuevasNotas);

    try {
      const ejercicio = rutinas.find(e => e.id === ejercicioId);
      const setsCompletadosCount = Object.values(setsCompletados[ejercicioId] || {}).filter(Boolean).length;
      
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
          reps_logradas: realesData[ejercicioId]?.repsReales || ejercicio?.reps,
          peso_utilizado: realesData[ejercicioId]?.pesoReal || ejercicio?.peso,
          rir_final: ejercicio?.rir,
          rpe_final: ejercicio?.rpe,
          notas: texto
        }),
      });
    } catch (error) {
      console.error('Error guardando notas:', error);
    }
  };

  const renderItem = ({ item }) => {
    const datosReales = realesData[item.id];
    const setsCompletadosCount = Object.values(setsCompletados[item.id] || {}).filter(Boolean).length;
    const completado = setsCompletadosCount === item.series;

    return (
      <View style={[styles.card, completado && styles.cardCompletada]}>
        <View style={styles.exerciseHeader}>
          <Text style={styles.exerciseName}>{item.nombre}</Text>
          {completado && <Ionicons name="checkmark-circle" size={20} color={colors.active} />}
        </View>

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

        {datosReales && (
          <View style={styles.realesContainer}>
            <Text style={styles.realesTitle}>🎯 Tus datos reales:</Text>
            <Text style={styles.realesText}>
              Reps: {datosReales.repsReales} | Peso: {datosReales.pesoReal}
            </Text>
          </View>
        )}

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

       <TouchableOpacity 
  style={styles.botonReales}
  onPress={() => abrirModalDatosReales(item)}
>
  <Ionicons name="create-outline" size={16} color={colors.text} />
  <Text style={styles.textoBotonReales}>
    {datosReales ? 'Editar peso y reps' : 'Registrar peso y reps reales'}
  </Text>
</TouchableOpacity>

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
  };

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

      <TouchableOpacity 
        style={styles.botonCompletarRutina}
        onPress={() => setShowModalCompletar(true)}
      >
        <Text style={styles.textoBotonCompletarRutina}>✅ Completar Rutina</Text>
      </TouchableOpacity>


     <Modal
  visible={!!ejercicioEditando}
  transparent={true}
  animationType="slide"
  onRequestClose={() => setEjercicioEditando(null)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>📝 Peso y Repeticiones Realizadas - {ejercicioEditando?.nombre}</Text>
      
      <View style={styles.modalField}>
        <Text style={styles.modalLabel}>Repeticiones Realizadas:</Text>
        <TextInput
          style={styles.modalInput}
          value={repsTemp}
          onChangeText={setRepsTemp}
          placeholder="Ej: 10, 8-12, 15"
          placeholderTextColor={colors.placeholder}
          keyboardType="default"
        />
      </View>

      <View style={styles.modalField}>
        <Text style={styles.modalLabel}>Peso Utilizado (kg):</Text>
        <TextInput
          style={styles.modalInput}
          value={pesoTemp}
          onChangeText={setPesoTemp}
          placeholder="Ej: 40, 50-60, barra"
          placeholderTextColor={colors.placeholder}
          keyboardType="default"
        />
      </View>

      <View style={styles.modalButtons}>
        <TouchableOpacity 
          style={[styles.modalButton, styles.modalButtonCancel]}
          onPress={() => setEjercicioEditando(null)}
        >
          <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.modalButton, styles.modalButtonSave]}
          onPress={() => {
            if (ejercicioEditando) {
              guardarDatosReales(ejercicioEditando.id, repsTemp, pesoTemp);
            }
            setEjercicioEditando(null);
          }}
        >
          <Text style={styles.modalButtonTextSave}>Guardar</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>


      <Modal
        visible={showModalCompletar}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎯 Completar Rutina</Text>
            <Text style={styles.modalText}>
              ¿Estás seguro de que quieres marcar esta rutina como completada?
            </Text>
            <Text style={styles.modalSubtext}>
              Se guardarán todos tus datos de progreso.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowModalCompletar(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={() => {
                  const ejerciciosCompletados = rutinas.filter(ejercicio => {
                    const setsCompletadosCount = Object.values(setsCompletados[ejercicio.id] || {}).filter(Boolean).length;
                    return setsCompletadosCount === ejercicio.series;
                  }).length;
                  registrarSesionCompletada(ejerciciosCompletados);
                }}
              >
                <Text style={styles.modalButtonTextConfirm}>Sí, Completar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  cardCompletada: {
    borderLeftWidth: 4,
    borderLeftColor: colors.active,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
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
  realesContainer: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.active,
  },
  realesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.active,
    marginBottom: 2,
  },
  realesText: {
    fontSize: 12,
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
  botonReales: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  textoBotonReales: {
    color: colors.text,
    fontSize: 12,
    marginLeft: 4,
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
    marginHorizontal: 16,
    marginBottom: 24,
  },
  textoBotonCompletarRutina: {
    color: colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    color: colors.text,
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtext: {
    color: colors.placeholder,
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalField: {
    marginBottom: 15,
  },
  modalLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonSave: {
    backgroundColor: colors.active,
  },
  modalButtonConfirm: {
    backgroundColor: colors.active,
  },
  modalButtonTextCancel: {
    color: colors.text,
    fontWeight: '600',
  },
  modalButtonTextSave: {
    color: colors.card,
    fontWeight: 'bold',
  },
  modalButtonTextConfirm: {
    color: colors.card,
    fontWeight: 'bold',
  },
});
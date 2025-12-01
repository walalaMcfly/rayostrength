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
  const [setsCompletados, setSetsCompletados] = useState({});
  const [rutina, setRutina] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userToken, setUserToken] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [realesData, setRealesData] = useState({});
  const [showModalCompletar, setShowModalCompletar] = useState(false);
  const [ejercicioEditando, setEjercicioEditando] = useState(null);
  const [repsTemp, setRepsTemp] = useState('');
  const [pesoTemp, setPesoTemp] = useState('');
  const [notaGeneral, setNotaGeneral] = useState('');
  const [rutinaCompletada, setRutinaCompletada] = useState(false);
  const [idCoach, setIdCoach] = useState(null);

  useEffect(() => {
    const obtenerToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setUserToken(token);
      } catch (error) {
        console.error('Error obteniendo token:', error);
        Alert.alert('Error', 'No se pudo obtener la sesion');
      }
    };

    obtenerToken();
  }, []);

  useEffect(() => {
    if (userToken) {
      cargarRutinaPersonalizada();
    }
  }, [userToken]);

  const cargarRutinaPersonalizada = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const user = JSON.parse(await AsyncStorage.getItem('userData'));

      console.log('Cargando rutina para usuario:', user.id_usuario);

      const response = await fetch(`${BASE_URL}/api/rutinas-personalizadas/cliente/${user.id_usuario}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Status de respuesta:', response.status);

      if (response.status === 401) {
        throw new Error('Token invalido o expirado');
      }

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('Respuesta completa del backend:', JSON.stringify(result, null, 2));

      if (result.success !== false) {
        console.log('Datos recibidos:');
        console.log('personalizada:', result.personalizada);
        console.log('hojaVinculada:', result.hojaVinculada);
        console.log('ejercicios:', result.ejercicios);
        console.log('cantidad ejercicios:', result.ejercicios ? result.ejercicios.length : 0);
        
        if (result.ejercicios && result.ejercicios.length > 0) {
          console.log('Estructura del primer ejercicio:', JSON.stringify(result.ejercicios[0], null, 2));
        }

        setRutina({
          personalizada: result.personalizada || false,
          hojaVinculada: result.hojaVinculada || false,
          coach: result.coach || '',
          id_coach: result.id_coach || null, 
          ejercicios: result.ejercicios || [],
          message: result.message || ''
        });

        if (result.id_coach) {
          setIdCoach(result.id_coach);
        }

      } else {
        console.error('Error en respuesta del servidor:', result.message);
        Alert.alert('Error', result.message || 'Error al cargar rutinas');
      }
    } catch (error) {
      console.error('Error cargando rutina:', error);
      
      if (error.message.includes('Token') || error.message.includes('401')) {
        Alert.alert('Sesion expirada', 'Por favor inicia sesion nuevamente');
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
    try {
      setRefreshing(true);
      console.log('Sincronizando con Google Sheets...');
      
      const token = await AsyncStorage.getItem('userToken');
      const user = JSON.parse(await AsyncStorage.getItem('userData'));
      await fetch(`${BASE_URL}/api/rutinas/sincronizar/${user.id_usuario}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      await cargarRutinaPersonalizada();
      
      console.log('Sincronizacion completada');
    } catch (error) {
      console.error('Error en sincronizacion:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const abrirModalDatosReales = (ejercicio) => {
    setEjercicioEditando(ejercicio);
    setRepsTemp(realesData[ejercicio.id]?.repsReales || ejercicio.repeticiones || '');
    setPesoTemp(realesData[ejercicio.id]?.pesoReal || ejercicio.pesoSugerido || '');
  };

  const guardarDatosReales = async (ejercicioId, repsReal, pesoReal) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('No hay token de autenticacion');
      }

      const payload = {
        id_ejercicio: ejercicioId,
        reps_logradas: repsReal,
        peso_utilizado: pesoReal
      };

      const response = await fetch('https://rayostrength-production.up.railway.app/api/progreso/actualizar-ejercicio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
        throw new Error('Error interno del servidor. Contacta al administrador.');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Respuesta invalida del servidor');
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || `Error ${response.status}`);
      }

      setRealesData(prev => ({
        ...prev,
        [ejercicioId]: {
          repsReales: repsReal,
          pesoReal: pesoReal
        }
      }));

      Alert.alert('✅ Exito', 'Datos guardados correctamente');
    } catch (error) {
      console.error('Error guardarDatosReales:', error);
      Alert.alert(
        '❌ Error al guardar',
        error.message || 'No se pudieron guardar los datos. Verifica tu conexion.'
      );
    }
  };

  const toggleSet = async (ejercicioId, setNumber) => {
    try {
      const nuevosSets = { ...setsCompletados };
      if (!nuevosSets[ejercicioId]) nuevosSets[ejercicioId] = {};
      
      nuevosSets[ejercicioId][setNumber] = !nuevosSets[ejercicioId]?.[setNumber];
      setSetsCompletados(nuevosSets);

      const setsCompletadosCount = Object.values(nuevosSets[ejercicioId] || {}).filter(Boolean).length;
      const ejercicio = rutina.ejercicios.find(e => e.id === ejercicioId);
      
      const payload = {
        id_ejercicio: ejercicioId,
        nombre_ejercicio: ejercicio?.nombre,
        sets_completados: setsCompletadosCount,
        reps_logradas: realesData[ejercicioId]?.repsReales || ejercicio?.repeticiones,
        peso_utilizado: realesData[ejercicioId]?.pesoReal || ejercicio?.pesoSugerido,
        rir_final: ejercicio?.rir,
        notas: `Completado: ${setsCompletadosCount}/${ejercicio?.series} sets`
      };

      console.log('Guardando progreso de sets:', payload);

      const response = await fetch(`${BASE_URL}/api/progreso/guardar-ejercicio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('Error guardando sets');
      } else {
        console.log('Sets guardados correctamente');
      }

      verificarRutinaCompletada();

    } catch (error) {
      console.error('Error en toggleSet:', error);
    }
  };

  const verificarRutinaCompletada = async () => {
    try {
      const ejerciciosCompletados = rutina.ejercicios.filter(ejercicio => {
        const setsDelEjercicio = setsCompletados[ejercicio.id] || {};
        const setsCompletadosCount = Object.values(setsDelEjercicio).filter(Boolean).length;
        return setsCompletadosCount === ejercicio.series;
      }).length;

      const todosCompletados = ejerciciosCompletados === rutina.ejercicios.length;

      if (todosCompletados) {
        setShowModalCompletar(true);
      }

    } catch (error) {
      console.error('Error verificando rutina completada:', error);
    }
  };

const registrarSesionCompletada = async () => {
  try {
    const ejerciciosCompletados = rutina.ejercicios.filter(ejercicio => {
      const setsCompletadosCount = Object.values(setsCompletados[ejercicio.id] || {}).filter(Boolean).length;
      return setsCompletadosCount === ejercicio.series;
    }).length;

    const volumenTotal = rutina.ejercicios.reduce((total, ejercicio) => {
      const peso = parseFloat(realesData[ejercicio.id]?.pesoReal || '0') || 0;
      const series = ejercicio.series || 0;
      const reps = parseFloat(realesData[ejercicio.id]?.repsReales || '0') || 0;
      return total + (peso * series * reps);
    }, 0);
    const response = await fetch(`${BASE_URL}/api/progreso/registrar-sesion`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        semana_rutina: 'Personalizada',
        total_ejercicios: rutina.ejercicios.length,
        ejercicios_completados: ejerciciosCompletados,
        duracion_total_minutos: 60,
        volumen_total: volumenTotal,
        notas_usuario: notaGeneral || 'Rutina personalizada completada'
      }),
    });

    if (response.ok) {

      if (notaGeneral && notaGeneral.trim() !== '' && rutina.id_coach) {
        try {
          console.log('Enviando nota al coach:', rutina.id_coach);
          
          const notaResponse = await fetch(`${BASE_URL}/api/cliente/notas`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id_coach: rutina.id_coach,
              mensaje: notaGeneral
            }),
          });

          const notaResult = await notaResponse.json();
          
          if (notaResponse.ok) {
            console.log(' Nota enviada al coach correctamente');
          } else {
            console.log(' Error enviando nota al coach:', notaResult.message);
          }
        } catch (notaError) {
          console.error('Error enviando nota:', notaError);
        }
      }
      setRutinaCompletada(true);
      
      let mensajeExito = "🎉 Rutina Completada\nTu progreso ha sido guardado correctamente";
      if (notaGeneral && rutina.id_coach) {
        mensajeExito += "\n\nTu nota ha sido enviada a tu coach";
      } else if (notaGeneral && !rutina.id_coach) {
        mensajeExito += "\n\nNota: No se pudo enviar tu nota (no tienes coach asignado)";
      }
      
      Alert.alert(" Éxito", mensajeExito);
      setShowModalCompletar(false);
      setNotaGeneral('');
    } else {
      throw new Error('Error al registrar sesión');
    }

  } catch (error) {
    console.error('Error registrando sesion completada:', error);
    Alert.alert(" Error", "No se pudo guardar la sesión completada: " + error.message);
  }
};

  const renderItem = ({ item, index }) => {
    if (rutinaCompletada) return null;

    const ejercicio = {
      id: item.id || `ej-${index}`,
      grupoMuscular: item.grupoMuscular || 'General',
      nombre: item.nombre || 'Ejercicio sin nombre',
      video: item.video || '',
      series: item.series || 0,
      repeticiones: item.repeticiones || '',
      rir: item.rir || 0,
      descanso: item.descanso || ''
    };

    const datosReales = realesData[ejercicio.id];
    const setsCompletadosCount = Object.values(setsCompletados[ejercicio.id] || {}).filter(Boolean).length;
    const completado = setsCompletadosCount === ejercicio.series;

    return (
      <View style={[styles.card, completado && styles.cardCompletada]}>
        {ejercicio.grupoMuscular && ejercicio.grupoMuscular !== 'General' && (
          <View style={styles.grupoHeader}>
            <Text style={styles.grupoText}>{ejercicio.grupoMuscular}</Text>
          </View>
        )}

        <View style={styles.exerciseHeader}>
          <Text style={styles.exerciseName}>{ejercicio.nombre}</Text>
          {completado && <Ionicons name="checkmark-circle" size={20} color={colors.active} />}
        </View>

        {ejercicio.video && ejercicio.video !== '-' && (
          <TouchableOpacity onPress={() => Linking.openURL(ejercicio.video)}>
            <View style={styles.row}>
              <Ionicons name="play-circle" size={20} color={colors.icon} />
              <Text style={styles.videoText}>🎥 Ver video</Text>
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.details}>
          📊 Series {ejercicio.series} / Reps {ejercicio.repeticiones} {ejercicio.rir ? `/ RIR ${ejercicio.rir}` : ''} {ejercicio.descanso ? `/ ⏱️ Descanso ${ejercicio.descanso}` : ''}
        </Text>

        {datosReales && (
          <View style={styles.realesContainer}>
            <Text style={styles.realesTitle}>✅ Tus datos reales:</Text>
            <Text style={styles.realesText}>
              Reps: {datosReales.repsReales} | Peso: {datosReales.pesoReal}
            </Text>
          </View>
        )}

        <View style={styles.setsRow}>
          {Array.from({ length: ejercicio.series || 0 }, (_, i) => i + 1).map((setNum) => (
            <TouchableOpacity
              key={setNum}
              style={[
                styles.setButton,
                {
                  backgroundColor: setsCompletados[ejercicio.id]?.[setNum]
                    ? colors.active
                    : colors.inactive,
                },
              ]}
              onPress={() => toggleSet(ejercicio.id, setNum)}
            >
              <Text style={{ color: colors.text }}>Set {setNum}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.botonReales}
          onPress={() => abrirModalDatosReales(ejercicio)}
        >
          <Ionicons name="create-outline" size={16} color={colors.text} />
          <Text style={styles.textoBotonReales}>
            {datosReales ? '✏️ Editar peso y reps' : '📝 Registrar peso y reps reales'}
          </Text>
        </TouchableOpacity>
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

  if (rutinaCompletada) {
    return (
      <View style={styles.container}>
        <View style={styles.completadaContainer}>
          <Ionicons name="checkmark-circle" size={80} color={colors.active} />
          <Text style={styles.completadaTitle}>🎉 Rutina Completada</Text>
          <Text style={styles.completadaText}>
            ¡Excelente trabajo! Tu rutina ha sido completada y guardada.
          </Text>
          <Text style={styles.completadaSubtext}>
            Tu coach ha sido notificado de tu progreso
          </Text>
          <TouchableOpacity 
            style={styles.botonNuevaRutina}
            onPress={() => {
              setRutinaCompletada(false);
              setSetsCompletados({});
              setRealesData({});
            }}
          >
            <Text style={styles.textoBotonNuevaRutina}>🔄 Nueva Rutina</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {rutina?.personalizada ? (
        <View style={styles.headerCompact}>
          <View style={styles.infoContainer}>
            <Text style={styles.coachText}>👤 Creada por: {rutina.coach}</Text>
            <Text style={styles.syncText}>
              📅 Ultima actualizacion: {new Date().toLocaleDateString()}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.headerCompact}>
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              {rutina?.message || 'Tu coach aun no te ha asignado una rutina personalizada.'}
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={rutina?.ejercicios || []}
        keyExtractor={(item, index) => {
          const key = item.id || `ej-${index}`;
          return key;
        }}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshing={refreshing} 
        onRefresh={onRefresh} 
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {rutina?.personalizada === false 
                ? '📝 No tienes rutina personalizada asignada' 
                : '❌ No hay ejercicios disponibles'
              }
            </Text>
            <Text style={styles.emptySubtext}>
              {rutina?.message || 'Contacta a tu coach para que te asigne una rutina personalizada.'}
            </Text>
          </View>
        }
      />

      {/* BOTÓN CORREGIDO - SIN DUPLICADOS */}
      {rutina?.ejercicios && rutina.ejercicios.length > 0 && (
        <TouchableOpacity 
          style={styles.botonCompletarRutina}
          onPress={() => setShowModalCompletar(true)}
        >
          <Text style={styles.textoBotonCompletarRutina}>✅ Completar Rutina</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={!!ejercicioEditando}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEjercicioEditando(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📊 Peso y Repeticiones Realizadas - {ejercicioEditando?.nombre}</Text>
            
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
                <Text style={styles.modalButtonTextCancel}>❌ Cancelar</Text>
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
                <Text style={styles.modalButtonTextSave}>💾 Guardar</Text>
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
            <Text style={styles.modalTitle}>✅ Completar Rutina</Text>
            <Text style={styles.modalText}>
              ¿Estás seguro de que quieres marcar esta rutina como completada?
            </Text>
            <Text style={styles.modalSubtext}>
              Se guardarán todos tus datos de progreso y tu coach será notificado.
            </Text>
            
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>💭 Nota general para tu coach:</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={notaGeneral}
                onChangeText={setNotaGeneral}
                placeholder="¿Cómo te sentiste en la rutina? ¿Alguna observación?"
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowModalCompletar(false)}
              >
                <Text style={styles.modalButtonTextCancel}>❌ Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={registrarSesionCompletada}
              >
                <Text style={styles.modalButtonTextConfirm}>✅ Si, Completar</Text>
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
    backgroundColor: colors.background,
  },
  completadaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  completadaTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.active,
    marginTop: 20,
    marginBottom: 10,
  },
  completadaText: {
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  completadaSubtext: {
    fontSize: 14,
    color: colors.placeholder,
    textAlign: 'center',
    marginBottom: 30,
  },
  botonNuevaRutina: {
    backgroundColor: colors.active,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  textoBotonNuevaRutina: {
    color: colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerCompact: {
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoContainer: {
  },
  coachText: {
    color: colors.active,
    fontSize: 16,
    fontWeight: '600',
  },
  syncText: {
    color: colors.placeholder,
    fontSize: 14,
    marginTop: 2,
  },
  infoText: {
    color: colors.text,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  cardCompletada: {
    borderLeftWidth: 4,
    borderLeftColor: colors.active,
  },
  grupoHeader: {
    backgroundColor: colors.active,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  grupoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 0,
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
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
  },
  realesContainer: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    padding: 8,
    borderRadius: 8,
    margin: 16,
    marginTop: 0,
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
    paddingHorizontal: 16,
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
    marginHorizontal: 16,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  textoBotonReales: {
    color: colors.text,
    fontSize: 12,
    marginLeft: 4,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.placeholder,
    textAlign: 'center',
    lineHeight: 20,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
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
          'Authorization': `Bearer ${userToken}`, // ✅ TOKEN REAL
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

  const toggleSet = async (ejercicioId, setNumber) => {
    const nuevosSets = { ...setsCompletados };
    if (!nuevosSets[ejercicioId]) nuevosSets[ejercicioId] = {};
    
    nuevosSets[ejercicioId][setNumber] = !nuevosSets[ejercicioId]?.[setNumber];
    setSetsCompletados(nuevosSets);

    try {
      await fetch(`${BASE_URL}/api/rutinas/completar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          semana: 'Rayostrenght',
          ejercicioId: ejercicioId,
          setsCompletados: nuevosSets[ejercicioId]
        }),
      });
    } catch (error) {
      console.error('Error guardando progreso:', error);
    }
  };

  const guardarNotas = async (ejercicioId, texto) => {
    const nuevasNotas = { ...notasCliente, [ejercicioId]: texto };
    setNotasCliente(nuevasNotas);

    
    try {
      await fetch(`${BASE_URL}/api/rutinas/notas`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          semana: 'Rayostrenght',
          ejercicioId: ejercicioId,
          notasCliente: texto
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
});
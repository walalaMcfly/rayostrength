import { Ionicons } from "@expo/vector-icons";
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


export default function RutinasScreen() {
  const router = useRouter();
  const [notasCliente, setNotasCliente] = useState({});
  const [setsCompletados, setSetsCompletados] = useState({});
  const [rutinas, setRutinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semanaActual] = useState("Semana1"); 

 
  useEffect(() => {
    cargarRutinas();
  }, []);

  const cargarRutinas = async () => {
    try {
      setLoading(true);
  
      const response = await fetch(`rayostrength-production.up.railway.app/api/rutinas/Rayostrenght`, {
        headers: {
          'Authorization': `Bearer ${"https://oauth2.googleapis.com/token"}`, // Tu token de autenticación
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        setRutinas(result.rutinas);
      } else {
        Alert.alert('Error', 'No se pudieron cargar las rutinas');
      }
    } catch (error) {
      console.error('Error cargando rutinas:', error);
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const toggleSet = async (ejercicioId, setNumber) => {
    const nuevosSets = { ...setsCompletados };
    if (!nuevosSets[ejercicioId]) nuevosSets[ejercicioId] = {};
    
    nuevosSets[ejercicioId][setNumber] = !nuevosSets[ejercicioId]?.[setNumber];
    setSetsCompletados(nuevosSets);

    // Guardar en Google Sheets
    try {
      await fetch('rayostrength-production.up.railway.app', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${"https://oauth2.googleapis.com/token"}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          semana: semanaActual,
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

    // Guardar en Google Sheets
    try {
      await fetch('rayostrength-production.up.railway.app', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${"https://oauth2.googleapis.com/token"}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          semana: semanaActual,
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
      />
    </View>
  );
}

// Agregar estos estilos
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
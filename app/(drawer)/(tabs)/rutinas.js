import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../../../constants/theme";

// 🔹 Mock de datos
const RUTINAS_DATA = [
  {
    id: "1",
    nombre: "Squat Jump",
    videoUrl: "https://www.youtube.com/watch?v=abc123",
    series: 3,
    reps: "6-8",
    tempo: "0-0-0",
    rir: 1,
    rpe: 7,
    peso: "40kg",
    notaCoach: "Debe ser explosivo al intentar subir.",
  },
  {
    id: "2",
    nombre: "Reverse Split BB",
    videoUrl: "https://www.youtube.com/watch?v=def456",
    series: 2,
    reps: "6-9",
    tempo: "4 seg",
    rir: 1,
    rpe: 9,
    peso: "barra",
    notaCoach: "Mantén la postura erguida.",
  },
];

export default function RutinasScreen() {
  const router = useRouter();
  const [notasCliente, setNotasCliente] = useState({});
  const [setsCompletados, setSetsCompletados] = useState({});

  const toggleSet = (ejercicioId, setNumber) => {
    setSetsCompletados((prev) => {
      const current = prev[ejercicioId] || {};
      return {
        ...prev,
        [ejercicioId]: {
          ...current,
          [setNumber]: !current[setNumber],
        },
      };
    });
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.exerciseName}>{item.nombre}</Text>

      <TouchableOpacity onPress={() => Linking.openURL(item.videoUrl)}>
        <View style={styles.row}>
          <Ionicons name="play-circle" size={20} color={colors.icon} />
          <Text style={styles.videoText}>Ver video</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.details}>
        Series {item.series} / Reps {item.reps} / Tempo {item.tempo} / RIR{" "}
        {item.rir} / RPE @{item.rpe} / Peso {item.peso}
      </Text>

      <View style={styles.setsRow}>
        {[1, 2, 3, 4].map((setNum) => (
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
          onChangeText={(text) =>
            setNotasCliente({ ...notasCliente, [item.id]: text })
          }
          style={styles.feedbackInput}
          multiline
        />
      </View>

      <View style={styles.feedbackBox}>
        <Text style={styles.feedbackLabel}>Nota Coach:</Text>
        <Text style={{ color: colors.text }}>{item.notaCoach}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={RUTINAS_DATA}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
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
});
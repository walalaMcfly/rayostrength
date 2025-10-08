import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";
import { colors } from "../../../constants/theme";

const screenWidth = Dimensions.get("window").width;

const wellnessQuestions = [
  "¿Cómo estuvo tu sueño?",
  "¿Cómo está tu energía?",
  "¿Cómo está tu motivación?",
  "¿Tienes dolores musculares?",
  "¿Estrés general?",
  "¿Cómo estuvo tu nutrición?",
  "¿Cómo estuvo tu hidratación?",
  "¿Cómo fue tu recuperación?",
];

export default function Progreso() {
  const router = useRouter();
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState("");

  const muscleGroups = [
    { name: "Pecho", population: 20, color: "#ff7f50", legendFontColor: colors.text, legendFontSize: 14 },
    { name: "Piernas", population: 35, color: "#87cefa", legendFontColor: colors.text, legendFontSize: 14 },
    { name: "Espalda", population: 25, color: "#32cd32", legendFontColor: colors.text, legendFontSize: 14 },
    { name: "Brazos", population: 20, color: "#9370db", legendFontColor: colors.text, legendFontSize: 14 },
  ];

  const performance = {
    labels: ["Semana 1", "Semana 2", "Semana 3", "Semana 4"],
    datasets: [{ data: [70, 75, 80, 78] }],
  };

  const handleAnswer = (index, value) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Progreso</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📊 Resumen</Text>
        <Text style={styles.subtitle}>Series por grupo muscular</Text>
        <PieChart
          data={muscleGroups}
          width={screenWidth - 64}
          height={220}
          chartConfig={chartConfig}
          accessor={"population"}
          backgroundColor={"transparent"}
          paddingLeft={"15"}
          absolute
        />
        <Text style={styles.subtitle}>Índice de rendimiento</Text>
        <BarChart
          data={performance}
          width={screenWidth - 64}
          height={220}
          chartConfig={chartConfig}
          style={{ borderRadius: 16 }}
          fromZero
          showValuesOnTopOfBars
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🧘 Wellness</Text>
        {wellnessQuestions.map((q, i) => (
          <View key={i} style={styles.questionBlock}>
            <Text style={styles.question}>{q}</Text>
            <View style={styles.answerRow}>
              {[1, 2, 3, 4, 5].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.answerButton,
                    answers[i] === val && { backgroundColor: colors.active },
                  ]}
                  onPress={() => handleAnswer(i, val)}
                >
                  <Text style={answers[i] === val ? styles.answerTextActive : styles.answerText}>
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <Text style={styles.subtitle}>Feedback libre</Text>
        <TextInput
          style={styles.feedbackBox}
          placeholder="Escribe tus comentarios..."
          placeholderTextColor={colors.placeholder}
          multiline
          value={feedback}
          onChangeText={setFeedback}
        />
      </View>
    </ScrollView>
  );
}

const chartConfig = {
  backgroundGradientFrom: colors.card,
  backgroundGradientTo: colors.card,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(255, 215, 0, ${opacity})`,
  labelColor: (opacity = 1) => colors.text,
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 10, color: colors.accent },
  subtitle: { fontSize: 16, fontWeight: "600", marginVertical: 12, color: colors.text },
  questionBlock: { marginBottom: 16 },
  question: { fontSize: 16, fontWeight: "600", marginBottom: 8, color: colors.text },
  answerRow: { flexDirection: "row", justifyContent: "space-between" },
  answerButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 8,
    width: 40,
    alignItems: "center",
  },
  answerText: { color: colors.text },
  answerTextActive: { color: colors.text, fontWeight: "bold" },
  feedbackBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    height: 100,
    textAlignVertical: "top",
    color: colors.text,
  },
});
import { StyleSheet, Text, View } from "react-native";

export default function Rutinas() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Aquí verás tus rutinas 🏋️</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 20, fontWeight: "bold" },
});

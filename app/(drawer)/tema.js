import { Text, View } from "react-native";

export default function Tema() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 20 }}>🎨 Pantalla de Tema</Text>
      <Text style={{ fontSize: 16, marginTop: 10, textAlign: 'center' }}>
        El cambio de tema se controla desde el switch en el menú desplegable
      </Text>
    </View>
  );
}
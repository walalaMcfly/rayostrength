import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function HomeLayout() {
  return (
    <Tabs screenOptions={{ tabBarStyle: { backgroundColor: "#111" }, tabBarActiveTintColor: "#c0b398ff" }}>
      <Tabs.Screen
        name="rutinas"
        options={{
          title: "Rutinas",
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="progreso"
        options={{
          title: "Progreso",
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

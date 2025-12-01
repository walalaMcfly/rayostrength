import { Stack } from 'expo-router';

export default function ClientsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#3B82F6',
        },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Gestión de Clientes' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle Cliente' }} />
      <Stack.Screen name="notes" options={{ title: 'Notas del cliente' }} />
    </Stack>
  );
}
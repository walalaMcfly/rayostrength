import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

export default function VerificarCuenta() {
  const [estado, setEstado] = useState('verificando');
  const [mensaje, setMensaje] = useState('');
  const router = useRouter();
  const params = useLocalSearchParams();
  const token = params.token;

  useEffect(() => {
    verificarToken();
  }, [token]);

  const verificarToken = async () => {
    try {
      const response = await fetch(`https://rayostrength-production.up.railway.app/api/auth/verificar?token=${token}`);
      const data = await response.json();

      if (response.ok) {
        setEstado('exito');
        setMensaje(data.message || 'Cuenta verificada exitosamente');
      } else {
        setEstado('error');
        setMensaje(data.message || data.error || 'Error al verificar la cuenta');
      }
    } catch (error) {
      setEstado('error');
      setMensaje('Error de conexión. Intenta nuevamente.');
    }
  };

  if (estado === 'verificando') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 20, fontSize: 16, textAlign: 'center' }}>
          Verificando tu cuenta...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
        {estado === 'exito' ? '¡Cuenta Verificada!' : 'Error de Verificación'}
      </Text>
      
      <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 30, lineHeight: 22 }}>
        {mensaje}
      </Text>

      <TouchableOpacity
        onPress={() => router.push('/')}
        style={{
          backgroundColor: '#007AFF',
          paddingHorizontal: 30,
          paddingVertical: 15,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
          Iniciar Sesión
        </Text>
      </TouchableOpacity>
    </View>
  );
}
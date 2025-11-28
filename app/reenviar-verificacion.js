import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ReenviarVerificacion() {
  const [email, setEmail] = useState('');
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  const handleReenviar = async () => {
    if (!email) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
      return;
    }

    setCargando(true);
    
    try {
      const response = await fetch('https://rayostrength-production.up.railway.app/api/auth/reenviar-verificacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Éxito', data.message || 'Email de verificación reenviado');
        router.push('/');
      } else {
        Alert.alert('Error', data.message || data.error || 'Error al reenviar verificación');
      }
    } catch (error) {
      Alert.alert('Error', 'Error de conexión. Intenta nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 }}>
        Reenviar Verificación
      </Text>
      
      <Text style={{ textAlign: 'center', marginBottom: 30, color: '#666' }}>
        Ingresa tu correo para reenviar el enlace de verificación
      </Text>

      <TextInput
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          padding: 15,
          borderRadius: 8,
          marginBottom: 20,
          backgroundColor: 'white',
        }}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TouchableOpacity
        onPress={handleReenviar}
        disabled={cargando}
        style={{
          backgroundColor: cargando ? '#ccc' : '#007AFF',
          padding: 15,
          borderRadius: 8,
          opacity: cargando ? 0.6 : 1,
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontSize: 16, fontWeight: '600' }}>
          {cargando ? 'Enviando...' : 'Reenviar Verificación'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        style={{ padding: 15, marginTop: 10 }}
      >
        <Text style={{ textAlign: 'center', color: '#007AFF' }}>
          Volver al Login
        </Text>
      </TouchableOpacity>
    </View>
  );
}
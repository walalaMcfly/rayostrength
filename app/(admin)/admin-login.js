import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const API_URL = 'https://rayostrength-production.up.railway.app/api';

export default function AdminLogin() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, contraseña: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error servidor');
      if (!data.success) throw new Error(data.message || 'Credenciales inválidas');

      if (data.user.role !== 'admin') {
        Alert.alert('Acceso denegado', 'Esta entrada es solo para administradores');
        return;
      }

      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      await AsyncStorage.setItem('userRole', data.user.role);
      router.replace('/(admin)');
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo conectar');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.loginBox}>
          <Text style={styles.title}>Login Administrador</Text>
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={v => handleChange('email', v)}
          />
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Contraseña"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
              value={form.password}
              onChangeText={v => handleChange('password', v)}
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={22} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  logo: { width: 150, height: 150, alignSelf: 'center', marginBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 30 },
  loginBox: { backgroundColor: '#2a2a2a', padding: 20, borderRadius: 10 },
  input: { backgroundColor: '#3a3a3a', color: 'white', padding: 15, borderRadius: 8, fontSize: 16, marginBottom: 15 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3a3a3a', borderRadius: 8, marginBottom: 15 },
  passwordInput: { flex: 1, color: 'white', padding: 15, fontSize: 16 },
  eyeButton: { padding: 15 },
  button: { backgroundColor: '#fdeb4db7', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { backgroundColor: '#6c757d' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

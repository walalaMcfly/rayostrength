import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { useState } from "react";
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
} from "react-native";

const API_URL = 'https://rayostrength-production.up.railway.app/api';

export default function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});



// Función de login modificada temporalmente
const login = async (email, password) => {
  try {
    let endpoint = '/api/auth/login';
    if (email === 'carlos.coach@rayostrength.com') {
      endpoint = '/api/auth/login-coach-temp';
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        contraseña: password
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Error en login');
    }

    return data;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
};

const handleLogin = async () => {
  try {
    if (!form.email || !form.password) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    console.log(' Iniciando login...');
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: form.email,
        contraseña: form.password
      }),
    });

    console.log('📨 Status de respuesta:', response.status);
    
    const data = await response.json();
    console.log('📨 Respuesta completa del login:', data);

    if (data.success) {
      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));


    if (data.success) {
  await AsyncStorage.setItem('userToken', data.token);
  await AsyncStorage.setItem('userData', JSON.stringify(data.user));
  await AsyncStorage.setItem('userRole', data.user.role); 
  
  console.log('✅ Login exitoso. Rol:', data.user.role);
  
  if (data.user.role === 'coach') {
    console.log('👨‍💼 Redirigiendo a área de coach');
    router.replace('/(coach)');
  } else {
    console.log('👤 Redirigiendo a área de cliente');
    router.replace('/(client)/(drawer)/(tabs)/rutinas'); 
  }
}
      
      console.log('Login exitoso. Rol:', data.user.role);
      if (data.user.role === 'coach') {
        console.log(' Redirigiendo a área de coach');
        router.replace('/(coach)');
      } else {
        console.log('👤 Redirigiendo a área de cliente');
        router.replace('/(drawer)/(tabs)/rutinas');
      }
    } else {
      Alert.alert("Error", data.message || "Credenciales incorrectas");
    }
  } catch (error) {
    console.error(' Error completo en login:', error);
    Alert.alert("Error", "No se pudo conectar al servidor: " + error.message);
  } finally {
    setLoading(false);
  }
};

  
  const handleChange = (name, value) => {
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Image 
          source={require("../assets/images/logo.png")} 
          style={styles.logo} 
          resizeMode="contain" 
        />

        <View style={styles.loginBox}>
          <Text style={styles.title}>Iniciar Sesión</Text>
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(value) => handleChange('email', value)}
          />

          <View style={styles.passwordContainer}>
            <TextInput
             style={styles.passwordInput}
                placeholder="Contraseña"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(value) => handleChange('password', value)}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                name={showPassword ? 'eye' : 'eye-off'}
                size={22}
                color="#9ca3af"
                  />
              </TouchableOpacity>
            </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿No tienes cuenta?</Text>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text style={styles.registerText}> Regístrate aquí</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 30,
  },
  loginBox: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#3a3a3a',
    color: 'white',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3a3a3a',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#fdeb4db7',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  passwordContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#3a3a3a',
  borderRadius: 8,
  marginBottom: 15,
  borderWidth: 1,
  borderColor: '#3a3a3a',
},
passwordInput: {
  flex: 1,
  color: 'white',
  padding: 15,
  fontSize: 16,
},
eyeButton: {
  padding: 15,
},
eyeIcon: {
  fontSize: 16,
  color: '#9ca3af',
},

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  registerText: {
    color: '#fdec4dff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
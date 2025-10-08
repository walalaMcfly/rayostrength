import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Text, TextInput, TouchableOpacity, View } from "react-native";

const API_URL = 'http://localhost:3000/api';

export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert("Error", "Username, email y contraseña son requeridos");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
          nombre: nombre || null,
          edad: edad ? parseInt(edad) : null
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Éxito", "Usuario registrado correctamente");
        router.push("/"); // Volver al login
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      console.error('Error registro:', error);
      Alert.alert("Error", "No se pudo conectar al servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image 
        source={require("../assets/images/logo.png")} 
        style={styles.logo} 
        resizeMode="contain" 
      />

      <View style={styles.registerBox}>
        <TextInput
          style={styles.input}
          placeholder="Nombre completo"
          placeholderTextColor="#9ca3af"
          value={nombre}
          onChangeText={setNombre}
        />

        <TextInput
          style={styles.input}
          placeholder="Nombre de usuario"
          placeholderTextColor="#9ca3af"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Edad"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={edad}
          onChangeText={setEdad}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Registrarse</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
        <TouchableOpacity onPress={() => router.push("/")}>
          <Text style={styles.loginText}> Inicia sesión aquí</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ... (tus estilos actuales)
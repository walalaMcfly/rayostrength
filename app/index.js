import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";


const API_URL = 'https://rayostrength-production.up.railway.app/api'; 

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email y contraseña son requeridos");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          contraseña: password 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert("Éxito", "¡Login exitoso!");
        console.log("Usuario logueado:", data.user);
        router.push("/(drawer)/(tabs)/rutinas");
      } else {
        Alert.alert("Error", data.message || "Credenciales incorrectas");
      }
    } catch (error) {
      console.log('Error de conexión:', error);
      Alert.alert("Error", "No se pudo conectar al servidor. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo arriba */}
      <Image 
        source={require("../assets/images/logo.png")} 
        style={styles.logo} 
        resizeMode="contain" 
      />

      {/* Caja rectangular para el login */}
      <View style={styles.loginBox}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
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

      {/* Footer con registro */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>¿No tienes tu cuenta creada?</Text>
        <TouchableOpacity onPress={() => router.push("/register")}>
          <Text style={styles.registerText}> Regístrate aquí</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 20, 
    backgroundColor: "#111111ff" 
  },
  logo: {
    width: 250,
    height: 100,
    marginBottom: 40,
  },
  loginBox: {
    width: "100%",
    backgroundColor: "#1e1e1e",
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  input: { 
    width: "100%", 
    backgroundColor: "#424040ff", 
    padding: 12, 
    borderRadius: 10, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: "#333", 
    color: "#fff" 
  },
  button: { 
    backgroundColor: "#6e7275ff", 
    padding: 15, 
    borderRadius: 10, 
    width: "100%", 
    alignItems: "center", 
    marginTop: 10 
  },
  buttonDisabled: {
    backgroundColor: "#4a4a4a",
  },
  buttonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "bold" 
  },
  footer: { 
    flexDirection: "row", 
    marginTop: 30 
  },
  footerText: { 
    color: "#9ca3af" 
  },
  registerText: { 
    color: "#c0b398ff", 
    fontWeight: "bold" 
  }
});
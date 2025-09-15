// app/login.js
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

// Import directo del logo
import Logo from "../assets/images/logo.png";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (username === "admin" && password === "1234") {
      router.push("/home"); 
    } else {
      Alert.alert("Error", "Usuario o contraseña incorrectos");
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo arriba */}
      <Image source={Logo} style={styles.logo} resizeMode="contain" />

      {/* Caja rectangular para el login */}
      <View style={styles.loginBox}>
        <TextInput
          style={styles.input}
          placeholder="Usuario"
          placeholderTextColor="#9ca3af"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Footer con registro */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>¿No tienes tu cuenta creada?</Text>
        <TouchableOpacity onPress={() => Alert.alert("Registro", "Función en construcción 🚧")}>
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
    backgroundColor: "#1e1e1e",   // color del rectángulo
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5, // para Android
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

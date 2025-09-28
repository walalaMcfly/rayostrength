import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = () => {
    if (!username || !email || !password) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    // // 🚧 Aquí luego puedes conectar con backend o Firebase
    // Alert.alert("Éxito", "Usuario registrado con éxito 🚀");
    // router.push("/login"); // vuelve al login después del registro
  };

  return (
    <View style={styles.container}>
      {/* Logo arriba */}
      <Image 
        source={require("../assets/images/logo.png")} 
        style={styles.logo} 
        resizeMode="contain" 
      />

      {/* Caja rectangular para el registro */}
      <View style={styles.registerBox}>
        <TextInput
          style={styles.input}
          placeholder="Nombre de usuario"
          placeholderTextColor="#9ca3af"
          value={username}
          onChangeText={setUsername}
        />

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Registrarse</Text>
        </TouchableOpacity>
      </View>

      {/* Footer con volver al login */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
        <TouchableOpacity onPress={() => router.push("/")}>
          <Text style={styles.loginText}> Inicia sesión aquí</Text>
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
  registerBox: {
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
  loginText: { 
    color: "#c0b398ff", 
    fontWeight: "bold" 
  }
});

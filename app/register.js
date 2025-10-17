import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Text, TextInput, TouchableOpacity, View } from "react-native";

const API_URL = 'http://192.168.1.2:3000/api';

export default function Register() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [sexo, setSexo] = useState("");
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validaciones actualizadas
    if (!nombre || !apellido || !email || !password || !fechaNacimiento || !sexo) {
      Alert.alert("Error", "Nombre, apellido, email, contraseña, fecha de nacimiento y sexo son requeridos");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres");
      return;
    }

    // Validar formato de fecha (YYYY-MM-DD)
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaRegex.test(fechaNacimiento)) {
      Alert.alert("Error", "La fecha debe tener el formato YYYY-MM-DD (ej: 1990-05-15)");
      return;
    }

    // Validar sexo
    const sexosValidos = ['M', 'F', 'Otro'];
    if (!sexosValidos.includes(sexo)) {
      Alert.alert("Error", "Sexo debe ser: M, F u Otro");
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
          nombre,
          apellido,
          email,
          contraseña: password,
          fecha_nacimiento: fechaNacimiento,
          sexo,
          peso_actual: peso ? parseFloat(peso) : null,
          altura: altura ? parseFloat(altura) : null
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
          placeholder="Nombre"
          placeholderTextColor="#9ca3af"
          value={nombre}
          onChangeText={setNombre}
        />

        <TextInput
          style={styles.input}
          placeholder="Apellido"
          placeholderTextColor="#9ca3af"
          value={apellido}
          onChangeText={setApellido}
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
          placeholder="Contraseña"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TextInput
          style={styles.input}
          placeholder="Fecha nacimiento (YYYY-MM-DD)"
          placeholderTextColor="#9ca3af"
          value={fechaNacimiento}
          onChangeText={setFechaNacimiento}
        />

        <TextInput
          style={styles.input}
          placeholder="Sexo (M, F, Otro)"
          placeholderTextColor="#9ca3af"
          value={sexo}
          onChangeText={setSexo}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Peso (kg)"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={peso}
          onChangeText={setPeso}
        />

        <TextInput
          style={styles.input}
          placeholder="Altura (cm)"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={altura}
          onChangeText={setAltura}
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

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 40,
  },
  registerBox: {
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
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  loginText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: 'bold',
  },
};
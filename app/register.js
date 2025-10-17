import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

const API_URL = 'https://rayostrength-production.up.railway.app/api';

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    fecha_nacimiento: "",
    sexo: "",
    peso: "",
    altura: ""
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Validaciones en tiempo real
  const validateField = (name, value) => {
    switch (name) {
      case "nombre":
      case "apellido":
        if (!value) return "Este campo es requerido";
        if (value.length < 2) return "Mínimo 2 caracteres";
        return "";
      
      case "email":
        if (!value) return "Email requerido";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Email inválido";
        return "";
      
      case "password":
        if (!value) return "Contraseña requerida";
        if (value.length < 8) return "Mínimo 8 caracteres";
        return "";
      
      case "fecha_nacimiento":
        if (!value) return "Fecha requerida";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Formato: YYYY-MM-DD";
        
        // Validar que sea una fecha válida y mayor de 16 años
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age < 16) return "Debes ser mayor de 16 años";
        if (birthDate > today) return "Fecha no puede ser futura";
        return "";
      
      case "sexo":
        if (!value) return "Selecciona tu sexo";
        return "";
      
      case "peso":
        if (value && (parseFloat(value) < 20 || parseFloat(value) > 300)) 
          return "Peso debe ser entre 20-300 kg";
        return "";
      
      case "altura":
        if (value && (parseFloat(value) < 100 || parseFloat(value) > 250)) 
          return "Altura debe ser entre 100-250 cm";
        return "";
      
      default:
        return "";
    }
  };

  // Calcular fortaleza de contraseña
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;
    return strength;
  };

  // Manejar cambios en los campos
  const handleChange = (name, value) => {
    let formattedValue = value;

    // Formato automático para fecha (YYYY-MM-DD)
    if (name === "fecha_nacimiento") {
      // Solo números y guiones
      formattedValue = value.replace(/[^\d-]/g, '');
      
      // Auto-insertar guiones
      if (formattedValue.length === 4 && !formattedValue.includes('-')) {
        formattedValue = formattedValue + '-';
      } else if (formattedValue.length === 7 && formattedValue.split('-').length === 2) {
        formattedValue = formattedValue + '-';
      }
      
      // Limitar longitud
      if (formattedValue.length > 10) {
        formattedValue = formattedValue.slice(0, 10);
      }
    }

    // Formato automático para altura (solo números y punto)
    if (name === "altura") {
      formattedValue = value.replace(/[^\d.]/g, '');
      
      // Solo un punto decimal
      const parts = formattedValue.split('.');
      if (parts.length > 2) {
        formattedValue = parts[0] + '.' + parts.slice(1).join('');
      }
      
      // Limitar decimales
      if (parts.length === 2 && parts[1].length > 1) {
        formattedValue = parts[0] + '.' + parts[1].slice(0, 1);
      }
    }

    // Formato automático para peso (solo números y punto)
    if (name === "peso") {
      formattedValue = value.replace(/[^\d.]/g, '');
      
      // Solo un punto decimal
      const parts = formattedValue.split('.');
      if (parts.length > 2) {
        formattedValue = parts[0] + '.' + parts.slice(1).join('');
      }
    }

    setForm(prev => ({ ...prev, [name]: formattedValue }));

    // Validar en tiempo real
    if (touched[name]) {
      const error = validateField(name, formattedValue);
      setErrors(prev => ({ ...prev, [name]: error }));
    }

    // Calcular fortaleza de contraseña
    if (name === "password") {
      setPasswordStrength(calculatePasswordStrength(formattedValue));
    }
  };

  // Manejar blur (cuando el usuario sale del campo)
  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, form[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  // Verificar si el formulario es válido
  const isFormValid = () => {
    const requiredFields = ['nombre', 'apellido', 'email', 'password', 'fecha_nacimiento', 'sexo'];
    return requiredFields.every(field => !validateField(field, form[field])) && 
           Object.values(errors).every(error => !error);
  };

  // Obtener color de fortaleza de contraseña
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 50) return '#ff4444';
    if (passwordStrength < 75) return '#ffaa00';
    return '#00c851';
  };

  // Obtener texto de fortaleza de contraseña
  const getPasswordStrengthText = () => {
    if (passwordStrength < 50) return 'Débil';
    if (passwordStrength < 75) return 'Media';
    return 'Fuerte';
  };

  const handleRegister = async () => {
    // Marcar todos los campos como tocados para mostrar errores
    const allTouched = {};
    Object.keys(form).forEach(key => { allTouched[key] = true; });
    setTouched(allTouched);

    // Validar todos los campos
    const newErrors = {};
    Object.keys(form).forEach(key => {
      newErrors[key] = validateField(key, form[key]);
    });
    setErrors(newErrors);

    if (!isFormValid()) {
      Alert.alert("Error", "Por favor corrige los errores en el formulario");
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
          nombre: form.nombre,
          apellido: form.apellido,
          email: form.email,
          contraseña: form.password,
          fecha_nacimiento: form.fecha_nacimiento,
          sexo: form.sexo,
          peso_actual: form.peso ? parseFloat(form.peso) : null,
          altura: form.altura ? parseFloat(form.altura) : null
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("¡Éxito!", "Cuenta creada correctamente");
        router.push("/");
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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Image 
          source={require("../assets/images/logo.png")} 
          style={styles.logo} 
          resizeMode="contain" 
        />

        <View style={styles.registerBox}>
          {/* Nombre */}
          <View style={styles.fieldContainer}>
            <TextInput
              style={[
                styles.input, 
                touched.nombre && errors.nombre ? styles.inputError : styles.inputSuccess,
                touched.nombre && !errors.nombre && styles.inputSuccess
              ]}
              placeholder="Nombre *"
              placeholderTextColor="#9ca3af"
              value={form.nombre}
              onChangeText={(value) => handleChange('nombre', value)}
              onBlur={() => handleBlur('nombre')}
            />
            {touched.nombre && errors.nombre ? (
              <Text style={styles.errorText}>{errors.nombre}</Text>
            ) : touched.nombre && !errors.nombre ? (
              <Text style={styles.successText}>✓ Válido</Text>
            ) : null}
          </View>

          {/* Apellido */}
          <View style={styles.fieldContainer}>
            <TextInput
              style={[
                styles.input, 
                touched.apellido && errors.apellido ? styles.inputError : styles.inputSuccess,
                touched.apellido && !errors.apellido && styles.inputSuccess
              ]}
              placeholder="Apellido *"
              placeholderTextColor="#9ca3af"
              value={form.apellido}
              onChangeText={(value) => handleChange('apellido', value)}
              onBlur={() => handleBlur('apellido')}
            />
            {touched.apellido && errors.apellido && (
              <Text style={styles.errorText}>{errors.apellido}</Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.fieldContainer}>
            <TextInput
              style={[
                styles.input, 
                touched.email && errors.email ? styles.inputError : styles.inputSuccess,
                touched.email && !errors.email && styles.inputSuccess
              ]}
              placeholder="Email *"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(value) => handleChange('email', value)}
              onBlur={() => handleBlur('email')}
            />
            {touched.email && errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* Contraseña con indicador de fortaleza */}
          <View style={styles.fieldContainer}>
            <TextInput
              style={[
                styles.input, 
                touched.password && errors.password ? styles.inputError : styles.inputSuccess,
                touched.password && !errors.password && styles.inputSuccess
              ]}
              placeholder="Contraseña * (mín. 8 caracteres, mayúsculas, números)"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={form.password}
              onChangeText={(value) => handleChange('password', value)}
              onBlur={() => handleBlur('password')}
            />
            
            {form.password.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <View style={styles.passwordStrengthBar}>
                  <View 
                    style={[
                      styles.passwordStrengthFill,
                      { 
                        width: `${passwordStrength}%`,
                        backgroundColor: getPasswordStrengthColor()
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.passwordStrengthText, { color: getPasswordStrengthColor() }]}>
                  Fortaleza: {getPasswordStrengthText()}
                </Text>
              </View>
            )}
            
            {touched.password && errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {/* Fecha de Nacimiento */}
          <View style={styles.fieldContainer}>
            <TextInput
              style={[
                styles.input, 
                touched.fecha_nacimiento && errors.fecha_nacimiento ? styles.inputError : styles.inputSuccess,
                touched.fecha_nacimiento && !errors.fecha_nacimiento && styles.inputSuccess
              ]}
              placeholder="Fecha de nacimiento * (YYYY-MM-DD)"
              placeholderTextColor="#9ca3af"
              keyboardType="numbers-and-punctuation"
              value={form.fecha_nacimiento}
              onChangeText={(value) => handleChange('fecha_nacimiento', value)}
              onBlur={() => handleBlur('fecha_nacimiento')}
            />
            {touched.fecha_nacimiento && errors.fecha_nacimiento && (
              <Text style={styles.errorText}>{errors.fecha_nacimiento}</Text>
            )}
          </View>

          {/* Sexo */}
          <View style={styles.fieldContainer}>
            <TextInput
              style={[
                styles.input, 
                touched.sexo && errors.sexo ? styles.inputError : styles.inputSuccess,
                touched.sexo && !errors.sexo && styles.inputSuccess
              ]}
              placeholder="Sexo * (M, F, Otro)"
              placeholderTextColor="#9ca3af"
              value={form.sexo}
              onChangeText={(value) => handleChange('sexo', value)}
              onBlur={() => handleBlur('sexo')}
            />
            {touched.sexo && errors.sexo && (
              <Text style={styles.errorText}>{errors.sexo}</Text>
            )}
          </View>

          {/* Peso */}
          <View style={styles.fieldContainer}>
            <TextInput
              style={[
                styles.input, 
                touched.peso && errors.peso ? styles.inputError : styles.inputSuccess
              ]}
              placeholder="Peso (kg) - Opcional"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={form.peso}
              onChangeText={(value) => handleChange('peso', value)}
              onBlur={() => handleBlur('peso')}
            />
            {touched.peso && errors.peso && (
              <Text style={styles.errorText}>{errors.peso}</Text>
            )}
          </View>

          {/* Altura */}
          <View style={styles.fieldContainer}>
            <TextInput
              style={[
                styles.input, 
                touched.altura && errors.altura ? styles.inputError : styles.inputSuccess
              ]}
              placeholder="Altura (cm) - Opcional"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={form.altura}
              onChangeText={(value) => handleChange('altura', value)}
              onBlur={() => handleBlur('altura')}
            />
            {touched.altura && errors.altura && (
              <Text style={styles.errorText}>{errors.altura}</Text>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.button, (!isFormValid() || loading) && styles.buttonDisabled]} 
            onPress={handleRegister}
            disabled={!isFormValid() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isFormValid() ? "Registrarse" : "Completa el formulario"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
          <TouchableOpacity onPress={() => router.push("/")}>
            <Text style={styles.loginText}> Inicia sesión aquí</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollContainer: {
    padding: 20,
    justifyContent: 'center',
    flexGrow: 1,
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
  fieldContainer: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#3a3a3a',
    color: 'white',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  inputSuccess: {
    borderColor: '#00c851',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 5,
  },
  successText: {
    color: '#00c851',
    fontSize: 12,
    marginTop: 5,
  },
  passwordStrengthContainer: {
    marginTop: 8,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: '#3a3a3a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#007bff',
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
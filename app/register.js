import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
    confirmPassword: "",
    edad: "",
    sexo: "",
    peso: "",
    altura: ""
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const [showSexModal, setShowSexModal] = useState(false);


  const validateField = (name, value) => {
    switch (name) {
      case "nombre":
      case "apellido":
        if (!value) return "Este campo es requerido";
        if (value.length < 2) return "Mínimo 2 caracteres";
        return "";
      
      case "email":
        if (!value) return "Correo requerido";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Correo inválido";
        return "";
      
      case "password":
        if (!value) return "Contraseña requerida";
        if (value.length < 8) return "Mínimo 8 caracteres";
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) 
          return "Debe incluir mayúsculas, minúsculas y números";
        return "";
      
      case "confirmPassword":
        if (!value) return "Confirma tu contraseña";
        if (value !== form.password) return "Las contraseñas no coinciden";
        return "";
      
      case "edad":
        if (!value) return "Edad requerida";
        return "";
      
      case "sexo":
        if (!value) return "Selecciona tu sexo";
        return "";
      
      case "peso":
        if (!value) return "Peso requerido para seguimiento físico";
        if (parseFloat(value) < 20 || parseFloat(value) > 300) 
          return "Peso debe ser entre 20-300 kg";
        return "";
      
      case "altura":
        if (!value) return "Altura requerida para seguimiento físico";
        if (parseFloat(value) < 100 || parseFloat(value) > 250) 
          return "Altura debe ser entre 100-250 cm";
        return "";
      
      default:
        return "";
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;
    return strength;
  };

  
  const handleChange = (name, value) => {
    let formattedValue = value;
    if (name === "peso") {
      formattedValue = value.replace(/[^\d.]/g, '');
      const parts = formattedValue.split('.');
      if (parts.length > 2) {
        formattedValue = parts[0] + '.' + parts.slice(1).join('');
      }
    }
 
    if (name === "altura") {
      formattedValue = value.replace(/[^\d.]/g, '');
      const parts = formattedValue.split('.');
      if (parts.length > 2) {
        formattedValue = parts[0] + '.' + parts.slice(1).join('');
      }
    }

    if (name === "edad") {
      formattedValue = value.replace(/[^0-9]/g, '');
    }

    setForm(prev => ({ ...prev, [name]: formattedValue }));

    if (touched[name]) {
      const error = validateField(name, formattedValue);
      setErrors(prev => ({ ...prev, [name]: error }));
    }

    if (name === "password" && touched.confirmPassword) {
      const confirmError = validateField("confirmPassword", form.confirmPassword);
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
    if (name === "password") {
      setPasswordStrength(calculatePasswordStrength(formattedValue));
    }
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, form[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };


  const handleSexSelect = (sex) => {
    handleChange('sexo', sex);
    setShowSexModal(false);
  };

  const isFormValid = () => {
    const requiredFields = ['nombre', 'apellido', 'email', 'password', 'confirmPassword', 'edad', 'sexo', 'peso', 'altura'];
    return requiredFields.every(field => !validateField(field, form[field])) && 
           Object.values(errors).every(error => !error);
  };
 
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 50) return '#ff4444';
    if (passwordStrength < 75) return '#ffaa00';
    return '#00c851';
  };
 
  const getPasswordStrengthText = () => {
    if (passwordStrength < 50) return 'Débil';
    if (passwordStrength < 75) return 'Media';
    return 'Fuerte';
  };

  const getSexText = (sex) => {
    switch(sex) {
      case 'M': return 'Masculino';
      case 'F': return 'Femenino';
      case 'Otro': return 'Otro';
      default: return 'Seleccionar sexo *';
    }
  };

  const passwordsMatch = () => {
    return form.password === form.confirmPassword && form.confirmPassword.length > 0;
  };

  const handleRegister = async () => {
    const allTouched = {};
    Object.keys(form).forEach(key => { allTouched[key] = true; });
    setTouched(allTouched);

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
          edad: parseInt(form.edad),
          sexo: form.sexo,
          peso_actual: parseFloat(form.peso),
          altura: parseFloat(form.altura)
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiereVerificacion) {
          Alert.alert(
            'Registro Exitoso',
            'Te hemos enviado un email de verificación. Por favor revisa tu bandeja de entrada.',
            [
              {
                text: 'OK',
                onPress: () => router.push('/')
              }
            ]
          );
        } else {
          await AsyncStorage.setItem('userToken', data.token);
          await AsyncStorage.setItem('userRole', 'user');
          router.replace('/(drawer)/(tabs)');
        }
      } else {
        Alert.alert('Error', data.message);
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
              placeholder="Correo *"
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

          {/* Contraseña */}
          <View style={styles.fieldContainer}>
            <TextInput
              style={[
                styles.input, 
                touched.password && errors.password ? styles.inputError : styles.inputSuccess,
                touched.password && !errors.password && styles.inputSuccess
              ]}
              placeholder="Contraseña *"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={form.password}
              onChangeText={(value) => handleChange('password', value)}
              onBlur={() => handleBlur('password')}
            />
            
            {/* Texto de ayuda siempre visible */}
            <Text style={styles.helpText}>
              Mín. 8 caracteres, con mayúsculas, minúsculas y números
            </Text>
            
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

          {/* Confirmar Contraseña */}
          <View style={styles.fieldContainer}>
            <TextInput
              style={[
                styles.input, 
                touched.confirmPassword && errors.confirmPassword ? styles.inputError : styles.inputSuccess,
                touched.confirmPassword && passwordsMatch() && styles.inputSuccess
              ]}
              placeholder="Confirmar contraseña *"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={form.confirmPassword}
              onChangeText={(value) => handleChange('confirmPassword', value)}
              onBlur={() => handleBlur('confirmPassword')}
            />
            
            {touched.confirmPassword && errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}
            
            {touched.confirmPassword && passwordsMatch() && (
              <Text style={styles.successText}>✓ Las contraseñas coinciden</Text>
            )}
          </View>

          {/* Edad */}
          <View style={styles.fieldContainer}>
            <TextInput
              style={[
                styles.input, 
                touched.edad && errors.edad ? styles.inputError : styles.inputSuccess,
                touched.edad && !errors.edad && styles.inputSuccess
              ]}
              placeholder="Edad * "
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={form.edad}
              onChangeText={(value) => handleChange('edad', value)}
              onBlur={() => handleBlur('edad')}
              maxLength={3}
            />
            {touched.edad && errors.edad && (
              <Text style={styles.errorText}>{errors.edad}</Text>
            )}
          </View>

          {/* Selector de Sexo */}
          <View style={styles.fieldContainer}>
            <TouchableOpacity 
              style={[
                styles.input, 
                styles.sexInput,
                touched.sexo && errors.sexo ? styles.inputError : styles.inputSuccess,
                touched.sexo && !errors.sexo && styles.inputSuccess
              ]}
              onPress={() => setShowSexModal(true)}
            >
              <Text style={form.sexo ? styles.sexText : styles.placeholderText}>
                {getSexText(form.sexo)}
              </Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>
            {touched.sexo && errors.sexo && (
              <Text style={styles.errorText}>{errors.sexo}</Text>
            )}
          </View>

          {/* Peso */}
          <View style={styles.fieldContainer}>
            <TextInput
              style={[
                styles.input, 
                touched.peso && errors.peso ? styles.inputError : styles.inputSuccess,
                touched.peso && !errors.peso && styles.inputSuccess
              ]}
              placeholder="Peso * (kg)"
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
                touched.altura && errors.altura ? styles.inputError : styles.inputSuccess,
                touched.altura && !errors.altura && styles.inputSuccess
              ]}
              placeholder="Altura * (cm)"
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
                {isFormValid() ? "Crear Cuenta" : "Completa todos los campos"}
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

        {/* Modal para selección de sexo */}
        <Modal
          visible={showSexModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSexModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowSexModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Selecciona tu sexo</Text>
                  
                  <TouchableOpacity 
                    style={styles.sexOption}
                    onPress={() => handleSexSelect('M')}
                  >
                    <Text style={styles.sexOptionText}>Masculino</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.sexOption}
                    onPress={() => handleSexSelect('F')}
                  >
                    <Text style={styles.sexOptionText}>Femenino</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.sexOption}
                    onPress={() => handleSexSelect('Otro')}
                  >
                    <Text style={styles.sexOptionText}>Otro</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.modalCancel}
                    onPress={() => setShowSexModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
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
  sexInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sexText: {
    color: 'white',
    fontSize: 16,
  },
  placeholderText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  helpText: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 5,
    fontStyle: 'italic',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#9ca3af',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  inputSuccess: {
    borderColor: '#fcde7cff',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  sexOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  sexOptionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  modalCancel: {
    padding: 15,
    marginTop: 10,
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
  },
  modalCancelText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
  },
};
import DateTimePicker from '@react-native-community/datetimepicker';
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
    fecha_nacimiento: "",
    sexo: "",
    peso: "",
    altura: ""
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showSexModal, setShowSexModal] = useState(false);

  // Función para formatear fecha a DD/MM/YYYY
  const formatDateToDMY = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Función para convertir DD/MM/YYYY a YYYY-MM-DD
  const formatDateToYMD = (dateString) => {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
  };

  // Validaciones en tiempo real
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
      
      case "fecha_nacimiento":
        if (!value) return "Fecha requerida";
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return "Formato: DD/MM/YYYY";
        
        const parts = value.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const birthDate = new Date(year, month, day);
        
        if (isNaN(birthDate.getTime())) return "Fecha inválida";
        
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        if (age < 16) return "Debes ser mayor de 16 años";
        if (birthDate > today) return "Fecha no puede ser futura";
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

    if (name === "fecha_nacimiento") {
      formattedValue = value.replace(/[^\d/]/g, '');
      
      if (formattedValue.length === 2 && !formattedValue.includes('/')) {
        formattedValue = formattedValue + '/';
      } else if (formattedValue.length === 5 && formattedValue.split('/').length === 2) {
        formattedValue = formattedValue + '/';
      }
      
      if (formattedValue.length > 10) {
        formattedValue = formattedValue.slice(0, 10);
      }
    }

    if (name === "peso" || name === "altura") {
      formattedValue = value.replace(/[^\d.]/g, '');
      
      const parts = formattedValue.split('.');
      if (parts.length > 2) {
        formattedValue = parts[0] + '.' + parts.slice(1).join('');
      }
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

  // Manejar blur
  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, form[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  // Manejar selección de fecha
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      const formattedDate = formatDateToDMY(selectedDate);
      handleChange('fecha_nacimiento', formattedDate);
    }
  };

  // Manejar selección de sexo
  const handleSexSelect = (sex) => {
    handleChange('sexo', sex);
    setShowSexModal(false);
  };

  // Verificar si el formulario es válido
  const isFormValid = () => {
    const requiredFields = ['nombre', 'apellido', 'email', 'password', 'confirmPassword', 'fecha_nacimiento', 'sexo', 'peso', 'altura'];
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

  // Obtener texto amigable para sexo
  const getSexText = (sex) => {
    switch(sex) {
      case 'M': return 'Masculino';
      case 'F': return 'Femenino';
      case 'Otro': return 'Otro';
      default: return 'Seleccionar sexo *';
    }
  };

  // Verificar si las contraseñas coinciden
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
      const fechaParaBD = formatDateToYMD(form.fecha_nacimiento);

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
          fecha_nacimiento: fechaParaBD,
          sexo: form.sexo,
          peso_actual: parseFloat(form.peso),
          altura: parseFloat(form.altura)
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("¡Éxito!", "Su cuenta fue creada correctamente");
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
              placeholder="Apellidos *"
              placeholderTextColor="#9ca3af"
              value={form.apellido}
              onChangeText={(value) => handleChange('apellido', value)}
              onBlur={() => handleBlur('apellido')}
            />
            {touched.apellido && errors.apellido && (
              <Text style={styles.errorText}>{errors.apellido}</Text>
            )}
          </View>

          {/* Correo */}
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

          {/* Fecha de Nacimiento */}
          <View style={styles.fieldContainer}>
            <TouchableOpacity 
              style={[
                styles.input, 
                styles.dateInput,
                touched.fecha_nacimiento && errors.fecha_nacimiento ? styles.inputError : styles.inputSuccess,
                touched.fecha_nacimiento && !errors.fecha_nacimiento && styles.inputSuccess
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={form.fecha_nacimiento ? styles.dateText : styles.placeholderText}>
                {form.fecha_nacimiento || "Fecha de nacimiento * "}
              </Text>
              <Text style={styles.calendarIcon}>📅</Text>
            </TouchableOpacity>
            {touched.fecha_nacimiento && errors.fecha_nacimiento && (
              <Text style={styles.errorText}>{errors.fecha_nacimiento}</Text>
            )}
            
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
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
  // NUEVO estilo para texto de ayuda
  helpText: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 5,
    fontStyle: 'italic',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sexInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    color: 'white',
    fontSize: 16,
  },
  sexText: {
    color: 'white',
    fontSize: 16,
  },
  placeholderText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  calendarIcon: {
    fontSize: 18,
    color: '#9ca3af',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#9ca3af',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  inputSuccess: {
    borderColor: '#d8bb18ff',
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
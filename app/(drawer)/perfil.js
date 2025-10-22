import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { colors } from "../../constants/theme";

const API_URL = 'https://rayostrength-production.up.railway.app/api';

export default function Perfil() {
  const [userData, setUserData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    edad: "",
    sexo: "",
    peso_actual: "",
    altura: ""
  });
  
  const [originalData, setOriginalData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showSexModal, setShowSexModal] = useState(false);
  const [errors, setErrors] = useState({});

  // Cargar datos del perfil cuando la pantalla se enfoca
  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
    }, [])
  );

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      console.log('🔄 Cargando perfil...');
      
      if (!token) {
        Alert.alert("Error", "No se encontró token de autenticación");
        return;
      }

      const response = await fetch(`${API_URL}/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Status de respuesta:', response.status);

      const data = await response.json();
      console.log('📨 Datos del servidor:', data);

      if (data.success) {
        const user = data.user;
        const formattedData = {
          nombre: user.nombre || "",
          apellido: user.apellido || "",
          email: user.email || "",
          edad: user.edad ? user.edad.toString() : "",
          sexo: user.sexo || "",
          peso_actual: user.peso_actual ? user.peso_actual.toString() : "",
          altura: user.altura ? user.altura.toString() : ""
        };
        
        console.log('📝 Datos formateados:', formattedData);
        
        setUserData(formattedData);
        setOriginalData(formattedData);
      } else {
        Alert.alert("Error", data.message || "No se pudieron cargar los datos del perfil");
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      Alert.alert("Error", "No se pudo conectar al servidor");
    } finally {
      setLoading(false);
    }
  };

  const validateField = (name, value) => {
    switch (name) {
      case "nombre":
      case "apellido":
        if (!value) return "Este campo es requerido";
        if (value.length < 2) return "Mínimo 2 caracteres";
        return "";
      
      case "edad":
        if (!value) return "Edad requerida";
        const edad = parseInt(value);
        if (edad < 13 || edad > 100) return "Edad debe estar entre 13-100 años";
        return "";
      
      case "peso_actual":
        if (value && (parseFloat(value) < 20 || parseFloat(value) > 300)) {
          return "Peso debe ser entre 20-300 kg";
        }
        return "";
      
      case "altura":
        if (value && (parseFloat(value) < 100 || parseFloat(value) > 250)) {
          return "Altura debe ser entre 100-250 cm";
        }
        return "";
      
      default:
        return "";
    }
  };

  const handleChange = (name, value) => {
    let formattedValue = value;

    // Formato para campos numéricos
    if (name === "peso_actual" || name === "altura") {
      formattedValue = value.replace(/[^\d.]/g, '');
      const parts = formattedValue.split('.');
      if (parts.length > 2) {
        formattedValue = parts[0] + '.' + parts.slice(1).join('');
      }
    }

    if (name === "edad") {
      formattedValue = value.replace(/[^0-9]/g, '');
    }

    setUserData(prev => ({ ...prev, [name]: formattedValue }));

    // Validar en tiempo real si estamos editando
    if (editing) {
      const error = validateField(name, formattedValue);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleSexSelect = (sex) => {
    handleChange('sexo', sex);
    setShowSexModal(false);
  };

  const getSexText = (sex) => {
    switch(sex) {
      case 'M': return 'Masculino';
      case 'F': return 'Femenino';
      case 'Otro': return 'Otro';
      default: return 'No especificado';
    }
  };

  const startEditing = () => {
    setEditing(true);
    setErrors({});
  };

  const cancelEditing = () => {
    setUserData(originalData);
    setEditing(false);
    setErrors({});
  };

  const saveProfile = async () => {
    // Validar todos los campos
    const newErrors = {};
    Object.keys(userData).forEach(key => {
      if (key !== 'email') { // El email no se puede editar
        newErrors[key] = validateField(key, userData[key]);
      }
    });
    setErrors(newErrors);

    // Verificar si hay errores
    const hasErrors = Object.values(newErrors).some(error => error !== "");
    if (hasErrors) {
      Alert.alert("Error", "Por favor corrige los errores en el formulario");
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(`${API_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: userData.nombre,
          apellido: userData.apellido,
          edad: parseInt(userData.edad),
          sexo: userData.sexo,
          peso_actual: userData.peso_actual ? parseFloat(userData.peso_actual) : null,
          altura: userData.altura ? parseFloat(userData.altura) : null
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("¡Éxito!", "Perfil actualizado correctamente");
        setOriginalData(userData);
        setEditing(false);
        // Recargar datos para asegurar sincronización
        await loadUserProfile();
      } else {
        Alert.alert("Error", data.message || "No se pudo actualizar el perfil");
      }
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      Alert.alert("Error", "No se pudo conectar al servidor");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Perfil</Text>
        {!editing ? (
          <TouchableOpacity style={styles.editButton} onPress={startEditing}>
            <Text style={styles.editButtonText}>✏️ Editar</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelEditing}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.buttonDisabled]} 
              onPress={saveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Información Personal */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Información Personal</Text>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={[
              styles.input, 
              !editing && styles.inputDisabled,
              errors.nombre && styles.inputError
            ]}
            value={userData.nombre}
            onChangeText={(value) => handleChange('nombre', value)}
            placeholder="Tu nombre"
            placeholderTextColor={colors.placeholder}
            editable={editing}
          />
          {errors.nombre && <Text style={styles.errorText}>{errors.nombre}</Text>}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Apellido</Text>
          <TextInput
            style={[
              styles.input, 
              !editing && styles.inputDisabled,
              errors.apellido && styles.inputError
            ]}
            value={userData.apellido}
            onChangeText={(value) => handleChange('apellido', value)}
            placeholder="Tu apellido"
            placeholderTextColor={colors.placeholder}
            editable={editing}
          />
          {errors.apellido && <Text style={styles.errorText}>{errors.apellido}</Text>}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={userData.email}
            placeholder="Tu email"
            placeholderTextColor={colors.placeholder}
            editable={false}
          />
          <Text style={styles.helpText}>El email no se puede modificar</Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Edad</Text>
          <TextInput
            style={[
              styles.input, 
              !editing && styles.inputDisabled,
              errors.edad && styles.inputError
            ]}
            value={userData.edad}
            onChangeText={(value) => handleChange('edad', value)}
            placeholder="Tu edad"
            placeholderTextColor={colors.placeholder}
            keyboardType="numeric"
            editable={editing}
            maxLength={3}
          />
          {errors.edad && <Text style={styles.errorText}>{errors.edad}</Text>}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Sexo</Text>
          {editing ? (
            <TouchableOpacity 
              style={[styles.input, styles.sexInput]}
              onPress={() => setShowSexModal(true)}
            >
              <Text style={userData.sexo ? styles.sexText : styles.placeholderText}>
                {getSexText(userData.sexo)}
              </Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>
          ) : (
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={getSexText(userData.sexo)}
              editable={false}
            />
          )}
        </View>
      </View>

      {/* Datos Físicos */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Datos Físicos</Text>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Peso Actual (kg)</Text>
          <TextInput
            style={[
              styles.input, 
              !editing && styles.inputDisabled,
              errors.peso_actual && styles.inputError
            ]}
            value={userData.peso_actual}
            onChangeText={(value) => handleChange('peso_actual', value)}
            placeholder="Tu peso en kg"
            placeholderTextColor={colors.placeholder}
            keyboardType="decimal-pad"
            editable={editing}
          />
          {errors.peso_actual && <Text style={styles.errorText}>{errors.peso_actual}</Text>}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Altura (cm)</Text>
          <TextInput
            style={[
              styles.input, 
              !editing && styles.inputDisabled,
              errors.altura && styles.inputError
            ]}
            value={userData.altura}
            onChangeText={(value) => handleChange('altura', value)}
            placeholder="Tu altura en cm"
            placeholderTextColor={colors.placeholder}
            keyboardType="decimal-pad"
            editable={editing}
          />
          {errors.altura && <Text style={styles.errorText}>{errors.altura}</Text>}
        </View>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
  },
  editButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    backgroundColor: colors.border,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
    color: colors.accent,
  },
  fieldContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    fontSize: 16,
  },
  inputDisabled: {
    backgroundColor: colors.border,
    color: colors.placeholder,
  },
  inputError: {
    borderColor: '#ff4444',
  },
  sexInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sexText: {
    color: colors.text,
    fontSize: 16,
  },
  placeholderText: {
    color: colors.placeholder,
    fontSize: 16,
  },
  dropdownIcon: {
    fontSize: 12,
    color: colors.placeholder,
  },
  helpText: {
    color: colors.placeholder,
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  sexOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sexOptionText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
  },
  modalCancel: {
    padding: 15,
    marginTop: 10,
    backgroundColor: colors.border,
    borderRadius: 8,
  },
  modalCancelText: {
    color: colors.placeholder,
    fontSize: 16,
    textAlign: 'center',
  },
});
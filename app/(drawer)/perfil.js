import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from "expo-router";
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
  const router = useRouter();
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


  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
    }, [])
  );

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando perfil...');
      
      const token = await AsyncStorage.getItem('userToken');
      
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

      const data = await response.json();
      console.log('📨 Respuesta del servidor:', data);

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
        
        console.log('📝 Datos formateados para el estado:', formattedData);
        
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

  const handleChange = (name, value) => {
    let formattedValue = value;

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

    if (editing) {
      const error = validateField(name, formattedValue);
      setErrors(prev => ({ ...prev, [name]: error }));
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
    const newErrors = {};
    Object.keys(userData).forEach(key => {
      if (key !== 'email') {
        newErrors[key] = validateField(key, userData[key]);
      }
    });
    setErrors(newErrors);

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

  // DEBUG: Ver qué se está renderizando
  console.log('🎨 Renderizando con datos:', userData);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
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
            placeholderTextColor="#666"
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
            placeholderTextColor="#666"
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
            placeholderTextColor="#666"
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
            placeholderTextColor="#666"
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
            <View style={[styles.input, styles.inputDisabled]}>
              <Text style={styles.sexText}>{getSexText(userData.sexo)}</Text>
            </View>
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
            placeholderTextColor="#666"
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
            placeholderTextColor="#666"
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
    backgroundColor: '#1a1a1a', 
  },
  contentContainer: {
    padding: 16,
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
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: '#ffffff', 
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#ffffff',
  },
  editButton: {
    backgroundColor: '#fcde7cff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#000000', 
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    backgroundColor: '#3a3a3a',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#ffffff',
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
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
    color: '#fcde7cff',
  },
  fieldContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
    color: '#ffffff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff', 
    fontSize: 16,
    backgroundColor: '#1a1a1a',
  },
  inputDisabled: {
    backgroundColor: '#3a3a3a',
    color: '#cccccc',
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
    color: '#ffffff',
    fontSize: 16,
  },
  placeholderText: {
    color: '#666666',
    fontSize: 16,
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#666666',
  },
  helpText: {
    color: '#666666',
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
    backgroundColor: '#2a2a2a',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    color: '#ffffff',
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
    color: '#ffffff',
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
    color: '#cccccc',
    fontSize: 16,
    textAlign: 'center',
  },
});
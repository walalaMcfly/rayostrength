import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const API_URL = 'https://rayostrength-production.up.railway.app/api';

interface Coach {
  id: number;
  nombre: string;
  email: string;
  especialidad?: string;
  activo: number;
  fechaCreacion: string;
}

export default function CoachesScreen() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    especialidad: '',
  });

  useEffect(() => {
    fetchCoaches();
  }, []);

  const fetchCoaches = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/admin/coaches`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.coaches) {
        setCoaches(data.coaches);
      }
    } catch (error) {
      console.error('Error al obtener coaches:', error);
      Alert.alert('Error', 'No se pudieron cargar los coaches');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCoaches();
  };

  const handleOpenModal = (coach?: Coach) => {
    if (coach) {
      setEditMode(true);
      setSelectedCoach(coach);
      setForm({
        nombre: coach.nombre,
        email: coach.email,
        password: '',
        especialidad: coach.especialidad || '',
      });
    } else {
      setEditMode(false);
      setSelectedCoach(null);
      setForm({
        nombre: '',
        email: '',
        password: '',
        especialidad: '',
      });
    }
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setForm({
      nombre: '',
      email: '',
      password: '',
      especialidad: '',
    });
  };

  const handleSubmit = async () => {
    if (!form.nombre || !form.email) {
      Alert.alert('Error', 'Nombre y email son obligatorios');
      return;
    }

    if (!editMode && !form.password) {
      Alert.alert('Error', 'La contraseña es obligatoria para crear un coach');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      const url = editMode && selectedCoach
        ? `${API_URL}/admin/coaches/${selectedCoach.id}`
        : `${API_URL}/admin/coaches`;
      
      const method = editMode ? 'PUT' : 'POST';
      
      const body = editMode
        ? {
            nombre: form.nombre,
            email: form.email,
            especialidad: form.especialidad,
            activo: 1,
          }
        : form;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Éxito',
          editMode ? 'Coach actualizado' : 'Coach creado correctamente'
        );
        handleCloseModal();
        fetchCoaches();
      } else {
        Alert.alert('Error', data.error || 'No se pudo guardar el coach');
      }
    } catch (error) {
      console.error('Error al guardar coach:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    }
  };

  const handleDelete = (coach: Coach) => {
    Alert.alert(
      'Confirmar Eliminación',
      `¿Estás seguro de eliminar a ${coach.nombre}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`${API_URL}/admin/coaches/${coach.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                Alert.alert('Éxito', 'Coach eliminado correctamente');
                fetchCoaches();
              } else {
                Alert.alert('Error', 'No se pudo eliminar el coach');
              }
            } catch (error) {
              console.error('Error al eliminar:', error);
              Alert.alert('Error', 'No se pudo conectar con el servidor');
            }
          },
        },
      ]
    );
  };

  const renderCoach = ({ item }: { item: Coach }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={24} color="#fdec4d" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.nombre}</Text>
          <Text style={styles.cardEmail}>{item.email}</Text>
          {item.especialidad && (
            <Text style={styles.cardEspecialidad}>{item.especialidad}</Text>
          )}
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleOpenModal(item)}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fdec4d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Coaches</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleOpenModal()}
        >
          <Ionicons name="add-circle" size={24} color="#fdec4d" />
          <Text style={styles.addButtonText}>Nuevo Coach</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={coaches}
        renderItem={renderCoach}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fdec4d"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#4b5563" />
            <Text style={styles.emptyText}>No hay coaches registrados</Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editMode ? 'Editar Coach' : 'Nuevo Coach'}
                </Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                placeholderTextColor="#9ca3af"
                value={form.nombre}
                onChangeText={(text) => setForm({ ...form, nombre: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={(text) => setForm({ ...form, email: text })}
              />

              {!editMode && (
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Contraseña"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={form.password}
                    onChangeText={(text) => setForm({ ...form, password: text })}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye' : 'eye-off'}
                      size={22}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              )}

              <TextInput
                style={styles.input}
                placeholder="Especialidad (opcional)"
                placeholderTextColor="#9ca3af"
                value={form.especialidad}
                onChangeText={(text) => setForm({ ...form, especialidad: text })}
              />

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>
                  {editMode ? 'Actualizar' : 'Crear Coach'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCloseModal}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  addButtonText: {
    color: '#fdec4d',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 3,
  },
  cardEmail: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 3,
  },
  cardEspecialidad: {
    fontSize: 12,
    color: '#fdec4d',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 5,
  },
  editButton: {
    backgroundColor: '#2563eb',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  input: {
    backgroundColor: '#3a3a3a',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    color: '#fff',
    padding: 15,
    fontSize: 16,
  },
  eyeButton: {
    padding: 15,
  },
  submitButton: {
    backgroundColor: '#fdec4d',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#3a3a3a',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
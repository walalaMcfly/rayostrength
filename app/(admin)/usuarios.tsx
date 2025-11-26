import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const API_URL = 'https://rayostrength-production.up.railway.app/api';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: number;
  fechaCreacion: string;
  ultimaConexion?: string;
  tieneRutina: number;
}

export default function UsuariosScreen() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsuarios();
  }, []);

  useEffect(() => {
    filterUsuarios();
  }, [searchQuery, usuarios]);

  const fetchUsuarios = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/admin/usuarios`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.usuarios) {
        setUsuarios(data.usuarios);
      }
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterUsuarios = () => {
    if (!searchQuery.trim()) {
      setFilteredUsuarios(usuarios);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = usuarios.filter(
      (user) =>
        user.nombre.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
    setFilteredUsuarios(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsuarios();
  };

  const handleToggleActive = async (usuario: Usuario) => {
    const action = usuario.activo ? 'desactivar' : 'activar';
    Alert.alert(
      `Confirmar ${action}`,
      `¿Estás seguro de ${action} a ${usuario.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(
                `${API_URL}/admin/usuarios/${usuario.id}/toggle-activo`,
                {
                  method: 'PATCH',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                }
              );

              if (response.ok) {
                Alert.alert('Éxito', `Usuario ${action}do correctamente`);
                fetchUsuarios();
              } else {
                Alert.alert('Error', 'No se pudo actualizar el usuario');
              }
            } catch (error) {
              console.error('Error al actualizar:', error);
              Alert.alert('Error', 'No se pudo conectar con el servidor');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (usuario: Usuario) => {
    Alert.alert(
      'Confirmar Eliminación',
      `¿Estás seguro de eliminar a ${usuario.nombre}? Esta acción eliminará todos sus datos y no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(
                `${API_URL}/admin/usuarios/${usuario.id}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                }
              );

              if (response.ok) {
                Alert.alert('Éxito', 'Usuario eliminado correctamente');
                fetchUsuarios();
              } else {
                Alert.alert('Error', 'No se pudo eliminar el usuario');
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

  const renderUsuario = ({ item }: { item: Usuario }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[
          styles.avatarContainer,
          !item.activo && styles.avatarInactive
        ]}>
          <Ionicons 
            name="person" 
            size={24} 
            color={item.activo ? '#fdec4d' : '#6b7280'} 
          />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={[
              styles.cardName,
              !item.activo && styles.inactiveText
            ]}>
              {item.nombre}
            </Text>
            {!item.activo && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactivo</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardEmail}>{item.email}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
              <Text style={styles.metaText}>
                {new Date(item.fechaCreacion).toLocaleDateString()}
              </Text>
            </View>
            {item.tieneRutina > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                <Text style={[styles.metaText, { color: '#059669' }]}>
                  Con rutina
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            item.activo ? styles.deactivateButton : styles.activateButton
          ]}
          onPress={() => handleToggleActive(item)}
        >
          <Ionicons 
            name={item.activo ? 'pause-circle-outline' : 'play-circle-outline'} 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.actionButtonText}>
            {item.activo ? 'Desactivar' : 'Activar'}
          </Text>
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
        <Text style={styles.title}>Gestión de Usuarios</Text>
        <Text style={styles.subtitle}>
          {filteredUsuarios.length} usuario{filteredUsuarios.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o email..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredUsuarios}
        renderItem={renderUsuario}
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
            <Text style={styles.emptyText}>
              {searchQuery 
                ? 'No se encontraron usuarios' 
                : 'No hay usuarios registrados'}
            </Text>
          </View>
        }
      />
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
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    paddingVertical: 12,
    fontSize: 16,
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
  avatarInactive: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  cardInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: 8,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  inactiveText: {
    color: '#6b7280',
  },
  inactiveBadge: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '600',
  },
  cardEmail: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 15,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#9ca3af',
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
  activateButton: {
    backgroundColor: '#059669',
  },
  deactivateButton: {
    backgroundColor: '#f59e0b',
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
});
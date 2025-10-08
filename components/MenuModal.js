import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function MenuModal({ visible, onClose }) {
  const router = useRouter();

  const menuOptions = [
    { 
      name: 'Perfil', 
      icon: 'person-outline', 
      onPress: () => router.push('/perfil') 
    },
    { 
      name: 'Notificaciones', 
      icon: 'notifications-outline', 
      onPress: () => router.push('/notificaciones') 
    },
    { 
      name: 'Tema', 
      icon: 'color-palette-outline', 
      onPress: () => router.push('/tema') 
    },
    { 
      name: 'Cerrar Sesión', 
      icon: 'log-out-outline', 
      onPress: () => {
        onClose();
        router.replace('/');
      }
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          {menuOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {
                option.onPress();
                onClose();
              }}
            >
              <Ionicons name={option.icon} size={24} color="#333" />
              <Text style={styles.menuText}>{option.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  menuContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  menuText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
  },
});
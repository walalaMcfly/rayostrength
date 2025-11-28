import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CerrarSesion() {
  const router = useRouter();

  const confirmar = async () => {
    await AsyncStorage.multiRemove(['userToken', 'userData', 'userRole']);
    router.replace('/');
  };

  const cancelar = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>¿Desea cerrar sesión?</Text>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.button, styles.yes]} onPress={confirmar}>
          <Text style={styles.buttonText}>Sí</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.no]} onPress={cancelar}>
          <Text style={styles.buttonText}>No</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1b1b1bff',
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 30,
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fff', 
  },
  yes: {
    backgroundColor: '#D1B000',
  },
  no: {
    backgroundColor: '#111',
  },
  buttonText: {
    color: '#fff', 
    fontSize: 16,
    fontWeight: '700',
  },
});

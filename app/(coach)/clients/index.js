import { colors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const ClientManagementScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const agregarCliente = async () => {
    if (!email) {
      Alert.alert('Error', 'Por favor ingresa un email');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch('https://rayostrength-production.up.railway.app/api/coach/clientes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('Éxito', 'Cliente agregado correctamente');
        setEmail('');
        navigation.goBack();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error agregando cliente:', error);
      Alert.alert('Error', 'No se pudo agregar el cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Agregar Nuevo Cliente</Text>
      
      <View style={styles.formContainer}>
        <Text style={styles.label}>Email del cliente</Text>
        <TextInput
          style={styles.input}
          placeholder="ejemplo@email.com"
          placeholderTextColor={colors.placeholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TouchableOpacity 
          style={[styles.boton, loading && styles.botonDeshabilitado]}
          onPress={agregarCliente}
          disabled={loading}
        >
          <Text style={styles.textoBoton}>
            {loading ? 'Agregando...' : 'Agregar Cliente'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitulo}>¿Cómo agregar un cliente?</Text>
        <Text style={styles.infoTexto}>
          1. El cliente debe estar registrado en la aplicación.{'\n'}
          2. Ingresa el email con el que se registró.{'\n'}
          3. El cliente aparecerá en tu lista automáticamente.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    marginBottom: 16,
  },
  boton: {
    backgroundColor: colors.active,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  botonDeshabilitado: {
    backgroundColor: colors.placeholder,
  },
  textoBoton: {
    color: colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
  },
  infoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  infoTexto: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ClientManagementScreen;
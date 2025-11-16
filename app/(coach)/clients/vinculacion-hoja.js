import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_URL = 'https://rayostrength-production.up.railway.app';

const colors = { primary: '#3B82F6', background: '#F3F4F6', text: '#1F2937', white: '#FFFFFF', gray: '#6B7280' };

export default function VinculacionHojaScreen() {
  const { id: idCliente } = useLocalSearchParams();
  const router = useRouter();
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const vincularHojaCliente = async () => {
    if (!sheetUrl.trim()) {
      Alert.alert('Error', 'Ingresa la URL de Google Sheets');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
    
      const response = await fetch(`${API_URL}/api/coach/cliente/vincular-hoja`, {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          idCliente, 
          sheetUrl 
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('✅ Éxito', 'Hoja vinculada correctamente', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('❌ Error', result.message || 'Error al vincular la hoja');
      }
    } catch (error) {
      console.error('Error vinculando hoja:', error);
      Alert.alert('Error', 'No se pudo vincular la hoja');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vincular Hoja de Cálculo</Text>
        <Text style={styles.subtitle}>Vincula la hoja personalizada del cliente</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>URL de Google Sheets:</Text>
        <TextInput 
          style={styles.input} 
          placeholder="https://docs.google.com/spreadsheets/d/..." 
          value={sheetUrl} 
          onChangeText={setSheetUrl} 
          placeholderTextColor={colors.gray} 
          autoCapitalize="none"
        />
        
        <Text style={styles.helpText}>
          • Compartir la hoja con permisos de lectura{'\n'}
          • Estructura debe coincidir con el formato
        </Text>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={vincularHojaCliente} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Vincular y Sincronizar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>📋 Formato Esperado:</Text>
        <Text style={styles.infoText}>
          A: Grupo muscular{'\n'}
          B: Exercise{'\n'} 
          C: Video{'\n'}
          D: Sets{'\n'}
          E: Repeticiones{'\n'}
          F: RIR{'\n'}
          G: Rest
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.white, padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 5 },
  subtitle: { fontSize: 16, color: colors.gray },
  formContainer: { backgroundColor: colors.white, padding: 20, margin: 20, borderRadius: 12 },
  label: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15 },
  helpText: { fontSize: 14, color: colors.gray, lineHeight: 20, marginBottom: 20 },
  button: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  buttonDisabled: { backgroundColor: colors.gray },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.gray },
  secondaryButtonText: { color: colors.gray, fontSize: 16 },
  infoBox: { backgroundColor: colors.white, padding: 20, margin: 20, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.primary },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 10 },
  infoText: { fontSize: 14, color: colors.gray, lineHeight: 20 },
});
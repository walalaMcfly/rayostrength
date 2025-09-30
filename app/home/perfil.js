import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../../constants/theme";

export default function Perfil() {
  const [nombre, setNombre] = useState("Walala");
  const [edad, setEdad] = useState("22");
  const [plan, setPlan] = useState("Básico");
  const [notificaciones, setNotificaciones] = useState(true);
  const [foto, setFoto] = useState(null);

  const planes = ["Básico", "Intermedio", "Avanzado"];

   // función para elegir imagen de galería
  const seleccionarImagen = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      alert("Se necesita permiso para acceder a la galería.");
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!resultado.canceled) {
      setFoto(resultado.assets[0].uri);
    }
  };

  // función para tomar foto con cámara
  const tomarFoto = async () => {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      alert("Se necesita permiso para usar la cámara.");
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!resultado.canceled) {
      setFoto(resultado.assets[0].uri);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Perfil</Text>

      {/* ----------- CARD: FOTO ----------- */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Foto de perfil</Text>
        <View style={styles.fotoContainer}>
          {foto ? (
            <Image source={{ uri: foto }} style={styles.foto} />
          ) : (
            <Text style={styles.fotoPlaceholder}>Sin foto</Text>
          )}
        </View>

       
        <View style={styles.botonesFoto}>
          <TouchableOpacity style={styles.botonFoto} onPress={seleccionarImagen}>
            <Text style={styles.botonTexto}>📁 Galería</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonFoto} onPress={tomarFoto}>
            <Text style={styles.botonTexto}>📷 Cámara</Text>
          </TouchableOpacity>
        </View>
      </View>


      {/* ----------- CARD: DATOS ----------- */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Información personal</Text>
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Tu nombre"
          placeholderTextColor={colors.placeholder} 
        />

        <Text style={styles.label}>Edad</Text>
        <TextInput
          style={styles.input}
          value={edad}
          onChangeText={setEdad}
          placeholder="Tu edad"
          placeholderTextColor={colors.placeholder} 
          keyboardType="numeric"
        />
      </View>

      {/* ----------- CARD: PLAN ----------- */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Plan actual</Text>
        <View style={styles.planRow}>
          {planes.map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.planButton,
                plan === p && { backgroundColor: colors.active }, 
              ]}
              onPress={() => setPlan(p)}
            >
              <Text style={plan === p ? styles.planTextActive : styles.planText}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ----------- CARD: NOTIFICACIONES ----------- */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notificaciones</Text>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Recibir notificaciones</Text>
          <Switch
            value={notificaciones}
            onValueChange={setNotificaciones}
            thumbColor={notificaciones ? colors.active : colors.inactive} 
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: colors.text, 
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
    marginBottom: 10,
    color: colors.accent, 
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
    color: colors.text, 
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border, 
    borderRadius: 8,
    padding: 10,
    color: colors.text, 
  },
  fotoContainer: {
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.border, 
    justifyContent: "center",
    alignItems: "center",
  },
  foto: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  fotoPlaceholder: {
    color: colors.placeholder, 
    fontSize: 16,
  },
  planRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  planButton: {
    borderWidth: 1,
    borderColor: colors.border, 
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.card, 
  },
  planText: {
    color: colors.text, 
  },
  planTextActive: {
    color: colors.text, 
    fontWeight: "bold",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
});
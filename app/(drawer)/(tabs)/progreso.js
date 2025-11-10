import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";
import { colors } from "../../../constants/theme";

const screenWidth = Dimensions.get("window").width;
const BASE_URL = 'https://rayostrength-production.up.railway.app';

export default function ProgresoScreen() {
  const [activeTab, setActiveTab] = useState("resumen");
  const [wellnessData, setWellnessData] = useState({});
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState(null);

  // Datos de ejemplo (reemplazar con datos reales del backend)
  const [estadisticas, setEstadisticas] = useState({
    rutinasCompletadas: 12,
    totalRutinas: 20,
    porcentajeCompletitud: 60,
    mejorRPE: 8,
    promedioRIR: 2.5,
    volumenSemanal: 45
  });

  const wellnessQuestions = [
    { id: "sueno", pregunta: "💤 Calidad del sueño", escala: "1 (Malo) - 10 (Excelente)" },
    { id: "energia", pregunta: "⚡ Nivel de energía", escala: "1 (Agotado) - 10 (Energético)" },
    { id: "estres", pregunta: "😥 Nivel de estrés", escala: "1 (Tranquilo) - 10 (Muy estresado)" },
    { id: "dolor", pregunta: "💪 Dolor muscular", escala: "1 (Sin dolor) - 10 (Dolor intenso)" },
    { id: "motivacion", pregunta: "🎯 Motivación para entrenar", escala: "1 (Nada) - 10 (Muy motivado)" },
    { id: "apetito", pregunta: "🍽️ Nivel de apetito", escala: "1 (Nada) - 10 (Muy hambriento)" }
  ];

  useEffect(() => {
    cargarDatosProgreso();
  }, []);

  const cargarDatosProgreso = async () => {
    try {
      setLoading(true);
      // Aquí cargarás datos reales del backend
      // Por ahora usamos datos de ejemplo
      setProgressData({
        rutinasSemanales: [3, 4, 5, 4, 6],
        wellnessPromedio: [6, 7, 8, 7, 6, 8, 7],
        progresoPesos: [60, 62, 65, 63, 68],
        volumenEntrenamiento: [1200, 1350, 1420, 1380, 1500]
      });
    } catch (error) {
      console.error('Error cargando progreso:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWellnessChange = (preguntaId, valor) => {
    setWellnessData(prev => ({
      ...prev,
      [preguntaId]: valor
    }));
  };

  const enviarWellness = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const respuestasCompletas = wellnessQuestions.every(q => wellnessData[q.id]);
      
      if (!respuestasCompletas) {
        Alert.alert("Completa la encuesta", "Por favor responde todas las preguntas");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/wellness/registrar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fecha: new Date().toISOString().split('T')[0],
          respuestas: wellnessData
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert("✅ Encuesta guardada", "Tu estado wellness ha sido registrado");
        setWellnessData({});
      } else {
        Alert.alert("Error", "No se pudo guardar la encuesta");
      }
    } catch (error) {
      console.error('Error enviando wellness:', error);
      Alert.alert("Error", "No se pudo conectar al servidor");
    }
  };

  const renderResumen = () => (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>📈 Resumen de Progreso</Text>
      
      <View style={styles.estadisticasGrid}>
        <View style={styles.estadisticaCard}>
          <Text style={styles.estadisticaNumero}>{estadisticas.rutinasCompletadas}/{estadisticas.totalRutinas}</Text>
          <Text style={styles.estadisticaLabel}>Rutinas Completadas</Text>
          <View style={styles.barraProgreso}>
            <View 
              style={[
                styles.barraProgresoFill, 
                {width: `${estadisticas.porcentajeCompletitud}%`}
              ]} 
            />
          </View>
        </View>

        <View style={styles.estadisticaCard}>
          <Text style={styles.estadisticaNumero}>{estadisticas.promedioRIR}</Text>
          <Text style={styles.estadisticaLabel}>RIR Promedio</Text>
        </View>

        <View style={styles.estadisticaCard}>
          <Text style={styles.estadisticaNumero}>{estadisticas.mejorRPE}/10</Text>
          <Text style={styles.estadisticaLabel}>Mejor RPE</Text>
        </View>

        <View style={styles.estadisticaCard}>
          <Text style={styles.estadisticaNumero}>{estadisticas.volumenSemanal}</Text>
          <Text style={styles.estadisticaLabel}>Volumen Semanal</Text>
        </View>
      </View>

      {/* Gráfico de progreso semanal */}
      {progressData && (
        <View style={styles.graficoContainer}>
          <Text style={styles.subtitulo}>Rutinas Completadas por Semana</Text>
          <BarChart
            data={{
              labels: ['S1', 'S2', 'S3', 'S4', 'S5'],
              datasets: [{ data: progressData.rutinasSemanales }]
            }}
            width={screenWidth - 64}
            height={200}
            chartConfig={chartConfig}
            style={styles.grafico}
          />
        </View>
      )}
    </View>
  );

  const renderWellness = () => (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>🧘 Wellness Diario</Text>
      <Text style={styles.descripcion}>
        Evalúa cómo te sientes hoy. Esto ayuda a tu coach a ajustar tu entrenamiento.
      </Text>

      {wellnessQuestions.map((pregunta) => (
        <View key={pregunta.id} style={styles.preguntaContainer}>
          <Text style={styles.preguntaTexto}>{pregunta.pregunta}</Text>
          <Text style={styles.escalaTexto}>{pregunta.escala}</Text>
          
          <View style={styles.escalaContainer}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((numero) => (
              <TouchableOpacity
                key={numero}
                style={[
                  styles.botonEscala,
                  wellnessData[pregunta.id] === numero && styles.botonEscalaSeleccionado
                ]}
                onPress={() => handleWellnessChange(pregunta.id, numero)}
              >
                <Text style={[
                  styles.textoBotonEscala,
                  wellnessData[pregunta.id] === numero && styles.textoBotonEscalaSeleccionado
                ]}>
                  {numero}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.botonEnviar} onPress={enviarWellness}>
        <Text style={styles.textoBotonEnviar}>📤 Enviar Encuesta Wellness</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEstadisticas = () => (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>📊 Estadísticas Detalladas</Text>
      
      {progressData && (
        <>
          <View style={styles.graficoContainer}>
            <Text style={styles.subtitulo}>Progreso de Wellness Semanal</Text>
            <LineChart
              data={{
                labels: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
                datasets: [{ data: progressData.wellnessPromedio }]
              }}
              width={screenWidth - 64}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.grafico}
            />
          </View>

          <View style={styles.graficoContainer}>
            <Text style={styles.subtitulo}>Volumen de Entrenamiento (kg)</Text>
            <LineChart
              data={{
                labels: ['S1', 'S2', 'S3', 'S4', 'S5'],
                datasets: [{ data: progressData.volumenEntrenamiento }]
              }}
              width={screenWidth - 64}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.grafico}
            />
          </View>
        </>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.cargandoContainer}>
        <ActivityIndicator size="large" color={colors.active} />
        <Text style={styles.cargandoTexto}>Cargando tu progreso...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navegación por pestañas */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "resumen" && styles.tabActiva]}
          onPress={() => setActiveTab("resumen")}
        >
          <Text style={[styles.tabTexto, activeTab === "resumen" && styles.tabTextoActivo]}>
            📈 Resumen
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === "wellness" && styles.tabActiva]}
          onPress={() => setActiveTab("wellness")}
        >
          <Text style={[styles.tabTexto, activeTab === "wellness" && styles.tabTextoActivo]}>
            🧘 Wellness
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === "estadisticas" && styles.tabActiva]}
          onPress={() => setActiveTab("estadisticas")}
        >
          <Text style={[styles.tabTexto, activeTab === "estadisticas" && styles.tabTextoActivo]}>
            📊 Stats
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contenido}>
        {activeTab === "resumen" && renderResumen()}
        {activeTab === "wellness" && renderWellness()}
        {activeTab === "estadisticas" && renderEstadisticas()}
      </ScrollView>
    </View>
  );
}

const chartConfig = {
  backgroundColor: colors.card,
  backgroundGradientFrom: colors.card,
  backgroundGradientTo: colors.card,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(255, 215, 0, ${opacity})`,
  labelColor: (opacity = 1) => colors.text,
  style: { borderRadius: 16 },
  propsForDots: { r: "4", strokeWidth: "2", stroke: colors.active }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  cargandoContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: colors.background 
  },
  cargandoTexto: { 
    marginTop: 10, 
    color: colors.text,
    fontSize: 16 
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActiva: {
    backgroundColor: colors.active,
  },
  tabTexto: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextoActivo: {
    color: colors.card,
    fontWeight: 'bold',
  },
  contenido: {
    flex: 1,
  },
  seccion: {
    padding: 16,
  },
  tituloSeccion: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  descripcion: {
    color: colors.text,
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  estadisticasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  estadisticaCard: {
    width: '48%',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  estadisticaNumero: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.active,
    marginBottom: 8,
  },
  estadisticaLabel: {
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
  },
  barraProgreso: {
    width: '100%',
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginTop: 8,
  },
  barraProgresoFill: {
    height: '100%',
    backgroundColor: colors.active,
    borderRadius: 3,
  },
  graficoContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  subtitulo: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  grafico: {
    borderRadius: 16,
  },
  preguntaContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  preguntaTexto: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  escalaTexto: {
    color: colors.placeholder,
    fontSize: 12,
    marginBottom: 12,
  },
  escalaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  botonEscala: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  botonEscalaSeleccionado: {
    backgroundColor: colors.active,
    borderColor: colors.active,
  },
  textoBotonEscala: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  textoBotonEscalaSeleccionado: {
    color: colors.card,
  },
  botonEnviar: {
    backgroundColor: colors.active,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  textoBotonEnviar: {
    color: colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
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
import { BarChart } from "react-native-chart-kit";
import { colors } from "../../../constants/theme";

const screenWidth = Dimensions.get("window").width;
const BASE_URL = 'https://rayostrength-production.up.railway.app';

export default function ProgresoScreen() {
  const [activeTab, setActiveTab] = useState("resumen");
  const [wellnessData, setWellnessData] = useState({});
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState(null);

  const [estadisticas, setEstadisticas] = useState({
    rutinasCompletadas: 0,
    totalRutinas: 0,
    porcentajeCompletitud: 0,
    mejorRPE: 0,
    promedioRIR: 0,
    volumenSemanal: 0
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
      const token = await AsyncStorage.getItem('userToken');

      // Intentar cargar datos reales del backend
      try {
        const response = await fetch(`${BASE_URL}/api/progreso/datos-reales`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setProgressData(result.progressData);
            setEstadisticas(result.estadisticas);
            console.log('✅ Datos reales cargados:', result.estadisticas);
            return;
          }
        }
      } catch (apiError) {
        console.log('⚠️ Usando datos de ejemplo:', apiError.message);
      }

      // Datos de ejemplo como fallback
      const datosEjemplo = {
        rutinasSemanales: [3, 4, 5, 4, 6],
        wellnessPromedio: [6, 7, 8, 7, 6, 8, 7]
      };
      
      setProgressData(datosEjemplo);
      setEstadisticas({
        rutinasCompletadas: 12,
        totalRutinas: 20,
        porcentajeCompletitud: 60,
        mejorRPE: 8,
        promedioRIR: 2.5,
        volumenSemanal: 45
      });
      
    } catch (error) {
      console.error('❌ Error cargando progreso:', error);
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

    // ✅ LLAMADA REAL AL BACKEND
    const response = await fetch(`${BASE_URL}/api/wellness/registrar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        energia: wellnessData.energia,
        sueno: wellnessData.sueno,
        estres: wellnessData.estres,
        dolor_muscular: wellnessData.dolor,
        motivacion: wellnessData.motivacion,
        apetito: wellnessData.apetito,
        notas: 'Encuesta completada desde la app'
      }),
    });

    const result = await response.json();

    if (result.success) {
      Alert.alert("✅ Encuesta guardada", "Tu estado wellness ha sido registrado correctamente");
      setWellnessData({});
      // Recargar datos para actualizar gráficos
      cargarDatosProgreso();
    } else {
      Alert.alert("Error", result.message || "No se pudo guardar la encuesta");
    }
    
  } catch (error) {
    console.error('Error enviando wellness:', error);
    Alert.alert("Error de conexión", "No se pudo conectar con el servidor");
  }
};

  const renderResumen = () => (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>📈 Tu Progreso</Text>
      
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
          <Text style={styles.estadisticaSubtexto}>(Menos es mejor)</Text>
        </View>

        <View style={styles.estadisticaCard}>
          <Text style={styles.estadisticaNumero}>{estadisticas.mejorRPE}/10</Text>
          <Text style={styles.estadisticaLabel}>Mejor RPE</Text>
          <Text style={styles.estadisticaSubtexto}>(Esfuerzo percibido)</Text>
        </View>

        <View style={styles.estadisticaCard}>
          <Text style={styles.estadisticaNumero}>{estadisticas.volumenSemanal}</Text>
          <Text style={styles.estadisticaLabel}>Volumen Semanal</Text>
          <Text style={styles.estadisticaSubtexto}>(kg totales)</Text>
        </View>
      </View>

      {/* Solo un gráfico simple y confiable */}
      {progressData && progressData.rutinasSemanales && (
        <View style={styles.graficoContainer}>
          <Text style={styles.subtitulo}>Rutinas Completadas (Últimas 5 semanas)</Text>
          <BarChart
            data={{
              labels: ['S1', 'S2', 'S3', 'S4', 'S5'],
              datasets: [{ 
                data: progressData.rutinasSemanales.map(val => isFinite(val) ? val : 0) 
              }]
            }}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig}
            style={styles.grafico}
            fromZero
            showValuesOnTopOfBars
          />
        </View>
      )}

      {/* Información adicional útil */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitulo}>💡 ¿Cómo interpretar tus métricas?</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>RIR (Reps in Reserve):</Text>
          <Text style={styles.infoText}>Cuántas repeticiones te quedaban en el tanque. Ideal: 1-2</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>RPE (Rate of Perceived Exertion):</Text>
          <Text style={styles.infoText}>Tu esfuerzo percibido. Ideal: 7-9</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Volumen:</Text>
          <Text style={styles.infoText}>Peso total levantado. Busca progresión gradual.</Text>
        </View>
      </View>
    </View>
  );

  const renderWellness = () => (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>🧘 Wellness Diario</Text>
      <Text style={styles.descripcion}>
        Evalúa cómo te sientes hoy. Esta información ayuda a tu coach a ajustar tu entrenamiento según tu recuperación.
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

      <View style={styles.wellnessInfo}>
        <Text style={styles.wellnessInfoTitulo}>¿Por qué es importante el Wellness?</Text>
        <Text style={styles.wellnessInfoText}>
          Tu recuperación diaria afecta directamente tu rendimiento. Un wellness bajo puede indicar que necesitas más descanso o ajustar la intensidad.
        </Text>
      </View>
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
      {/* Solo 2 pestañas: Resumen y Wellness */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "resumen" && styles.tabActiva]}
          onPress={() => setActiveTab("resumen")}
        >
          <Text style={[styles.tabTexto, activeTab === "resumen" && styles.tabTextoActivo]}>
            📈 Progreso
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
      </View>

      <ScrollView style={styles.contenido}>
        {activeTab === "resumen" && renderResumen()}
        {activeTab === "wellness" && renderWellness()}
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
    marginBottom: 4,
  },
  estadisticaLabel: {
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  estadisticaSubtexto: {
    color: colors.placeholder,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
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
    textAlign: 'center',
  },
  grafico: {
    borderRadius: 16,
  },
  infoContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
  },
  infoTitulo: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoItem: {
    marginBottom: 10,
  },
  infoLabel: {
    color: colors.active,
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    color: colors.text,
    fontSize: 12,
    marginTop: 2,
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
  wellnessInfo: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  wellnessInfoTitulo: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  wellnessInfoText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
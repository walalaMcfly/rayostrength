import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
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
  const [refreshing, setRefreshing] = useState(false);
  const [progressData, setProgressData] = useState(null);

  const [estadisticas, setEstadisticas] = useState({
    rutinasCompletadas: 0,
    totalRutinas: 0,
    porcentajeCompletitud: 0,
    mejorRPE: 0,
    promedioRIR: 0,
    volumenSemanal: 0,
    fuerzaProgreso: 0,
    consistencia: 0
  });

  const wellnessQuestions = [
    { id: "energia", pregunta: "⚡ Nivel de energía", escala: "1 (Agotado) - 10 (Energético)" },
    { id: "sueno", pregunta: "💤 Calidad del sueño", escala: "1 (Malo) - 10 (Excelente)" },
    { id: "estres", pregunta: "😥 Nivel de estrés", escala: "1 (Tranquilo) - 10 (Muy estresado)" },
    { id: "dolor_muscular", pregunta: "💪 Dolor muscular", escala: "1 (Sin dolor) - 10 (Dolor intenso)" }, 
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

      // Cargar datos del backend
      const [progresoResponse, wellnessResponse] = await Promise.all([
        fetch(`${BASE_URL}/api/progreso/datos-reales`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${BASE_URL}/api/wellness/ultimo`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      ]);

      let datosProgreso = null;
      let datosWellness = null;

      // Procesar respuesta de progreso
      if (progresoResponse.ok) {
        const result = await progresoResponse.json();
        if (result.success) {
          datosProgreso = result.progressData || result.data;
          console.log('✅ Datos de progreso cargados:', datosProgreso);
        }
      }

      // Procesar respuesta de wellness
      if (wellnessResponse.ok) {
        const result = await wellnessResponse.json();
        if (result.success) {
          datosWellness = result.data;
          console.log('✅ Datos de wellness cargados:', datosWellness);
        }
      }

      // Actualizar estado con datos reales o de ejemplo
      if (datosProgreso) {
        setProgressData(datosProgreso);
        setEstadisticas(calcularEstadisticas(datosProgreso));
      } else {
        // Datos de ejemplo mejorados
        const datosEjemplo = generarDatosEjemplo();
        setProgressData(datosEjemplo);
        setEstadisticas(calcularEstadisticas(datosEjemplo));
      }

      // Si hay datos de wellness, pre-cargar el formulario
      if (datosWellness) {
        setWellnessData(datosWellness);
      }
      
    } catch (error) {
      console.error('❌ Error cargando progreso:', error);
      // En caso de error, usar datos de ejemplo
      const datosEjemplo = generarDatosEjemplo();
      setProgressData(datosEjemplo);
      setEstadisticas(calcularEstadisticas(datosEjemplo));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calcularEstadisticas = (datos) => {
    if (!datos) {
      return {
        rutinasCompletadas: 0,
        totalRutinas: 0,
        porcentajeCompletitud: 0,
        mejorRPE: 0,
        promedioRIR: 0,
        volumenSemanal: 0,
        fuerzaProgreso: 0,
        consistencia: 0
      };
    }

    // Cálculos basados en datos reales
    const rutinasSemanales = datos.rutinasSemanales || [3, 4, 5, 4, 6];
    const volumenData = datos.volumenSemanal || [1200, 1350, 1420, 1380, 1500];
    const rirData = datos.promedioRIR || [2.5, 2.3, 2.1, 2.4, 2.0];
    const rpeData = datos.mejorRPE || [7, 8, 8, 7, 9];

    const rutinasCompletadas = rutinasSemanales.reduce((a, b) => a + b, 0);
    const totalRutinas = rutinasSemanales.length * 7; // Asumiendo 7 días por semana
    const porcentajeCompletitud = Math.round((rutinasCompletadas / totalRutinas) * 100);
    
    const promedioRIR = (rirData.reduce((a, b) => a + b, 0) / rirData.length).toFixed(1);
    const mejorRPE = Math.max(...rpeData);
    const volumenSemanal = volumenData[volumenData.length - 1] || 0;
    
    // Calcular progreso de fuerza (última semana vs primera)
    const fuerzaProgreso = volumenData.length > 1 
      ? Math.round(((volumenData[volumenData.length - 1] - volumenData[0]) / volumenData[0]) * 100)
      : 0;

    // Calcular consistencia (variación semanal)
    const consistencia = calcularConsistencia(rutinasSemanales);

    return {
      rutinasCompletadas,
      totalRutinas,
      porcentajeCompletitud,
      mejorRPE,
      promedioRIR,
      volumenSemanal,
      fuerzaProgreso,
      consistencia
    };
  };

  const calcularConsistencia = (rutinasSemanales) => {
    if (rutinasSemanales.length < 2) return 100;
    
    const promedio = rutinasSemanales.reduce((a, b) => a + b, 0) / rutinasSemanales.length;
    const variaciones = rutinasSemanales.map(val => Math.abs(val - promedio));
    const variacionPromedio = variaciones.reduce((a, b) => a + b, 0) / variaciones.length;
    
    // Convertir a porcentaje de consistencia (menos variación = más consistencia)
    return Math.max(0, 100 - (variacionPromedio / promedio * 100));
  };

  const generarDatosEjemplo = () => {
    return {
      rutinasSemanales: [3, 4, 5, 4, 6, 5, 4],
      volumenSemanal: [1200, 1350, 1420, 1380, 1500, 1450, 1550],
      promedioRIR: [2.5, 2.3, 2.1, 2.4, 2.0, 2.2, 1.9],
      mejorRPE: [7, 8, 8, 7, 9, 8, 9],
      wellnessPromedio: [6, 7, 8, 7, 6, 8, 7]
    };
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatosProgreso();
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
      
      // Verificar que todas las preguntas tengan respuesta
      const respuestasCompletas = wellnessQuestions.every(q => 
        wellnessData[q.id] !== undefined && wellnessData[q.id] !== null
      );
      
      if (!respuestasCompletas) {
        Alert.alert("Encuesta incompleta", "Por favor responde todas las preguntas");
        return;
      }

      const datosWellness = {
        energia: wellnessData.energia || 5,
        sueno: wellnessData.sueno || 5,
        estres: wellnessData.estres || 5,
        dolor_muscular: wellnessData.dolor_muscular || 5, 
        motivacion: wellnessData.motivacion || 5,
        apetito: wellnessData.apetito || 5
      };

      console.log('📤 Enviando wellness:', datosWellness);

      const response = await fetch(`${BASE_URL}/api/wellness/registrar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosWellness),
      });

      const responseText = await response.text();
      console.log('🔍 Respuesta del servidor:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Error parseando JSON:', parseError);
        Alert.alert("Error", "Respuesta inválida del servidor");
        return;
      }

      if (result.success) {
        Alert.alert("✅ Encuesta guardada", "Tu estado wellness ha sido registrado correctamente");
        setWellnessData({});
        // Recargar datos después de enviar
        cargarDatosProgreso();
      } else {
        Alert.alert("Error", result.message || result.error || "No se pudo guardar la encuesta");
      }
      
    } catch (error) {
      console.error('❌ Error enviando wellness:', error);
      Alert.alert("Error de conexión", "No se pudo conectar con el servidor: " + error.message);
    }
  };

  const renderResumen = () => (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>📈 Tu Progreso</Text>
      
      <View style={styles.estadisticasGrid}>
        <View style={styles.estadisticaCard}>
          <Text style={styles.estadisticaNumero}>{estadisticas.rutinasCompletadas}</Text>
          <Text style={styles.estadisticaLabel}>Rutinas Completadas</Text>
          <View style={styles.barraProgreso}>
            <View 
              style={[
                styles.barraProgresoFill, 
                {width: `${Math.min(100, estadisticas.porcentajeCompletitud)}%`}
              ]} 
            />
          </View>
          <Text style={styles.estadisticaSubtexto}>{estadisticas.porcentajeCompletitud}% de consistencia</Text>
        </View>

        <View style={styles.estadisticaCard}>
          <Text style={styles.estadisticaNumero}>{estadisticas.promedioRIR}</Text>
          <Text style={styles.estadisticaLabel}>RIR Promedio</Text>
          <Text style={styles.estadisticaSubtexto}>
          </Text>
        </View>

        <View style={styles.estadisticaCard}>
          <Text style={styles.estadisticaNumero}>{estadisticas.mejorRPE}/10</Text>
          <Text style={styles.estadisticaLabel}>Mejor Esfuerzo</Text>
          <Text style={styles.estadisticaSubtexto}>
            {estadisticas.mejorRPE >= 8 ? '🔥 Excelente' : '💪 Buen trabajo'}
          </Text>
        </View>

        <View style={styles.estadisticaCard}>
          <Text style={styles.estadisticaNumero}>{estadisticas.volumenSemanal}</Text>
          <Text style={styles.estadisticaLabel}>Volumen Total</Text>
          <Text style={styles.estadisticaSubtexto}>
            {estadisticas.fuerzaProgreso > 0 ? `📈 +${estadisticas.fuerzaProgreso}%` : 'Manteniendo'}
          </Text>
        </View>
      </View>

      {/* Gráficos mejorados */}
      {progressData && progressData.rutinasSemanales && (
        <View style={styles.graficosContainer}>
          <View style={styles.graficoContainer}>
            <Text style={styles.subtitulo}>Rutinas por Semana</Text>
            <BarChart
              data={{
                labels: progressData.rutinasSemanales.map((_, i) => `S${i+1}`),
                datasets: [{ 
                  data: progressData.rutinasSemanales.map(val => isFinite(val) ? val : 0) 
                }]
              }}
              width={screenWidth - 64}
              height={200}
              chartConfig={chartConfig}
              style={styles.grafico}
              fromZero
              showValuesOnTopOfBars
            />
          </View>

          {progressData.volumenSemanal && (
            <View style={styles.graficoContainer}>
              <Text style={styles.subtitulo}>Progreso de Volumen (kg)</Text>
              <BarChart
                data={{
                  labels: progressData.volumenSemanal.map((_, i) => `S${i+1}`),
                  datasets: [{ 
                    data: progressData.volumenSemanal.map(val => isFinite(val) ? Math.round(val/10) : 0) 
                  }]
                }}
                width={screenWidth - 64}
                height={200}
                chartConfig={chartConfigVolumen}
                style={styles.grafico}
                fromZero
                showValuesOnTopOfBars
              />
            </View>
          )}
        </View>
      )}

      {/* Información adicional útil */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitulo}>💡 Tus Métricas de Rendimiento</Text>
        <View style={styles.metricaItem}>
          <Text style={styles.metricaLabel}>Consistencia de Entrenamiento:</Text>
          <Text style={styles.metricaValor}>{Math.round(estadisticas.consistencia)}%</Text>
          <Text style={styles.metricaDescripcion}>
            {estadisticas.consistencia > 80 ? 'Excelente consistencia' : 
             estadisticas.consistencia > 60 ? 'Buena regularidad' : 
             'Puedes mejorar la regularidad'}
          </Text>
        </View>
        <View style={styles.metricaItem}>
          <Text style={styles.metricaLabel}>Progreso de Fuerza:</Text>
          <Text style={styles.metricaValor}>
            {estadisticas.fuerzaProgreso > 0 ? `+${estadisticas.fuerzaProgreso}%` : 'Estable'}
          </Text>
          <Text style={styles.metricaDescripcion}>
            {estadisticas.fuerzaProgreso > 10 ? '¡Gran progreso!' : 
             'Mantén la progresión gradual'}
          </Text>
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
          Tu recuperación diaria afecta directamente tu rendimiento. Un wellness bajo puede indicar que necesitas más descanso o ajustar la intensidad. Tu coach verá estos datos para personalizar tu entrenamiento.
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
      {/* Header con botón de recarga */}
      <View style={styles.header}>
        <Text style={styles.tituloPrincipal}>Mi Progreso</Text>
        <TouchableOpacity style={styles.botonRecargar} onPress={onRefresh}>
          <Text style={styles.textoBotonRecargar}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Pestañas */}
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

      <ScrollView 
        style={styles.contenido}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.active]}
            tintColor={colors.active}
          />
        }
      >
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

const chartConfigVolumen = {
  backgroundColor: colors.card,
  backgroundGradientFrom: colors.card,
  backgroundGradientTo: colors.card,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
  labelColor: (opacity = 1) => colors.text,
  style: { borderRadius: 16 },
  propsForDots: { r: "4", strokeWidth: "2", stroke: "#22c55e" }
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  tituloPrincipal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  botonRecargar: {
    padding: 8,
    backgroundColor: colors.card,
    borderRadius: 20,
  },
  textoBotonRecargar: {
    fontSize: 18,
    color: colors.text,
  },
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
  graficosContainer: {
    gap: 16,
  },
  graficoContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
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
    marginTop: 16,
  },
  infoTitulo: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  metricaItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metricaLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricaValor: {
    color: colors.active,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricaDescripcion: {
    color: colors.text,
    fontSize: 12,
    opacity: 0.8,
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
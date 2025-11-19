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

      if (!token) {
        Alert.alert('Error', 'No estás autenticado. Por favor inicia sesión nuevamente.');
        return;
      }

      const progresoResponse = await fetch(`${BASE_URL}/api/progreso/datos-reales`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      let datosReales = null;

      if (progresoResponse.ok) {
        const result = await progresoResponse.json();
        
        if (result.success) {
          datosReales = result.progressData || result.data || result.estadisticas;
        }
      }

      if (datosReales && Object.keys(datosReales).length > 0) {
        setProgressData(datosReales);
        setEstadisticas(calcularEstadisticasReales(datosReales));
      } else {
        setProgressData({
          rutinasSemanales: [0, 0, 0, 0, 0],
          volumenSemanal: [0, 0, 0, 0, 0],
          wellnessPromedio: [0, 0, 0, 0, 0]
        });
        setEstadisticas({
          rutinasCompletadas: 0,
          totalRutinas: 0,
          porcentajeCompletitud: 0,
          mejorRPE: 0,
          promedioRIR: 0,
          volumenSemanal: 0,
          fuerzaProgreso: 0,
          consistencia: 0
        });
      }
      
    } catch (error) {
      setProgressData({
        rutinasSemanales: [0, 0, 0, 0, 0],
        volumenSemanal: [0, 0, 0, 0, 0],
        wellnessPromedio: [0, 0, 0, 0, 0]
      });
      setEstadisticas({
        rutinasCompletadas: 0,
        totalRutinas: 0,
        porcentajeCompletitud: 0,
        mejorRPE: 0,
        promedioRIR: 0,
        volumenSemanal: 0,
        fuerzaProgreso: 0,
        consistencia: 0
      });
      
      Alert.alert(
        'Error de conexión', 
        'No se pudieron cargar los datos de progreso. Verifica tu conexión.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calcularEstadisticasReales = (datos) => {
    if (!datos || Object.keys(datos).length === 0) {
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

    if (datos.estadisticas) {
      return {
        rutinasCompletadas: datos.estadisticas.rutinasCompletadas || 0,
        totalRutinas: datos.estadisticas.totalRutinas || 0,
        porcentajeCompletitud: datos.estadisticas.porcentajeCompletitud || 0,
        mejorRPE: datos.estadisticas.mejorRPE || 0,
        promedioRIR: datos.estadisticas.promedioRIR || 0,
        volumenSemanal: datos.estadisticas.volumenSemanal || 0,
        fuerzaProgreso: datos.estadisticas.fuerzaProgreso || 0,
        consistencia: datos.estadisticas.consistencia || 0
      };
    }

    const rutinasSemanales = datos.rutinasSemanales || [0, 0, 0, 0, 0];
    const volumenSemanal = datos.volumenSemanal || [0, 0, 0, 0, 0];
    
    const rutinasCompletadas = rutinasSemanales.reduce((a, b) => a + b, 0);
    const totalRutinas = rutinasSemanales.length * 7;
    const porcentajeCompletitud = totalRutinas > 0 ? Math.round((rutinasCompletadas / totalRutinas) * 100) : 0;
    
    const volumenActual = volumenSemanal.length > 0 ? volumenSemanal[volumenSemanal.length - 1] : 0;
    const fuerzaProgreso = volumenSemanal.length > 1 && volumenSemanal[0] > 0 
      ? Math.round(((volumenActual - volumenSemanal[0]) / volumenSemanal[0]) * 100)
      : 0;

    const consistencia = calcularConsistencia(rutinasSemanales);

    return {
      rutinasCompletadas,
      totalRutinas,
      porcentajeCompletitud,
      mejorRPE: datos.mejorRPE || 0,
      promedioRIR: datos.promedioRIR || 0,
      volumenSemanal: volumenActual,
      fuerzaProgreso,
      consistencia
    };
  };

  const calcularConsistencia = (rutinasSemanales) => {
    if (rutinasSemanales.length < 2) return 100;
    
    const promedio = rutinasSemanales.reduce((a, b) => a + b, 0) / rutinasSemanales.length;
    const variaciones = rutinasSemanales.map(val => Math.abs(val - promedio));
    const variacionPromedio = variaciones.reduce((a, b) => a + b, 0) / variaciones.length;
    
    return Math.max(0, 100 - (variacionPromedio / promedio * 100));
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

      const response = await fetch(`${BASE_URL}/api/wellness/registrar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosWellness),
      });

      const responseText = await response.text();

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        Alert.alert("Error", "Respuesta inválida del servidor");
        return;
      }

      if (result.success) {
        Alert.alert("✅ Encuesta guardada", "Tu estado wellness ha sido registrado correctamente");
        setWellnessData({});
        cargarDatosProgreso();
      } else {
        Alert.alert("Error", result.message || result.error || "No se pudo guardar la encuesta");
      }
      
    } catch (error) {
      Alert.alert("Error de conexión", "No se pudo conectar con el servidor: " + error.message);
    }
  };


const renderResumen = () => (
  <View style={styles.seccion}>
    <Text style={styles.tituloSeccion}> Tu Progreso </Text>
    
    {estadisticas.seriesTotales === 0 ? (
      <View style={styles.avisoContainer}>
        <Text style={styles.avisoTexto}>
          🏋️‍♂️ Aún no tienes datos de entrenamiento. 
          {"\n"}Completa algunas rutinas registrando tus pesos y series para ver tu progreso aquí.
        </Text>
      </View>
    ) : (
      <>
        <View style={styles.estadisticasGrid}>
          <View style={styles.estadisticaCard}>
            <Text style={styles.estadisticaNumero}>{estadisticas.mejorRecord}kg</Text>
            <Text style={styles.estadisticaLabel}>Mejor Record</Text>
            <Text style={styles.estadisticaSubtexto}>
              {progressData?.topRecords?.[0]?.nombre_ejercicio || 'Ejercicio'}
            </Text>
          </View>

          <View style={styles.estadisticaCard}>
            <Text style={styles.estadisticaNumero}>{estadisticas.volumenTotal}</Text>
            <Text style={styles.estadisticaLabel}>Volumen Total</Text>
            <Text style={styles.estadisticaSubtexto}>
              {estadisticas.pesoPromedio}kg avg × {estadisticas.seriesTotales} series
            </Text>
          </View>

          <View style={styles.estadisticaCard}>
            <Text style={styles.estadisticaNumero}>{estadisticas.seriesTotales}</Text>
            <Text style={styles.estadisticaLabel}>Series Totales</Text>
            <Text style={styles.estadisticaSubtexto}>
              {estadisticas.diasEntrenados} días
            </Text>
          </View>

          <View style={styles.estadisticaCard}>
            <Text style={styles.estadisticaNumero}>{estadisticas.consistencia}%</Text>
            <Text style={styles.estadisticaLabel}>Consistencia</Text>
            <Text style={styles.estadisticaSubtexto}>
              {estadisticas.consistencia > 70 ? '🔥 Excelente' : '💪 En progreso'}
            </Text>
          </View>
        </View>

        {progressData?.graficoCircular && progressData.graficoCircular.length > 0 && (
          <View style={styles.graficoCircularContainer}>
            <Text style={styles.subtitulo}>Distribución de Series por Grupo Muscular</Text>
            <View style={styles.graficoCircular}>
              <View style={styles.graficoPlaceholder}>
                <Text style={styles.graficoPlaceholderText}>
                  📊 Gráfico Circular: {estadisticas.seriesTotales} series totales
                </Text>
                {progressData.graficoCircular.map((grupo, index) => (
                  <View key={index} style={styles.grupoItem}>
                    <Text style={styles.grupoTexto}>
                      {grupo.grupo}: {grupo.series} series ({grupo.porcentaje}%)
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
        {progressData?.topRecords && progressData.topRecords.length > 0 && (
          <View style={styles.recordsContainer}>
            <Text style={styles.subtitulo}>🏆 Tus Mejores Records</Text>
            {progressData.topRecords.map((record, index) => (
              <View key={index} style={styles.recordCard}>
                <Text style={styles.recordEjercicio}>{record.nombre_ejercicio}</Text>
                <Text style={styles.recordPeso}>{record.record_peso} kg</Text>
              </View>
            ))}
          </View>
        )}
      </>
    )}
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
      <View style={styles.header}>
        <Text style={styles.tituloPrincipal}>Mi Progreso</Text>
        <TouchableOpacity style={styles.botonRecargar} onPress={onRefresh}>
          <Text style={styles.textoBotonRecargar}>🔄</Text>
        </TouchableOpacity>
      </View>

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
  avisoContainer: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  avisoTexto: {
    color: '#856404',
    fontSize: 14,
    lineHeight: 20,
  },
  sinDatosContainer: {
    backgroundColor: colors.card,
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  sinDatosTexto: {
    color: colors.placeholder,
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  graficoCircularContainer: {
  backgroundColor: colors.card,
  padding: 16,
  borderRadius: 12,
  marginBottom: 16,
},
graficoCircular: {
  alignItems: 'center',
  marginTop: 10,
},
graficoPlaceholder: {
  alignItems: 'center',
},
graficoPlaceholderText: {
  color: colors.text,
  fontSize: 16,
  fontWeight: 'bold',
  marginBottom: 10,
},
grupoItem: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: '100%',
  paddingVertical: 4,
},
grupoTexto: {
  color: colors.text,
  fontSize: 14,
},
recordsContainer: {
  backgroundColor: colors.card,
  padding: 16,
  borderRadius: 12,
},
recordCard: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
},
recordEjercicio: {
  color: colors.text,
  fontSize: 14,
  flex: 1,
},
recordPeso: {
  color: colors.active,
  fontSize: 16,
  fontWeight: 'bold',
},
});
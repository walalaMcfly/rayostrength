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
import { LineChart } from 'react-native-chart-kit';
import { colors } from "../../../constants/theme";

const screenWidth = Dimensions.get("window").width;
const BASE_URL = 'https://rayostrength-production.up.railway.app';

export default function ProgresoScreen() {
  const [activeTab, setActiveTab] = useState("resumen");
  const [wellnessData, setWellnessData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progressData, setProgressData] = useState(null);
  const [historialPesos, setHistorialPesos] = useState([]);

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
          await cargarHistorialPesos(token);
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
      console.error('Error cargando datos:', error);
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
        'No se pudieron cargar los datos de progreso.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cargarHistorialPesos = async (token) => {
    try {
      const response = await fetch(`${BASE_URL}/api/progreso/historial-pesos`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setHistorialPesos(result.historial || []);
        }
      } else {
        generarDatosEjemplo();
      }
    } catch (error) {
      generarDatosEjemplo();
    }
  };

  const generarDatosEjemplo = () => {
    const fechas = ['1 Mar', '8 Mar', '15 Mar', '22 Mar', '29 Mar', '5 Abr'];
    const pesos = [40, 45, 42, 48, 50, 52];
    
    const historialEjemplo = fechas.map((fecha, index) => ({
      fecha,
      peso: Number(pesos[index]) || 0,
      ejercicio: `Ejercicio ${index + 1}`
    }));
    
    setHistorialPesos(historialEjemplo);
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
        consistencia: datos.estadisticas.consistencia || 0,
        seriesTotales: datos.estadisticas.seriesTotales || 0,
        diasEntrenados: datos.estadisticas.diasEntrenados || 0,
        volumenTotal: datos.estadisticas.volumenTotal || 0,
        mejorRecord: datos.estadisticas.mejorRecord || 0,
        pesoPromedio: datos.estadisticas.pesoPromedio || 0
      };
    }

    return {
      rutinasCompletadas: 0,
      totalRutinas: 0,
      porcentajeCompletitud: 0,
      mejorRPE: 0,
      promedioRIR: 0,
      volumenSemanal: 0,
      fuerzaProgreso: 0,
      consistencia: 0,
      seriesTotales: 0,
      diasEntrenados: 0,
      volumenTotal: 0,
      mejorRecord: 0,
      pesoPromedio: 0
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
      Alert.alert("Error de conexión", "No se pudo conectar con el servidor");
    }
  };

  const asegurarDatosNumericos = (datos) => {
    if (!Array.isArray(datos)) return [0];
    return datos.map(item => {
      const num = Number(item);
      return isNaN(num) ? 0 : Math.max(0, num);
    });
  };

  const renderGraficoProgreso = () => {
    if (!historialPesos || historialPesos.length === 0) {
      return (
        <View style={styles.graficoContainer}>
          <Text style={styles.subtitulo}>📈 Progreso de Pesos</Text>
          <View style={styles.sinDatosGrafico}>
            <Text style={styles.sinDatosTexto}>
              Aún no hay suficientes datos para mostrar tu progreso
            </Text>
            <Text style={styles.sinDatosSubtexto}>
              Sigue registrando tus entrenamientos para ver tu evolución
            </Text>
          </View>
        </View>
      );
    }

    const datosPesos = asegurarDatosNumericos(historialPesos.map(item => item.peso));
    const etiquetas = historialPesos.map(item => item.fecha || 'Fecha');

    const tieneDatosValidos = datosPesos.some(peso => peso > 0);

    if (!tieneDatosValidos) {
      return (
        <View style={styles.graficoContainer}>
          <Text style={styles.subtitulo}>📈 Progreso de Pesos</Text>
          <View style={styles.sinDatosGrafico}>
            <Text style={styles.sinDatosTexto}>
              Registra pesos mayores a 0 para ver tu progreso
            </Text>
          </View>
        </View>
      );
    }

    const datosGrafico = {
      labels: etiquetas,
      datasets: [
        {
          data: datosPesos,
          color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: ["Peso Máximo (kg)"]
    };

    return (
      <View style={styles.graficoContainer}>
        <Text style={styles.subtitulo}>📈 Evolución de Tu Fuerza</Text>
        <LineChart
          data={datosGrafico}
          width={screenWidth - 48}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.grafico}
          fromZero
        />
        <View style={styles.infoGrafico}>
          <Text style={styles.infoGraficoTitulo}>Tu Progreso</Text>
          <Text style={styles.infoGraficoTexto}>
            {historialPesos.length > 1 ? 
              `Has aumentado ${datosPesos[datosPesos.length - 1] - datosPesos[0]}kg en ${historialPesos.length} semanas` :
              'Continúa registrando para ver tu progreso'
            }
          </Text>
        </View>
      </View>
    );
  };

  const renderResumen = () => (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>📊 Tu Progreso</Text>
      
      {estadisticas.rutinasCompletadas === 0 ? (
        <View style={styles.avisoContainer}>
          <Text style={styles.avisoTexto}>
            🏋️‍♂️ Aún no tienes datos de entrenamiento. Completa algunas rutinas registrando tus pesos y series para ver tu progreso aquí.
          </Text>
          <TouchableOpacity style={styles.botonAccion} onPress={onRefresh}>
            <Text style={styles.textoBotonAccion}>🔄 Actualizar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.estadisticasGrid}>
            <View style={styles.estadisticaCard}>
              <Text style={styles.estadisticaNumero}>{estadisticas.mejorRecord}kg</Text>
              <Text style={styles.estadisticaLabel}>🏆 Mejor Record</Text>
              <Text style={styles.estadisticaSubtexto}>
                {progressData?.topRecords?.[0]?.nombre_ejercicio || 'Tu máximo'}
              </Text>
            </View>

            <View style={styles.estadisticaCard}>
              <Text style={styles.estadisticaNumero}>{estadisticas.volumenTotal}</Text>
              <Text style={styles.estadisticaLabel}>💪 Volumen Total</Text>
              <Text style={styles.estadisticaSubtexto}>
                {estadisticas.pesoPromedio}kg × {estadisticas.seriesTotales} series
              </Text>
            </View>

            <View style={styles.estadisticaCard}>
              <Text style={styles.estadisticaNumero}>{estadisticas.rutinasCompletadas}</Text>
              <Text style={styles.estadisticaLabel}>✅ Rutinas Completadas</Text>
              <Text style={styles.estadisticaSubtexto}>
                {estadisticas.porcentajeCompletitud}% de efectividad
              </Text>
            </View>

            <View style={styles.estadisticaCard}>
              <Text style={styles.estadisticaNumero}>{estadisticas.consistencia}%</Text>
              <Text style={styles.estadisticaLabel}>🔥 Consistencia</Text>
              <Text style={styles.estadisticaSubtexto}>
                {estadisticas.consistencia > 70 ? '🔥 Excelente' : 
                 estadisticas.consistencia > 40 ? '💪 Bueno' : '⚡ Puedes mejorar'}
              </Text>
            </View>
          </View>

          {renderGraficoProgreso()}

          <View style={styles.metricasContainer}>
            <Text style={styles.subtitulo}>📊 Métricas de Entrenamiento</Text>
            <View style={styles.metricasGrid}>
              <View style={styles.metricaItem}>
                <Text style={styles.metricaValor}>{estadisticas.mejorRPE || 0}</Text>
                <Text style={styles.metricaLabel}>💥 Mejor RPE</Text>
              </View>
              <View style={styles.metricaItem}>
                <Text style={styles.metricaValor}>{estadisticas.promedioRIR || 0}</Text>
                <Text style={styles.metricaLabel}>📏 RIR Promedio</Text>
              </View>
              <View style={styles.metricaItem}>
                <Text style={styles.metricaValor}>{estadisticas.diasEntrenados || 0}</Text>
                <Text style={styles.metricaLabel}>📅 Días Entrenados</Text>
              </View>
              <View style={styles.metricaItem}>
                <Text style={styles.metricaValor}>{estadisticas.fuerzaProgreso || 0}%</Text>
                <Text style={styles.metricaLabel}>🚀 Progreso Fuerza</Text>
              </View>
            </View>
          </View>

          {progressData?.topRecords && progressData.topRecords.length > 0 && (
            <View style={styles.recordsContainer}>
              <Text style={styles.subtitulo}>🏆 Tus Records Personales</Text>
              {progressData.topRecords.map((record, index) => (
                <View key={index} style={styles.recordCard}>
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordEjercicio}>{record.nombre_ejercicio}</Text>
                    <Text style={styles.recordFecha}>
                      {record.fecha_record ? new Date(record.fecha_record).toLocaleDateString() : 'Reciente'}
                    </Text>
                  </View>
                  <Text style={styles.recordPeso}>{record.record_peso} kg</Text>
                </View>
              ))}
            </View>
          )}

          {progressData?.sesionesRecientes && progressData.sesionesRecientes.length > 0 && (
            <View style={styles.sesionesContainer}>
              <Text style={styles.subtitulo}>📅 Sesiones Recientes</Text>
              {progressData.sesionesRecientes.slice(0, 3).map((sesion, index) => (
                <View key={index} style={styles.sesionCard}>
                  <Text style={styles.sesionFecha}>
                    {new Date(sesion.fecha).toLocaleDateString()}
                  </Text>
                  <Text style={styles.sesionDetalles}>
                    {sesion.ejercicios_completados}/{sesion.total_ejercicios} ejercicios • {sesion.porcentaje_completitud}% completado
                  </Text>
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
        <Text style={styles.wellnessInfoTitulo}>💡 ¿Por qué es importante el Wellness?</Text>
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
        <Text style={styles.tituloPrincipal}>📊 Mi Progreso</Text>
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
  backgroundColor: colors.background,
  backgroundGradientFrom: colors.background,
  backgroundGradientTo: colors.background,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
  labelColor: (opacity = 1) => colors.text,
  style: {
    borderRadius: 16,
    padding: 10
  },
  propsForDots: {
    r: "5",
    strokeWidth: "2",
    stroke: colors.active
  },
  propsForBackgroundLines: {
    strokeDasharray: "",
    stroke: colors.border,
    strokeWidth: 1
  },
  formatYLabel: (yValue) => {
    const num = Number(yValue);
    return isNaN(num) ? '0' : Math.round(num).toString();
  }
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
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
  graficoContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  grafico: {
    marginVertical: 8,
    borderRadius: 16,
  },
  subtitulo: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoGrafico: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderRadius: 8,
  },
  infoGraficoTitulo: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoGraficoTexto: {
    color: colors.placeholder,
    fontSize: 14,
  },
  sinDatosGrafico: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sinDatosTexto: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  sinDatosSubtexto: {
    color: colors.placeholder,
    fontSize: 14,
    textAlign: 'center',
  },
  metricasContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  metricasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricaItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  metricaValor: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.active,
    marginBottom: 4,
  },
  metricaLabel: {
    color: colors.text,
    fontSize: 12,
    textAlign: 'center',
  },
  recordsContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  recordCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recordInfo: {
    flex: 1,
  },
  recordEjercicio: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  recordFecha: {
    color: colors.placeholder,
    fontSize: 12,
    marginTop: 2,
  },
  recordPeso: {
    color: colors.active,
    fontSize: 18,
    fontWeight: 'bold',
  },
  sesionesContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sesionCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sesionFecha: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sesionDetalles: {
    color: colors.placeholder,
    fontSize: 14,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
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
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    alignItems: 'center',
  },
  avisoTexto: {
    color: '#856404',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  botonAccion: {
    backgroundColor: colors.active,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  textoBotonAccion: {
    color: colors.card,
    fontSize: 14,
    fontWeight: '600',
  },
});
import { useColorScheme } from '@/hooks/useColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  const [loadedFonts] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const role = await AsyncStorage.getItem('userRole');
        const currentSegment = segments[0];
        
        const inProtectedArea = currentSegment === '(coach)' || 
                               currentSegment === '(admin)' || 
                               currentSegment === '(drawer)';
        
        if (!token && inProtectedArea) {
          router.replace('/');
          return;
        }

        if (token && inProtectedArea) {
          if (currentSegment === '(admin)' && role !== 'admin') {
            await AsyncStorage.clear();
            router.replace('/');
            return;
          }
          if (currentSegment === '(coach)' && role !== 'coach') {
            await AsyncStorage.clear();
            router.replace('/');
            return;
          }
        }

      } catch (error) {
        console.error('Error verificando auth:', error);
      } finally {
        setIsReady(true);
      }
    };

    if (loadedFonts) {
      verifyAuth();
    }
  }, [segments, loadedFonts]);

  if (!loadedFonts || !isReady) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(drawer)" />
        <Stack.Screen name="(coach)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="+not-found" />
      </Stack>

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
import { Stack } from 'expo-router';
import { useFonts, IMFellEnglish_400Regular } from '@expo-google-fonts/im-fell-english';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Asset } from 'expo-asset';
import { View, Image, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { theme } from '../constants/theme';
import { autoSyncWikiSyncForSavedCharacters } from '../constants/wikisync-api';
import { QUEST_NAME_LIST } from '../constants/quest-names';

SplashScreen.preventAutoHideAsync();

function PersistentBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image source={require('../assets/icons/osrs-bg-scale.png')} style={{ width, height }} resizeMode="cover" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject as any}>
        <Defs>
          <RadialGradient id="vig" cx="50%" cy="45%" r="70%">
            <Stop offset="0%"   stopColor="#0d0900" stopOpacity="0.0" />
            <Stop offset="75%"  stopColor="#0d0900" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0d0900" stopOpacity="0.92" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#vig)" />
      </Svg>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    IMFellEnglish_400Regular,
  });
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  useEffect(() => {
    Asset.loadAsync([
      require('../assets/icons/osrs-bg-scale.png'),
    ]).then(() => setAssetsLoaded(true));
  }, []);

  useEffect(() => {
    if (fontsLoaded && assetsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded, assetsLoaded]);

  useEffect(() => {
    if (!fontsLoaded || !assetsLoaded) return;
    autoSyncWikiSyncForSavedCharacters(QUEST_NAME_LIST).catch(() => {
      // Silent background sync — manual sync remains available in-app.
    });
  }, [fontsLoaded, assetsLoaded]);

  if (!fontsLoaded || !assetsLoaded) return null;

  return (
    <>
      <StatusBar style="light" />
      <PersistentBackground />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </>
  );
}
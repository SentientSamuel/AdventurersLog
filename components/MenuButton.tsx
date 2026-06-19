import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Animated,
  Image,
  ImageSourcePropType,
  Platform,
} from 'react-native';
import { theme } from '../constants/theme';

interface MenuButtonProps {
  icon?: ImageSourcePropType;
  emoji?: string;
  label: string;
  onPress: () => void;
}

export default function MenuButton({ icon, emoji, label, onPress }: MenuButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  return (
    <View style={styles.buttonWrapper}>
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View
          style={[styles.inner, { transform: [{ scale: scaleAnim }] }]}
        >
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          {icon
            ? <Image source={icon} style={styles.icon} resizeMode="contain" />
            : <Text style={styles.emoji}>{emoji}</Text>
          }
          <Text style={labelStyle} numberOfLines={2}>{label}</Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const labelStyle = {
  fontFamily: theme.fonts.display,
  fontSize: Platform.OS === 'android' ? 8 : 11,
  color: theme.colors.parchment,
  textAlign: 'center' as const,
  letterSpacing: 2,
  textTransform: 'uppercase' as const,
  lineHeight: 16,
  textShadowColor: 'rgba(0,0,0,0.8)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
};

const styles = StyleSheet.create({
  buttonWrapper: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 3,
    marginBottom: 4,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    shadowColor: theme.colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    flex: 1,
  },
  inner: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 88,
    position: 'relative',
  },
  icon: {
    width: 36,
    height: 36,
    marginBottom: 8,
  },
  emoji: {
    fontSize: 28,
    marginBottom: 7,
  },
  corner: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderColor: theme.colors.borderGold,
  },
  cornerTL: { top: 3, left: 3, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  cornerTR: { top: 3, right: 3, borderTopWidth: 1.5, borderRightWidth: 1.5 },
  cornerBL: { bottom: 3, left: 3, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
  cornerBR: { bottom: 3, right: 3, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
});
import React, { ReactNode } from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import * as Haptics from 'expo-haptics';

interface AnimatedTouchableProps extends TouchableOpacityProps {
  children: ReactNode;
  activeScale?: number;
  activeOpacity?: number;
  hapticFeedback?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function AnimatedTouchable({
  children,
  activeOpacity = 0.7,
  hapticFeedback = true,
  style,
  onPress,
  ...props
}: AnimatedTouchableProps) {
  const handlePress = (e: any) => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    if (onPress) onPress(e);
  };

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      onPress={handlePress}
      style={style}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
}

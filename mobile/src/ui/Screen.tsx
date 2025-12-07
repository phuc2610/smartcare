/**
 * Screen Component
 * Base screen container with safe area and consistent styling
 */

import React from 'react';
import { View, ViewStyle, StyleSheet, ScrollView, ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme';

export interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
  scrollViewProps?: ScrollViewProps;
  safeAreaEdges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  scrollable = false,
  scrollViewProps,
  safeAreaEdges = ['top', 'bottom'],
}) => {
  const content = scrollable ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.container}>{children}</View>
  );

  return (
    <SafeAreaView edges={safeAreaEdges} style={[styles.safeArea, style]}>
      {content}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});


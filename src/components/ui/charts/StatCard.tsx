/**
 * Statistics Card Component
 * 
 * Displays key metrics and statistics in a visually appealing card format.
 * Optimized for session analytics and performance metrics display.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../providers/ThemeProvider';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  style?: ViewStyle;
  size?: 'small' | 'medium' | 'large';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  trend,
  trendValue,
  style,
  size = 'medium',
}) => {
  const { theme } = useTheme();

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return theme.colors.success;
      case 'down':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: size === 'small' ? theme.spacing[3] : theme.spacing[4],
      ...theme.shadows.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    textContainer: {
      flex: 1,
    },
    iconContainer: {
      marginLeft: theme.spacing[3],
    },
    title: {
      fontSize: size === 'small' ? theme.typography.sizes.sm : theme.typography.sizes.base,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
      marginBottom: theme.spacing[1],
    },
    value: {
      fontSize: size === 'large' 
        ? theme.typography.sizes['3xl'] 
        : size === 'small' 
          ? theme.typography.sizes.lg 
          : theme.typography.sizes['2xl'],
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: size === 'large' ? 36 : size === 'small' ? 24 : 28,
    },
    subtitle: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing[1],
    },
    trendContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing[2],
    },
    trendText: {
      fontSize: theme.typography.sizes.sm,
      color: getTrendColor(),
      fontWeight: theme.typography.fontWeight.medium,
      marginLeft: theme.spacing[1],
    },
  });

  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardContent}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.value}>{value}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          
          {trend && trendValue && (
            <View style={styles.trendContainer}>
              <Ionicons
                name={getTrendIcon() as any}
                size={16}
                color={getTrendColor()}
              />
              <Text style={styles.trendText}>{trendValue}</Text>
            </View>
          )}
        </View>
        
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons
              name={icon as any}
              size={size === 'large' ? 32 : size === 'small' ? 20 : 24}
              color={iconColor || theme.colors.primary}
            />
          </View>
        )}
      </View>
    </View>
  );
};

export default StatCard;
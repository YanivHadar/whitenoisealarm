/**
 * Upgrade Prompt Banner
 * 
 * Subtle, non-intrusive banner that appears in various parts of the app
 * to encourage users to upgrade to premium.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export type BannerVariant = 'compact' | 'expanded' | 'floating';
export type BannerContext = 'alarm_limit' | 'sound_library' | 'settings' | 'general';

interface UpgradePromptBannerProps {
  variant?: BannerVariant;
  context?: BannerContext;
  onPress: () => void;
  onDismiss?: () => void;
  showDismiss?: boolean;
  style?: any;
}

const contextMessages = {
  alarm_limit: {
    title: 'Unlock Unlimited Alarms',
    subtitle: 'Create as many alarms as you need',
    icon: 'infinite',
    cta: 'Upgrade Now',
  },
  sound_library: {
    title: 'Premium Sound Library',
    subtitle: 'Access 100+ high-quality sounds',
    icon: 'musical-notes',
    cta: 'Explore Sounds',
  },
  settings: {
    title: 'Advanced Features Available',
    subtitle: 'Unlock white noise, custom audio & more',
    icon: 'settings',
    cta: 'See Features',
  },
  general: {
    title: 'Try Premium Free',
    subtitle: '7-day trial • Cancel anytime',
    icon: 'rocket',
    cta: 'Start Trial',
  },
};

export const UpgradePromptBanner: React.FC<UpgradePromptBannerProps> = ({
  variant = 'compact',
  context = 'general',
  onPress,
  onDismiss,
  showDismiss = false,
  style,
}) => {
  const { theme } = useTheme();
  const message = contextMessages[context];

  const getGradientColors = () => {
    // Sleep-optimized gradient colors
    return [theme.colors.primary + 'E6', theme.colors.primary + 'CC'];
  };

  const renderCompactBanner = () => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.compactContainer}
      >
        <View style={styles.compactContent}>
          <Ionicons
            name={message.icon as any}
            size={18}
            color="#FFFFFF"
            style={styles.compactIcon}
          />
          <View style={styles.compactText}>
            <Text style={styles.compactTitle}>{message.title}</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color="#FFFFFF"
            style={styles.compactArrow}
          />
        </View>

        {showDismiss && onDismiss && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderExpandedBanner = () => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.expandedContainer}
      >
        <View style={styles.expandedContent}>
          <View style={styles.expandedLeft}>
            <View style={styles.expandedIconContainer}>
              <Ionicons
                name={message.icon as any}
                size={24}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.expandedTextContainer}>
              <Text style={styles.expandedTitle}>{message.title}</Text>
              <Text style={styles.expandedSubtitle}>{message.subtitle}</Text>
            </View>
          </View>

          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>{message.cta}</Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color="#FFFFFF"
              style={styles.ctaArrow}
            />
          </View>
        </View>

        {showDismiss && onDismiss && (
          <TouchableOpacity
            style={styles.dismissButtonExpanded}
            onPress={onDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderFloatingBanner = () => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.floatingContainer}
      >
        <View style={styles.floatingContent}>
          <Ionicons
            name={message.icon as any}
            size={20}
            color="#FFFFFF"
            style={styles.floatingIcon}
          />
          <View style={styles.floatingText}>
            <Text style={styles.floatingTitle}>{message.title}</Text>
            <Text style={styles.floatingSubtitle}>{message.subtitle}</Text>
          </View>
          <View style={styles.floatingCta}>
            <Text style={styles.floatingCtaText}>{message.cta}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    // Compact variant
    compactContainer: {
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      ...style,
    },
    compactContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
    },
    compactIcon: {
      marginRight: theme.spacing[2],
    },
    compactText: {
      flex: 1,
    },
    compactTitle: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    compactArrow: {
      marginLeft: theme.spacing[2],
    },

    // Expanded variant
    expandedContainer: {
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
      ...style,
    },
    expandedContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing[4],
      paddingRight: theme.spacing[6],
    },
    expandedLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    expandedIconContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: theme.borderRadius.full,
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing[3],
    },
    expandedTextContainer: {
      flex: 1,
    },
    expandedTitle: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: 2,
    },
    expandedSubtitle: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: theme.typography.sizes.sm,
    },
    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[2],
    },
    ctaText: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    ctaArrow: {
      marginLeft: theme.spacing[1],
    },

    // Floating variant
    floatingContainer: {
      borderRadius: theme.borderRadius.xl,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      ...style,
    },
    floatingContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing[4],
    },
    floatingIcon: {
      marginRight: theme.spacing[3],
    },
    floatingText: {
      flex: 1,
      marginRight: theme.spacing[3],
    },
    floatingTitle: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: 2,
    },
    floatingSubtitle: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: theme.typography.sizes.xs,
    },
    floatingCta: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
    },
    floatingCtaText: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },

    // Dismiss buttons
    dismissButton: {
      position: 'absolute',
      top: theme.spacing[2],
      right: theme.spacing[2],
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: theme.borderRadius.full,
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dismissButtonExpanded: {
      position: 'absolute',
      top: theme.spacing[3],
      right: theme.spacing[3],
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: theme.borderRadius.full,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  switch (variant) {
    case 'compact':
      return renderCompactBanner();
    case 'expanded':
      return renderExpandedBanner();
    case 'floating':
      return renderFloatingBanner();
    default:
      return renderCompactBanner();
  }
};

export default UpgradePromptBanner;
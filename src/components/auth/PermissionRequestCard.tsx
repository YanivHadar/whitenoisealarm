/**
 * Permission Request Card Component
 * 
 * Reusable component for requesting app permissions during onboarding
 * or when needed. Provides clear explanations and handles permission logic.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../providers/ThemeProvider';
import Button from '../ui/Button';

export type PermissionType = 'notifications' | 'camera' | 'microphone' | 'location';

export interface PermissionRequestCardProps {
  /** Type of permission to request */
  permissionType: PermissionType;
  /** Title of the permission request */
  title?: string;
  /** Description explaining why this permission is needed */
  description?: string;
  /** Icon to display */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Called when permission is granted successfully */
  onPermissionGranted?: () => void;
  /** Called when permission is denied */
  onPermissionDenied?: () => void;
  /** Called when user skips this permission */
  onSkip?: () => void;
  /** Whether this permission is required (can't be skipped) */
  required?: boolean;
  /** Custom styling */
  containerStyle?: any;
}

export const PermissionRequestCard: React.FC<PermissionRequestCardProps> = ({
  permissionType,
  title,
  description,
  icon,
  onPermissionGranted,
  onPermissionDenied,
  onSkip,
  required = false,
  containerStyle,
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'pending' | 'granted' | 'denied'>('pending');

  const styles = createStyles(theme);

  const getDefaultProps = () => {
    switch (permissionType) {
      case 'notifications':
        return {
          title: title || 'Enable Notifications',
          description: description || 'Get reliable alarm notifications even when the app is closed. Essential for never missing your wake-up time.',
          icon: icon || 'notifications' as keyof typeof Ionicons.glyphMap,
        };
      case 'camera':
        return {
          title: title || 'Camera Access',
          description: description || 'Scan QR codes for quick alarm setup and sharing sleep routines with friends.',
          icon: icon || 'camera' as keyof typeof Ionicons.glyphMap,
        };
      case 'microphone':
        return {
          title: title || 'Microphone Access',
          description: description || 'Record custom alarm sounds and analyze sleep environment noise levels.',
          icon: icon || 'mic' as keyof typeof Ionicons.glyphMap,
        };
      case 'location':
        return {
          title: title || 'Location Services',
          description: description || 'Automatically adjust alarms based on your timezone and weather conditions.',
          icon: icon || 'location' as keyof typeof Ionicons.glyphMap,
        };
      default:
        return {
          title: title || 'Permission Required',
          description: description || 'This permission is needed for optimal app functionality.',
          icon: icon || 'shield-checkmark' as keyof typeof Ionicons.glyphMap,
        };
    }
  };

  const defaultProps = getDefaultProps();

  const requestPermission = async () => {
    setLoading(true);
    
    try {
      let result: any = { status: 'denied' };

      switch (permissionType) {
        case 'notifications':
          if (Platform.OS === 'ios') {
            result = await Notifications.requestPermissionsAsync({
              ios: {
                allowAlert: true,
                allowBadge: true,
                allowSound: true,
                allowCriticalAlerts: true,
              },
            });
          } else {
            result = await Notifications.requestPermissionsAsync();
          }
          break;
        
        case 'camera':
        case 'microphone':
        case 'location':
          // These would require additional permission libraries
          // For now, simulate permission request
          result = { status: 'granted' };
          break;
      }

      if (result.status === 'granted') {
        setStatus('granted');
        onPermissionGranted?.();
      } else {
        setStatus('denied');
        handlePermissionDenied();
      }

    } catch (error) {
      console.error(`Error requesting ${permissionType} permission:`, error);
      setStatus('denied');
      handlePermissionDenied();
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionDenied = () => {
    if (permissionType === 'notifications' && required) {
      Alert.alert(
        'Notifications Required',
        'Alarm notifications are essential for this app to work properly. Please enable notifications in your device settings.',
        [
          { text: 'Later', onPress: onPermissionDenied },
          { text: 'Open Settings', onPress: openSettings },
        ]
      );
    } else {
      onPermissionDenied?.();
    }
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      // On iOS, this would open the Settings app
      // Linking.openURL('app-settings:');
    } else {
      // On Android, open app settings
      // Linking.openSettings();
    }
  };

  const handleSkip = () => {
    if (required) {
      Alert.alert(
        'Permission Required',
        'This permission is required for the app to function properly.',
        [{ text: 'OK' }]
      );
      return;
    }
    onSkip?.();
  };

  const getStatusColor = () => {
    switch (status) {
      case 'granted':
        return theme.colors.success;
      case 'denied':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'granted':
        return 'checkmark-circle';
      case 'denied':
        return 'close-circle';
      default:
        return defaultProps.icon;
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { borderColor: getStatusColor() }]}>
          <Ionicons 
            name={getStatusIcon()} 
            size={32} 
            color={getStatusColor()} 
          />
        </View>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{defaultProps.title}</Text>
          <Text style={styles.description}>{defaultProps.description}</Text>
        </View>
      </View>

      {/* Status Message */}
      {status !== 'pending' && (
        <View style={[styles.statusContainer, { backgroundColor: `${getStatusColor()}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {status === 'granted' 
              ? 'Permission granted! You\'re all set.' 
              : 'Permission denied. You can enable this later in settings.'
            }
          </Text>
        </View>
      )}

      {/* Actions */}
      {status === 'pending' && (
        <View style={styles.actions}>
          <Button
            title={`Allow ${defaultProps.title.split(' ')[1] || 'Access'}`}
            variant="primary"
            size="medium"
            onPress={requestPermission}
            loading={loading}
            containerStyle={styles.allowButton}
          />
          
          {!required && (
            <Button
              title="Skip for Now"
              variant="secondary"
              size="medium"
              onPress={handleSkip}
              containerStyle={styles.skipButton}
            />
          )}
        </View>
      )}

      {status === 'denied' && required && (
        <View style={styles.actions}>
          <Button
            title="Try Again"
            variant="primary"
            size="medium"
            onPress={requestPermission}
            containerStyle={styles.allowButton}
          />
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[6],
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[4],
    marginBottom: theme.spacing[4],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    paddingTop: theme.spacing[1],
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing[2],
  },
  description: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: theme.lineHeight.relaxed * theme.fontSize.base,
  },
  statusContainer: {
    borderRadius: theme.borderRadius.default,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    marginBottom: theme.spacing[4],
  },
  statusText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    textAlign: 'center',
  },
  actions: {
    gap: theme.spacing[3],
  },
  allowButton: {
    minHeight: 44,
  },
  skipButton: {
    minHeight: 44,
  },
});

export default PermissionRequestCard;
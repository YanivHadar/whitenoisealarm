/**
 * Settings Home Screen
 * 
 * Main settings interface with organized sections
 * for account, preferences, and app configuration.
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsStackScreenProps } from '../../types/navigation';
import { useTheme } from '../../components/providers/ThemeProvider';
import { useAuthStore } from '../../store/auth-store';

type SettingsHomeScreenProps = SettingsStackScreenProps<'SettingsHome'>;

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

interface SettingsItem {
  title: string;
  subtitle?: string;
  icon: string;
  screen?: string;
  action?: () => void;
  badge?: string;
}

export const SettingsHomeScreen: React.FC<SettingsHomeScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { userProfile, signOut } = useAuthStore();

  const styles = createStyles(theme);

  const sections: SettingsSection[] = [
    {
      title: 'Account',
      items: [
        {
          title: 'Profile',
          subtitle: userProfile?.email,
          icon: 'person-outline',
          screen: 'Account',
        },
        {
          title: 'Subscription',
          subtitle: userProfile?.subscription_status || 'Free',
          icon: 'star-outline',
          screen: 'Subscription',
          badge: userProfile?.is_premium ? undefined : 'Upgrade',
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          title: 'Notifications',
          subtitle: 'Manage alarm and app notifications',
          icon: 'notifications-outline',
          screen: 'Notifications',
        },
        {
          title: 'Audio Settings',
          subtitle: 'Volume, routing, and sound preferences',
          icon: 'volume-high-outline',
          screen: 'Audio',
        },
        {
          title: 'Privacy',
          subtitle: 'Data usage and biometric settings',
          icon: 'shield-checkmark-outline',
          screen: 'Privacy',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          title: 'Help & FAQ',
          subtitle: 'Get help with common questions',
          icon: 'help-circle-outline',
          screen: 'Help',
        },
        {
          title: 'About',
          subtitle: 'App version and legal information',
          icon: 'information-circle-outline',
          screen: 'About',
        },
      ],
    },
    {
      title: 'Account Actions',
      items: [
        {
          title: 'Sign Out',
          subtitle: 'Sign out of your account',
          icon: 'log-out-outline',
          action: () => signOut(),
        },
      ],
    },
  ];

  const handleItemPress = (item: SettingsItem) => {
    if (item.action) {
      item.action();
    } else if (item.screen) {
      // Will be implemented when screen routing is set up
      console.log(`Navigate to ${item.screen}`);
    }
  };

  const renderSettingsItem = (item: SettingsItem, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.settingsItem}
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.itemLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon as any} size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          {item.subtitle && (
            <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
          )}
        </View>
      </View>
      
      <View style={styles.itemRight}>
        {item.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  const renderSection = (section: SettingsSection, index: number) => (
    <View key={index} style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionContent}>
        {section.items.map(renderSettingsItem)}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Settings Sections */}
        {sections.map(renderSection)}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  section: {
    marginTop: theme.spacing[6],
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: theme.spacing[6],
    marginBottom: theme.spacing[3],
  },
  sectionContent: {
    backgroundColor: theme.colors.card,
    marginHorizontal: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${theme.colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing[3],
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  itemSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[1],
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  badge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.default,
  },
  badgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: '#FFFFFF',
  },
});

export default SettingsHomeScreen;
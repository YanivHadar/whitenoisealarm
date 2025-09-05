/**
 * Create/Edit Alarm Screen
 * 
 * Comprehensive alarm creation and editing interface
 * with white noise integration and sleep optimization.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { AlarmStackScreenProps } from '../../types/navigation';
import { useTheme } from '../../components/providers/ThemeProvider';
import Button from '../../components/ui/Button';

type CreateAlarmScreenProps = AlarmStackScreenProps<'CreateAlarm'>;

export const CreateAlarmScreen: React.FC<CreateAlarmScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { alarmId } = route.params || {};
  const isEditing = !!alarmId;

  const styles = createStyles(theme);

  const [time, setTime] = useState('07:00');
  const [label, setLabel] = useState('');
  const [repeatDays, setRepeatDays] = useState<string[]>([]);
  const [hasWhiteNoise, setHasWhiteNoise] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Alarm' : 'Create Alarm'
    });
  }, [navigation, isEditing]);

  const handleSave = async () => {
    // Implementation will be added in future phases
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Time Picker Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alarm Time</Text>
          <View style={styles.timeDisplay}>
            <Text style={styles.timeText}>{time}</Text>
          </View>
        </View>

        {/* Label Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Label (Optional)</Text>
          <Text style={styles.placeholder}>Wake up, Morning routine, etc.</Text>
        </View>

        {/* Repeat Days Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Repeat</Text>
          <Text style={styles.placeholder}>Select days of the week</Text>
        </View>

        {/* White Noise Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>White Noise Integration</Text>
          <Text style={styles.placeholder}>Configure sleep sounds</Text>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Button
          title={isEditing ? "Update Alarm" : "Create Alarm"}
          variant="primary"
          size="large"
          fullWidth
          onPress={handleSave}
        />
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing[6],
  },
  section: {
    marginBottom: theme.spacing[6],
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing[3],
  },
  timeDisplay: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[6],
    alignItems: 'center',
  },
  timeText: {
    fontSize: theme.fontSize['4xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  placeholder: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  footer: {
    padding: theme.spacing[6],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});

export default CreateAlarmScreen;
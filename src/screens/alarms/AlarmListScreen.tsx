/**
 * Alarm List Screen
 * 
 * Main screen showing user's alarms with sleep-optimized controls
 * and intuitive management interface.
 */

import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  RefreshControl,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AlarmStackScreenProps } from '../../types/navigation';
import { useTheme } from '../../components/providers/ThemeProvider';
import { Alarm } from '../../types/alarm';
import { AlarmService } from '../../services/alarm-service';
import Button from '../../components/ui/Button';

type AlarmListScreenProps = AlarmStackScreenProps<'AlarmList'>;

export const AlarmListScreen: React.FC<AlarmListScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = createStyles(theme);

  const loadAlarms = async () => {
    try {
      const result = await AlarmService.getAllAlarms();
      if (result.success && result.data) {
        setAlarms(result.data);
      }
    } catch (error) {
      console.error('Failed to load alarms:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlarms();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAlarms();
  };

  const toggleAlarm = async (alarm: Alarm) => {
    try {
      const result = await AlarmService.updateAlarm(alarm.id, {
        ...alarm,
        is_enabled: !alarm.is_enabled,
      });
      
      if (result.success) {
        setAlarms(prev => 
          prev.map(a => 
            a.id === alarm.id ? { ...a, is_enabled: !alarm.is_enabled } : a
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle alarm:', error);
      Alert.alert('Error', 'Failed to update alarm');
    }
  };

  const deleteAlarm = async (alarm: Alarm) => {
    Alert.alert(
      'Delete Alarm',
      `Are you sure you want to delete the alarm for ${alarm.time}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await AlarmService.deleteAlarm(alarm.id);
              if (result.success) {
                setAlarms(prev => prev.filter(a => a.id !== alarm.id));
              }
            } catch (error) {
              console.error('Failed to delete alarm:', error);
              Alert.alert('Error', 'Failed to delete alarm');
            }
          },
        },
      ]
    );
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatRepeatDays = (repeatDays: string[]) => {
    if (repeatDays.length === 0) return 'Once';
    if (repeatDays.length === 7) return 'Every day';
    
    const dayAbbrev = {
      monday: 'Mon',
      tuesday: 'Tue', 
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun',
    };
    
    return repeatDays.map(day => dayAbbrev[day as keyof typeof dayAbbrev]).join(', ');
  };

  const renderAlarm = ({ item: alarm }: { item: Alarm }) => (
    <TouchableOpacity 
      style={[styles.alarmCard, !alarm.is_enabled && styles.alarmCardDisabled]}
      onPress={() => navigation.navigate('EditAlarm', { alarmId: alarm.id })}
    >
      <View style={styles.alarmContent}>
        {/* Time Display */}
        <View style={styles.timeSection}>
          <Text style={[styles.timeText, !alarm.is_enabled && styles.timeTextDisabled]}>
            {formatTime(alarm.time)}
          </Text>
          <Text style={[styles.repeatText, !alarm.is_enabled && styles.repeatTextDisabled]}>
            {formatRepeatDays(alarm.repeat_days)}
          </Text>
        </View>

        {/* Alarm Details */}
        <View style={styles.detailsSection}>
          {alarm.label && (
            <Text style={[styles.labelText, !alarm.is_enabled && styles.labelTextDisabled]} numberOfLines={1}>
              {alarm.label}
            </Text>
          )}
          
          {alarm.has_white_noise && (
            <View style={styles.featureRow}>
              <Ionicons name="musical-notes" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.featureText}>White noise</Text>
            </View>
          )}
        </View>

        {/* Toggle Switch */}
        <TouchableOpacity 
          style={[styles.toggle, alarm.is_enabled ? styles.toggleActive : styles.toggleInactive]}
          onPress={() => toggleAlarm(alarm)}
        >
          <View style={[styles.toggleThumb, alarm.is_enabled && styles.toggleThumbActive]} />
        </TouchableOpacity>
      </View>

      {/* Swipe Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => deleteAlarm(alarm)}
        >
          <Ionicons name="trash" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="alarm-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={styles.emptyTitle}>No alarms set</Text>
      <Text style={styles.emptySubtitle}>
        Create your first alarm to start optimizing your sleep routine
      </Text>
      <Button
        title="Create First Alarm"
        variant="primary"
        size="medium"
        onPress={() => navigation.navigate('CreateAlarm')}
        containerStyle={styles.emptyButton}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Alarms</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateAlarm')}
        >
          <Ionicons name="add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Alarms List */}
      <FlatList
        data={alarms}
        renderItem={renderAlarm}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContainer,
          alarms.length === 0 && styles.listContainerEmpty
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    padding: theme.spacing[2],
  },
  listContainer: {
    padding: theme.spacing[4],
  },
  listContainerEmpty: {
    flex: 1,
  },
  alarmCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[3],
    ...theme.shadows.sm,
  },
  alarmCardDisabled: {
    opacity: 0.6,
  },
  alarmContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[4],
  },
  timeSection: {
    flex: 1,
  },
  timeText: {
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  timeTextDisabled: {
    color: theme.colors.textSecondary,
  },
  repeatText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[1],
  },
  repeatTextDisabled: {
    color: theme.colors.disabled,
  },
  detailsSection: {
    flex: 1,
    paddingHorizontal: theme.spacing[4],
  },
  labelText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.text,
    marginBottom: theme.spacing[1],
  },
  labelTextDisabled: {
    color: theme.colors.textSecondary,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  featureText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleInactive: {
    backgroundColor: theme.colors.disabled,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[3],
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.default,
    padding: theme.spacing[2],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[8],
  },
  emptyTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  emptySubtitle: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.lineHeight.relaxed * theme.fontSize.base,
    marginBottom: theme.spacing[6],
  },
  emptyButton: {
    minWidth: 160,
  },
});

export default AlarmListScreen;
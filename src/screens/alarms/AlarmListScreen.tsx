/**
 * Alarm List Screen
 * 
 * Main screen showing user's alarms with sleep-optimized controls
 * and intuitive management interface.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  RefreshControl,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AlarmStackScreenProps } from '../../types/navigation';
import { useTheme } from '../../components/providers/ThemeProvider';
import { Alarm } from '../../types/alarm';
import { EnhancedAlarmService } from '../../services/alarm-service';
import { SessionProgressBar } from '../../components/SessionProgressBar';
import Button from '../../components/ui/Button';
import { PremiumGateModal } from '../../components/ui/PremiumGateModal';
import { UpgradePromptBanner } from '../../components/ui/UpgradePromptBanner';
import { subscriptionService } from '../../services/subscription-service';
import { supabase } from '../../lib/supabase/client';

type AlarmListScreenProps = AlarmStackScreenProps<'AlarmList'>;

export const AlarmListScreen: React.FC<AlarmListScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedAlarms, setSelectedAlarms] = useState<string[]>([]);
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);
  const fabAnimation = useRef(new Animated.Value(1)).current;

  const styles = createStyles(theme);

  const checkPremiumStatus = async () => {
    try {
      const hasPremium = await subscriptionService.hasPremiumAccess();
      setIsPremium(hasPremium);
      
      // Hide upgrade banner if user is premium
      if (hasPremium) {
        setShowUpgradeBanner(false);
      }
    } catch (error) {
      console.error('Failed to check premium status:', error);
    }
  };

  const loadAlarms = async () => {
    try {
      // Load both alarms and premium status
      const [result] = await Promise.all([
        EnhancedAlarmService.getUserAlarms('current-user-id'),
        checkPremiumStatus(),
      ]);
      
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

  // Real-time subscription for alarm updates
  useEffect(() => {
    loadAlarms();
    
    // Set up real-time subscription
    const alarmsSubscription = supabase
      .channel('alarms-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'alarms' },
        (payload) => {
          console.log('Alarm change detected:', payload);
          handleRealtimeUpdate(payload);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(alarmsSubscription);
    };
  }, []);

  const handleRealtimeUpdate = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    setAlarms(currentAlarms => {
      switch (eventType) {
        case 'INSERT':
          return [...currentAlarms, newRecord as Alarm];
        case 'UPDATE':
          return currentAlarms.map(alarm => 
            alarm.id === newRecord.id ? newRecord as Alarm : alarm
          );
        case 'DELETE':
          return currentAlarms.filter(alarm => alarm.id !== oldRecord.id);
        default:
          return currentAlarms;
      }
    });
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAlarms();
  };

  const toggleAlarm = async (alarm: Alarm) => {
    try {
      const newEnabledState = !alarm.enabled;
      
      // Single active alarm logic: if enabling this alarm, disable all others
      if (newEnabledState) {
        const updates: Promise<any>[] = [];
        
        // Disable all other enabled alarms
        const enabledAlarms = alarms.filter(a => a.enabled && a.id !== alarm.id);
        for (const enabledAlarm of enabledAlarms) {
          updates.push(
            EnhancedAlarmService.update(enabledAlarm.id, {
              enabled: false,
            })
          );
        }
        
        // Enable the selected alarm
        updates.push(
          EnhancedAlarmService.update(alarm.id, {
            enabled: true,
          })
        );
        
        await Promise.all(updates);
        
        // Update local state
        setAlarms(prev => 
          prev.map(a => ({
            ...a,
            enabled: a.id === alarm.id ? true : false
          }))
        );
        
        setActiveAlarm({ ...alarm, enabled: true });
      } else {
        // Just disable this alarm
        const result = await EnhancedAlarmService.update(alarm.id, {
          enabled: false,
        });
        
        if (result.success) {
          setAlarms(prev => 
            prev.map(a => 
              a.id === alarm.id ? { ...a, enabled: false } : a
            )
          );
          setActiveAlarm(null);
        }
      }
    } catch (error) {
      console.error('Failed to toggle alarm:', error);
      Alert.alert('Error', 'Failed to update alarm');
    }
  };

  const enterEditMode = () => {
    setEditMode(true);
    setSelectedAlarms([]);
    
    // Animate FAB out
    Animated.timing(fabAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const exitEditMode = () => {
    setEditMode(false);
    setSelectedAlarms([]);
    
    // Animate FAB in
    Animated.timing(fabAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const toggleAlarmSelection = (alarmId: string) => {
    setSelectedAlarms(prev => 
      prev.includes(alarmId) 
        ? prev.filter(id => id !== alarmId)
        : [...prev, alarmId]
    );
  };

  const deleteSelectedAlarms = () => {
    if (selectedAlarms.length === 0) return;
    
    Alert.alert(
      'Delete Alarms',
      `Are you sure you want to delete ${selectedAlarms.length} alarm${selectedAlarms.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const deletePromises = selectedAlarms.map(id => 
                EnhancedAlarmService.delete(id)
              );
              
              await Promise.all(deletePromises);
              
              setAlarms(prev => 
                prev.filter(alarm => !selectedAlarms.includes(alarm.id))
              );
              
              exitEditMode();
            } catch (error) {
              console.error('Failed to delete alarms:', error);
              Alert.alert('Error', 'Failed to delete selected alarms');
            }
          },
        },
      ]
    );
  };

  const playAlarm = async (alarm: Alarm) => {
    try {
      // This would start the alarm/white noise session
      console.log('Playing alarm:', alarm.id);
      
      // Navigate to session monitoring if implemented
      // navigation.navigate('SessionMonitoring', { sessionId: alarm.id });
    } catch (error) {
      console.error('Failed to start alarm:', error);
      Alert.alert('Error', 'Failed to start alarm session');
    }
  };

  const pauseAlarm = async (alarm: Alarm) => {
    try {
      // This would pause the current session
      console.log('Pausing alarm:', alarm.id);
    } catch (error) {
      console.error('Failed to pause alarm:', error);
      Alert.alert('Error', 'Failed to pause alarm session');
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
              const result = await EnhancedAlarmService.delete(alarm.id);
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

  const renderAlarm = ({ item: alarm }: { item: Alarm }) => {
    const isSelected = selectedAlarms.includes(alarm.id);
    const isActive = activeAlarm?.id === alarm.id;
    
    return (
      <TouchableOpacity 
        style={[
          styles.alarmCard, 
          !alarm.enabled && styles.alarmCardDisabled,
          isSelected && styles.alarmCardSelected,
          isActive && styles.alarmCardActive
        ]}
        onPress={() => {
          if (editMode) {
            toggleAlarmSelection(alarm.id);
          } else {
            navigation.navigate('EditAlarm', { alarmId: alarm.id });
          }
        }}
        onLongPress={() => {
          if (!editMode) {
            enterEditMode();
            toggleAlarmSelection(alarm.id);
          }
        }}
      >
        {/* Two-Column Layout */}
        <View style={styles.alarmContent}>
          {/* Left Column - Time & Details */}
          <View style={styles.leftColumn}>
            {/* Selection Checkbox (Edit Mode) */}
            {editMode && (
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => toggleAlarmSelection(alarm.id)}
              >
                <View style={[styles.checkboxInner, isSelected && styles.checkboxSelected]}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>
            )}
            
            {/* Time Display */}
            <View style={styles.timeSection}>
              <Text style={[styles.timeText, !alarm.enabled && styles.timeTextDisabled]}>
                {formatTime(alarm.time)}
              </Text>
              <Text style={[styles.repeatText, !alarm.enabled && styles.repeatTextDisabled]}>
                {formatRepeatDays(Array.isArray(alarm.repeat_days) 
                  ? alarm.repeat_days.map(String) 
                  : []
                )}
              </Text>
            </View>

            {/* Alarm Details */}
            <View style={styles.detailsSection}>
              {alarm.name && (
                <Text style={[styles.labelText, !alarm.enabled && styles.labelTextDisabled]} numberOfLines={1}>
                  {alarm.name}
                </Text>
              )}
              
              {alarm.white_noise_enabled && (
                <View style={styles.featureRow}>
                  <Ionicons name="musical-notes" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.featureText}>White noise</Text>
                </View>
              )}
            </View>

            {/* Progress Bar for Active Alarm */}
            {isActive && alarm.enabled && (
              <View style={styles.progressSection}>
                <SessionProgressBar 
                  height={6}
                  showTimeLabels={false}
                  showPercentage={false}
                  animated={true}
                />
              </View>
            )}
          </View>

          {/* Right Column - Controls */}
          <View style={styles.rightColumn}>
            {!editMode && (
              <>
                {/* Play/Pause Controls */}
                {alarm.enabled && (
                  <View style={styles.controlsContainer}>
                    <TouchableOpacity 
                      style={styles.playButton}
                      onPress={() => isActive ? pauseAlarm(alarm) : playAlarm(alarm)}
                    >
                      <Ionicons 
                        name={isActive ? "pause" : "play"} 
                        size={20} 
                        color="#FFFFFF" 
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Toggle Switch */}
                <TouchableOpacity 
                  style={[styles.toggle, alarm.enabled ? styles.toggleActive : styles.toggleInactive]}
                  onPress={() => toggleAlarm(alarm)}
                >
                  <View style={[styles.toggleThumb, alarm.enabled && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </>
            )}
            
            {/* Delete button in edit mode */}
            {editMode && isSelected && (
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => deleteAlarm(alarm)}
              >
                <Ionicons name="trash" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.title}>
          {editMode ? `${selectedAlarms.length} Selected` : 'Your Alarms'}
        </Text>
        
        <View style={styles.headerActions}>
          {editMode ? (
            <>
              {selectedAlarms.length > 0 && (
                <TouchableOpacity 
                  style={styles.headerButton}
                  onPress={deleteSelectedAlarms}
                >
                  <Ionicons name="trash" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={exitEditMode}
              >
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={enterEditMode}
            >
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
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

      {/* Floating Action Button */}
      <Animated.View 
        style={[
          styles.fabContainer,
          {
            opacity: fabAnimation,
            transform: [{
              scale: fabAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            }],
          },
        ]}
        pointerEvents={editMode ? 'none' : 'auto'}
      >
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('CreateAlarm')}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  headerButton: {
    padding: theme.spacing[2],
  },
  editText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
  },
  doneText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
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
  alarmCardSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: theme.colors.primaryBackground,
  },
  alarmCardActive: {
    borderColor: theme.colors.success,
    borderWidth: 2,
    backgroundColor: theme.colors.successBackground,
  },
  alarmContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: theme.spacing[4],
  },
  leftColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[3],
  },
  rightColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 80,
    gap: theme.spacing[2],
  },
  checkbox: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing[1],
  },
  checkboxInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
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
  progressSection: {
    width: '100%',
    marginTop: theme.spacing[3],
  },
  controlsContainer: {
    alignItems: 'center',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
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
  fabContainer: {
    position: 'absolute',
    bottom: theme.spacing[6],
    right: theme.spacing[6],
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
    elevation: 8,
  },
});

export default AlarmListScreen;
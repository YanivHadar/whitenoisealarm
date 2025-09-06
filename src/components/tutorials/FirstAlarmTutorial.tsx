/**
 * First Alarm Tutorial Component
 * 
 * Interactive tutorial that guides users through creating their first alarm
 * with step-by-step instructions and visual highlights. Can be used in onboarding
 * or when a user creates their first alarm.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import Button from '../ui/Button';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string;
  highlightArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  actionText?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Create Your First Alarm',
    description: 'Let\'s walk through setting up an alarm with white noise to optimize your sleep routine.',
    actionText: 'Start Tutorial',
  },
  {
    id: 'time_selection',
    title: 'Set Your Wake-Up Time',
    description: 'Choose when you want to wake up. You can always adjust this later for different days.',
    highlightArea: { x: 20, y: 200, width: screenWidth - 40, height: 120 },
    actionText: 'Next',
  },
  {
    id: 'repeat_days',
    title: 'Choose Repeat Days',
    description: 'Select which days this alarm should repeat. Perfect for your work schedule or weekend routines.',
    highlightArea: { x: 20, y: 340, width: screenWidth - 40, height: 80 },
    actionText: 'Next',
  },
  {
    id: 'white_noise',
    title: 'Add White Noise',
    description: 'Enable white noise to help you fall asleep faster and sleep more deeply before your alarm.',
    highlightArea: { x: 20, y: 440, width: screenWidth - 40, height: 100 },
    actionText: 'Next',
  },
  {
    id: 'sound_selection',
    title: 'Choose Your Sounds',
    description: 'Pick from our curated library of sleep-optimized sounds that will play until your alarm.',
    highlightArea: { x: 20, y: 560, width: screenWidth - 40, height: 120 },
    actionText: 'Next',
  },
  {
    id: 'alarm_tone',
    title: 'Select Alarm Tone',
    description: 'Choose a gentle wake-up sound that will gradually increase to wake you naturally.',
    highlightArea: { x: 20, y: 700, width: screenWidth - 40, height: 80 },
    actionText: 'Next',
  },
  {
    id: 'completion',
    title: 'You\'re All Set!',
    description: 'Your alarm is ready. It will start white noise at bedtime and wake you up at the perfect time.',
    actionText: 'Finish Tutorial',
  },
];

export interface FirstAlarmTutorialProps {
  /** Whether the tutorial modal is visible */
  visible: boolean;
  /** Called when tutorial is dismissed or completed */
  onComplete: () => void;
  /** Called when tutorial is skipped */
  onSkip?: () => void;
  /** Custom steps to show (optional) */
  customSteps?: TutorialStep[];
  /** Whether to show skip option */
  allowSkip?: boolean;
}

export const FirstAlarmTutorial: React.FC<FirstAlarmTutorialProps> = ({
  visible,
  onComplete,
  onSkip,
  customSteps,
  allowSkip = true,
}) => {
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  const styles = createStyles(theme);
  const steps = customSteps || TUTORIAL_STEPS;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setCurrentStep(0);
    onComplete();
  };

  const handleSkip = () => {
    setCurrentStep(0);
    onSkip?.();
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.8)" />
        
        {/* Dark overlay */}
        <Animated.View 
          style={[
            styles.backgroundOverlay,
            { opacity: fadeAnim }
          ]} 
        />

        {/* Highlight area */}
        {currentStepData.highlightArea && (
          <Animated.View
            style={[
              styles.highlight,
              {
                left: currentStepData.highlightArea.x,
                top: currentStepData.highlightArea.y,
                width: currentStepData.highlightArea.width,
                height: currentStepData.highlightArea.height,
                opacity: fadeAnim,
              },
            ]}
          />
        )}

        {/* Tutorial content */}
        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { width: `${((currentStep + 1) / steps.length) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {currentStep + 1} of {steps.length}
              </Text>
            </View>

            {/* Step content */}
            <View style={styles.stepContent}>
              <View style={styles.iconContainer}>
                <Ionicons 
                  name={currentStep === 0 ? 'bulb-outline' : currentStep === steps.length - 1 ? 'checkmark-circle' : 'information-circle'} 
                  size={32} 
                  color={theme.colors.primary} 
                />
              </View>

              <Text style={styles.stepTitle}>{currentStepData.title}</Text>
              <Text style={styles.stepDescription}>{currentStepData.description}</Text>
            </View>

            {/* Tutorial tips */}
            <View style={styles.tipsContainer}>
              {currentStep === 0 && (
                <View style={styles.tipItem}>
                  <Ionicons name="bulb" size={16} color={theme.colors.warning} />
                  <Text style={styles.tipText}>
                    This tutorial will help you create the perfect sleep routine
                  </Text>
                </View>
              )}
              
              {currentStep === steps.length - 1 && (
                <View style={styles.tipItem}>
                  <Ionicons name="moon" size={16} color={theme.colors.primary} />
                  <Text style={styles.tipText}>
                    Your alarm will automatically start white noise 30 minutes before bedtime
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <View style={styles.actionRow}>
              {/* Skip button */}
              {allowSkip && !isLastStep && (
                <Button
                  title="Skip Tutorial"
                  variant="secondary"
                  size="medium"
                  onPress={handleSkip}
                  containerStyle={styles.skipButton}
                />
              )}

              {/* Previous button */}
              {currentStep > 0 && (
                <Button
                  title="Previous"
                  variant="secondary"
                  size="medium"
                  onPress={handlePrevious}
                  containerStyle={styles.previousButton}
                />
              )}

              {/* Next/Finish button */}
              <Button
                title={currentStepData.actionText || 'Next'}
                variant="primary"
                size="medium"
                onPress={handleNext}
                containerStyle={styles.nextButton}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    position: 'relative',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  highlight: {
    position: 'absolute',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 3,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: screenHeight * 0.5,
    minHeight: 300,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing[6],
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[6],
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  progressText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  stepContent: {
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[4],
  },
  stepTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing[3],
  },
  stepDescription: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.lineHeight.relaxed * theme.fontSize.base,
    maxWidth: 280,
  },
  tipsContainer: {
    marginBottom: theme.spacing[4],
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[3],
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[2],
  },
  tipText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.lineHeight.relaxed * theme.fontSize.sm,
  },
  actions: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
    paddingBottom: theme.spacing[6],
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  skipButton: {
    flex: 1,
    minHeight: 44,
  },
  previousButton: {
    flex: 1,
    minHeight: 44,
  },
  nextButton: {
    flex: 2,
    minHeight: 44,
  },
});

export default FirstAlarmTutorial;
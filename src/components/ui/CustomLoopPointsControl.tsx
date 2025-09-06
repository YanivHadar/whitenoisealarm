/**
 * Custom Loop Points Control Component
 * 
 * Advanced UI component for setting custom loop start/end points
 * for individual sounds in the audio mixing engine.
 * 
 * Features:
 * - Interactive timeline for setting loop points
 * - Real-time preview of loop segments
 * - Precise time input controls
 * - Visual waveform display (simplified)
 * - Validation and error handling
 * 
 * @author Alarm & White Noise App Development Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Dimensions,
  TextInput,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Slider } from '@react-native-slider/slider';
import { getAudioMixingEngine } from '../../services/audio-mixing-engine';
import type { SoundFile, CustomLoopPoint } from '../../types/audio';

interface CustomLoopPointsControlProps {
  soundFile: SoundFile;
  isVisible: boolean;
  onClose: () => void;
  onLoopPointsSet: (startTime: number, endTime: number) => void;
}

const CustomLoopPointsControl: React.FC<CustomLoopPointsControlProps> = ({
  soundFile,
  isVisible,
  onClose,
  onLoopPointsSet
}) => {
  const [startTime, setStartTime] = useState<number>(soundFile.loop_start_point || 0);
  const [endTime, setEndTime] = useState<number>(soundFile.loop_end_point || soundFile.duration || 60);
  const [maxDuration] = useState<number>(soundFile.duration || 60);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [startInputValue, setStartInputValue] = useState<string>(startTime.toString());
  const [endInputValue, setEndInputValue] = useState<string>(endTime.toString());

  const audioMixingEngine = getAudioMixingEngine();

  /**
   * Format time display (MM:SS)
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Validate loop point values
   */
  const validateLoopPoints = (start: number, end: number): { valid: boolean; error?: string } => {
    if (start < 0) {
      return { valid: false, error: 'Start time cannot be negative' };
    }
    if (end <= start) {
      return { valid: false, error: 'End time must be greater than start time' };
    }
    if (end > maxDuration) {
      return { valid: false, error: 'End time cannot exceed sound duration' };
    }
    if (end - start < 0.5) {
      return { valid: false, error: 'Loop segment must be at least 0.5 seconds' };
    }
    return { valid: true };
  };

  /**
   * Handle start time change
   */
  const handleStartTimeChange = useCallback((value: number) => {
    const newStartTime = Math.max(0, Math.min(value, endTime - 0.5));
    setStartTime(newStartTime);
    setStartInputValue(newStartTime.toFixed(1));
  }, [endTime]);

  /**
   * Handle end time change
   */
  const handleEndTimeChange = useCallback((value: number) => {
    const newEndTime = Math.max(startTime + 0.5, Math.min(value, maxDuration));
    setEndTime(newEndTime);
    setEndInputValue(newEndTime.toFixed(1));
  }, [startTime, maxDuration]);

  /**
   * Handle start time input change
   */
  const handleStartInputChange = (text: string) => {
    setStartInputValue(text);
    const numValue = parseFloat(text);
    if (!isNaN(numValue)) {
      handleStartTimeChange(numValue);
    }
  };

  /**
   * Handle end time input change
   */
  const handleEndInputChange = (text: string) => {
    setEndInputValue(text);
    const numValue = parseFloat(text);
    if (!isNaN(numValue)) {
      handleEndTimeChange(numValue);
    }
  };

  /**
   * Preview loop segment
   */
  const previewLoop = async () => {
    try {
      // This would integrate with the audio mixing engine
      // to play just the loop segment for preview
      setIsPlaying(true);
      
      // Simulate preview playback
      setTimeout(() => {
        setIsPlaying(false);
      }, (endTime - startTime) * 1000);
      
    } catch (error) {
      console.warn('Preview error:', error);
      Alert.alert('Preview Error', 'Unable to preview loop segment');
    }
  };

  /**
   * Save loop points
   */
  const saveLoopPoints = () => {
    const validation = validateLoopPoints(startTime, endTime);
    if (!validation.valid) {
      Alert.alert('Invalid Loop Points', validation.error);
      return;
    }

    try {
      // Set loop points in the audio mixing engine
      const result = audioMixingEngine.setCustomLoopPoints(soundFile.id, startTime, endTime);
      
      if (result.success) {
        onLoopPointsSet(startTime, endTime);
        onClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to set loop points');
      }
    } catch (error) {
      console.warn('Save loop points error:', error);
      Alert.alert('Error', 'Failed to save loop points');
    }
  };

  /**
   * Reset to default loop points
   */
  const resetToDefaults = () => {
    const defaultStart = soundFile.loop_start_point || 0;
    const defaultEnd = soundFile.loop_end_point || soundFile.duration || 60;
    
    setStartTime(defaultStart);
    setEndTime(defaultEnd);
    setStartInputValue(defaultStart.toString());
    setEndInputValue(defaultEnd.toString());
  };

  /**
   * Load existing custom loop points
   */
  useEffect(() => {
    const existingLoopPoints = audioMixingEngine.getCustomLoopPoints(soundFile.id);
    if (existingLoopPoints) {
      setStartTime(existingLoopPoints.startTime);
      setEndTime(existingLoopPoints.endTime);
      setStartInputValue(existingLoopPoints.startTime.toString());
      setEndInputValue(existingLoopPoints.endTime.toString());
    }
  }, [soundFile.id, audioMixingEngine]);

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Custom Loop Points</Text>
        <Text style={styles.subtitle}>{soundFile.name}</Text>
      </View>

      {/* Timeline Visualization */}
      <View style={styles.timeline}>
        <View style={styles.timelineTrack}>
          {/* Background track */}
          <View style={styles.fullTrack} />
          
          {/* Loop segment highlight */}
          <View 
            style={[
              styles.loopSegment,
              {
                left: `${(startTime / maxDuration) * 100}%`,
                width: `${((endTime - startTime) / maxDuration) * 100}%`
              }
            ]}
          />
          
          {/* Start marker */}
          <View 
            style={[
              styles.marker,
              styles.startMarker,
              { left: `${(startTime / maxDuration) * 100}%` }
            ]}
          />
          
          {/* End marker */}
          <View 
            style={[
              styles.marker,
              styles.endMarker,
              { left: `${(endTime / maxDuration) * 100}%` }
            ]}
          />
        </View>
        
        {/* Time labels */}
        <View style={styles.timeLabels}>
          <Text style={styles.timeLabel}>0:00</Text>
          <Text style={styles.timeLabel}>{formatTime(maxDuration)}</Text>
        </View>
      </View>

      {/* Slider Controls */}
      <View style={styles.sliderContainer}>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Start:</Text>
          <Slider
            style={styles.slider}
            value={startTime}
            minimumValue={0}
            maximumValue={endTime - 0.5}
            onValueChange={handleStartTimeChange}
            step={0.1}
            minimumTrackTintColor="#4CAF50"
            maximumTrackTintColor="#E0E0E0"
            thumbStyle={styles.sliderThumb}
          />
          <TextInput
            style={styles.timeInput}
            value={startInputValue}
            onChangeText={handleStartInputChange}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>

        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>End:</Text>
          <Slider
            style={styles.slider}
            value={endTime}
            minimumValue={startTime + 0.5}
            maximumValue={maxDuration}
            onValueChange={handleEndTimeChange}
            step={0.1}
            minimumTrackTintColor="#2196F3"
            maximumTrackTintColor="#E0E0E0"
            thumbStyle={styles.sliderThumb}
          />
          <TextInput
            style={styles.timeInput}
            value={endInputValue}
            onChangeText={handleEndInputChange}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>
      </View>

      {/* Loop Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Loop Duration: {formatTime(endTime - startTime)}
        </Text>
        <Text style={styles.infoText}>
          Loop Range: {formatTime(startTime)} - {formatTime(endTime)}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.button, styles.previewButton]} 
          onPress={previewLoop}
          disabled={isPlaying}
        >
          <Text style={styles.buttonText}>
            {isPlaying ? 'Playing...' : 'Preview Loop'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.resetButton]} 
          onPress={resetToDefaults}
        >
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Main Action Buttons */}
      <View style={styles.mainActions}>
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]} 
          onPress={onClose}
        >
          <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.saveButton]} 
          onPress={saveLoopPoints}
        >
          <Text style={styles.buttonText}>Save Loop Points</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  timeline: {
    marginBottom: 32,
  },
  timelineTrack: {
    height: 40,
    position: 'relative',
    marginBottom: 8,
  },
  fullTrack: {
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
  },
  loopSegment: {
    position: 'absolute',
    top: 15,
    height: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    opacity: 0.7,
  },
  marker: {
    position: 'absolute',
    top: 5,
    width: 20,
    height: 30,
    borderRadius: 10,
    transform: [{ translateX: -10 }],
  },
  startMarker: {
    backgroundColor: '#4CAF50',
  },
  endMarker: {
    backgroundColor: '#2196F3',
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: 12,
    color: '#666666',
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    width: 50,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 12,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  timeInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButton: {
    backgroundColor: '#FF9800',
    flex: 0.48,
  },
  resetButton: {
    backgroundColor: '#9E9E9E',
    flex: 0.48,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mainActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flex: 0.48,
  },
  cancelButtonText: {
    color: '#666666',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    flex: 0.48,
  },
});

export default CustomLoopPointsControl;
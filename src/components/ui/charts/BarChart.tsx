/**
 * Mobile-optimized Bar Chart Component
 * 
 * Custom bar chart implementation using React Native SVG for analytics visualization.
 * Designed for categorical data display with mobile-friendly interactions.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import Svg, { Rect, Text as SvgText, Line, G } from 'react-native-svg';
import { useTheme } from '../../providers/ThemeProvider';

export interface BarChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartProps {
  data: BarChartDataPoint[];
  width?: number;
  height?: number;
  style?: ViewStyle;
  title?: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  showGrid?: boolean;
  showValues?: boolean;
  horizontal?: boolean;
  barRadius?: number;
  formatValue?: (value: number) => string;
}

const { width: screenWidth } = Dimensions.get('window');

export const BarChart: React.FC<BarChartProps> = ({
  data,
  width = screenWidth - 40,
  height = 200,
  style,
  title,
  yAxisLabel,
  xAxisLabel,
  showGrid = true,
  showValues = true,
  horizontal = false,
  barRadius = 4,
  formatValue = (value) => value.toString(),
}) => {
  const { theme } = useTheme();

  const padding = { top: 20, right: 30, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const { bars, yTicks, maxValue, barWidth } = useMemo(() => {
    if (data.length === 0) {
      return { bars: [], yTicks: [], maxValue: 0, barWidth: 0 };
    }

    const maxValue = Math.max(...data.map(d => d.value));
    const padding = maxValue * 0.1;
    const adjustedMaxValue = maxValue + padding;

    // Generate Y ticks
    const yTickCount = 5;
    const yTicks = Array.from({ length: yTickCount }, (_, i) => {
      const value = (adjustedMaxValue * i) / (yTickCount - 1);
      return {
        value,
        y: chartHeight - (chartHeight * value) / adjustedMaxValue,
      };
    });

    // Calculate bar dimensions
    const barSpacing = 0.2; // 20% spacing between bars
    const totalSpacing = (data.length - 1) * barSpacing;
    const availableWidth = chartWidth - totalSpacing * (chartWidth / data.length);
    const barWidth = availableWidth / data.length;

    // Create bars
    const bars = data.map((item, index) => {
      const barHeight = (chartHeight * item.value) / adjustedMaxValue;
      const x = index * (barWidth + (chartWidth * barSpacing) / data.length);
      const y = chartHeight - barHeight;

      return {
        x,
        y,
        width: barWidth,
        height: barHeight,
        value: item.value,
        label: item.label,
        color: item.color || theme.colors.primary,
      };
    });

    return { bars, yTicks, maxValue: adjustedMaxValue, barWidth };
  }, [data, chartWidth, chartHeight, theme.colors.primary]);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[4],
      ...theme.shadows.sm,
    },
    title: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: theme.spacing[4],
    },
    axisLabel: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    yAxisLabel: {
      position: 'absolute',
      left: 10,
      top: height / 2 - 30,
      transform: [{ rotate: '-90deg' }],
    },
    xAxisLabel: {
      position: 'absolute',
      bottom: 5,
      left: width / 2 - 30,
    },
    tickLabel: {
      fontSize: 10,
    },
    yTickLabel: {
      fontSize: 10,
    },
    valueLabel: {
      fontSize: 10,
    },
  });

  if (data.length === 0) {
    return (
      <View style={[styles.container, style]}>
        {title && <Text style={styles.title}>{title}</Text>}
        <View style={{ height: height - 60, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={[styles.axisLabel, { textAlign: 'center' }]}>
            No data available
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <View style={{ position: 'relative' }}>
        {yAxisLabel && (
          <Text style={[styles.axisLabel, styles.yAxisLabel]}>
            {yAxisLabel}
          </Text>
        )}
        
        {xAxisLabel && (
          <Text style={[styles.axisLabel, styles.xAxisLabel]}>
            {xAxisLabel}
          </Text>
        )}

        <Svg width={width} height={height} style={{ marginTop: 10 }}>
          <G x={padding.left} y={padding.top}>
            {/* Grid lines */}
            {showGrid && yTicks.map((tick, index) => (
              <Line
                key={`y-grid-${index}`}
                x1={0}
                y1={tick.y}
                x2={chartWidth}
                y2={tick.y}
                stroke={theme.colors.border}
                strokeWidth={0.5}
                strokeDasharray="2,2"
              />
            ))}

            {/* Bars */}
            {bars.map((bar, index) => (
              <Rect
                key={`bar-${index}`}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                fill={bar.color}
                rx={barRadius}
                ry={barRadius}
              />
            ))}

            {/* Value labels */}
            {showValues && bars.map((bar, index) => (
              <SvgText
                key={`value-${index}`}
                x={bar.x + bar.width / 2}
                y={bar.y - 5}
                fontSize={10}
                fill={theme.colors.textPrimary}
                textAnchor="middle"
                fontWeight="bold"
              >
                {formatValue(bar.value)}
              </SvgText>
            ))}

            {/* Y axis labels */}
            {yTicks.map((tick, index) => (
              <SvgText
                key={`y-label-${index}`}
                x={-10}
                y={tick.y + 4}
                fontSize={10}
                fill={theme.colors.textSecondary}
                textAnchor="end"
              >
                {formatValue(tick.value)}
              </SvgText>
            ))}

            {/* X axis labels */}
            {bars.map((bar, index) => (
              <SvgText
                key={`x-label-${index}`}
                x={bar.x + bar.width / 2}
                y={chartHeight + 20}
                fontSize={10}
                fill={theme.colors.textSecondary}
                textAnchor="middle"
              >
                {bar.label.length > 8 ? `${bar.label.slice(0, 8)}...` : bar.label}
              </SvgText>
            ))}

            {/* Axes */}
            <Line
              x1={0}
              y1={chartHeight}
              x2={chartWidth}
              y2={chartHeight}
              stroke={theme.colors.border}
              strokeWidth={1}
            />
            <Line
              x1={0}
              y1={0}
              x2={0}
              y2={chartHeight}
              stroke={theme.colors.border}
              strokeWidth={1}
            />
          </G>
        </Svg>
      </View>
    </View>
  );
};

export default BarChart;
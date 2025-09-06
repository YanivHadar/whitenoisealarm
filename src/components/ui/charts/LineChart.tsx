/**
 * Mobile-optimized Line Chart Component
 * 
 * Custom line chart implementation using React Native SVG for analytics visualization.
 * Designed for session history and trends display with touch interactions.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Text as SvgText, Line, G } from 'react-native-svg';
import { useTheme } from '../../providers/ThemeProvider';

export interface LineChartDataPoint {
  x: number;
  y: number;
  label?: string;
  date?: Date;
}

export interface LineChartProps {
  data: LineChartDataPoint[];
  width?: number;
  height?: number;
  style?: ViewStyle;
  title?: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  showGrid?: boolean;
  showPoints?: boolean;
  strokeWidth?: number;
  pointRadius?: number;
  animate?: boolean;
  formatYValue?: (value: number) => string;
  formatXValue?: (value: number) => string;
}

const { width: screenWidth } = Dimensions.get('window');

export const LineChart: React.FC<LineChartProps> = ({
  data,
  width = screenWidth - 40,
  height = 200,
  style,
  title,
  yAxisLabel,
  xAxisLabel,
  showGrid = true,
  showPoints = true,
  strokeWidth = 2,
  pointRadius = 4,
  formatYValue = (value) => value.toString(),
  formatXValue = (value) => value.toString(),
}) => {
  const { theme } = useTheme();

  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const { pathData, points, yTicks, xTicks, maxY, minY, maxX, minX } = useMemo(() => {
    if (data.length === 0) {
      return {
        pathData: '',
        points: [],
        yTicks: [],
        xTicks: [],
        maxY: 0,
        minY: 0,
        maxX: 0,
        minX: 0,
      };
    }

    // Calculate bounds
    const maxY = Math.max(...data.map(d => d.y));
    const minY = Math.min(...data.map(d => d.y));
    const maxX = Math.max(...data.map(d => d.x));
    const minX = Math.min(...data.map(d => d.x));

    // Add padding to Y range
    const yRange = maxY - minY;
    const yPadding = yRange * 0.1;
    const adjustedMaxY = maxY + yPadding;
    const adjustedMinY = Math.max(0, minY - yPadding);

    // Generate Y ticks
    const yTickCount = 5;
    const yTicks = Array.from({ length: yTickCount }, (_, i) => {
      const value = adjustedMinY + (adjustedMaxY - adjustedMinY) * (i / (yTickCount - 1));
      return {
        value,
        y: chartHeight - (chartHeight * (value - adjustedMinY) / (adjustedMaxY - adjustedMinY)),
      };
    });

    // Generate X ticks
    const xTickCount = Math.min(5, data.length);
    const xTicks = Array.from({ length: xTickCount }, (_, i) => {
      const dataIndex = Math.floor((data.length - 1) * (i / (xTickCount - 1)));
      const point = data[dataIndex];
      return {
        value: point.x,
        x: (chartWidth * (point.x - minX)) / (maxX - minX),
        label: point.label,
      };
    });

    // Convert data points to chart coordinates
    const points = data.map(point => ({
      x: (chartWidth * (point.x - minX)) / (maxX - minX),
      y: chartHeight - (chartHeight * (point.y - adjustedMinY) / (adjustedMaxY - adjustedMinY)),
      originalData: point,
    }));

    // Generate path data
    const pathData = points.reduce((path, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }
      return `${path} L ${point.x} ${point.y}`;
    }, '');

    return {
      pathData,
      points,
      yTicks,
      xTicks,
      maxY: adjustedMaxY,
      minY: adjustedMinY,
      maxX,
      minX,
    };
  }, [data, chartWidth, chartHeight]);

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
            {showGrid && (
              <>
                {yTicks.map((tick, index) => (
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
                {xTicks.map((tick, index) => (
                  <Line
                    key={`x-grid-${index}`}
                    x1={tick.x}
                    y1={0}
                    x2={tick.x}
                    y2={chartHeight}
                    stroke={theme.colors.border}
                    strokeWidth={0.5}
                    strokeDasharray="2,2"
                  />
                ))}
              </>
            )}

            {/* Main line path */}
            <Path
              d={pathData}
              stroke={theme.colors.primary}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {showPoints &&
              points.map((point, index) => (
                <Circle
                  key={`point-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={pointRadius}
                  fill={theme.colors.primary}
                  stroke={theme.colors.surface}
                  strokeWidth={2}
                />
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
                {formatYValue(tick.value)}
              </SvgText>
            ))}

            {/* X axis labels */}
            {xTicks.map((tick, index) => (
              <SvgText
                key={`x-label-${index}`}
                x={tick.x}
                y={chartHeight + 20}
                fontSize={10}
                fill={theme.colors.textSecondary}
                textAnchor="middle"
              >
                {tick.label || formatXValue(tick.value)}
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

export default LineChart;
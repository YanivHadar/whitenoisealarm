#!/usr/bin/env node
/**
 * Test Reporter and Metrics Dashboard Generator
 * Phase 2.3: Integration Testing & Cross-Platform Validation
 * 
 * Generates comprehensive test reports and metrics for CI/CD pipeline
 * Aggregates results from unit tests, integration tests, E2E tests, and reliability tests
 */

const fs = require('fs');
const path = require('path');

// Test reporting configuration
const REPORT_CONFIG = {
  OUTPUT_DIR: './test-reports',
  TEMPLATES_DIR: './scripts/templates',
  METRICS_FILE: 'test-metrics.json',
  HTML_REPORT: 'test-dashboard.html',
  RELIABILITY_TARGET: 99.9,
  PERFORMANCE_TARGETS: {
    APP_STARTUP: 2000, // 2 seconds
    AUDIO_RESPONSE: 100, // 100ms
    MEMORY_USAGE: 100, // 100MB
    BATTERY_OVERNIGHT: 5, // 5% max drain
  },
  COVERAGE_TARGETS: {
    STATEMENTS: 90,
    BRANCHES: 85,
    FUNCTIONS: 90,
    LINES: 90,
  },
};

/**
 * Test metrics aggregator
 */
class TestMetricsAggregator {
  constructor() {
    this.metrics = {
      timestamp: new Date().toISOString(),
      buildId: process.env.GITHUB_RUN_NUMBER || 'local',
      commitSha: process.env.GITHUB_SHA || 'unknown',
      branch: process.env.GITHUB_REF_NAME || 'unknown',
      unitTests: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        coverage: {},
        duration: 0,
      },
      integrationTests: {
        total: 0,
        passed: 0,
        failed: 0,
        duration: 0,
      },
      reliabilityTests: {
        iterations: 0,
        successRate: 0,
        targetMet: false,
        duration: 0,
        failureReasons: [],
      },
      e2eTests: {
        ios: {
          total: 0,
          passed: 0,
          failed: 0,
          duration: 0,
        },
        android: {
          total: 0,
          passed: 0,
          failed: 0,
          duration: 0,
        },
      },
      performanceTests: {
        startupTime: null,
        audioResponseTime: null,
        memoryUsage: null,
        batteryDrain: null,
        targetsMet: {},
      },
      securityTests: {
        vulnerabilities: 0,
        warnings: 0,
        passed: false,
      },
      overallStatus: 'unknown',
      criticalIssues: [],
      recommendations: [],
    };
  }

  /**
   * Load and aggregate Jest test results
   */
  async loadJestResults(resultsPath) {
    try {
      if (!fs.existsSync(resultsPath)) {
        console.warn(`Jest results not found at ${resultsPath}`);
        return;
      }

      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      this.metrics.unitTests = {
        total: results.numTotalTests,
        passed: results.numPassedTests,
        failed: results.numFailedTests,
        skipped: results.numPendingTests,
        coverage: results.coverageMap || {},
        duration: results.testResults.reduce((acc, test) => acc + (test.perfStats?.end - test.perfStats?.start || 0), 0),
      };

      // Validate coverage targets
      if (results.coverageMap?.global) {
        const coverage = results.coverageMap.global;
        Object.keys(REPORT_CONFIG.COVERAGE_TARGETS).forEach(metric => {
          const target = REPORT_CONFIG.COVERAGE_TARGETS[metric];
          const actual = coverage[metric.toLowerCase()] || 0;
          if (actual < target) {
            this.metrics.criticalIssues.push(`Coverage ${metric} (${actual}%) below target (${target}%)`);
          }
        });
      }

      console.log(`✅ Loaded Jest results: ${this.metrics.unitTests.passed}/${this.metrics.unitTests.total} tests passed`);
    } catch (error) {
      console.error('Error loading Jest results:', error.message);
      this.metrics.criticalIssues.push(`Failed to load Jest results: ${error.message}`);
    }
  }

  /**
   * Load and aggregate Detox E2E test results
   */
  async loadDetoxResults(iosPath, androidPath) {
    try {
      // Load iOS results
      if (fs.existsSync(iosPath)) {
        const iosResults = JSON.parse(fs.readFileSync(iosPath, 'utf8'));
        this.metrics.e2eTests.ios = {
          total: iosResults.numTotalTests,
          passed: iosResults.numPassedTests,
          failed: iosResults.numFailedTests,
          duration: iosResults.testResults.reduce((acc, test) => acc + test.duration || 0, 0),
        };
        console.log(`✅ Loaded iOS E2E results: ${this.metrics.e2eTests.ios.passed}/${this.metrics.e2eTests.ios.total}`);
      }

      // Load Android results
      if (fs.existsSync(androidPath)) {
        const androidResults = JSON.parse(fs.readFileSync(androidPath, 'utf8'));
        this.metrics.e2eTests.android = {
          total: androidResults.numTotalTests,
          passed: androidResults.numPassedTests,
          failed: androidResults.numFailedTests,
          duration: androidResults.testResults.reduce((acc, test) => acc + test.duration || 0, 0),
        };
        console.log(`✅ Loaded Android E2E results: ${this.metrics.e2eTests.android.passed}/${this.metrics.e2eTests.android.total}`);
      }

      // Check cross-platform parity
      const iosTotal = this.metrics.e2eTests.ios.total;
      const androidTotal = this.metrics.e2eTests.android.total;
      if (iosTotal !== androidTotal) {
        this.metrics.criticalIssues.push(`Cross-platform test parity issue: iOS ${iosTotal} tests vs Android ${androidTotal} tests`);
      }

    } catch (error) {
      console.error('Error loading Detox results:', error.message);
      this.metrics.criticalIssues.push(`Failed to load E2E results: ${error.message}`);
    }
  }

  /**
   * Load reliability test results
   */
  async loadReliabilityResults(reliabilityPath) {
    try {
      if (!fs.existsSync(reliabilityPath)) {
        console.warn(`Reliability results not found at ${reliabilityPath}`);
        return;
      }

      const results = JSON.parse(fs.readFileSync(reliabilityPath, 'utf8'));
      
      this.metrics.reliabilityTests = {
        iterations: results.totalIterations,
        successRate: results.successRate,
        targetMet: results.successRate >= REPORT_CONFIG.RELIABILITY_TARGET,
        duration: results.totalDuration,
        failureReasons: results.failureReasons || [],
      };

      if (!this.metrics.reliabilityTests.targetMet) {
        this.metrics.criticalIssues.push(
          `Reliability target not met: ${results.successRate}% < ${REPORT_CONFIG.RELIABILITY_TARGET}%`
        );
      }

      console.log(`✅ Loaded reliability results: ${results.successRate}% success rate`);
    } catch (error) {
      console.error('Error loading reliability results:', error.message);
      this.metrics.criticalIssues.push(`Failed to load reliability results: ${error.message}`);
    }
  }

  /**
   * Load performance test results
   */
  async loadPerformanceResults(performancePath) {
    try {
      if (!fs.existsSync(performancePath)) {
        console.warn(`Performance results not found at ${performancePath}`);
        return;
      }

      const results = JSON.parse(fs.readFileSync(performancePath, 'utf8'));
      
      this.metrics.performanceTests = {
        startupTime: results.startupTime,
        audioResponseTime: results.audioResponseTime,
        memoryUsage: results.memoryUsage,
        batteryDrain: results.batteryDrain,
        targetsMet: {},
      };

      // Check performance targets
      Object.keys(REPORT_CONFIG.PERFORMANCE_TARGETS).forEach(metric => {
        const target = REPORT_CONFIG.PERFORMANCE_TARGETS[metric];
        const actual = results[metric.toLowerCase()];
        const met = actual ? (actual <= target) : false;
        this.metrics.performanceTests.targetsMet[metric] = met;
        
        if (!met && actual) {
          this.metrics.criticalIssues.push(
            `Performance target not met for ${metric}: ${actual} > ${target}`
          );
        }
      });

      console.log(`✅ Loaded performance results`);
    } catch (error) {
      console.error('Error loading performance results:', error.message);
      this.metrics.criticalIssues.push(`Failed to load performance results: ${error.message}`);
    }
  }

  /**
   * Determine overall test status
   */
  determineOverallStatus() {
    const hasFailures = this.metrics.unitTests.failed > 0 || 
                       this.metrics.e2eTests.ios.failed > 0 || 
                       this.metrics.e2eTests.android.failed > 0;
    
    const hasCriticalIssues = this.metrics.criticalIssues.length > 0;
    
    if (hasCriticalIssues) {
      this.metrics.overallStatus = 'critical';
    } else if (hasFailures) {
      this.metrics.overallStatus = 'failed';
    } else if (this.metrics.unitTests.total === 0) {
      this.metrics.overallStatus = 'no-tests';
    } else {
      this.metrics.overallStatus = 'passed';
    }
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    this.metrics.recommendations = [];

    // Coverage recommendations
    if (this.metrics.unitTests.coverage.statements < REPORT_CONFIG.COVERAGE_TARGETS.STATEMENTS) {
      this.metrics.recommendations.push('Increase unit test coverage, especially for alarm scheduling logic');
    }

    // Reliability recommendations
    if (this.metrics.reliabilityTests.successRate < REPORT_CONFIG.RELIABILITY_TARGET) {
      this.metrics.recommendations.push('Investigate alarm delivery failures - reliability is critical for user wake-ups');
    }

    // Performance recommendations
    Object.keys(this.metrics.performanceTests.targetsMet).forEach(metric => {
      if (!this.metrics.performanceTests.targetsMet[metric]) {
        this.metrics.recommendations.push(`Optimize ${metric} - current performance may impact user experience`);
      }
    });

    // Cross-platform recommendations
    const iosTests = this.metrics.e2eTests.ios;
    const androidTests = this.metrics.e2eTests.android;
    if (iosTests.failed > 0 || androidTests.failed > 0) {
      this.metrics.recommendations.push('Address cross-platform inconsistencies in E2E tests');
    }

    console.log(`📋 Generated ${this.metrics.recommendations.length} recommendations`);
  }

  /**
   * Save metrics to JSON file
   */
  async saveMetrics() {
    const outputPath = path.join(REPORT_CONFIG.OUTPUT_DIR, REPORT_CONFIG.METRICS_FILE);
    
    // Ensure output directory exists
    fs.mkdirSync(REPORT_CONFIG.OUTPUT_DIR, { recursive: true });
    
    fs.writeFileSync(outputPath, JSON.stringify(this.metrics, null, 2));
    console.log(`📊 Test metrics saved to ${outputPath}`);
  }

  /**
   * Generate HTML dashboard
   */
  async generateHTMLReport() {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alarm & White Noise - Test Dashboard</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status-${this.metrics.overallStatus} { border-left: 4px solid ${this.getStatusColor()}; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 5px; }
        .success { color: #22c55e; } .warning { color: #f59e0b; } .error { color: #ef4444; }
        .progress-bar { background: #e5e7eb; height: 8px; border-radius: 4px; margin: 10px 0; }
        .progress-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
        .critical-issues { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .recommendations { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; margin: 20px 0; }
        ul { padding-left: 20px; } li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header status-${this.metrics.overallStatus}">
            <h1>🎵 Alarm & White Noise - Test Dashboard</h1>
            <p><strong>Build:</strong> ${this.metrics.buildId} | <strong>Commit:</strong> ${this.metrics.commitSha.substring(0, 8)} | <strong>Date:</strong> ${new Date(this.metrics.timestamp).toLocaleString()}</p>
            <h2 class="${this.getStatusClass()}">Overall Status: ${this.metrics.overallStatus.toUpperCase()}</h2>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>🧪 Unit Tests</h3>
                <div class="metric-value ${this.metrics.unitTests.failed === 0 ? 'success' : 'error'}">${this.metrics.unitTests.passed}/${this.metrics.unitTests.total}</div>
                <div class="metric-label">Tests Passed</div>
                <div class="progress-bar">
                    <div class="progress-fill ${this.metrics.unitTests.failed === 0 ? 'success' : 'error'}" style="width: ${(this.metrics.unitTests.passed / this.metrics.unitTests.total * 100) || 0}%; background-color: ${this.metrics.unitTests.failed === 0 ? '#22c55e' : '#ef4444'};"></div>
                </div>
                <p>Duration: ${Math.round(this.metrics.unitTests.duration / 1000)}s</p>
            </div>

            <div class="card">
                <h3>🎯 Reliability Tests</h3>
                <div class="metric-value ${this.metrics.reliabilityTests.targetMet ? 'success' : 'error'}">${this.metrics.reliabilityTests.successRate}%</div>
                <div class="metric-label">Success Rate (Target: ${REPORT_CONFIG.RELIABILITY_TARGET}%)</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${this.metrics.reliabilityTests.successRate}%; background-color: ${this.metrics.reliabilityTests.targetMet ? '#22c55e' : '#ef4444'};"></div>
                </div>
                <p>Iterations: ${this.metrics.reliabilityTests.iterations}</p>
            </div>

            <div class="card">
                <h3>📱 E2E Tests - iOS</h3>
                <div class="metric-value ${this.metrics.e2eTests.ios.failed === 0 ? 'success' : 'error'}">${this.metrics.e2eTests.ios.passed}/${this.metrics.e2eTests.ios.total}</div>
                <div class="metric-label">Tests Passed</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(this.metrics.e2eTests.ios.passed / this.metrics.e2eTests.ios.total * 100) || 0}%; background-color: ${this.metrics.e2eTests.ios.failed === 0 ? '#22c55e' : '#ef4444'};"></div>
                </div>
            </div>

            <div class="card">
                <h3>🤖 E2E Tests - Android</h3>
                <div class="metric-value ${this.metrics.e2eTests.android.failed === 0 ? 'success' : 'error'}">${this.metrics.e2eTests.android.passed}/${this.metrics.e2eTests.android.total}</div>
                <div class="metric-label">Tests Passed</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(this.metrics.e2eTests.android.passed / this.metrics.e2eTests.android.total * 100) || 0}%; background-color: ${this.metrics.e2eTests.android.failed === 0 ? '#22c55e' : '#ef4444'};"></div>
                </div>
            </div>

            <div class="card">
                <h3>⚡ Performance</h3>
                <div class="metric-value ${Object.values(this.metrics.performanceTests.targetsMet).every(Boolean) ? 'success' : 'warning'}">
                    ${Object.values(this.metrics.performanceTests.targetsMet).filter(Boolean).length}/${Object.keys(this.metrics.performanceTests.targetsMet).length}
                </div>
                <div class="metric-label">Targets Met</div>
                <p>Startup: ${this.metrics.performanceTests.startupTime || 'N/A'}ms</p>
                <p>Audio: ${this.metrics.performanceTests.audioResponseTime || 'N/A'}ms</p>
            </div>

            <div class="card">
                <h3>🛡️ Security</h3>
                <div class="metric-value ${this.metrics.securityTests.vulnerabilities === 0 ? 'success' : 'error'}">${this.metrics.securityTests.vulnerabilities}</div>
                <div class="metric-label">Vulnerabilities Found</div>
                <p>Status: ${this.metrics.securityTests.passed ? '✅ Passed' : '❌ Failed'}</p>
            </div>
        </div>

        ${this.metrics.criticalIssues.length > 0 ? `
        <div class="critical-issues">
            <h3>🚨 Critical Issues</h3>
            <ul>
                ${this.metrics.criticalIssues.map(issue => `<li>${issue}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        ${this.metrics.recommendations.length > 0 ? `
        <div class="recommendations">
            <h3>💡 Recommendations</h3>
            <ul>
                ${this.metrics.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
    </div>
</body>
</html>
    `;

    const outputPath = path.join(REPORT_CONFIG.OUTPUT_DIR, REPORT_CONFIG.HTML_REPORT);
    fs.writeFileSync(outputPath, htmlTemplate);
    console.log(`📈 HTML dashboard generated: ${outputPath}`);
  }

  getStatusColor() {
    switch (this.metrics.overallStatus) {
      case 'passed': return '#22c55e';
      case 'failed': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  }

  getStatusClass() {
    switch (this.metrics.overallStatus) {
      case 'passed': return 'success';
      case 'failed': return 'warning';
      case 'critical': return 'error';
      default: return '';
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting test report generation...\n');

  const aggregator = new TestMetricsAggregator();

  // Load test results from various sources
  await aggregator.loadJestResults('./coverage/coverage-final.json');
  await aggregator.loadDetoxResults('./e2e/artifacts/ios-results.json', './e2e/artifacts/android-results.json');
  await aggregator.loadReliabilityResults('./test-results/reliability-results.json');
  await aggregator.loadPerformanceResults('./test-results/performance-results.json');

  // Generate insights and recommendations
  aggregator.determineOverallStatus();
  aggregator.generateRecommendations();

  // Save outputs
  await aggregator.saveMetrics();
  await aggregator.generateHTMLReport();

  console.log('\n✅ Test report generation completed!');
  console.log(`📊 View metrics: ${path.join(REPORT_CONFIG.OUTPUT_DIR, REPORT_CONFIG.METRICS_FILE)}`);
  console.log(`📈 View dashboard: ${path.join(REPORT_CONFIG.OUTPUT_DIR, REPORT_CONFIG.HTML_REPORT)}`);

  // Exit with appropriate code based on overall status
  if (aggregator.metrics.overallStatus === 'critical') {
    process.exit(2);
  } else if (aggregator.metrics.overallStatus === 'failed') {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test report generation failed:', error);
    process.exit(1);
  });
}

module.exports = { TestMetricsAggregator, REPORT_CONFIG };
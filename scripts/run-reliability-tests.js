#!/usr/bin/env node

/**
 * Alarm Reliability Test Script
 * 
 * Executes comprehensive reliability tests for the Alarm & White Noise app
 * and generates detailed reports for 99.9% reliability validation.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  RELIABILITY_TARGET: 99.9,
  TEST_TIMEOUT: 300000, // 5 minutes
  REPORT_DIR: path.join(__dirname, '..', 'reliability-reports'),
  COVERAGE_DIR: path.join(__dirname, '..', 'coverage', 'reliability'),
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class ReliabilityTestRunner {
  constructor() {
    this.startTime = Date.now();
    this.testResults = {
      overall: null,
      suites: [],
      coverage: null,
      recommendations: [],
    };
  }

  /**
   * Main execution method
   */
  async run() {
    try {
      console.log(this.colorize('🚀 Starting Alarm Reliability Test Suite', colors.cyan, true));
      console.log(this.colorize(`Target Reliability: ${CONFIG.RELIABILITY_TARGET}%\n`, colors.blue));

      // Setup
      await this.setup();

      // Run test suites
      await this.runReliabilityTests();

      // Generate reports
      await this.generateReports();

      // Display results
      this.displayResults();

      // Exit with appropriate code
      process.exit(this.testResults.overall.reliabilityMet ? 0 : 1);

    } catch (error) {
      console.error(this.colorize('❌ Reliability test execution failed:', colors.red, true));
      console.error(error.message);
      process.exit(1);
    }
  }

  /**
   * Setup test environment
   */
  async setup() {
    console.log(this.colorize('📋 Setting up test environment...', colors.yellow));
    
    // Create report directories
    this.ensureDir(CONFIG.REPORT_DIR);
    this.ensureDir(CONFIG.COVERAGE_DIR);

    // Install dependencies if needed
    try {
      execSync('npm list jest jest-html-reporter jest-junit --depth=0', { 
        stdio: 'ignore',
        cwd: path.join(__dirname, '..') 
      });
    } catch (error) {
      console.log(this.colorize('  Installing test dependencies...', colors.yellow));
      execSync('npm install --save-dev jest-html-reporter jest-junit', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
    }

    console.log(this.colorize('✅ Test environment ready\n', colors.green));
  }

  /**
   * Run reliability test suites
   */
  async runReliabilityTests() {
    const testSuites = [
      {
        name: 'Core Functionality Tests',
        testFile: 'alarm-service.test.ts',
        weight: 25,
      },
      {
        name: 'Reliability Integration Tests',
        testFile: 'alarm-reliability.test.ts',
        weight: 35,
      },
      {
        name: 'Notification Delivery Tests',
        testFile: 'notification-delivery.test.ts',
        weight: 30,
      },
      {
        name: 'Performance Tests',
        testFile: 'reliability-runner.ts',
        weight: 10,
      },
    ];

    console.log(this.colorize('🧪 Running reliability test suites...', colors.cyan, true));

    for (const suite of testSuites) {
      await this.runTestSuite(suite);
    }

    console.log(this.colorize('✅ All test suites completed\n', colors.green));
  }

  /**
   * Run individual test suite
   */
  async runTestSuite(suite) {
    console.log(this.colorize(`  Running: ${suite.name}`, colors.blue));
    
    const startTime = Date.now();
    
    try {
      const output = execSync(
        `npm test -- --config=jest.reliability.config.js --testPathPattern="${suite.testFile}" --verbose`,
        {
          cwd: path.join(__dirname, '..'),
          encoding: 'utf8',
          timeout: CONFIG.TEST_TIMEOUT,
          env: {
            ...process.env,
            RELIABILITY_TEST_MODE: 'true',
            VERBOSE_TESTS: 'true',
          }
        }
      );

      const duration = Date.now() - startTime;
      const results = this.parseJestOutput(output);

      this.testResults.suites.push({
        name: suite.name,
        weight: suite.weight,
        results,
        duration,
        success: results.failed === 0,
      });

      console.log(this.colorize(
        `    ✅ ${suite.name}: ${results.passed}/${results.total} tests passed (${duration}ms)`,
        colors.green
      ));

    } catch (error) {
      const duration = Date.now() - startTime;
      const output = error.stdout || error.stderr || error.message;
      const results = this.parseJestOutput(output);

      this.testResults.suites.push({
        name: suite.name,
        weight: suite.weight,
        results,
        duration,
        success: false,
        error: error.message,
      });

      console.log(this.colorize(
        `    ❌ ${suite.name}: ${results.failed} test(s) failed (${duration}ms)`,
        colors.red
      ));
    }
  }

  /**
   * Parse Jest output to extract test results
   */
  parseJestOutput(output) {
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };

    // Parse Jest summary line
    const summaryMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/) ||
                          output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/) ||
                          output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+total/);

    if (summaryMatch) {
      if (summaryMatch.length === 4) {
        // Has failed tests
        results.failed = parseInt(summaryMatch[1]);
        results.passed = parseInt(summaryMatch[2]);
        results.total = parseInt(summaryMatch[3]);
      } else if (summaryMatch.length === 3) {
        // All passed or all failed
        if (output.includes('failed')) {
          results.failed = parseInt(summaryMatch[1]);
          results.total = parseInt(summaryMatch[2]);
          results.passed = results.total - results.failed;
        } else {
          results.passed = parseInt(summaryMatch[1]);
          results.total = parseInt(summaryMatch[2]);
          results.failed = 0;
        }
      }
    }

    return results;
  }

  /**
   * Generate comprehensive reports
   */
  async generateReports() {
    console.log(this.colorize('📊 Generating reliability reports...', colors.yellow));

    // Calculate overall score
    let totalScore = 0;
    let totalWeight = 0;
    let totalTests = 0;
    let totalPassed = 0;

    this.testResults.suites.forEach(suite => {
      const suiteScore = suite.results.total > 0 
        ? (suite.results.passed / suite.results.total) * 100 
        : 0;
      
      totalScore += suiteScore * (suite.weight / 100);
      totalWeight += suite.weight;
      totalTests += suite.results.total;
      totalPassed += suite.results.passed;
    });

    const overallScore = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
    
    this.testResults.overall = {
      score: overallScore,
      reliabilityMet: overallScore >= CONFIG.RELIABILITY_TARGET,
      totalTests,
      totalPassed,
      totalFailed: totalTests - totalPassed,
      duration: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
    };

    // Generate recommendations
    this.generateRecommendations();

    // Write JSON report
    await this.writeJsonReport();

    // Write HTML report
    await this.writeHtmlReport();

    console.log(this.colorize('✅ Reports generated\n', colors.green));
  }

  /**
   * Generate improvement recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    this.testResults.suites.forEach(suite => {
      const suiteScore = suite.results.total > 0 
        ? (suite.results.passed / suite.results.total) * 100 
        : 0;

      if (suiteScore < 95) {
        recommendations.push({
          priority: 'critical',
          message: `${suite.name} scored ${suiteScore.toFixed(1)}% - requires immediate attention`,
          suite: suite.name,
        });
      } else if (suiteScore < 99) {
        recommendations.push({
          priority: 'warning',
          message: `${suite.name} scored ${suiteScore.toFixed(1)}% - improvement recommended`,
          suite: suite.name,
        });
      }

      if (suite.error) {
        recommendations.push({
          priority: 'critical',
          message: `${suite.name} execution error: ${suite.error}`,
          suite: suite.name,
        });
      }
    });

    if (this.testResults.overall.score < CONFIG.RELIABILITY_TARGET) {
      recommendations.push({
        priority: 'critical',
        message: `Overall reliability ${this.testResults.overall.score.toFixed(2)}% below target ${CONFIG.RELIABILITY_TARGET}%`,
        suite: 'Overall',
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'info',
        message: `🎉 All tests passed! System meets ${CONFIG.RELIABILITY_TARGET}% reliability target.`,
        suite: 'Overall',
      });
    }

    this.testResults.recommendations = recommendations;
  }

  /**
   * Write JSON report
   */
  async writeJsonReport() {
    const reportPath = path.join(CONFIG.REPORT_DIR, 'reliability-report.json');
    const report = {
      meta: {
        version: '1.0.0',
        generated_at: new Date().toISOString(),
        duration: Date.now() - this.startTime,
        reliability_target: CONFIG.RELIABILITY_TARGET,
      },
      results: this.testResults,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(this.colorize(`  JSON report: ${reportPath}`, colors.blue));
  }

  /**
   * Write HTML report
   */
  async writeHtmlReport() {
    const reportPath = path.join(CONFIG.REPORT_DIR, 'reliability-report.html');
    const html = this.generateHtmlReport();
    
    fs.writeFileSync(reportPath, html);
    console.log(this.colorize(`  HTML report: ${reportPath}`, colors.blue));
  }

  /**
   * Generate HTML report content
   */
  generateHtmlReport() {
    const { overall, suites, recommendations } = this.testResults;
    const passColor = overall.reliabilityMet ? '#28a745' : '#dc3545';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alarm Reliability Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .score { font-size: 3em; font-weight: bold; color: ${passColor}; }
        .target { color: #6c757d; margin-top: 10px; }
        .status { padding: 10px 20px; border-radius: 5px; display: inline-block; color: white; font-weight: bold; background: ${passColor}; }
        .card { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; padding: 20px; }
        .suite { border-left: 4px solid #007bff; margin-bottom: 15px; padding: 15px; background: #f8f9fa; }
        .suite-pass { border-left-color: #28a745; }
        .suite-fail { border-left-color: #dc3545; }
        .metric { display: inline-block; margin-right: 20px; }
        .metric-value { font-weight: bold; font-size: 1.2em; }
        .recommendations { margin-top: 20px; }
        .rec-critical { border-left: 4px solid #dc3545; background: #f8d7da; padding: 10px; margin: 5px 0; }
        .rec-warning { border-left: 4px solid #ffc107; background: #fff3cd; padding: 10px; margin: 5px 0; }
        .rec-info { border-left: 4px solid #17a2b8; background: #d1ecf1; padding: 10px; margin: 5px 0; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Alarm Reliability Test Report</h1>
            <div class="score">${overall.score.toFixed(2)}%</div>
            <div class="target">Target: ${CONFIG.RELIABILITY_TARGET}%</div>
            <div class="status">${overall.reliabilityMet ? 'RELIABILITY TARGET MET' : 'RELIABILITY TARGET NOT MET'}</div>
            <div class="timestamp">Generated: ${new Date(overall.timestamp).toLocaleString()}</div>
        </div>

        <div class="card">
            <h2>Overall Summary</h2>
            <div class="metric">
                <div class="metric-value">${overall.totalTests}</div>
                <div>Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value">${overall.totalPassed}</div>
                <div>Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${overall.totalFailed}</div>
                <div>Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${(overall.duration / 1000).toFixed(1)}s</div>
                <div>Duration</div>
            </div>
        </div>

        <div class="card">
            <h2>Test Suites</h2>
            ${suites.map(suite => {
              const suiteScore = suite.results.total > 0 ? (suite.results.passed / suite.results.total) * 100 : 0;
              const suiteClass = suite.success ? 'suite-pass' : 'suite-fail';
              
              return `
                <div class="suite ${suiteClass}">
                    <h3>${suite.name}</h3>
                    <div class="metric">
                        <div class="metric-value">${suiteScore.toFixed(1)}%</div>
                        <div>Score (Weight: ${suite.weight}%)</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${suite.results.passed}/${suite.results.total}</div>
                        <div>Tests Passed</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${(suite.duration / 1000).toFixed(1)}s</div>
                        <div>Duration</div>
                    </div>
                    ${suite.error ? `<div style="color: #dc3545; margin-top: 10px;">Error: ${suite.error}</div>` : ''}
                </div>
              `;
            }).join('')}
        </div>

        <div class="card">
            <h2>Recommendations</h2>
            <div class="recommendations">
                ${recommendations.map(rec => {
                  const recClass = `rec-${rec.priority}`;
                  const icon = rec.priority === 'critical' ? '🚨' : rec.priority === 'warning' ? '⚠️' : '💡';
                  return `<div class="${recClass}">${icon} ${rec.message}</div>`;
                }).join('')}
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Display results summary
   */
  displayResults() {
    const { overall } = this.testResults;
    
    console.log(this.colorize('\n📊 RELIABILITY TEST RESULTS', colors.cyan, true));
    console.log(this.colorize('=' * 50, colors.cyan));
    
    console.log(this.colorize(`Overall Score: ${overall.score.toFixed(2)}%`, 
      overall.reliabilityMet ? colors.green : colors.red, true));
    
    console.log(this.colorize(`Target: ${CONFIG.RELIABILITY_TARGET}%`, colors.blue));
    
    console.log(this.colorize(`Status: ${overall.reliabilityMet ? 'PASSED' : 'FAILED'}`,
      overall.reliabilityMet ? colors.green : colors.red, true));
    
    console.log(`Tests: ${overall.totalPassed}/${overall.totalTests} passed`);
    console.log(`Duration: ${(overall.duration / 1000).toFixed(1)}s`);

    // Suite breakdown
    console.log(this.colorize('\nSuite Breakdown:', colors.yellow, true));
    this.testResults.suites.forEach(suite => {
      const suiteScore = suite.results.total > 0 
        ? (suite.results.passed / suite.results.total) * 100 
        : 0;
      const status = suite.success ? '✅' : '❌';
      console.log(`  ${status} ${suite.name}: ${suiteScore.toFixed(1)}% (${suite.results.passed}/${suite.results.total})`);
    });

    // Critical recommendations
    const criticalRecs = this.testResults.recommendations.filter(r => r.priority === 'critical');
    if (criticalRecs.length > 0) {
      console.log(this.colorize('\nCritical Issues:', colors.red, true));
      criticalRecs.forEach(rec => {
        console.log(this.colorize(`  🚨 ${rec.message}`, colors.red));
      });
    }

    console.log(this.colorize('\n📋 Reports generated in:', colors.blue));
    console.log(`  ${CONFIG.REPORT_DIR}/`);
    
    console.log(this.colorize(
      `\n${overall.reliabilityMet ? '🎉 RELIABILITY TARGET ACHIEVED!' : '🚨 RELIABILITY TARGET NOT MET'}`, 
      overall.reliabilityMet ? colors.green : colors.red, true
    ));
  }

  /**
   * Utility methods
   */
  ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  colorize(text, color, bold = false) {
    return `${bold ? colors.bright : ''}${color}${text}${colors.reset}`;
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new ReliabilityTestRunner();
  runner.run().catch(error => {
    console.error('Failed to run reliability tests:', error);
    process.exit(1);
  });
}

module.exports = ReliabilityTestRunner;
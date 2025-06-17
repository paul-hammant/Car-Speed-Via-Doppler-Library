/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo
 *
 * Unit Tests for TestReporter
 * 
 * These tests show beginners how to:
 * - Test output formatting functions
 * - Verify string manipulation and formatting
 * - Test statistical calculations
 * - Handle console output testing
 */

import TestReporter from '../../docs/shared/test-reporter.js';

/**
 * Simple test framework for beginners
 */
class SimpleTest {
    constructor(testName) {
        this.testName = testName;
        this.passed = 0;
        this.failed = 0;
        this.originalConsoleLog = console.log;
        this.capturedOutput = [];
    }
    
    // Capture console output for testing
    startCapturingOutput() {
        this.capturedOutput = [];
        console.log = (message) => {
            this.capturedOutput.push(message);
        };
    }
    
    stopCapturingOutput() {
        console.log = this.originalConsoleLog;
        return this.capturedOutput.join('\n');
    }
    
    assert(condition, message) {
        if (condition) {
            console.log(`  ✅ ${message}`);
            this.passed++;
        } else {
            console.log(`  ❌ ${message}`);
            this.failed++;
        }
    }
    
    assertEqual(actual, expected, message) {
        const condition = actual === expected;
        const fullMessage = `${message} (expected: ${expected}, got: ${actual})`;
        this.assert(condition, fullMessage);
    }
    
    assertContains(text, substring, message) {
        const condition = text.includes(substring);
        const fullMessage = `${message} (looking for "${substring}" in output)`;
        this.assert(condition, fullMessage);
    }
    
    assertNear(actual, expected, tolerance, message) {
        const condition = Math.abs(actual - expected) <= tolerance;
        const fullMessage = `${message} (expected: ~${expected}, got: ${actual}, tolerance: ±${tolerance})`;
        this.assert(condition, fullMessage);
    }
    
    summary() {
        console.log(`\n${this.testName} Results: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    }
}

/**
 * Create test result data
 */
function createTestResults() {
    return [
        {
            filename: 'test1.wav',
            expectedSpeedMph: 30,
            calculatedSpeedMph: 28.5,
            status: 'SUCCESS',
            error: 1.5,
            accuracy: 95.0,
            duration: 5.1,
            executionTimeMs: 150
        },
        {
            filename: 'test2.wav',
            expectedSpeedMph: 45,
            calculatedSpeedMph: null,
            status: 'FAILED - no valid frequency pairs',
            duration: 4.2,
            executionTimeMs: 100
        },
        {
            filename: 'test3.wav',
            expectedSpeedMph: 25,
            calculatedSpeedMph: 26.2,
            status: 'SUCCESS',
            error: 1.2,
            accuracy: 95.2,
            duration: 6.3,
            executionTimeMs: 200
        }
    ];
}

/**
 * Test the formatResultLine function
 */
function testFormatResultLine() {
    const test = new SimpleTest('TestReporter.formatResultLine');
    console.log('\n=== Testing Result Line Formatting ===');
    
    // Test 1: Successful result with error
    console.log('\nTest 1: Successful result formatting');
    const successResult = {
        filename: 'test.wav',
        expectedSpeedMph: 30,
        calculatedSpeedMph: 28.5,
        status: 'SUCCESS',
        error: 1.5,
        duration: 5.55,
        executionTimeMs: 123
    };
    
    const successLine = TestReporter.formatResultLine(successResult);
    
    test.assertContains(successLine, 'test.wav', 'Contains filename');
    test.assertContains(successLine, 'Expected: 30 mph', 'Contains expected speed');
    test.assertContains(successLine, 'Calculated: 28.5 mph', 'Contains calculated speed');
    test.assertContains(successLine, '±1.5', 'Contains error margin');
    test.assertContains(successLine, '[123ms, 5.55s]', 'Contains timing and duration info');
    
    // Test 2: Failed result
    console.log('\nTest 2: Failed result formatting');
    const failedResult = {
        filename: 'failed.wav',
        expectedSpeedMph: 45,
        calculatedSpeedMph: null,
        status: 'FAILED - no signal',
        duration: 3.0,
        executionTimeMs: 99
    };
    
    const failedLine = TestReporter.formatResultLine(failedResult);
    
    test.assertContains(failedLine, 'failed.wav', 'Contains filename');
    test.assertContains(failedLine, 'Expected: 45 mph', 'Contains expected speed');
    test.assertContains(failedLine, 'FAILED - no signal', 'Contains failure reason');
    test.assert(!failedLine.includes('±'), 'No error margin for failed test');
    test.assertContains(failedLine, '[99ms, 3.00s]', 'Contains timing and duration on failed test');
    
    // Test 3: Long filename padding
    console.log('\nTest 3: Filename padding');
    const shortResult = { ...successResult, filename: 'a.wav' };
    const longResult = { ...successResult, filename: 'very_long_filename.wav' };
    
    const shortLine = TestReporter.formatResultLine(shortResult);
    const longLine = TestReporter.formatResultLine(longResult);
    
    // Both should have consistent formatting structure
    test.assert(shortLine.includes('|'), 'Short filename line has separators');
    test.assert(longLine.includes('|'), 'Long filename line has separators');
    
    return test.summary();
}

/**
 * Test the createTestResult function
 */
function testCreateTestResult() {
    const test = new SimpleTest('TestReporter.createTestResult');
    console.log('\n=== Testing Test Result Creation ===');
    
    // Test 1: Successful result with error
    console.log('\nTest 1: Successful result creation');
    const successResult = TestReporter.createTestResult(
        'test.wav', 30, 28.5, 'SUCCESS', 1.5
    );
    
    test.assertEqual(successResult.filename, 'test.wav', 'Filename set correctly');
    test.assertEqual(successResult.expectedSpeedMph, 30, 'Expected speed set correctly');
    test.assertEqual(successResult.calculatedSpeedMph, 28.5, 'Calculated speed set correctly');
    test.assertEqual(successResult.status, 'SUCCESS', 'Status set correctly');
    test.assertEqual(successResult.error, 1.5, 'Error set correctly');
    test.assertNear(successResult.accuracy, 95.0, 0.1, 'Accuracy calculated correctly');
    
    // Test 2: Failed result without error
    console.log('\nTest 2: Failed result creation');
    const failedResult = TestReporter.createTestResult(
        'failed.wav', 45, null, 'FAILED'
    );
    
    test.assertEqual(failedResult.filename, 'failed.wav', 'Failed filename set correctly');
    test.assertEqual(failedResult.calculatedSpeedMph, null, 'Failed speed is null');
    test.assertEqual(failedResult.status, 'FAILED', 'Failed status set correctly');
    test.assert(!('error' in failedResult), 'No error field for failed result');
    test.assert(!('accuracy' in failedResult), 'No accuracy field for failed result');
    
    return test.summary();
}

/**
 * Test the calculateAverageExpectedSpeed function
 */
function testCalculateAverageExpectedSpeed() {
    const test = new SimpleTest('TestReporter.calculateAverageExpectedSpeed');
    console.log('\n=== Testing Average Speed Calculation ===');
    
    // Test 1: Normal results
    console.log('\nTest 1: Normal average calculation');
    const results = [
        { expectedSpeedMph: 20 },
        { expectedSpeedMph: 30 },
        { expectedSpeedMph: 40 }
    ];
    
    const average = TestReporter.calculateAverageExpectedSpeed(results);
    test.assertEqual(average, 30, 'Average calculated correctly');
    
    // Test 2: Single result
    console.log('\nTest 2: Single result average');
    const singleResult = [{ expectedSpeedMph: 25 }];
    const singleAverage = TestReporter.calculateAverageExpectedSpeed(singleResult);
    test.assertEqual(singleAverage, 25, 'Single result average is the value itself');
    
    // Test 3: Decimal values
    console.log('\nTest 3: Decimal values');
    const decimalResults = [
        { expectedSpeedMph: 22.5 },
        { expectedSpeedMph: 27.5 }
    ];
    const decimalAverage = TestReporter.calculateAverageExpectedSpeed(decimalResults);
    test.assertEqual(decimalAverage, 25.0, 'Decimal average calculated correctly');
    
    return test.summary();
}

/**
 * Test the displayResultsSummary function (output testing)
 */
function testDisplayResultsSummary() {
    const test = new SimpleTest('TestReporter.displayResultsSummary');
    console.log('\n=== Testing Results Summary Display ===');
    
    // Test 1: Mixed results output
    console.log('\nTest 1: Mixed results summary');
    const testResults = createTestResults();
    
    test.startCapturingOutput();
    TestReporter.displayResultsSummary(testResults);
    const output = test.stopCapturingOutput();
    
    test.assertContains(output, 'TEST RESULTS SUMMARY', 'Contains summary header');
    test.assertContains(output, 'test1.wav', 'Contains first test file');
    test.assertContains(output, 'test2.wav', 'Contains second test file');
    test.assertContains(output, 'test3.wav', 'Contains third test file');
    test.assertContains(output, 'Test Summary: 2/3 successful', 'Contains success count');
    test.assertContains(output, 'Average Error:', 'Contains average error');
    test.assertContains(output, 'Best Result:', 'Contains best result info');
    test.assertContains(output, 'Worst Result:', 'Contains worst result info');
    
    // Test 2: All successful results
    console.log('\nTest 2: All successful results');
    const allSuccessResults = [
        TestReporter.createTestResult('test1.wav', 30, 29.0, 'SUCCESS', 1.0),
        TestReporter.createTestResult('test2.wav', 40, 39.5, 'SUCCESS', 0.5)
    ];
    
    test.startCapturingOutput();
    TestReporter.displayResultsSummary(allSuccessResults);
    const successOutput = test.stopCapturingOutput();
    
    test.assertContains(successOutput, 'Test Summary: 2/2 successful', 'All tests marked successful');
    test.assertContains(successOutput, 'Average Error:', 'Shows average error for successes');
    
    // Test 3: All failed results
    console.log('\nTest 3: All failed results');
    const allFailedResults = [
        TestReporter.createTestResult('fail1.wav', 30, null, 'FAILED'),
        TestReporter.createTestResult('fail2.wav', 40, null, 'FAILED')
    ];
    
    test.startCapturingOutput();
    TestReporter.displayResultsSummary(allFailedResults);
    const failedOutput = test.stopCapturingOutput();
    
    test.assertContains(failedOutput, 'Test Summary: 0/2 successful', 'All tests marked failed');
    test.assert(!failedOutput.includes('Average Error:'), 'No average error for all failures');
    
    return test.summary();
}

/**
 * Test the displayTestAnalysis function
 */
function testDisplayTestAnalysis() {
    const test = new SimpleTest('TestReporter.displayTestAnalysis');
    console.log('\n=== Testing Test Analysis Display ===');
    
    // Test 1: Complete analysis display
    console.log('\nTest 1: Complete analysis display');
    const sections = {
        duration: 5.5,
        sampleRate: 48000,
        closestApproachTime: 2.75,
        approachDuration: 2.0,
        recedeDuration: 2.5
    };
    
    const approachFreqs = [
        { frequency: 1100 },
        { frequency: 1050 },
        { frequency: 1120 }
    ];
    
    const recedeFreqs = [
        { frequency: 950 },
        { frequency: 980 },
        { frequency: 920 }
    ];
    
    const finalResult = {
        valid: true,
        approachFreq: 1100,
        recedeFreq: 950,
        speedMph: 56.2,
        error: 1.8
    };
    
    test.startCapturingOutput();
    TestReporter.displayTestAnalysis(
        'test.wav', 55, sections, approachFreqs, recedeFreqs, finalResult
    );
    const output = test.stopCapturingOutput();
    
    test.assertContains(output, 'Testing: test.wav', 'Contains filename');
    test.assertContains(output, 'Expected: 55 mph', 'Contains expected speed');
    test.assertContains(output, 'Duration: 5.50s', 'Contains duration');
    test.assertContains(output, 'Closest approach: 2.75s', 'Contains approach time');
    test.assertContains(output, 'Top approach frequencies: 1100, 1050, 1120 Hz', 'Contains frequency list');
    test.assertContains(output, 'Frequencies used: 1100 → 950 Hz', 'Contains selected frequencies');
    test.assertContains(output, 'Result: 56.2 mph', 'Contains final result');
    
    return test.summary();
}

/**
 * Run all tests
 */
function runAllTests() {
    console.log('🧪 TEST REPORTER UNIT TESTS');
    console.log('============================');
    console.log('These tests demonstrate how to:');
    console.log('• Test output formatting functions');
    console.log('• Capture and verify console output');
    console.log('• Test statistical calculations');
    console.log('• Verify string formatting and manipulation');
    
    const results = [];
    results.push(testFormatResultLine());
    results.push(testCreateTestResult());
    results.push(testCalculateAverageExpectedSpeed());
    results.push(testDisplayResultsSummary());
    results.push(testDisplayTestAnalysis());
    
    const allPassed = results.every(result => result === true);
    const passedCount = results.filter(result => result === true).length;
    
    console.log('\n' + '='.repeat(50));
    console.log(`OVERALL RESULTS: ${passedCount}/${results.length} test suites passed`);
    
    if (allPassed) {
        console.log('🎉 All TestReporter tests passed!');
        console.log('✅ The module is working correctly');
    } else {
        console.log('⚠️  Some tests failed - check implementation');
    }
    
    return allPassed;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
}

export { runAllTests };

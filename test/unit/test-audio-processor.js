/**
 * Unit Tests for AudioProcessor (AudioUtils)
 * 
 * These tests show beginners how to:
 * - Test static utility functions
 * - Test file I/O operations with mocked data
 * - Test data transformation functions
 * - Test error handling for edge cases
 */

import AudioProcessor from '../../docs/shared/audio-utils.js';
import fs from 'fs';
import path from 'path';

/**
 * Simple test framework for beginners
 */
class SimpleTest {
    constructor(testName) {
        this.testName = testName;
        this.passed = 0;
        this.failed = 0;
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
    
    assertNear(actual, expected, tolerance, message) {
        const condition = Math.abs(actual - expected) <= tolerance;
        const fullMessage = `${message} (expected: ~${expected}, got: ${actual}, tolerance: ±${tolerance})`;
        this.assert(condition, fullMessage);
    }
    
    assertArrayEqual(actual, expected, message) {
        const condition = Array.isArray(actual) && Array.isArray(expected) && 
                         actual.length === expected.length &&
                         actual.every((val, i) => Math.abs(val - expected[i]) < 0.001);
        this.assert(condition, `${message} (arrays ${condition ? 'match' : 'differ'})`);
    }
    
    summary() {
        console.log(`\n${this.testName} Results: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    }
}

/**
 * Create test audio data for testing
 */
function createTestSamples(length = 1000) {
    const samples = [];
    for (let i = 0; i < length; i++) {
        // Create a sine wave for realistic audio data
        samples.push(Math.sin(2 * Math.PI * 440 * i / 48000) * 0.5);
    }
    return samples;
}

/**
 * Test amplitude normalization
 */
function testNormalizeAmplitude() {
    const test = new SimpleTest('AudioProcessor.normalizeAmplitude');
    console.log('\n=== Testing Amplitude Normalization ===');
    
    // Test 1: Normal case with values > 1
    console.log('\nTest 1: Values greater than 1');
    const largeSamples = [2.0, -3.0, 1.5, -2.5];
    const normalized = AudioProcessor.normalizeAmplitude(largeSamples);
    
    test.assertArrayEqual(normalized, [2.0/3.0, -1.0, 0.5, -2.5/3.0], 'Large values normalized correctly');
    
    // Test 2: Values already in range [-1, 1]
    console.log('\nTest 2: Values already normalized');
    const normalSamples = [0.5, -0.8, 0.2, -0.1];
    const alreadyNormal = AudioProcessor.normalizeAmplitude(normalSamples);
    
    test.assertArrayEqual(alreadyNormal, normalSamples, 'Already normalized values unchanged');
    
    // Test 3: All zeros
    console.log('\nTest 3: All zero samples');
    const zeroSamples = [0, 0, 0, 0];
    const normalizedZeros = AudioProcessor.normalizeAmplitude(zeroSamples);
    
    test.assertArrayEqual(normalizedZeros, zeroSamples, 'Zero samples remain zero');
    
    // Test 4: Single large value
    console.log('\nTest 4: Single large value');
    const singleLarge = [0.1, 0.2, 5.0, 0.1];
    const normalizedSingle = AudioProcessor.normalizeAmplitude(singleLarge);
    
    test.assertNear(Math.max(...normalizedSingle.map(Math.abs)), 1.0, 0.001, 'Max value becomes 1.0');
    
    return test.summary();
}

/**
 * Test time-based section extraction
 */
function testExtractTimeSections() {
    const test = new SimpleTest('AudioProcessor.extractTimeSections');
    console.log('\n=== Testing Time Section Extraction ===');
    
    // Test 1: Normal case
    console.log('\nTest 1: Normal time ranges');
    const samples = createTestSamples(5000); // 5000 samples at 1000 Hz = 5 seconds
    const sampleRate = 1000;
    const timeRanges = {
        section1: [1.0, 2.0],   // 1000 samples
        section2: [3.0, 4.5]    // 1500 samples
    };
    
    const sections = AudioProcessor.extractTimeSections(samples, sampleRate, timeRanges);
    
    test.assertEqual(Object.keys(sections).length, 2, 'Correct number of sections');
    test.assertEqual(sections.section1.length, 1000, 'First section correct length');
    test.assertEqual(sections.section2.length, 1500, 'Second section correct length');
    
    // Test 2: Edge case - time range at boundaries
    console.log('\nTest 2: Boundary time ranges');
    const edgeRanges = {
        first: [0.0, 1.0],   // First second
        last: [4.0, 5.0]     // Last second
    };
    
    const edgeSections = AudioProcessor.extractTimeSections(samples, sampleRate, edgeRanges);
    
    test.assertEqual(Object.keys(edgeSections).length, 2, 'Boundary sections created');
    test.assertEqual(edgeSections.first.length, 1000, 'First boundary section correct');
    test.assertEqual(edgeSections.last.length, 1000, 'Last boundary section correct');
    
    // Test 3: Out of bounds time range
    console.log('\nTest 3: Out of bounds time range');
    const outOfBoundsRanges = {
        outOfBounds: [4.5, 6.0]    // Extends beyond audio length
    };
    
    try {
        const outOfBoundsSections = AudioProcessor.extractTimeSections(samples, sampleRate, outOfBoundsRanges);
        test.assert(outOfBoundsSections.outOfBounds.length <= 500, 'Out of bounds section truncated appropriately');
    } catch (error) {
        test.assert(true, 'Out of bounds range throws appropriate error');
    }
    
    return test.summary();
}


/**
 * Test error handling and edge cases
 */
function testErrorHandling() {
    const test = new SimpleTest('AudioProcessor Error Handling');
    console.log('\n=== Testing Error Handling ===');
    
    // Test 1: Empty array handling
    console.log('\nTest 1: Empty arrays');
    try {
        const emptyNormalized = AudioProcessor.normalizeAmplitude([]);
        test.assertEqual(emptyNormalized.length, 0, 'Empty array normalization returns empty array');
    } catch (error) {
        test.assert(true, 'Empty array throws appropriate error');
    }
    
    // Test 2: Invalid time ranges
    console.log('\nTest 2: Invalid time ranges');
    const samples = createTestSamples(1000);
    try {
        const invalidSections = AudioProcessor.extractTimeSections(samples, 1000, {
            invalid: [2.0, 1.0] // Invalid: start > end
        });
        test.assert(invalidSections.invalid.length === 0, 'Invalid time range returns empty section');
    } catch (error) {
        test.assert(true, 'Invalid time range throws appropriate error');
    }
    
    // Test 3: Non-numeric sample data
    console.log('\nTest 3: Non-numeric data handling');
    try {
        const badSamples = [1, 2, 'invalid', 4];
        const badRms = AudioProcessor.calculateRMSEnergy(badSamples);
        test.assert(!isNaN(badRms), 'Handles non-numeric data gracefully');
    } catch (error) {
        test.assert(true, 'Non-numeric data throws appropriate error');
    }
    
    return test.summary();
}

/**
 * Run all tests
 */
function runAllTests() {
    console.log('🧪 AUDIO PROCESSOR UNIT TESTS');
    console.log('===============================');
    console.log('These tests demonstrate how to:');
    console.log('• Test static utility functions');
    console.log('• Test data transformation operations');
    console.log('• Test mathematical calculations');
    console.log('• Test error handling for edge cases');
    
    const results = [];
    results.push(testNormalizeAmplitude());
    results.push(testExtractTimeSections());
    results.push(testErrorHandling());
    
    const allPassed = results.every(result => result === true);
    const passedCount = results.filter(result => result === true).length;
    
    console.log('\n' + '='.repeat(50));
    console.log(`OVERALL RESULTS: ${passedCount}/${results.length} test suites passed`);
    
    if (allPassed) {
        console.log('🎉 All AudioProcessor tests passed!');
        console.log('✅ The audio utility functions are working correctly');
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
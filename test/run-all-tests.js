/**
 * Comprehensive Test Runner
 * Runs all integration and unit tests for the car-speed-via-doppler-analysis module
 */

const { runSpeedDetectionTests } = require('./integration/test-audio-file-analysis');
const { runProblematicRecordingTests } = require('./integration/test-problematic-recordings');

async function runAllTests() {
    console.log('🚗 CAR SPEED VIA DOPPLER - COMPREHENSIVE TEST SUITE');
    console.log('==================================================');
    console.log('Running all integration and unit tests\n');
    
    try {
        // Run main speed detection tests (WAV files)
        console.log('1️⃣ MAIN SPEED DETECTION TESTS');
        console.log('─'.repeat(50));
        await runSpeedDetectionTests();
        
        console.log('\n\n');
        
        // Run problematic recordings analysis
        console.log('2️⃣ PROBLEMATIC RECORDINGS ANALYSIS');
        console.log('─'.repeat(50));
        await runProblematicRecordingTests();
        
        console.log('\n\n');
        
        // Summary
        console.log('✅ ALL TESTS COMPLETED');
        console.log('======================');
        console.log('• Main speed detection tests: Validates algorithm accuracy with known samples');
        console.log('• Problematic recordings: Documents edge cases and algorithm limitations');
        console.log('• Integration complete: E09 error cases are now part of the test suite');
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    }
}

// Run all tests if this file is executed directly
if (require.main === module) {
    runAllTests();
}

module.exports = { runAllTests };
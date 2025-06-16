/**
 * Master Unit Test Runner
 * 
 * This demonstrates to beginners how to:
 * - Organize and run multiple test suites
 * - Provide clear test reporting
 * - Structure a comprehensive test framework
 * - Handle test dependencies and setup
 */

// Import remaining unit test modules (others deleted due to lib/ cleanup)
import { runAllTests as runAudioProcessorTests } from './test-audio-processor.js';
import { runAllTests as runTestReporterTests } from './test-test-reporter.js';

/**
 * Master test suite configuration
 * Shows beginners how to organize test execution
 */
const TEST_SUITES = [
    {
        name: 'AudioProcessor',
        description: 'Tests audio file loading and utility functions',
        runner: runAudioProcessorTests,
        category: 'Audio Processing'
    },
    {
        name: 'TestReporter',
        description: 'Tests result formatting and statistical calculations',
        runner: runTestReporterTests,
        category: 'Utilities'
    }
];

/**
 * Run a single test suite with error handling
 * @param {Object} testSuite - Test suite configuration
 * @returns {Object} Test result
 */
function runSingleTestSuite(testSuite) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 RUNNING: ${testSuite.name}`);
    console.log(`📋 ${testSuite.description}`);
    console.log(`🏷️  Category: ${testSuite.category}`);
    console.log(`${'='.repeat(60)}`);
    
    const startTime = Date.now();
    let success = false;
    let error = null;
    
    try {
        success = testSuite.runner();
    } catch (err) {
        error = err;
        console.error(`❌ Test suite crashed: ${err.message}`);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
        name: testSuite.name,
        category: testSuite.category,
        success,
        error,
        duration
    };
}

/**
 * Display comprehensive test results summary
 * @param {Array} results - Array of test results
 */
function displayTestSummary(results) {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 COMPREHENSIVE UNIT TEST SUMMARY');
    console.log('='.repeat(80));
    
    // Overall statistics
    const totalSuites = results.length;
    const passedSuites = results.filter(r => r.success).length;
    const failedSuites = totalSuites - passedSuites;
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`\n📊 OVERALL RESULTS:`);
    console.log(`   Total Test Suites: ${totalSuites}`);
    console.log(`   Passed: ${passedSuites}`);
    console.log(`   Failed: ${failedSuites}`);
    console.log(`   Success Rate: ${((passedSuites / totalSuites) * 100).toFixed(1)}%`);
    console.log(`   Total Execution Time: ${totalTime}ms`);
    
    // Results by category
    const categories = [...new Set(results.map(r => r.category))];
    console.log(`\n📋 RESULTS BY CATEGORY:`);
    
    categories.forEach(category => {
        const categoryResults = results.filter(r => r.category === category);
        const categoryPassed = categoryResults.filter(r => r.success).length;
        console.log(`   ${category}: ${categoryPassed}/${categoryResults.length} passed`);
    });
    
    // Individual suite results
    console.log(`\n📝 INDIVIDUAL SUITE RESULTS:`);
    results.forEach(result => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        const time = `${result.duration}ms`;
        console.log(`   ${status} ${result.name.padEnd(25)} (${time})`);
        
        if (result.error) {
            console.log(`      Error: ${result.error.message}`);
        }
    });
    
    // Final assessment
    console.log('\n' + '='.repeat(80));
    if (passedSuites === totalSuites) {
        console.log('🎉 ALL UNIT TESTS PASSED!');
        console.log('✅ All utility modules are working correctly');
        console.log('🚀 The refactored codebase is ready for production');
    } else {
        console.log('⚠️  SOME UNIT TESTS FAILED');
        console.log(`❌ ${failedSuites} test suite(s) need attention`);
        console.log('🔧 Review failed modules before deploying');
    }
    
    return passedSuites === totalSuites;
}

/**
 * Display beginner-friendly information about unit testing
 */
function displayTestingGuide() {
    console.log('📚 UNIT TESTING GUIDE FOR BEGINNERS');
    console.log('===================================');
    console.log('');
    console.log('What you\'ll learn from these tests:');
    console.log('');
    console.log('🔬 TESTING CONCEPTS:');
    console.log('  • How to test individual functions in isolation');
    console.log('  • Creating test data (mocks) instead of using real files');
    console.log('  • Verifying expected behavior with assertions');
    console.log('  • Testing edge cases and error conditions');
    console.log('');
    console.log('🛠️  TESTING TECHNIQUES:');
    console.log('  • Mock objects (fake dependencies for testing)');
    console.log('  • Boundary testing (edge cases and limits)');
    console.log('  • Output testing (capturing console output)');
    console.log('  • Integration testing (multiple modules together)');
    console.log('');
    console.log('📊 WHAT EACH MODULE TESTS:');
    console.log('  • AudioProcessor: Audio file loading and utility functions');
    console.log('  • TestReporter: Output formatting and statistics');
    console.log('');
    console.log('💡 PRO TIPS:');
    console.log('  • Read each test file to understand the testing patterns');
    console.log('  • Run individual test files to see detailed output');
    console.log('  • Modify test data to see how tests react');
    console.log('  • Add your own tests when you modify the code');
    console.log('');
}

/**
 * Main test execution function
 */
function runAllUnitTests() {
    displayTestingGuide();
    
    console.log('🚀 Starting comprehensive unit test execution...\n');
    
    const results = [];
    
    // Run each test suite
    for (const testSuite of TEST_SUITES) {
        const result = runSingleTestSuite(testSuite);
        results.push(result);
    }
    
    // Display comprehensive summary
    const allPassed = displayTestSummary(results);
    
    // Return overall success for programmatic use
    return allPassed;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const success = runAllUnitTests();
    process.exit(success ? 0 : 1);
}

export { runAllUnitTests, TEST_SUITES };
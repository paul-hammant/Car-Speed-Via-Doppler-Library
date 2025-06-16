/**
 * Analysis of Extracted Problematic Recordings
 * Tests the three solo-car ~30mph recordings that resulted in E09 errors
 * Now converted from MP4 to WAV for full Doppler analysis
 */

const { DopplerSpeedTester } = require('./test-audio-file-analysis');
const path = require('path');

/**
 * Test the actual problematic recordings that were converted from MP4 to WAV
 */
async function testExtractedProblematicRecordings() {
    console.log('EXTRACTED PROBLEMATIC RECORDINGS ANALYSIS');
    console.log('=========================================');
    console.log('Testing solo-car ~30mph recordings that resulted in E09 errors');
    console.log('Original format: MP4, extracted to WAV for analysis\n');
    
    const tester = new DopplerSpeedTester();
    const baseDirectory = path.join(__dirname, '..', '..', 'speed_samples');
    
    // Test cases for the problematic recordings
    // User reported these were solo-car situations at just under 30mph
    const problematicTestCases = [
        { 
            file: 'doppler-recording-2025-06-13T17-09-59.wav', 
            expectedMph: 30,  // User reported ~30mph
            duration: '3.11s',
            originalFormat: 'MP4 (0.06 MB)',
            description: 'First problematic recording'
        },
        { 
            file: 'doppler-recording-2025-06-13T17-10-33.wav', 
            expectedMph: 30,  // User reported ~30mph  
            duration: '7.06s',
            originalFormat: 'MP4 (0.13 MB)',
            description: 'Second problematic recording'
        },
        { 
            file: 'doppler-recording-2025-06-13T17-11-41.wav', 
            expectedMph: 30,  // User reported ~30mph
            duration: '6.80s', 
            originalFormat: 'MP4 (0.12 MB)',
            description: 'Third problematic recording'
        }
    ];
    
    const results = [];
    
    problematicTestCases.forEach((testCase, index) => {
        console.log(`\n${index + 1}. ${testCase.description}`);
        console.log('─'.repeat(60));
        console.log(`Original: ${testCase.originalFormat}, Duration: ${testCase.duration}`);
        console.log(`Expected: Solo car at ~${testCase.expectedMph} mph`);
        console.log(`Resulted in: E09 error in web app\n`);
        
        const filePath = path.join(baseDirectory, testCase.file);
        const result = tester.analyzeTestFile(filePath, testCase.expectedMph);
        
        // Add metadata to result
        result.originalFormat = testCase.originalFormat;
        result.expectedDuration = testCase.duration;
        result.description = testCase.description;
        result.webAppResult = 'E09 - No clear pattern';
        
        results.push(result);
    });
    
    // Display analysis summary
    displayProblematicAnalysisSummary(results);
    
    return results;
}

/**
 * Display comprehensive analysis of the problematic recordings
 */
function displayProblematicAnalysisSummary(results) {
    console.log('\n\nPROBLEMATIC RECORDINGS ANALYSIS SUMMARY');
    console.log('=======================================');
    
    console.log('\n📊 DETAILED RESULTS:');
    console.log('─'.repeat(80));
    
    results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.description}`);
        console.log(`   Original: ${result.originalFormat}`);
        console.log(`   Duration: ${result.expectedDuration} (actual: ${result.duration?.toFixed(2)}s)`);
        console.log(`   Expected: ~30 mph solo car`);
        console.log(`   Web App: ${result.webAppResult}`);
        console.log(`   Analysis: ${result.status}`);
        
        if (result.calculatedSpeed) {
            console.log(`   Algorithm Result: ${result.calculatedSpeed.toFixed(1)} mph`);
            console.log(`   Error: ${result.speedError?.toFixed(1)} mph`);
        } else {
            console.log(`   Algorithm Result: ${result.status}`);
        }
        
        // Show the actual test result details
        console.log(`   Raw Result: ${JSON.stringify({
            status: result.status,
            speed: result.calculatedSpeed,
            error: result.speedError
        }, null, 2).replace(/\n/g, '\n             ')}`)
        
        console.log(`   Processing Time: ${result.executionTimeMs}ms`);
    });
    
    // Analysis insights
    console.log('\n\n🔍 FAILURE PATTERN ANALYSIS:');
    console.log('─'.repeat(40));
    
    const successfulResults = results.filter(r => r.calculatedSpeed);
    const failedResults = results.filter(r => !r.calculatedSpeed);
    
    console.log(`• Total recordings: ${results.length}`);
    console.log(`• Algorithm successful: ${successfulResults.length}`);
    console.log(`• Algorithm failed: ${failedResults.length}`);
    console.log(`• Web app E09 errors: ${results.length} (all)`);
    
    if (successfulResults.length > 0) {
        const avgSpeed = successfulResults.reduce((sum, r) => sum + r.calculatedSpeed, 0) / successfulResults.length;
        const avgError = successfulResults.reduce((sum, r) => sum + r.speedError, 0) / successfulResults.length;
        console.log(`• Average detected speed: ${avgSpeed.toFixed(1)} mph`);
        console.log(`• Average error: ${avgError.toFixed(1)} mph`);
    }
    
    console.log('\n🔬 ALGORITHM vs WEB APP DISCREPANCY:');
    console.log('─'.repeat(45));
    
    if (successfulResults.length > 0 && failedResults.length < results.length) {
        console.log('• Node.js algorithm CAN detect patterns in some recordings');
        console.log('• Web app resulted in E09 for ALL recordings');
        console.log('• Suggests potential differences between implementations');
        console.log('• May indicate browser-specific audio processing issues');
    } else if (failedResults.length === results.length) {
        console.log('• Both Node.js algorithm and web app failed');
        console.log('• Confirms these are genuinely challenging recordings');
        console.log('• Validates E09 error detection is working correctly');
    }
    
    console.log('\n📋 RECOMMENDATIONS:');
    console.log('─'.repeat(25));
    console.log('• Compare browser vs Node.js audio processing pipelines');
    console.log('• Investigate timing differences in sectioning algorithms');
    console.log('• Check for differences in FFT implementations');
    console.log('• Consider browser-specific audio encoding effects');
    console.log('• Use these as regression test cases for web app fixes');
}

// Run the test if this file is executed directly
if (require.main === module) {
    testExtractedProblematicRecordings().catch(console.error);
}

module.exports = { testExtractedProblematicRecordings };
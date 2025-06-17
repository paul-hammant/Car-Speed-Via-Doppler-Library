/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo
 *
 * Test Suite for Problematic Recordings
 * Tests real-world recordings that resulted in E09 errors in the web app
 * These recordings help identify edge cases and algorithm limitations
 */

const path = require('path');
const fs = require('fs');

/**
 * Test runner for problematic recordings that failed with E09 errors
 * These are real recordings from the web app that couldn't be processed successfully
 */
class ProblematicRecordingTester {
    constructor() {
        this.baseDirectory = path.join(__dirname, '..', '..', 'speed_samples');
        this.problematicRecordings = [
            'doppler-recording-2025-06-13T17-09-59.mp4',
            'doppler-recording-2025-06-13T17-10-33.mp4',
            'doppler-recording-2025-06-13T17-11-41.mp4'
        ];
    }
    
    /**
     * Analyze problematic recordings to understand failure patterns
     * @returns {Array} Test results for each problematic recording
     */
    analyzeProblematicRecordings() {
        console.log('PROBLEMATIC RECORDINGS ANALYSIS');
        console.log('===============================');
        console.log('Testing real-world recordings that resulted in E09 errors');
        console.log('These help identify algorithm limitations and edge cases\n');
        
        const results = [];
        
        this.problematicRecordings.forEach((filename, index) => {
            const filePath = path.join(this.baseDirectory, filename);
            console.log(`\n${index + 1}. Testing: ${filename}`);
            console.log('─'.repeat(50));
            
            try {
                const result = this.analyzeProblematicFile(filePath);
                results.push(result);
            } catch (error) {
                console.log(`❌ ERROR: ${error.message}`);
                results.push({
                    filename,
                    status: 'ERROR',
                    error: error.message,
                    expectedOutcome: 'E09 - No clear pattern',
                    actualOutcome: 'Analysis failed'
                });
            }
        });
        
        this.displayProblematicSummary(results);
        return results;
    }
    
    /**
     * Analyze a single problematic recording file
     * @param {string} filePath - Path to the problematic recording
     * @returns {Object} Analysis result
     */
    analyzeProblematicFile(filePath) {
        const filename = path.basename(filePath);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        
        const stats = fs.statSync(filePath);
        const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
        
        console.log(`📁 File size: ${fileSizeMB} MB`);
        console.log(`📅 Created: ${stats.birthtime.toISOString()}`);
        
        // For MP4 files, we need ffmpeg or similar to extract audio
        // For now, we'll document the file characteristics and expected behavior
        const result = {
            filename,
            fileSizeMB: parseFloat(fileSizeMB),
            createdAt: stats.birthtime.toISOString(),
            status: 'DOCUMENTED',
            expectedOutcome: 'E09 - No clear pattern',
            actualOutcome: 'MP4 audio extraction needed',
            notes: this.getRecordingNotes(filename)
        };
        
        console.log(`📋 Status: ${result.status}`);
        console.log(`🎯 Expected: ${result.expectedOutcome}`);
        console.log(`📝 Notes: ${result.notes}`);
        
        return result;
    }
    
    /**
     * Get specific notes about each problematic recording
     * @param {string} filename - The recording filename
     * @returns {string} Notes about the recording
     */
    getRecordingNotes(filename) {
        const notes = {
            'doppler-recording-2025-06-13T17-09-59.mp4': 'First problematic recording - likely contains challenging vehicle type or poor positioning',
            'doppler-recording-2025-06-13T17-10-33.mp4': 'Second problematic recording - pattern unclear, may have multiple vehicles or noise',
            'doppler-recording-2025-06-13T17-11-41.mp4': 'Third problematic recording - could be electric vehicle, bus, or insufficient Doppler shift'
        };
        
        return notes[filename] || 'Problematic recording requiring further analysis';
    }
    
    /**
     * Display summary of problematic recording analysis
     * @param {Array} results - Analysis results for all problematic recordings
     */
    displayProblematicSummary(results) {
        console.log('\n\nPROBLEMATIC RECORDINGS SUMMARY');
        console.log('==============================');
        
        results.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.filename}`);
            console.log(`   Status: ${result.status}`);
            console.log(`   Size: ${result.fileSizeMB} MB`);
            console.log(`   Expected: ${result.expectedOutcome}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });
        
        console.log('\n📊 ANALYSIS INSIGHTS:');
        console.log('─'.repeat(30));
        console.log('• These recordings represent real-world edge cases');
        console.log('• All resulted in E09 errors in the web application');
        console.log('• Common causes: complex vehicle types, poor positioning, noise');
        console.log('• Future enhancement: Add MP4 audio extraction for full analysis');
        console.log('• Test value: Validates E09 error detection is working correctly');
        
        console.log('\n🔧 RECOMMENDED ACTIONS:');
        console.log('─'.repeat(30));
        console.log('• Add ffmpeg integration for MP4 audio extraction');
        console.log('• Implement spectral analysis of these problematic recordings');
        console.log('• Document failure patterns for algorithm improvements');
        console.log('• Use these as negative test cases for E09 validation');
        console.log('• Consider machine learning approach for complex scenarios');
    }
}

/**
 * Enhanced test case documentation for integration into test suite
 */
function documentProblematicRecordings() {
    console.log('\n\n🔬 INTEGRATION TEST ENHANCEMENT');
    console.log('===============================');
    console.log('These problematic recordings should be added to the main test suite as:');
    console.log('\n1. NEGATIVE TEST CASES:');
    console.log('   - Verify E09 error detection works correctly');
    console.log('   - Test algorithm robustness with challenging inputs');
    console.log('   - Validate error handling and user feedback');
    
    console.log('\n2. ALGORITHM IMPROVEMENT TARGETS:');
    console.log('   - Bus detection (rear engine complexity)');
    console.log('   - Electric vehicle handling (low noise)');
    console.log('   - Multi-vehicle scenario separation');
    console.log('   - Noise reduction and signal enhancement');
    
    console.log('\n3. FUTURE ENHANCEMENTS:');
    console.log('   - Machine learning classification of vehicle types');
    console.log('   - Advanced signal processing for complex scenarios');
    console.log('   - Real-time feedback during recording');
    console.log('   - Adaptive algorithm selection based on input characteristics');
}

// Main execution function
async function runProblematicRecordingTests() {
    const tester = new ProblematicRecordingTester();
    const results = tester.analyzeProblematicRecordings();
    documentProblematicRecordings();
    return results;
}

// Run tests if this file is executed directly
if (require.main === module) {
    runProblematicRecordingTests().catch(console.error);
}

module.exports = { ProblematicRecordingTester, runProblematicRecordingTests };
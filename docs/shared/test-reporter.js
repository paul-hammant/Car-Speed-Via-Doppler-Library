/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo

 * Test Result Reporting
 * Formats and displays test results in a clear, readable format
 */

class TestReporter {
    /**
     * Display comprehensive test results summary
     * @param {Array} results - Array of test result objects
     * @param {Object} fftStatus - FFT implementation status (optional)
     */
    static displayResultsSummary(results, fftStatus = null) {
        console.log('\n## TEST RESULTS SUMMARY: Expected vs Calculated Car Speeds\n');
        
        let successCount = 0;
        let totalError = 0;
        let errorCount = 0;
        let bestResult = null;
        let worstResult = null;
        
        // Display markdown table header
        console.log('| File | Expected Speed | Calculated Speed | Error | Strategy Used | Clip Duration | Processing Time |');
        console.log('|------|----------------|------------------|-------|---------------|---------------|-----------------|');
        
        // Display individual results as table rows
        results.forEach(result => {
            const tableRow = this.formatResultAsTableRow(result);
            console.log(tableRow);
            
            // Track statistics
            if (result.status === 'SUCCESS') {
                successCount++;
                if (result.error !== undefined) {
                    totalError += result.error;
                    errorCount++;
                    
                    if (!bestResult || result.error < bestResult.error) {
                        bestResult = result;
                    }
                    if (!worstResult || result.error > worstResult.error) {
                        worstResult = result;
                    }
                }
            }
        });
        
        // Display FFT implementation info
        if (fftStatus) {
            console.log('');
            console.log(`**FFT Implementation**: ${fftStatus.implementation} (Mode: ${fftStatus.mode})`);
            if (fftStatus.wasmLoaded) {
                console.log(`**WASM Status**: Loaded and ${fftStatus.wasmWorking ? 'Working' : 'Not Working'}`);
                if (fftStatus.simdSize !== null && fftStatus.simdSize !== undefined) {
                    console.log(`**SIMD Size**: ${fftStatus.simdSize}`);
                }
            }
        }
        
        // Calculate timing statistics
        const timings = results.filter(r => r.executionTimeMs !== undefined).map(r => r.executionTimeMs);
        const totalTime = timings.reduce((sum, time) => sum + time, 0);
        const avgTime = timings.length > 0 ? totalTime / timings.length : 0;
        const minTime = timings.length > 0 ? Math.min(...timings) : 0;
        const maxTime = timings.length > 0 ? Math.max(...timings) : 0;

        // Display summary statistics
        console.log('');
        console.log(`Test Summary: ${successCount}/${results.length} successful`);
        
        if (timings.length > 0) {
            console.log(`Performance: Total ${totalTime}ms, Average ${avgTime.toFixed(0)}ms/test (${minTime}-${maxTime}ms range)`);
        }
        
        if (errorCount > 0) {
            const avgError = totalError / errorCount;
            const avgAccuracy = 100 - (avgError / this.calculateAverageExpectedSpeed(results) * 100);
            
            const avgErrorKmh = (avgError * 1.609344).toFixed(2);
            console.log(`Average Error: ${avgError.toFixed(2)} mph (${avgErrorKmh} km/h)`);
            console.log(`Average Accuracy: ${Math.max(0, avgAccuracy).toFixed(1)}%`);
            
            if (bestResult) {
                const bestErrorKmh = (bestResult.error * 1.609344).toFixed(1);
                console.log(`Best Result: ${bestResult.filename} (${bestResult.error.toFixed(1)} mph (${bestErrorKmh} km/h) error)`);
            }
            if (worstResult) {
                const worstErrorKmh = (worstResult.error * 1.609344).toFixed(1);
                console.log(`Worst Result: ${worstResult.filename} (${worstResult.error.toFixed(1)} mph (${worstErrorKmh} km/h) error)`);
            }
        }
        
        console.log('\nAll test files analyzed with Car Speed Via Doppler.');
    }
    
    /**
     * Format a single test result line
     * @param {Object} result - Test result object
     * @returns {string} Formatted result line
     */
    static formatResultLine(result) {
        const filename = result.filename.padEnd(16);
        const expectedKmh = (result.expectedSpeedMph * 1.609344).toFixed(1);
        const expected = `Expected: ${result.expectedSpeedMph} mph (${expectedKmh} km/h)`;
        
        let calculated, error;
        if (result.calculatedSpeedMph === null) {
            calculated = `Calculated: ${result.status}`;
            error = '';
        } else {
            const calculatedKmh = (result.calculatedSpeedMph * 1.609344).toFixed(1);
            calculated = `Calculated: ${result.calculatedSpeedMph.toFixed(1)} mph (${calculatedKmh} km/h)`;
            if (result.error !== undefined) {
                error = `        ±${result.error.toFixed(1)}`;
            } else {
                error = '';
            }
        }
        
        // Add timing information
        let timing = '';
        if (result.executionTimeMs !== undefined) {
            const durationStr = result.duration ? `${result.duration.toFixed(2)}s` : 'N/A';
            timing = `        [${result.executionTimeMs}ms time taken for ${durationStr} clip]`;
        }
        
        return `${filename} | ${expected} | ${calculated}${error}${timing}`;
    }
    
    /**
     * Format a single test result as markdown table row
     * @param {Object} result - Test result object
     * @returns {string} Formatted table row
     */
    static formatResultAsTableRow(result) {
        const filename = result.filename;
        const expectedKmh = (result.expectedSpeedMph * 1.609344).toFixed(1);
        const expected = `${result.expectedSpeedMph} mph (${expectedKmh} km/h)`;
        
        let calculated, error;
        if (result.calculatedSpeedMph === null) {
            calculated = `❌ ${result.status}`;
            error = 'N/A';
        } else {
            const calculatedKmh = (result.calculatedSpeedMph * 1.609344).toFixed(1);
            calculated = `${result.calculatedSpeedMph.toFixed(1)} mph (${calculatedKmh} km/h)`;
            if (result.error !== undefined) {
                error = `±${result.error.toFixed(1)} mph`;
            } else {
                error = 'N/A';
            }
        }
        
        // Strategy information
        const strategy = result.strategy || 'Primary';
        
        // Duration and timing information
        const duration = result.duration ? `${result.duration.toFixed(2)}s` : 'N/A';
        const timing = result.executionTimeMs !== undefined ? `${result.executionTimeMs}ms` : 'N/A';
        
        return `| ${filename} | ${expected} | ${calculated} | ${error} | ${strategy} | ${duration} | ${timing} |`;
    }
    
    /**
     * Display detailed analysis for a single test
     * @param {string} filename - Test file name
     * @param {number} expectedSpeedMph - Expected speed
     * @param {Object} sections - Audio sections info
     * @param {Array} approachFreqs - Approach frequency candidates
     * @param {Array} recedeFreqs - Recede frequency candidates
     * @param {Object} finalResult - Final calculation result
     */
    static displayTestAnalysis(filename, expectedSpeedMph, sections, approachFreqs, recedeFreqs, finalResult) {
        console.log(`\n=== Testing: ${filename} ===`);
        const expectedKmh = (expectedSpeedMph * 1.609344).toFixed(1);
        console.log(`Expected: ${expectedSpeedMph} mph (${expectedKmh} km/h)`);
        
        if (sections.duration) {
            console.log(`Duration: ${sections.duration.toFixed(2)}s, Sample rate: ${sections.sampleRate} Hz`);
        }
        
        if (sections.strategy) {
            console.log(`Strategy: ${sections.strategy}`);
        }
        
        if (sections.approachDuration && sections.recedeDuration) {
            if (sections.closestApproachTime !== undefined) {
                console.log(`Closest approach: ${sections.closestApproachTime.toFixed(2)}s`);
            }
            console.log(`Approach section: ${sections.approachDuration.toFixed(2)}s`);
            console.log(`Recede section: ${sections.recedeDuration.toFixed(2)}s`);
        }
        
        // Display top frequencies
        if (approachFreqs && approachFreqs.length > 0) {
            const topApproach = approachFreqs.slice(0, 3).map(f => f.frequency.toFixed(0)).join(', ');
            console.log(`Top approach frequencies: ${topApproach} Hz`);
        }
        
        if (recedeFreqs && recedeFreqs.length > 0) {
            const topRecede = recedeFreqs.slice(0, 3).map(f => f.frequency.toFixed(0)).join(', ');
            console.log(`Top recede frequencies: ${topRecede} Hz`);
        }
        
        // Display final result
        if (finalResult && finalResult.valid) {
            console.log(`Frequencies used: ${finalResult.approachFreq.toFixed(0)} → ${finalResult.recedeFreq.toFixed(0)} Hz`);
            const resultKmh = (finalResult.speedMph * 1.609344).toFixed(1);
            const errorKmh = (finalResult.error * 1.609344).toFixed(1);
            console.log(`Result: ${finalResult.speedMph.toFixed(1)} mph (${resultKmh} km/h) (error: ${finalResult.error.toFixed(1)} mph (${errorKmh} km/h))`);
        } else {
            console.log(`Result: FAILED (${finalResult ? finalResult.error : 'unknown error'})`);
        }
    }
    
    /**
     * Calculate average expected speed from results
     * @param {Array} results - Array of test results
     * @returns {number} Average expected speed
     */
    static calculateAverageExpectedSpeed(results) {
        const total = results.reduce((sum, result) => sum + result.expectedSpeedMph, 0);
        return total / results.length;
    }
    
    /**
     * Create a test result object
     * @param {string} filename - Test file name
     * @param {number} expectedSpeedMph - Expected speed
     * @param {number|null} calculatedSpeedMph - Calculated speed or null
     * @param {string} status - Test status (SUCCESS, FAILED, ERROR)
     * @param {number} error - Error amount (optional)
     * @returns {Object} Test result object
     */
    static createTestResult(filename, expectedSpeedMph, calculatedSpeedMph, status, error = undefined) {
        const result = {
            filename,
            expectedSpeedMph,
            calculatedSpeedMph,
            status
        };
        
        if (error !== undefined) {
            result.error = error;
            result.accuracy = 100 - (error / expectedSpeedMph * 100);
        }
        
        return result;
    }
}

export default TestReporter;

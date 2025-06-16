/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo

 * Frequency Matching and Speed Calculation
 * Finds optimal frequency pairs and calculates car speeds
 */

class FrequencyMatcher {
    constructor(speedCalculator) {
        this.speedCalculator = speedCalculator;
    }
    
    /**
     * Find the best frequency pair from approach and recede candidates
     * @param {Array} approachFrequencies - Array of frequency candidates from approach
     * @param {Array} recedeFrequencies - Array of frequency candidates from recede
     * @param {number} expectedSpeedMph - Expected speed for validation
     * @returns {Object} Best speed calculation result
     */
    findOptimalSpeedCalculation(approachFrequencies, recedeFrequencies, expectedSpeedMph) {
        console.log(`🔍 findOptimalSpeedCalculation called with ${approachFrequencies.length} approach, ${recedeFrequencies.length} recede freqs`);
        let bestResult = null;
        let bestError = Infinity;
        
        // Try all combinations of approach and recede frequencies
        for (const approachFreq of approachFrequencies) {
            for (const recedeFreq of recedeFrequencies) {
                const result = this.calculateSpeedForFrequencyPair(
                    approachFreq.frequency, 
                    recedeFreq.frequency, 
                    expectedSpeedMph
                );
                
                if (result.valid && result.error < bestError) {
                    bestResult = result;
                    bestError = result.error;
                }
            }
        }
        
        return bestResult || { 
            valid: false, 
            speedMph: null, 
            approachFreq: null, 
            recedeFreq: null,
            error: 'No valid frequency pairs found'
        };
    }
    
    /**
     * Calculate speed for a specific frequency pair
     * @param {number} approachFreq - Frequency when approaching (Hz)
     * @param {number} recedeFreq - Frequency when receding (Hz)
     * @param {number} expectedSpeedMph - Expected speed for error calculation
     * @returns {Object} Speed calculation result with validation
     */
    calculateSpeedForFrequencyPair(approachFreq, recedeFreq, expectedSpeedMph) {
        // Calculate speed using Doppler formula
        console.log(`Testing frequency pair: ${approachFreq.toFixed(0)}Hz → ${recedeFreq.toFixed(0)}Hz`);
        const speedKmh = this.speedCalculator.calculateSpeed(approachFreq, recedeFreq);
        
        if (speedKmh === 0) {
            // Speed calculator returned 0 (invalid)
            return {
                valid: false,
                speedKmh: 0,
                speedMph: 0,
                approachFreq,
                recedeFreq,
                error: 'Invalid speed calculation'
            };
        }
        
        const speedMph = speedKmh * 0.621371;
        const error = Math.abs(speedMph - expectedSpeedMph);
        
        return {
            valid: true,
            speedKmh,
            speedMph,
            approachFreq,
            recedeFreq,
            error,
            accuracy: 100 - (error / expectedSpeedMph * 100)
        };
    }
    
    /**
     * Check if frequency difference is reasonable for Doppler shift
     * @param {number} approachFreq - Approaching frequency
     * @param {number} recedeFreq - Receding frequency
     * @returns {boolean} True if frequency shift is reasonable
     */
    static isReasonableFrequencyShift(approachFreq, recedeFreq) {
        const shift = Math.abs(approachFreq - recedeFreq);
        const averageFreq = (approachFreq + recedeFreq) / 2;
        const shiftPercentage = (shift / averageFreq) * 100;
        
        // Expect 1-15% frequency shift for typical car speeds
        return shiftPercentage >= 1 && shiftPercentage <= 15;
    }
    
    /**
     * Filter frequency candidates to remove unrealistic ones
     * @param {Array} frequencies - Array of frequency candidates
     * @param {number} minFreq - Minimum reasonable frequency (default: 50 Hz)
     * @param {number} maxFreq - Maximum reasonable frequency (default: 2000 Hz)
     * @returns {Array} Filtered frequency array
     */
    static filterReasonableFrequencies(frequencies, minFreq = 50, maxFreq = 2000) {
        return frequencies.filter(freq => 
            freq.frequency >= minFreq && 
            freq.frequency <= maxFreq &&
            freq.power > 0
        );
    }
}

export default FrequencyMatcher;
/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo

 * Simplified Doppler Speed Analyzer for Web
 * Based on the working NodeJS version
 */

import DopplerSpeedCalculator from './doppler-calculator.js';
import FrequencyMatcher from './frequency-matcher.js';
import ApproachDetector from './approach-detector.js';
import { extractTimeSections } from './audio-slicer.js';

class SpeedAnalyzer {
    constructor() {
        this.speedCalculator = new DopplerSpeedCalculator();
        this.frequencyMatcher = new FrequencyMatcher(this.speedCalculator);
    }
    
    /**
     * Analyze audio samples for car speed using simple approach
     * @param {Array} samples - Audio sample data
     * @param {number} sampleRate - Sample rate in Hz
     * @param {number} expectedSpeedMph - Expected speed for validation
     * @returns {Object} Analysis result
     */
    async analyzeSpeed(samples, sampleRate, expectedSpeedMph = 30) {
        const duration = samples.length / sampleRate;
        
        try {
            // Extract sections based on duration
            let sections;
            if (duration < 2.0) {
                // Short file: use first/last quarters
                sections = this.extractQuarterSections(samples);
            } else {
                // Long file: use approach detection
                const closestApproachIndex = ApproachDetector.detectClosestApproach(samples);
                sections = this.extractApproachSections(samples, sampleRate, closestApproachIndex);
            }
            
            if (!sections.approaching || !sections.receding) {
                return { valid: false, error: 'Failed to extract audio sections' };
            }
            
            // Analyze frequencies using spectrum analysis
            const approachFreqs = await this.analyzeFrequencies(sections.approaching, sampleRate);
            const recedeFreqs = await this.analyzeFrequencies(sections.receding, sampleRate);
            
            if (approachFreqs.length === 0 || recedeFreqs.length === 0) {
                return { valid: false, error: 'No strong frequencies found' };
            }
            
            // Find best speed calculation
            const result = this.frequencyMatcher.findOptimalSpeedCalculation(
                approachFreqs, 
                recedeFreqs, 
                expectedSpeedMph
            );
            
            return result;
            
        } catch (error) {
            console.error('Speed analysis error:', error);
            return { valid: false, error: error.message };
        }
    }
    
    /**
     * Extract sections for short files (first/last quarters)
     */
    extractQuarterSections(samples) {
        const quarterLength = Math.floor(samples.length / 4);
        return {
            approaching: samples.slice(0, quarterLength),
            receding: samples.slice(-quarterLength)
        };
    }
    
    /**
     * Extract sections around closest approach point
     */
    extractApproachSections(samples, sampleRate, closestApproachIndex) {
        const sectionDuration = 2.0; // 2 seconds each section
        const sectionSamples = Math.floor(sectionDuration * sampleRate);
        
        const approachStart = Math.max(0, closestApproachIndex - sectionSamples * 2);
        const approachEnd = Math.max(approachStart + sectionSamples, closestApproachIndex - sectionSamples / 2);
        
        const recedeStart = Math.min(samples.length, closestApproachIndex + sectionSamples / 2);
        const recedeEnd = Math.min(samples.length, recedeStart + sectionSamples);
        
        return {
            approaching: samples.slice(approachStart, approachEnd),
            receding: samples.slice(recedeStart, recedeEnd)
        };
    }
    
    /**
     * Analyze frequencies in audio section using simple FFT approach
     */
    async analyzeFrequencies(samples, sampleRate) {
        // Simple frequency analysis - find dominant frequencies
        const frequencies = [];
        
        try {
            // Use basic FFT approach for frequency detection
            const fftSize = this.getOptimalFFTSize(samples.length);
            const freqBins = await this.performFFT(samples, fftSize, sampleRate);
            
            // Find top frequencies
            const sortedBins = freqBins
                .map((power, index) => ({ 
                    frequency: (index * sampleRate) / fftSize, 
                    power 
                }))
                .filter(bin => bin.frequency >= 50 && bin.frequency <= 2000) // Reasonable range
                .sort((a, b) => b.power - a.power)
                .slice(0, 10); // Top 10 frequencies
            
            return sortedBins;
            
        } catch (error) {
            console.error('Frequency analysis error:', error);
            return [];
        }
    }
    
    /**
     * Get optimal FFT size for given sample length
     */
    getOptimalFFTSize(sampleLength) {
        // Find next power of 2
        let size = 1024;
        while (size < sampleLength / 4 && size < 32768) {
            size *= 2;
        }
        return Math.min(size, sampleLength);
    }
    
    /**
     * Perform FFT analysis (simplified version)
     */
    async performFFT(samples, fftSize, sampleRate) {
        // Use a simplified FFT approach - for now return mock data
        // In real implementation, this should use actual FFT
        const freqBins = new Array(fftSize / 2).fill(0);
        
        // Simple frequency detection using basic spectral analysis
        // This is a placeholder - real implementation needs proper FFT
        for (let i = 0; i < freqBins.length; i++) {
            const freq = (i * sampleRate) / fftSize;
            let power = 0;
            
            // Calculate power at this frequency using simple approach
            for (let j = 0; j < Math.min(samples.length, 4096); j += 4) {
                const phase = (2 * Math.PI * freq * j) / sampleRate;
                power += Math.abs(samples[j] * Math.cos(phase));
            }
            
            freqBins[i] = power;
        }
        
        return freqBins;
    }
}

export default SpeedAnalyzer;
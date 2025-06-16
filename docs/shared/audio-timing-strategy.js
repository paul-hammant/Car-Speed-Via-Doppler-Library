/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo

 * Audio Timing Strategy
 * Provides time-based audio sectioning strategies
 */

import { extractTimeSections } from './audio-slicer.js';

class AudioTimingStrategy {
    /**
     * Extract sections with automatic timing based on file duration
     * @param {Array} samples - Audio sample data
     * @param {number} sampleRate - Audio sample rate
     * @param {number} duration - Audio duration in seconds
     * @returns {Object} Extracted audio sections
     */
    static extractAdaptiveSections(samples, sampleRate, duration) {
        // Use flexible timing based on file duration
        const midPoint = duration / 2;
        
        const timeRanges = {
            approaching: [0.5, midPoint - 0.2],
            near: [midPoint - 0.2, midPoint + 0.2],
            receding: [midPoint + 0.2, duration - 0.5]
        };
        
        return extractTimeSections(samples, sampleRate, timeRanges);
    }
    
    /**
     * Display section information for user feedback
     * @param {Object} sections - Extracted sections
     * @param {number} sampleRate - Sample rate for duration calculation
     */
    static displaySectionInfo(sections, sampleRate) {
        console.log('\nAudio sections extracted:');
        console.log(`  Approaching: ${(sections.approaching.length / sampleRate).toFixed(2)}s (${sections.approaching.length} samples)`);
        console.log(`  Near observer: ${(sections.near.length / sampleRate).toFixed(2)}s (excluded from analysis)`);
        console.log(`  Receding: ${(sections.receding.length / sampleRate).toFixed(2)}s (${sections.receding.length} samples)`);
    }
}

export default AudioTimingStrategy;
/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo

 * Audio Slicing Operations for Web Deployment
 * Production-grade audio cutting and slicing utilities
 * 
 * MULTI-STRATEGY SECTIONING FRAMEWORK
 * ========================================
 * Provides unified multi-strategy framework for audio sectioning:
 * 
 * - Strategy evaluation and confidence scoring
 * - Multiple sectioning strategies for different audio characteristics
 * - Optimal strategy selection based on audio characteristics
 * - Quality metrics for section validation
 */

class AudioSlicer {
    /**
     * Extract approach and recede sections from audio around closest approach point
     * @param {Array} samples - Full audio sample data
     * @param {number} sampleRate - Audio sample rate in Hz
     * @param {number} closestApproachIndex - Sample index of closest approach
     * @param {number} duration - Total audio duration in seconds
     * @returns {Object} Object with approach and recede sections
     */
    static extractSections(samples, sampleRate, closestApproachIndex, duration) {
        // Calculate adaptive margins around closest approach
        const marginSeconds = Math.min(0.3, duration * 0.2);
        const marginSamples = Math.floor(marginSeconds * sampleRate);
        const minSectionSamples = 2048;
        
        // Calculate section boundaries
        const approachEnd = Math.max(closestApproachIndex - marginSamples, minSectionSamples);
        const recedeStart = Math.min(closestApproachIndex + marginSamples, samples.length - minSectionSamples);
        
        // Extract sections
        const approachSection = samples.slice(0, approachEnd);
        const recedeSection = samples.slice(recedeStart);
        
        return {
            approaching: approachSection,
            receding: recedeSection,
            approachDuration: approachSection.length / sampleRate,
            recedeDuration: recedeSection.length / sampleRate,
            strategy: 'closest_approach',
            metadata: {
                closestApproachIndex,
                marginSeconds,
                marginSamples,
                approachEnd,
                recedeStart
            }
        };
    }
    
    /**
     * Extract sections for short audio files (different strategy)
     * @param {Array} samples - Full audio sample data
     * @param {number} sampleRate - Audio sample rate in Hz
     * @returns {Object} Object with approach and recede sections
     */
    static extractShortFileSections(samples, sampleRate) {
        // For short files, use first and last quarters
        const quarterLength = Math.floor(samples.length / 4);
        
        const approachSection = samples.slice(0, quarterLength);
        const recedeSection = samples.slice(-quarterLength);
        
        return {
            approaching: approachSection,
            receding: recedeSection,
            approachDuration: approachSection.length / sampleRate,
            recedeDuration: recedeSection.length / sampleRate,
            strategy: 'short_file_quarters',
            metadata: {
                quarterLength,
                totalLength: samples.length
            }
        };
    }
    
    /**
     * Extract time-based sections (for manual timing)
     * @param {Array} samples - Audio sample data
     * @param {number} sampleRate - Sample rate in Hz
     * @param {Object} timeRanges - Object with approaching/receding time ranges
     * @returns {Object} Object with extracted sections
     */
    static extractTimeSections(samples, sampleRate, timeRanges) {
        const sections = {};
        const metadata = {};
        
        for (const [sectionName, [startTime, endTime]] of Object.entries(timeRanges)) {
            const startSample = Math.floor(startTime * sampleRate);
            const endSample = Math.floor(endTime * sampleRate);
            
            const validStartSample = Math.max(0, startSample);
            const validEndSample = Math.min(samples.length, endSample);
            
            sections[sectionName] = samples.slice(validStartSample, validEndSample);
            metadata[sectionName] = {
                startTime,
                endTime,
                startSample: validStartSample,
                endSample: validEndSample,
                duration: (validEndSample - validStartSample) / sampleRate
            };
        }
        
        return {
            ...sections,
            strategy: 'time_based',
            metadata
        };
    }
    
    /**
     * Validate that extracted sections are large enough for analysis
     * @param {Object} sections - Sections object from extractSections
     * @param {number} minSamples - Minimum required samples (default: 2048)
     * @returns {Object} Validation result with details
     */
    static validateSections(sections, minSamples = 2048) {
        const validation = {
            isValid: false,
            errors: [],
            warnings: [],
            sectionDetails: {}
        };
        
        // Check approaching section
        if (!sections.approaching || sections.approaching.length < minSamples) {
            validation.errors.push(`Approaching section too short: ${sections.approaching?.length || 0} samples (minimum: ${minSamples})`);
        } else {
            validation.sectionDetails.approaching = {
                length: sections.approaching.length,
                duration: sections.approachDuration,
                valid: true
            };
        }
        
        // Check receding section
        if (!sections.receding || sections.receding.length < minSamples) {
            validation.errors.push(`Receding section too short: ${sections.receding?.length || 0} samples (minimum: ${minSamples})`);
        } else {
            validation.sectionDetails.receding = {
                length: sections.receding.length,
                duration: sections.recedeDuration,
                valid: true
            };
        }
        
        // Check for reasonable section balance
        if (sections.approaching && sections.receding) {
            const ratio = sections.approaching.length / sections.receding.length;
            if (ratio > 5 || ratio < 0.2) {
                validation.warnings.push(`Section length imbalance: approach/recede ratio = ${ratio.toFixed(2)}`);
            }
        }
        
        validation.isValid = validation.errors.length === 0;
        validation.strategy = sections.strategy || 'unknown';
        
        return validation;
    }
    
    /**
     * Auto-select best sectioning strategy based on audio characteristics
     * @param {Array} samples - Audio sample data
     * @param {number} sampleRate - Audio sample rate in Hz
     * @param {number} closestApproachIndex - Optional closest approach index
     * @returns {Object} Best sections with strategy metadata
     */
    static extractBestSections(samples, sampleRate, closestApproachIndex = null) {
        const duration = samples.length / sampleRate;
        const strategies = [];
        
        // Strategy 1: Closest approach (if available)
        if (closestApproachIndex !== null && closestApproachIndex > 0 && closestApproachIndex < samples.length) {
            const sections = this.extractSections(samples, sampleRate, closestApproachIndex, duration);
            const validation = this.validateSections(sections);
            
            strategies.push({
                name: 'closest_approach',
                sections,
                validation,
                confidence: validation.isValid ? 0.9 : 0.1,
                reason: validation.isValid ? 'Closest approach detected with valid sections' : 'Closest approach sections too small'
            });
        }
        
        // Strategy 2: Short file quarters
        if (duration < 5.0) { // Less than 5 seconds
            const sections = this.extractShortFileSections(samples, sampleRate);
            const validation = this.validateSections(sections, 1024); // Lower threshold for short files
            
            strategies.push({
                name: 'short_file_quarters',
                sections,
                validation,
                confidence: validation.isValid ? 0.7 : 0.2,
                reason: validation.isValid ? 'Short file strategy with valid sections' : 'Short file sections too small'
            });
        }
        
        // Strategy 3: Simple quarters (fallback)
        const quarterLength = Math.floor(samples.length / 4);
        const fallbackSections = {
            approaching: samples.slice(0, quarterLength),
            receding: samples.slice(-quarterLength),
            approachDuration: quarterLength / sampleRate,
            recedeDuration: quarterLength / sampleRate,
            strategy: 'simple_quarters'
        };
        const fallbackValidation = this.validateSections(fallbackSections, 512); // Even lower threshold
        
        strategies.push({
            name: 'simple_quarters',
            sections: fallbackSections,
            validation: fallbackValidation,
            confidence: fallbackValidation.isValid ? 0.5 : 0.1,
            reason: fallbackValidation.isValid ? 'Fallback quarters strategy' : 'All strategies failed'
        });
        
        // Select best strategy
        const validStrategies = strategies.filter(s => s.validation.isValid);
        const bestStrategy = validStrategies.length > 0 
            ? validStrategies.sort((a, b) => b.confidence - a.confidence)[0]
            : strategies.sort((a, b) => b.confidence - a.confidence)[0]; // Take best even if invalid
        
        return {
            ...bestStrategy.sections,
            selectedStrategy: bestStrategy.name,
            confidence: bestStrategy.confidence,
            reason: bestStrategy.reason,
            validation: bestStrategy.validation,
            alternativeStrategies: strategies.filter(s => s.name !== bestStrategy.name)
        };
    }
    
    /**
     * Extract overlapping sections for improved analysis
     * @param {Array} samples - Audio sample data
     * @param {number} sampleRate - Audio sample rate in Hz
     * @param {number} sectionDuration - Duration of each section in seconds
     * @param {number} overlapPercent - Overlap percentage (0-50)
     * @returns {Object} Object with multiple overlapping sections
     */
    static extractOverlappingSections(samples, sampleRate, sectionDuration = 1.0, overlapPercent = 25) {
        const sectionSamples = Math.floor(sectionDuration * sampleRate);
        const overlapSamples = Math.floor(sectionSamples * overlapPercent / 100);
        const stepSamples = sectionSamples - overlapSamples;
        
        const sections = {
            approaching: [],
            receding: []
        };
        
        // Extract overlapping sections from first half (approaching)
        const halfPoint = Math.floor(samples.length / 2);
        for (let start = 0; start + sectionSamples <= halfPoint; start += stepSamples) {
            sections.approaching.push({
                samples: samples.slice(start, start + sectionSamples),
                startTime: start / sampleRate,
                endTime: (start + sectionSamples) / sampleRate,
                duration: sectionDuration
            });
        }
        
        // Extract overlapping sections from second half (receding)
        for (let start = halfPoint; start + sectionSamples <= samples.length; start += stepSamples) {
            sections.receding.push({
                samples: samples.slice(start, start + sectionSamples),
                startTime: start / sampleRate,
                endTime: (start + sectionSamples) / sampleRate,
                duration: sectionDuration
            });
        }
        
        return {
            ...sections,
            strategy: 'overlapping_sections',
            metadata: {
                sectionDuration,
                overlapPercent,
                sectionSamples,
                overlapSamples,
                stepSamples,
                approachingSectionCount: sections.approaching.length,
                recedingSectionCount: sections.receding.length
            }
        };
    }
}

export default AudioSlicer;
/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo

 * Approach Detection for Web Deployment
 * Production-grade closest approach point detection using energy analysis
 */

class ApproachDetector {
    /**
     * Find the closest approach point in audio using RMS energy analysis
     * @param {Array} samples - Audio sample data
     * @param {number} sampleRate - Sample rate in Hz
     * @param {Object} options - Detection options
     * @returns {Object} Detection result with closest approach index and confidence
     */
    static findClosestApproach(samples, sampleRate, options = {}) {
        const {
            windowSize = 0.1,           // Window size in seconds
            smoothingWindow = 0.05,     // Smoothing window in seconds
            minimumConfidence = 0.3,    // Minimum confidence threshold
            peakProminence = 0.1        // Minimum peak prominence (0-1)
        } = options;
        
        const windowSamples = Math.floor(windowSize * sampleRate);
        const smoothingSamples = Math.floor(smoothingWindow * sampleRate);
        
        // Calculate RMS energy in sliding windows
        const energyProfile = this.calculateEnergyProfile(samples, windowSamples);
        
        // Apply smoothing to reduce noise
        const smoothedProfile = this.applySmoothingFilter(energyProfile, smoothingSamples);
        
        // Find peaks in energy profile
        const peaks = this.findEnergyPeaks(smoothedProfile, peakProminence);
        
        // Select the most prominent peak as closest approach
        const closestApproachResult = this.selectClosestApproachPeak(
            peaks, 
            smoothedProfile, 
            windowSamples,
            minimumConfidence
        );
        
        return {
            ...closestApproachResult,
            energyProfile: smoothedProfile,
            allPeaks: peaks,
            windowSize,
            sampleRate,
            metadata: {
                totalSamples: samples.length,
                duration: samples.length / sampleRate,
                windowSamples,
                smoothingSamples,
                peaksFound: peaks.length
            }
        };
    }
    
    /**
     * Calculate RMS energy profile using sliding window
     * @param {Array} samples - Audio samples
     * @param {number} windowSamples - Window size in samples
     * @returns {Array} Energy values for each window position
     */
    static calculateEnergyProfile(samples, windowSamples) {
        const energyProfile = [];
        const halfWindow = Math.floor(windowSamples / 2);
        
        for (let i = halfWindow; i < samples.length - halfWindow; i++) {
            let sumSquares = 0;
            let count = 0;
            
            // Calculate RMS over window centered at position i
            for (let j = i - halfWindow; j < i + halfWindow && j < samples.length; j++) {
                if (j >= 0) {
                    sumSquares += samples[j] * samples[j];
                    count++;
                }
            }
            
            const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0;
            energyProfile.push({
                index: i,
                energy: rms,
                time: i / (samples.length > 0 ? samples.length : 1) // Normalized time 0-1
            });
        }
        
        return energyProfile;
    }
    
    /**
     * Apply smoothing filter to energy profile
     * @param {Array} energyProfile - Raw energy profile
     * @param {number} smoothingSamples - Smoothing window size
     * @returns {Array} Smoothed energy profile
     */
    static applySmoothingFilter(energyProfile, smoothingSamples) {
        if (smoothingSamples <= 1) return energyProfile;
        
        const smoothed = [];
        const halfWindow = Math.floor(smoothingSamples / 2);
        
        for (let i = 0; i < energyProfile.length; i++) {
            let sum = 0;
            let count = 0;
            
            // Average over smoothing window
            for (let j = i - halfWindow; j <= i + halfWindow; j++) {
                if (j >= 0 && j < energyProfile.length) {
                    sum += energyProfile[j].energy;
                    count++;
                }
            }
            
            smoothed.push({
                ...energyProfile[i],
                energy: count > 0 ? sum / count : energyProfile[i].energy,
                rawEnergy: energyProfile[i].energy
            });
        }
        
        return smoothed;
    }
    
    /**
     * Find peaks in energy profile
     * @param {Array} energyProfile - Energy profile data
     * @param {number} prominence - Minimum peak prominence (0-1)
     * @returns {Array} Array of peak objects
     */
    static findEnergyPeaks(energyProfile, prominence = 0.1) {
        if (energyProfile.length < 3) return [];
        
        const peaks = [];
        const maxEnergy = Math.max(...energyProfile.map(p => p.energy));
        const minProminence = maxEnergy * prominence;
        
        for (let i = 1; i < energyProfile.length - 1; i++) {
            const current = energyProfile[i];
            const prev = energyProfile[i - 1];
            const next = energyProfile[i + 1];
            
            // Check if this is a local maximum
            if (current.energy > prev.energy && current.energy > next.energy) {
                // Calculate prominence by finding the minimum energy in surrounding area
                const searchRadius = Math.min(20, Math.floor(energyProfile.length / 10));
                let minSurrounding = current.energy;
                
                for (let j = Math.max(0, i - searchRadius); j <= Math.min(energyProfile.length - 1, i + searchRadius); j++) {
                    if (j !== i && energyProfile[j].energy < minSurrounding) {
                        minSurrounding = energyProfile[j].energy;
                    }
                }
                
                const peakProminence = current.energy - minSurrounding;
                
                if (peakProminence >= minProminence) {
                    peaks.push({
                        index: current.index,
                        energy: current.energy,
                        prominence: peakProminence,
                        normalizedProminence: peakProminence / maxEnergy,
                        time: current.time,
                        confidence: Math.min(1.0, peakProminence / (maxEnergy * 0.5))
                    });
                }
            }
        }
        
        // Sort peaks by prominence (descending)
        return peaks.sort((a, b) => b.prominence - a.prominence);
    }
    
    /**
     * Select the best peak as closest approach point
     * @param {Array} peaks - Array of detected peaks
     * @param {Array} energyProfile - Full energy profile
     * @param {number} windowSamples - Window size used for detection
     * @param {number} minimumConfidence - Minimum confidence threshold
     * @returns {Object} Closest approach result
     */
    static selectClosestApproachPeak(peaks, energyProfile, windowSamples, minimumConfidence = 0.3) {
        if (peaks.length === 0) {
            return {
                found: false,
                confidence: 0,
                reason: 'No energy peaks detected',
                closestApproachIndex: Math.floor(energyProfile.length / 2),
                estimatedIndex: Math.floor(energyProfile.length / 2)
            };
        }
        
        // Select the most prominent peak with sufficient confidence
        let bestPeak = null;
        
        for (const peak of peaks) {
            if (peak.confidence >= minimumConfidence) {
                bestPeak = peak;
                break; // Peaks are sorted by prominence
            }
        }
        
        if (!bestPeak) {
            // Use the most prominent peak even if confidence is low
            bestPeak = peaks[0];
            
            return {
                found: true,
                confidence: bestPeak.confidence,
                reason: `Low confidence peak selected (${bestPeak.confidence.toFixed(3)})`,
                closestApproachIndex: bestPeak.index,
                estimatedIndex: bestPeak.index,
                energy: bestPeak.energy,
                prominence: bestPeak.prominence,
                time: bestPeak.time,
                warning: 'Low confidence detection - results may be unreliable'
            };
        }
        
        return {
            found: true,
            confidence: bestPeak.confidence,
            reason: `High confidence peak detected (${bestPeak.confidence.toFixed(3)})`,
            closestApproachIndex: bestPeak.index,
            estimatedIndex: bestPeak.index,
            energy: bestPeak.energy,
            prominence: bestPeak.prominence,
            time: bestPeak.time
        };
    }
    
    /**
     * Analyze energy distribution characteristics
     * @param {Array} samples - Audio samples
     * @param {number} sampleRate - Sample rate in Hz
     * @returns {Object} Energy distribution analysis
     */
    static analyzeEnergyDistribution(samples, sampleRate) {
        const windowSamples = Math.floor(0.1 * sampleRate); // 100ms windows
        const energyProfile = this.calculateEnergyProfile(samples, windowSamples);
        
        if (energyProfile.length === 0) {
            return {
                meanEnergy: 0,
                maxEnergy: 0,
                energyVariance: 0,
                energyStd: 0,
                dynamicRange: 0,
                peakCount: 0
            };
        }
        
        const energies = energyProfile.map(p => p.energy);
        const meanEnergy = energies.reduce((sum, e) => sum + e, 0) / energies.length;
        const maxEnergy = Math.max(...energies);
        const minEnergy = Math.min(...energies);
        
        // Calculate variance and standard deviation
        const variance = energies.reduce((sum, e) => sum + Math.pow(e - meanEnergy, 2), 0) / energies.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Calculate dynamic range
        const dynamicRange = maxEnergy > 0 ? 20 * Math.log10(maxEnergy / Math.max(minEnergy, maxEnergy * 0.001)) : 0;
        
        // Count significant peaks
        const peaks = this.findEnergyPeaks(energyProfile, 0.1);
        
        return {
            meanEnergy,
            maxEnergy,
            minEnergy,
            energyVariance: variance,
            energyStd: standardDeviation,
            dynamicRange,
            peakCount: peaks.length,
            coefficient: standardDeviation / (meanEnergy || 1), // Coefficient of variation
            profile: energyProfile
        };
    }
    
    /**
     * Validate approach detection quality
     * @param {Object} detection - Detection result from findClosestApproach
     * @param {Array} samples - Original audio samples
     * @param {number} sampleRate - Sample rate in Hz
     * @returns {Object} Validation result
     */
    static validateDetection(detection, samples, sampleRate) {
        const validation = {
            isValid: false,
            quality: 'poor',
            issues: [],
            recommendations: []
        };
        
        // Check if detection was found
        if (!detection.found) {
            validation.issues.push('No closest approach detected');
            validation.recommendations.push('Try adjusting detection sensitivity or using manual sectioning');
            return validation;
        }
        
        // Check confidence level
        if (detection.confidence < 0.3) {
            validation.issues.push(`Low confidence: ${detection.confidence.toFixed(3)}`);
            validation.quality = 'poor';
        } else if (detection.confidence < 0.6) {
            validation.issues.push(`Medium confidence: ${detection.confidence.toFixed(3)}`);
            validation.quality = 'fair';
        } else {
            validation.quality = 'good';
        }
        
        // Check position validity (should not be too close to edges)
        const edgeMargin = samples.length * 0.1; // 10% margin
        if (detection.closestApproachIndex < edgeMargin) {
            validation.issues.push('Closest approach too close to beginning');
            validation.recommendations.push('Audio may not contain complete approach phase');
        } else if (detection.closestApproachIndex > samples.length - edgeMargin) {
            validation.issues.push('Closest approach too close to end');
            validation.recommendations.push('Audio may not contain complete recede phase');
        }
        
        // Analyze energy distribution
        const energyAnalysis = this.analyzeEnergyDistribution(samples, sampleRate);
        if (energyAnalysis.dynamicRange < 10) {
            validation.issues.push(`Low dynamic range: ${energyAnalysis.dynamicRange.toFixed(1)} dB`);
            validation.recommendations.push('Audio may lack sufficient signal variation for reliable detection');
        }
        
        validation.isValid = validation.issues.length === 0 || 
                           (validation.quality !== 'poor' && !validation.issues.some(issue => 
                               issue.includes('too close to')));
        
        return validation;
    }
    
    /**
     * Detect closest approach point using RMS energy analysis (simple version)
     * @param {Array} samples - Audio sample data
     * @param {number} windowSize - Analysis window size in samples (default: 2048)
     * @returns {number} Sample index of closest approach
     */
    static detectClosestApproach(samples, windowSize = 2048) {
        let maxRMSEnergy = 0;
        let closestApproachIndex = 0;
        
        // Slide window through audio to find highest energy point
        for (let i = 0; i <= samples.length - windowSize; i += windowSize / 4) {
            const rmsEnergy = this.calculateRMSEnergy(samples, i, windowSize);
            
            if (rmsEnergy > maxRMSEnergy) {
                maxRMSEnergy = rmsEnergy;
                closestApproachIndex = i + Math.floor(windowSize / 2);
            }
        }
        
        return closestApproachIndex;
    }
    
    /**
     * Calculate RMS (Root Mean Square) energy for a window of audio
     * @param {Array} samples - Audio sample data
     * @param {number} startIndex - Starting index of window
     * @param {number} windowSize - Size of analysis window
     * @returns {number} RMS energy value
     */
    static calculateRMSEnergy(samples, startIndex, windowSize) {
        let sumSquares = 0;
        const endIndex = Math.min(startIndex + windowSize, samples.length);
        
        // Sum squares of all samples in window
        for (let j = startIndex; j < endIndex; j++) {
            sumSquares += samples[j] * samples[j];
        }
        
        // Return root mean square
        return Math.sqrt(sumSquares / windowSize);
    }
    
    /**
     * Check if audio file is too short for normal approach detection
     * @param {number} duration - Audio duration in seconds
     * @returns {boolean} True if file is too short
     */
    static isShortFile(duration) {
        return duration < 2.0;
    }
}

export default ApproachDetector;
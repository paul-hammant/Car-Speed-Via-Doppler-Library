/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo

 * Comprehensive Frequency Analysis for Web Deployment
 * Production-grade dual frequency analysis with approach/recede detection
 */

import SpectrumAnalyzer from './spectrum-analyzer.js';
import DopplerCalculator from './doppler-calculator.js';

class FrequencyAnalysis {
    constructor(samples, sampleRate, options = {}) {
        this.samples = [...samples];
        this.sampleRate = sampleRate;
        this.windowType = options.windowType || 'hamming';
        this.fftMode = options.fftMode || 'auto';
        this.topFrequencyCount = options.topFrequencyCount || 10;
        this.confidenceThreshold = options.confidenceThreshold || 0.3;
        
        this.dopplerCalculator = new DopplerCalculator();
        this.approachAnalysis = null;
        this.recedeAnalysis = null;
        this.combinedAnalysis = null;
    }
    
    /**
     * Analyze approach and recede sections separately
     * @param {Array} approachSamples - Samples from approaching section
     * @param {Array} recedeSamples - Samples from receding section
     * @returns {Object} Dual analysis results
     */
    async analyzeDualSections(approachSamples, recedeSamples) {
        // Analyze approach section
        this.approachAnalysis = await this.analyzeSingleSection(
            approachSamples, 
            'approach'
        );
        
        // Analyze recede section
        this.recedeAnalysis = await this.analyzeSingleSection(
            recedeSamples, 
            'recede'
        );
        
        // Combine and find best speed matches
        this.combinedAnalysis = this.combineAnalyses(
            this.approachAnalysis, 
            this.recedeAnalysis
        );
        
        return {
            approach: this.approachAnalysis,
            recede: this.recedeAnalysis,
            combined: this.combinedAnalysis,
            metadata: {
                approachDuration: approachSamples.length / this.sampleRate,
                recedeDuration: recedeSamples.length / this.sampleRate,
                totalDuration: (approachSamples.length + recedeSamples.length) / this.sampleRate,
                fftMode: this.fftMode,
                windowType: this.windowType
            }
        };
    }
    
    /**
     * Analyze a single audio section
     * @param {Array} samples - Audio samples
     * @param {string} sectionType - 'approach' or 'recede'
     * @returns {Object} Single section analysis
     */
    async analyzeSingleSection(samples, sectionType) {
        if (samples.length < 1024) {
            return {
                sectionType,
                valid: false,
                error: `Section too short: ${samples.length} samples`,
                frequencies: [],
                peakFrequency: null,
                confidence: 0
            };
        }
        
        try {
            // Create spectrum analyzer for this section
            const analyzer = new SpectrumAnalyzer(samples, this.sampleRate, {
                fftMode: this.fftMode,
                windowType: this.windowType
            });
            
            // Calculate power spectrum
            await analyzer.calculatePowerSpectrum();
            
            // Get strongest frequencies
            const strongestFreqs = analyzer.getStrongestFrequencies(this.topFrequencyCount);
            const peakFrequency = analyzer.findPeakFrequency();
            
            // Calculate quality metrics
            const qualityMetrics = this.calculateSectionQuality(
                strongestFreqs, 
                samples.length, 
                sectionType
            );
            
            // Filter and rank frequencies
            const rankedFrequencies = this.rankFrequencies(
                strongestFreqs, 
                qualityMetrics
            );
            
            return {
                sectionType,
                valid: true,
                frequencies: rankedFrequencies,
                peakFrequency,
                allFrequencies: strongestFreqs,
                qualityMetrics,
                confidence: qualityMetrics.overallConfidence,
                sampleCount: samples.length,
                duration: samples.length / this.sampleRate,
                implementation: analyzer.getImplementationInfo()
            };
            
        } catch (error) {
            return {
                sectionType,
                valid: false,
                error: error.message,
                frequencies: [],
                peakFrequency: null,
                confidence: 0
            };
        }
    }
    
    /**
     * Calculate quality metrics for a frequency analysis section
     * @param {Array} frequencies - Array of frequency objects
     * @param {number} sampleCount - Number of samples analyzed
     * @param {string} sectionType - Section type identifier
     * @returns {Object} Quality metrics
     */
    calculateSectionQuality(frequencies, sampleCount, sectionType) {
        if (frequencies.length === 0) {
            return {
                overallConfidence: 0,
                signalStrength: 0,
                peakClarity: 0,
                frequencyDistribution: 0,
                noiseLevel: 1.0,
                recommendations: ['No significant frequencies detected']
            };
        }
        
        // Signal strength (based on peak power)
        const maxPower = Math.max(...frequencies.map(f => f.power));
        const avgPower = frequencies.reduce((sum, f) => sum + f.power, 0) / frequencies.length;
        const signalStrength = Math.min(1.0, maxPower / 0.001); // Normalize to expected range
        
        // Peak clarity (how much the strongest peak stands out)
        const peakClarity = frequencies.length > 1 
            ? (frequencies[0].power - frequencies[1].power) / frequencies[0].power
            : 1.0;
        
        // Frequency distribution (how spread out the frequencies are)
        if (frequencies.length > 1) {
            const freqValues = frequencies.map(f => f.frequency);
            const minFreq = Math.min(...freqValues);
            const maxFreq = Math.max(...freqValues);
            const freqSpread = (maxFreq - minFreq) / Math.max(minFreq, 100); // Relative spread
            const frequencyDistribution = Math.min(1.0, freqSpread);
        } else {
            var frequencyDistribution = 0.5; // Single peak
        }
        
        // Noise level estimation (based on power variance)
        const powerVariance = this.calculateVariance(frequencies.map(f => f.power));
        const noiseLevel = Math.min(1.0, powerVariance / (avgPower * avgPower + 1e-10));
        
        // Overall confidence calculation
        const overallConfidence = (
            signalStrength * 0.4 +
            peakClarity * 0.3 +
            frequencyDistribution * 0.2 +
            (1.0 - noiseLevel) * 0.1
        );
        
        // Generate recommendations
        const recommendations = [];
        if (signalStrength < 0.3) {
            recommendations.push('Low signal strength - check audio levels');
        }
        if (peakClarity < 0.2) {
            recommendations.push('Multiple similar peaks - may indicate noise or harmonics');
        }
        if (frequencyDistribution < 0.1) {
            recommendations.push('Limited frequency content - check audio source');
        }
        if (noiseLevel > 0.7) {
            recommendations.push('High noise level detected - consider audio filtering');
        }
        
        return {
            overallConfidence: Math.max(0.0, Math.min(1.0, overallConfidence)),
            signalStrength,
            peakClarity,
            frequencyDistribution,
            noiseLevel,
            sampleCount,
            maxPower,
            avgPower,
            powerVariance,
            recommendations: recommendations.length > 0 ? recommendations : ['Good signal quality']
        };
    }
    
    /**
     * Calculate variance of an array
     * @param {Array} values - Numeric values
     * @returns {number} Variance
     */
    calculateVariance(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return variance;
    }
    
    /**
     * Rank frequencies by importance for Doppler analysis
     * @param {Array} frequencies - Raw frequency array
     * @param {Object} qualityMetrics - Quality metrics for weighting
     * @returns {Array} Ranked frequencies
     */
    rankFrequencies(frequencies, qualityMetrics) {
        return frequencies.map((freq, index) => {
            // Base score from power level
            const powerScore = freq.power / Math.max(...frequencies.map(f => f.power));
            
            // Position bonus (top frequencies get higher score)
            const positionBonus = Math.max(0, (frequencies.length - index) / frequencies.length * 0.2);
            
            // Frequency range bonus (mid-range frequencies often better for vehicles)
            let frequencyBonus = 0;
            if (freq.frequency >= 200 && freq.frequency <= 2000) {
                frequencyBonus = 0.1; // Good range for vehicle sounds
            } else if (freq.frequency >= 100 && freq.frequency <= 5000) {
                frequencyBonus = 0.05; // Acceptable range
            }
            
            // Calculate final ranking score
            const rankingScore = powerScore + positionBonus + frequencyBonus;
            
            return {
                ...freq,
                rankingScore,
                powerScore,
                positionBonus,
                frequencyBonus,
                rank: index + 1
            };
        }).sort((a, b) => b.rankingScore - a.rankingScore);
    }
    
    /**
     * Combine approach and recede analyses to find speed matches
     * @param {Object} approachAnalysis - Approach section analysis
     * @param {Object} recedeAnalysis - Recede section analysis
     * @returns {Object} Combined analysis with speed calculations
     */
    combineAnalyses(approachAnalysis, recedeAnalysis) {
        if (!approachAnalysis.valid || !recedeAnalysis.valid) {
            return {
                valid: false,
                error: 'One or both sections invalid',
                speedCalculations: [],
                bestSpeed: null,
                confidence: 0
            };
        }
        
        const speedCalculations = [];
        const approachFreqs = approachAnalysis.frequencies.slice(0, 5); // Top 5
        const recedeFreqs = recedeAnalysis.frequencies.slice(0, 5); // Top 5
        
        // Try all combinations of approach and recede frequencies
        for (let i = 0; i < approachFreqs.length; i++) {
            for (let j = 0; j < recedeFreqs.length; j++) {
                const approachFreq = approachFreqs[i];
                const recedeFreq = recedeFreqs[j];
                
                // Skip if approach frequency isn't higher
                if (approachFreq.frequency <= recedeFreq.frequency) continue;
                
                try {
                    const speed = this.dopplerCalculator.calculateSpeed(
                        approachFreq.frequency,
                        recedeFreq.frequency
                    );
                    
                    // Calculate confidence for this speed calculation
                    const speedConfidence = this.calculateSpeedConfidence(
                        approachFreq,
                        recedeFreq,
                        speed,
                        approachAnalysis.qualityMetrics,
                        recedeAnalysis.qualityMetrics
                    );
                    
                    if (speedConfidence >= this.confidenceThreshold) {
                        speedCalculations.push({
                            approachFreq: approachFreq.frequency,
                            recedeFreq: recedeFreq.frequency,
                            approachPower: approachFreq.power,
                            recedePower: recedeFreq.power,
                            approachRank: approachFreq.rank,
                            recedeRank: recedeFreq.rank,
                            speed,
                            confidence: speedConfidence,
                            frequencySeparation: approachFreq.frequency - recedeFreq.frequency,
                            relativeShift: (approachFreq.frequency - recedeFreq.frequency) / recedeFreq.frequency
                        });
                    }
                } catch (error) {
                    // Skip invalid speed calculations
                    continue;
                }
            }
        }
        
        // Sort by confidence
        speedCalculations.sort((a, b) => b.confidence - a.confidence);
        
        const bestSpeed = speedCalculations[0] || null;
        const avgConfidence = speedCalculations.length > 0
            ? speedCalculations.reduce((sum, calc) => sum + calc.confidence, 0) / speedCalculations.length
            : 0;
        
        return {
            valid: speedCalculations.length > 0,
            speedCalculations,
            bestSpeed,
            confidence: bestSpeed ? bestSpeed.confidence : 0,
            averageConfidence: avgConfidence,
            validCalculations: speedCalculations.length,
            analysisQuality: {
                approachConfidence: approachAnalysis.confidence,
                recedeConfidence: recedeAnalysis.confidence,
                combinedConfidence: (approachAnalysis.confidence + recedeAnalysis.confidence) / 2
            }
        };
    }
    
    /**
     * Calculate confidence for a speed calculation
     * @param {Object} approachFreq - Approach frequency object
     * @param {Object} recedeFreq - Recede frequency object
     * @param {number} speed - Calculated speed
     * @param {Object} approachQuality - Approach section quality metrics
     * @param {Object} recedeQuality - Recede section quality metrics
     * @returns {number} Speed confidence (0-1)
     */
    calculateSpeedConfidence(approachFreq, recedeFreq, speed, approachQuality, recedeQuality) {
        // Base confidence from frequency powers
        const powerConfidence = Math.min(
            approachFreq.powerScore || 0.5,
            recedeFreq.powerScore || 0.5
        );
        
        // Section quality confidence
        const qualityConfidence = (approachQuality.overallConfidence + recedeQuality.overallConfidence) / 2;
        
        // Speed reasonableness
        let speedConfidence = 1.0;
        if (speed < 5) {
            speedConfidence = speed / 5; // Penalize very low speeds
        } else if (speed > 100) {
            speedConfidence = Math.max(0.2, 1.0 - (speed - 100) / 100); // Penalize very high speeds
        }
        
        // Frequency separation confidence
        const separation = (approachFreq.frequency - recedeFreq.frequency) / recedeFreq.frequency;
        const separationConfidence = Math.min(1.0, separation * 10); // Favor larger separations
        
        // Ranking confidence (prefer top-ranked frequencies)
        const rankingConfidence = 1.0 - (
            (approachFreq.rank - 1) * 0.1 + (recedeFreq.rank - 1) * 0.1
        );
        
        // Combined confidence
        const confidence = (
            powerConfidence * 0.3 +
            qualityConfidence * 0.25 +
            speedConfidence * 0.2 +
            separationConfidence * 0.15 +
            Math.max(0, rankingConfidence) * 0.1
        );
        
        return Math.max(0.0, Math.min(1.0, confidence));
    }
    
    /**
     * Get analysis summary for reporting
     * @returns {Object} Analysis summary
     */
    getAnalysisSummary() {
        if (!this.combinedAnalysis) {
            return {
                status: 'not_analyzed',
                message: 'No analysis performed yet'
            };
        }
        
        const summary = {
            status: this.combinedAnalysis.valid ? 'success' : 'failed',
            bestSpeed: this.combinedAnalysis.bestSpeed,
            confidence: this.combinedAnalysis.confidence,
            validCalculations: this.combinedAnalysis.validCalculations || 0
        };
        
        if (this.approachAnalysis && this.recedeAnalysis) {
            summary.sectionAnalysis = {
                approach: {
                    valid: this.approachAnalysis.valid,
                    confidence: this.approachAnalysis.confidence,
                    peakFrequency: this.approachAnalysis.peakFrequency,
                    frequencyCount: this.approachAnalysis.frequencies?.length || 0
                },
                recede: {
                    valid: this.recedeAnalysis.valid,
                    confidence: this.recedeAnalysis.confidence,
                    peakFrequency: this.recedeAnalysis.peakFrequency,
                    frequencyCount: this.recedeAnalysis.frequencies?.length || 0
                }
            };
        }
        
        return summary;
    }
    
    /**
     * Get detailed analysis report
     * @returns {Object} Detailed analysis report
     */
    getDetailedReport() {
        return {
            summary: this.getAnalysisSummary(),
            approach: this.approachAnalysis,
            recede: this.recedeAnalysis,
            combined: this.combinedAnalysis,
            configuration: {
                fftMode: this.fftMode,
                windowType: this.windowType,
                topFrequencyCount: this.topFrequencyCount,
                confidenceThreshold: this.confidenceThreshold,
                sampleRate: this.sampleRate
            }
        };
    }
}

export default FrequencyAnalysis;
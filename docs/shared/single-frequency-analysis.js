/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo

 * Single Frequency Analysis for Web Deployment
 * Production-grade single-section frequency analysis with confidence scoring
 */

import SpectrumAnalyzer from './spectrum-analyzer.js';

class SingleFrequencyAnalysis {
    constructor(samples, sampleRate, options = {}) {
        this.samples = [...samples];
        this.sampleRate = sampleRate;
        this.windowType = options.windowType || 'hamming';
        this.fftMode = options.fftMode || 'auto';
        this.topFrequencyCount = options.topFrequencyCount || 10;
        this.frequencyRange = options.frequencyRange || [50, 5000]; // Hz
        this.powerThreshold = options.powerThreshold || 1e-6;
        
        this.analyzer = null;
        this.analysisResult = null;
    }
    
    /**
     * Perform frequency analysis on the audio samples
     * @returns {Object} Analysis results with frequencies and confidence metrics
     */
    async analyze() {
        if (this.samples.length < 512) {
            return {
                valid: false,
                error: `Sample count too low: ${this.samples.length} (minimum: 512)`,
                frequencies: [],
                peakFrequency: null,
                confidence: 0
            };
        }
        
        try {
            // Create spectrum analyzer
            this.analyzer = new SpectrumAnalyzer(this.samples, this.sampleRate, {
                fftMode: this.fftMode,
                windowType: this.windowType
            });
            
            // Calculate power spectrum
            await this.analyzer.calculatePowerSpectrum();
            
            // Get strongest frequencies
            const allFrequencies = this.analyzer.getStrongestFrequencies(50); // Get more for filtering
            const peakFrequency = this.analyzer.findPeakFrequency();
            
            // Filter frequencies by range and power threshold
            const filteredFrequencies = this.filterFrequencies(allFrequencies);
            
            // Take top frequencies after filtering
            const topFrequencies = filteredFrequencies.slice(0, this.topFrequencyCount);
            
            // Calculate detailed metrics for each frequency
            const enhancedFrequencies = this.enhanceFrequencyData(topFrequencies, allFrequencies);
            
            // Calculate overall analysis confidence
            const confidence = this.calculateAnalysisConfidence(enhancedFrequencies, allFrequencies);
            
            // Generate quality assessment
            const qualityAssessment = this.assessSignalQuality(enhancedFrequencies, allFrequencies);
            
            this.analysisResult = {
                valid: true,
                frequencies: enhancedFrequencies,
                peakFrequency,
                allFrequencies: filteredFrequencies,
                confidence,
                qualityAssessment,
                metadata: {
                    sampleCount: this.samples.length,
                    duration: this.samples.length / this.sampleRate,
                    sampleRate: this.sampleRate,
                    frequencyRange: this.frequencyRange,
                    windowType: this.windowType,
                    fftMode: this.fftMode,
                    implementation: this.analyzer.getImplementationInfo()
                }
            };
            
            return this.analysisResult;
            
        } catch (error) {
            this.analysisResult = {
                valid: false,
                error: error.message,
                frequencies: [],
                peakFrequency: null,
                confidence: 0
            };
            
            return this.analysisResult;
        }
    }
    
    /**
     * Filter frequencies by range and power threshold
     * @param {Array} frequencies - Raw frequency array from spectrum analyzer
     * @returns {Array} Filtered frequencies
     */
    filterFrequencies(frequencies) {
        return frequencies.filter(freq => {
            return freq.frequency >= this.frequencyRange[0] &&
                   freq.frequency <= this.frequencyRange[1] &&
                   freq.power >= this.powerThreshold;
        });
    }
    
    /**
     * Enhance frequency data with additional metrics
     * @param {Array} topFrequencies - Top frequencies to enhance
     * @param {Array} allFrequencies - All valid frequencies for context
     * @returns {Array} Enhanced frequency objects
     */
    enhanceFrequencyData(topFrequencies, allFrequencies) {
        if (topFrequencies.length === 0) return [];
        
        const maxPower = Math.max(...allFrequencies.map(f => f.power));
        const totalPower = allFrequencies.reduce((sum, f) => sum + f.power, 0);
        
        return topFrequencies.map((freq, index) => {
            // Normalized power (0-1 relative to strongest frequency)
            const normalizedPower = freq.power / maxPower;
            
            // Power percentage of total
            const powerPercentage = (freq.power / totalPower) * 100;
            
            // Prominence score (how much it stands out)
            const prominence = this.calculateProminence(freq, allFrequencies, index);
            
            // Stability score (consistency across nearby bins)
            const stability = this.calculateStability(freq, allFrequencies);
            
            // Harmonic analysis
            const harmonicInfo = this.analyzeHarmonics(freq, allFrequencies);
            
            // Quality score for this frequency
            const qualityScore = this.calculateFrequencyQuality(
                normalizedPower, prominence, stability, harmonicInfo
            );
            
            return {
                ...freq,
                rank: index + 1,
                normalizedPower,
                powerPercentage,
                prominence,
                stability,
                harmonicInfo,
                qualityScore,
                metadata: {
                    bin: Math.round(freq.frequency * this.samples.length / this.sampleRate),
                    resolution: this.sampleRate / this.samples.length
                }
            };
        });
    }
    
    /**
     * Calculate prominence of a frequency relative to surrounding frequencies
     * @param {Object} targetFreq - Target frequency object
     * @param {Array} allFrequencies - All frequencies for context
     * @param {number} index - Index in the top frequencies list
     * @returns {number} Prominence score (0-1)
     */
    calculateProminence(targetFreq, allFrequencies, index) {
        // Find frequencies near this one
        const bandwidth = 50; // Hz
        const nearbyFreqs = allFrequencies.filter(f => 
            Math.abs(f.frequency - targetFreq.frequency) <= bandwidth && 
            f.frequency !== targetFreq.frequency
        );
        
        if (nearbyFreqs.length === 0) {
            return 1.0; // No nearby competition
        }
        
        const maxNearbyPower = Math.max(...nearbyFreqs.map(f => f.power));
        const prominence = targetFreq.power / (targetFreq.power + maxNearbyPower);
        
        // Boost prominence for top-ranked frequencies
        const rankBonus = Math.max(0, (10 - index) / 10 * 0.1);
        
        return Math.min(1.0, prominence + rankBonus);
    }
    
    /**
     * Calculate frequency stability (consistency across spectrum)
     * @param {Object} targetFreq - Target frequency object
     * @param {Array} allFrequencies - All frequencies for context
     * @returns {number} Stability score (0-1)
     */
    calculateStability(targetFreq, allFrequencies) {
        // Look for this frequency in surrounding bins
        const tolerance = 10; // Hz
        const similarFreqs = allFrequencies.filter(f =>
            Math.abs(f.frequency - targetFreq.frequency) <= tolerance
        );
        
        if (similarFreqs.length <= 1) {
            return 0.5; // Single bin, average stability
        }
        
        // Calculate power consistency
        const powers = similarFreqs.map(f => f.power);
        const avgPower = powers.reduce((sum, p) => sum + p, 0) / powers.length;
        const powerVariance = powers.reduce((sum, p) => sum + Math.pow(p - avgPower, 2), 0) / powers.length;
        const powerStd = Math.sqrt(powerVariance);
        
        // Stability is inverse of coefficient of variation
        const coefficientOfVariation = powerStd / (avgPower + 1e-10);
        const stability = Math.max(0, 1.0 - coefficientOfVariation);
        
        return Math.min(1.0, stability);
    }
    
    /**
     * Analyze harmonic content for a frequency
     * @param {Object} targetFreq - Target frequency object
     * @param {Array} allFrequencies - All frequencies for context
     * @returns {Object} Harmonic analysis
     */
    analyzeHarmonics(targetFreq, allFrequencies) {
        const fundamental = targetFreq.frequency;
        const harmonics = [];
        const tolerance = 0.05; // 5% tolerance for harmonic detection
        
        // Look for harmonics (2f, 3f, 4f, etc.)
        for (let harmonic = 2; harmonic <= 5; harmonic++) {
            const expectedFreq = fundamental * harmonic;
            const toleranceHz = expectedFreq * tolerance;
            
            const harmonicMatch = allFrequencies.find(f =>
                Math.abs(f.frequency - expectedFreq) <= toleranceHz
            );
            
            if (harmonicMatch) {
                harmonics.push({
                    harmonic,
                    frequency: harmonicMatch.frequency,
                    power: harmonicMatch.power,
                    powerRatio: harmonicMatch.power / targetFreq.power,
                    deviation: Math.abs(harmonicMatch.frequency - expectedFreq)
                });
            }
        }
        
        // Look for subharmonics (f/2, f/3, etc.)
        const subharmonics = [];
        for (let divisor = 2; divisor <= 4; divisor++) {
            const expectedFreq = fundamental / divisor;
            const toleranceHz = expectedFreq * tolerance;
            
            const subharmonicMatch = allFrequencies.find(f =>
                Math.abs(f.frequency - expectedFreq) <= toleranceHz
            );
            
            if (subharmonicMatch) {
                subharmonics.push({
                    divisor,
                    frequency: subharmonicMatch.frequency,
                    power: subharmonicMatch.power,
                    powerRatio: subharmonicMatch.power / targetFreq.power,
                    deviation: Math.abs(subharmonicMatch.frequency - expectedFreq)
                });
            }
        }
        
        return {
            harmonics,
            subharmonics,
            harmonicCount: harmonics.length,
            subharmonicCount: subharmonics.length,
            isLikelyFundamental: subharmonics.length === 0 && harmonics.length > 0,
            isLikelyHarmonic: subharmonics.length > 0
        };
    }
    
    /**
     * Calculate overall quality score for a frequency
     * @param {number} normalizedPower - Normalized power (0-1)
     * @param {number} prominence - Prominence score (0-1)
     * @param {number} stability - Stability score (0-1)
     * @param {Object} harmonicInfo - Harmonic analysis
     * @returns {number} Quality score (0-1)
     */
    calculateFrequencyQuality(normalizedPower, prominence, stability, harmonicInfo) {
        // Base quality from power and prominence
        const baseQuality = (normalizedPower * 0.4 + prominence * 0.4 + stability * 0.2);
        
        // Harmonic bonus
        let harmonicBonus = 0;
        if (harmonicInfo.isLikelyFundamental) {
            harmonicBonus = 0.1; // Boost for fundamental frequencies
        } else if (harmonicInfo.harmonicCount > 0) {
            harmonicBonus = 0.05; // Small boost for frequencies with harmonics
        }
        
        // Penalize if likely a harmonic of something else
        const harmonicPenalty = harmonicInfo.isLikelyHarmonic ? 0.1 : 0;
        
        const quality = baseQuality + harmonicBonus - harmonicPenalty;
        return Math.max(0.0, Math.min(1.0, quality));
    }
    
    /**
     * Calculate overall analysis confidence
     * @param {Array} frequencies - Enhanced frequency array
     * @param {Array} allFrequencies - All valid frequencies
     * @returns {number} Confidence score (0-1)
     */
    calculateAnalysisConfidence(frequencies, allFrequencies) {
        if (frequencies.length === 0) return 0;
        
        // Signal strength factor
        const avgQuality = frequencies.reduce((sum, f) => sum + f.qualityScore, 0) / frequencies.length;
        const signalStrength = frequencies[0].normalizedPower;
        
        // Frequency diversity factor
        const frequencySpread = frequencies.length > 1 
            ? (frequencies[frequencies.length - 1].frequency - frequencies[0].frequency) / frequencies[0].frequency
            : 0;
        const diversityScore = Math.min(1.0, frequencySpread * 2);
        
        // Peak clarity factor
        const peakClarity = frequencies.length > 1
            ? (frequencies[0].power - frequencies[1].power) / frequencies[0].power
            : 1.0;
        
        // Sample adequacy factor
        const sampleAdequacy = Math.min(1.0, this.samples.length / 4096); // 4096 samples as reference
        
        // Combined confidence
        const confidence = (
            avgQuality * 0.3 +
            signalStrength * 0.25 +
            peakClarity * 0.2 +
            diversityScore * 0.15 +
            sampleAdequacy * 0.1
        );
        
        return Math.max(0.0, Math.min(1.0, confidence));
    }
    
    /**
     * Assess signal quality with detailed metrics
     * @param {Array} frequencies - Enhanced frequency array
     * @param {Array} allFrequencies - All valid frequencies
     * @returns {Object} Quality assessment
     */
    assessSignalQuality(frequencies, allFrequencies) {
        const assessment = {
            overall: 'poor',
            signalToNoise: 0,
            dynamicRange: 0,
            frequencyContent: 'limited',
            recommendations: []
        };
        
        if (frequencies.length === 0) {
            assessment.recommendations.push('No significant frequencies detected - check audio levels');
            return assessment;
        }
        
        // Signal-to-noise estimation
        const topPower = frequencies[0].power;
        const avgPower = allFrequencies.reduce((sum, f) => sum + f.power, 0) / allFrequencies.length;
        const snr = topPower / (avgPower + 1e-10);
        assessment.signalToNoise = 20 * Math.log10(snr); // Convert to dB
        
        // Dynamic range
        const maxPower = Math.max(...allFrequencies.map(f => f.power));
        const minPower = Math.min(...allFrequencies.map(f => f.power));
        assessment.dynamicRange = 20 * Math.log10(maxPower / (minPower + 1e-10));
        
        // Frequency content assessment
        if (frequencies.length >= 5) {
            assessment.frequencyContent = 'rich';
        } else if (frequencies.length >= 3) {
            assessment.frequencyContent = 'moderate';
        } else {
            assessment.frequencyContent = 'limited';
        }
        
        // Overall quality determination
        const avgConfidence = frequencies.reduce((sum, f) => sum + f.qualityScore, 0) / frequencies.length;
        if (avgConfidence >= 0.7 && assessment.signalToNoise >= 10) {
            assessment.overall = 'excellent';
        } else if (avgConfidence >= 0.5 && assessment.signalToNoise >= 6) {
            assessment.overall = 'good';
        } else if (avgConfidence >= 0.3 && assessment.signalToNoise >= 3) {
            assessment.overall = 'fair';
        } else {
            assessment.overall = 'poor';
        }
        
        // Generate recommendations
        if (assessment.signalToNoise < 6) {
            assessment.recommendations.push('Low signal-to-noise ratio - reduce background noise');
        }
        if (assessment.dynamicRange < 20) {
            assessment.recommendations.push('Limited dynamic range - check audio levels');
        }
        if (frequencies.length < 3) {
            assessment.recommendations.push('Limited frequency content - verify audio source');
        }
        if (frequencies[0].qualityScore < 0.5) {
            assessment.recommendations.push('Primary frequency has low quality score');
        }
        
        if (assessment.recommendations.length === 0) {
            assessment.recommendations.push('Signal quality is good for analysis');
        }
        
        return assessment;
    }
    
    /**
     * Get analysis results (convenience method)
     * @returns {Object} Current analysis results
     */
    getResults() {
        return this.analysisResult;
    }
    
    /**
     * Get the top N frequencies with quality scores
     * @param {number} count - Number of frequencies to return
     * @returns {Array} Top frequencies
     */
    getTopFrequencies(count = 5) {
        if (!this.analysisResult || !this.analysisResult.valid) {
            return [];
        }
        
        return this.analysisResult.frequencies.slice(0, count);
    }
    
    /**
     * Find frequencies in a specific range
     * @param {number} minFreq - Minimum frequency (Hz)
     * @param {number} maxFreq - Maximum frequency (Hz)
     * @returns {Array} Frequencies in range
     */
    getFrequenciesInRange(minFreq, maxFreq) {
        if (!this.analysisResult || !this.analysisResult.valid) {
            return [];
        }
        
        return this.analysisResult.frequencies.filter(f =>
            f.frequency >= minFreq && f.frequency <= maxFreq
        );
    }
    
    /**
     * Get summary report of the analysis
     * @returns {Object} Summary report
     */
    getSummary() {
        if (!this.analysisResult) {
            return { status: 'not_analyzed' };
        }
        
        if (!this.analysisResult.valid) {
            return {
                status: 'failed',
                error: this.analysisResult.error
            };
        }
        
        return {
            status: 'success',
            peakFrequency: this.analysisResult.peakFrequency,
            confidence: this.analysisResult.confidence,
            frequencyCount: this.analysisResult.frequencies.length,
            qualityRating: this.analysisResult.qualityAssessment.overall,
            signalToNoise: this.analysisResult.qualityAssessment.signalToNoise.toFixed(1) + ' dB',
            duration: this.analysisResult.metadata.duration.toFixed(3) + ' seconds',
            implementation: this.analysisResult.metadata.implementation?.mode || 'unknown'
        };
    }
}

export default SingleFrequencyAnalysis;
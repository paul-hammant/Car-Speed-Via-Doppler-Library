/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo
 * 
 * Production Audio Analysis for Web Deployment
 * Complete Doppler speed analysis using all production algorithms
 */

import DopplerCalculator from './doppler-calculator.js';
import AudioSlicer from './audio-slicer.js';
import ApproachDetector from './approach-detector.js';
import FrequencyMatcher from './frequency-matcher.js?v=simple';
import FrequencyAnalysis from './frequency-analysis.js';
import SpectrumAnalyzer from './spectrum-analyzer.js';

class AudioAnalyzer {
    constructor(options = {}) {
        this.dopplerCalculator = new DopplerCalculator();
        this.frequencyMatcher = new FrequencyMatcher(this.dopplerCalculator);
        
        // Analysis configuration
        this.config = {
            fftMode: options.fftMode || 'auto',
            windowType: options.windowType || 'hamming',
            confidenceThreshold: options.confidenceThreshold || 0.7,
            sectioningStrategy: options.sectioningStrategy || 'auto', // 'auto', 'closest_approach', 'quarters', 'time_based'
            approachDetection: options.approachDetection !== false, // Enable by default
            multiStrategy: options.multiStrategy !== false, // Enable multi-strategy by default
            ...options
        };
    }
    
    /**
     * Perform complete Doppler speed analysis on audio samples
     * @param {Array} samples - Audio sample data
     * @param {number} sampleRate - Sample rate in Hz
     * @param {Object} options - Analysis options
     * @returns {Object} Complete analysis results
     */
    async analyzeAudioForSpeed(samples, sampleRate, options = {}) {
        const analysisConfig = { ...this.config, ...options };
        const startTime = performance.now();
        
        try {
            // Step 1: Detect closest approach (if enabled)
            let approachDetection = null;
            if (analysisConfig.approachDetection) {
                approachDetection = ApproachDetector.findClosestApproach(
                    samples, 
                    sampleRate, 
                    analysisConfig.approachOptions
                );
            }
            
            // Step 2: Extract approach and recede sections using best strategy
            const sectioning = this.extractOptimalSections(
                samples, 
                sampleRate, 
                approachDetection,
                analysisConfig
            );
            
            if (!sectioning.validation.isValid) {
                return {
                    success: false,
                    error: 'Invalid audio sectioning: ' + sectioning.validation.errors.join(', '),
                    sectioning,
                    approachDetection,
                    processingTime: performance.now() - startTime
                };
            }
            
            // Step 3: Perform frequency analysis on both sections
            const frequencyAnalysis = new FrequencyAnalysis(samples, sampleRate, {
                fftMode: analysisConfig.fftMode,
                windowType: analysisConfig.windowType,
                topFrequencyCount: analysisConfig.topFrequencyCount || 10,
                confidenceThreshold: analysisConfig.confidenceThreshold
            });
            
            const dualAnalysis = await frequencyAnalysis.analyzeDualSections(
                sectioning.approaching,
                sectioning.receding
            );
            
            // Step 4: Find best frequency matches for speed calculation
            let speedResults = null;
            if (dualAnalysis.approach.valid && dualAnalysis.recede.valid) {
                if (analysisConfig.multiStrategy) {
                    speedResults = this.frequencyMatcher.findMatchesMultiStrategy(
                        dualAnalysis.approach.frequencies,
                        dualAnalysis.recede.frequencies,
                        analysisConfig.matching
                    );
                } else {
                    speedResults = this.frequencyMatcher.findBestMatches(
                        dualAnalysis.approach.frequencies,
                        dualAnalysis.recede.frequencies,
                        analysisConfig.matching
                    );
                }
            }
            
            // Step 5: Validate and rank results
            const finalResults = this.compileFinalResults(
                speedResults,
                dualAnalysis,
                sectioning,
                approachDetection,
                analysisConfig
            );
            
            finalResults.processingTime = performance.now() - startTime;
            return finalResults;
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                processingTime: performance.now() - startTime
            };
        }
    }
    
    /**
     * Extract optimal audio sections using the best available strategy
     * @param {Array} samples - Audio samples
     * @param {number} sampleRate - Sample rate
     * @param {Object} approachDetection - Approach detection results
     * @param {Object} config - Analysis configuration
     * @returns {Object} Sectioning results
     */
    extractOptimalSections(samples, sampleRate, approachDetection, config) {
        let sectioning = null;
        
        switch (config.sectioningStrategy) {
            case 'closest_approach':
                if (approachDetection && approachDetection.found) {
                    sectioning = AudioSlicer.extractSections(
                        samples,
                        sampleRate,
                        approachDetection.closestApproachIndex,
                        samples.length / sampleRate
                    );
                } else {
                    // Fallback to quarters if no approach detected
                    sectioning = AudioSlicer.extractShortFileSections(samples, sampleRate);
                }
                break;
                
            case 'quarters':
                sectioning = AudioSlicer.extractShortFileSections(samples, sampleRate);
                break;
                
            case 'time_based':
                if (config.timeRanges) {
                    sectioning = AudioSlicer.extractTimeSections(samples, sampleRate, config.timeRanges);
                } else {
                    sectioning = AudioSlicer.extractShortFileSections(samples, sampleRate);
                }
                break;
                
            case 'auto':
            default:
                sectioning = AudioSlicer.extractBestSections(
                    samples,
                    sampleRate,
                    approachDetection?.found ? approachDetection.closestApproachIndex : null
                );
                break;
        }
        
        // Validate sectioning results
        sectioning.validation = AudioSlicer.validateSections(sectioning);
        
        return sectioning;
    }
    
    /**
     * Compile final analysis results with confidence scoring
     * @param {Object} speedResults - Speed calculation results
     * @param {Object} dualAnalysis - Frequency analysis results
     * @param {Object} sectioning - Audio sectioning results
     * @param {Object} approachDetection - Approach detection results
     * @param {Object} config - Analysis configuration
     * @returns {Object} Final compiled results
     */
    compileFinalResults(speedResults, dualAnalysis, sectioning, approachDetection, config) {
        const results = {
            success: false,
            confidence: 0,
            speed: null,
            speedMPH: null,
            speedKMH: null,
            error: null,
            warning: null
        };
        
        // Check if we have valid speed calculations
        if (!speedResults || !speedResults.bestMatch) {
            results.error = 'No valid speed calculations found';
            results.diagnostics = this.generateDiagnostics(dualAnalysis, sectioning, approachDetection);
            return this.addMetadata(results, dualAnalysis, sectioning, approachDetection, config);
        }
        
        const bestMatch = speedResults.bestMatch;
        
        // Extract speed information
        results.success = true;
        results.speed = bestMatch.speed;
        results.speedMPH = bestMatch.speed;
        results.speedKMH = bestMatch.speed * 1.60934;
        results.confidence = bestMatch.confidence;
        
        // Add frequency information
        results.frequencies = {
            approach: bestMatch.approachFreq,
            recede: bestMatch.recedeFreq,
            separation: bestMatch.frequencySeparation || (bestMatch.approachFreq - bestMatch.recedeFreq),
            ratio: bestMatch.approachFreq / bestMatch.recedeFreq
        };
        
        // Add power information
        results.signalStrength = {
            approach: bestMatch.approachPower,
            recede: bestMatch.recedePower,
            ratio: bestMatch.powerRatio || Math.min(bestMatch.approachPower, bestMatch.recedePower) / Math.max(bestMatch.approachPower, bestMatch.recedePower)
        };
        
        // Add validation information
        if (bestMatch.validation) {
            results.validation = bestMatch.validation;
            if (!bestMatch.validation.isValid) {
                results.warning = 'Speed calculation has validation issues: ' + bestMatch.validation.reason;
            }
        }
        
        // Add alternative results
        if (speedResults.matches && speedResults.matches.length > 1) {
            results.alternatives = speedResults.matches.slice(1, 4).map(match => ({
                speed: match.speed,
                confidence: match.confidence,
                approachFreq: match.approachFreq,
                recedeFreq: match.recedeFreq
            }));
        }
        
        // Add strategy information
        if (speedResults.selectedStrategy) {
            results.strategy = speedResults.selectedStrategy;
            results.strategyComparison = speedResults.strategyComparison;
        }
        
        return this.addMetadata(results, dualAnalysis, sectioning, approachDetection, config);
    }
    
    /**
     * Add comprehensive metadata to results
     * @param {Object} results - Current results object
     * @param {Object} dualAnalysis - Frequency analysis results
     * @param {Object} sectioning - Audio sectioning results
     * @param {Object} approachDetection - Approach detection results
     * @param {Object} config - Analysis configuration
     * @returns {Object} Results with metadata
     */
    addMetadata(results, dualAnalysis, sectioning, approachDetection, config) {
        results.metadata = {
            // Sectioning information
            sectioning: {
                strategy: sectioning.selectedStrategy || sectioning.strategy,
                confidence: sectioning.confidence,
                approachDuration: sectioning.approachDuration,
                recedeDuration: sectioning.recedeDuration,
                validation: sectioning.validation
            },
            
            // Frequency analysis information
            frequencyAnalysis: {
                approach: {
                    valid: dualAnalysis.approach.valid,
                    confidence: dualAnalysis.approach.confidence,
                    peakFrequency: dualAnalysis.approach.peakFrequency,
                    frequencyCount: dualAnalysis.approach.frequencies?.length || 0
                },
                recede: {
                    valid: dualAnalysis.recede.valid,
                    confidence: dualAnalysis.recede.confidence,
                    peakFrequency: dualAnalysis.recede.peakFrequency,
                    frequencyCount: dualAnalysis.recede.frequencies?.length || 0
                },
                implementation: dualAnalysis.approach.implementation || dualAnalysis.metadata?.implementation
            },
            
            // Approach detection information
            approachDetection: approachDetection ? {
                found: approachDetection.found,
                confidence: approachDetection.confidence,
                position: approachDetection.time,
                method: 'energy_analysis'
            } : null,
            
            // Configuration used
            configuration: {
                fftMode: config.fftMode,
                windowType: config.windowType,
                sectioningStrategy: config.sectioningStrategy,
                confidenceThreshold: config.confidenceThreshold,
                multiStrategy: config.multiStrategy
            }
        };
        
        return results;
    }
    
    /**
     * Generate diagnostic information for failed analyses
     * @param {Object} dualAnalysis - Frequency analysis results
     * @param {Object} sectioning - Audio sectioning results
     * @param {Object} approachDetection - Approach detection results
     * @returns {Object} Diagnostic information
     */
    generateDiagnostics(dualAnalysis, sectioning, approachDetection) {
        const diagnostics = {
            issues: [],
            recommendations: []
        };
        
        // Check sectioning issues
        if (!sectioning.validation.isValid) {
            diagnostics.issues.push('Audio sectioning failed: ' + sectioning.validation.errors.join(', '));
            diagnostics.recommendations.push('Try different sectioning strategy or longer audio');
        }
        
        // Check frequency analysis issues
        if (!dualAnalysis.approach.valid) {
            diagnostics.issues.push('Approach section analysis failed: ' + (dualAnalysis.approach.error || 'Unknown error'));
            diagnostics.recommendations.push('Check approach section audio quality');
        }
        
        if (!dualAnalysis.recede.valid) {
            diagnostics.issues.push('Recede section analysis failed: ' + (dualAnalysis.recede.error || 'Unknown error'));
            diagnostics.recommendations.push('Check recede section audio quality');
        }
        
        // Check frequency matching issues
        if (dualAnalysis.approach.valid && dualAnalysis.recede.valid) {
            if (dualAnalysis.approach.frequencies.length === 0) {
                diagnostics.issues.push('No significant frequencies found in approach section');
                diagnostics.recommendations.push('Increase audio gain or reduce noise');
            }
            
            if (dualAnalysis.recede.frequencies.length === 0) {
                diagnostics.issues.push('No significant frequencies found in recede section');
                diagnostics.recommendations.push('Increase audio gain or reduce noise');
            }
            
            if (dualAnalysis.approach.frequencies.length > 0 && dualAnalysis.recede.frequencies.length > 0) {
                diagnostics.issues.push('Frequencies found but no valid speed matches');
                diagnostics.recommendations.push('Try lower confidence threshold or manual frequency selection');
            }
        }
        
        // Check approach detection issues
        if (approachDetection && !approachDetection.found) {
            diagnostics.issues.push('Closest approach detection failed: ' + (approachDetection.reason || 'Unknown reason'));
            diagnostics.recommendations.push('Try manual sectioning or check audio for clear approach pattern');
        }
        
        return diagnostics;
    }
    
    /**
     * Extract approach and recede sections from audio using production logic
     * Now supports both smart approach detection and fallback strategies
     * @param {Array} samples - Audio samples
     * @param {number} sampleRate - Sample rate in Hz
     * @param {string} strategy - 'smart' for approach detection, 'quarters' for simple fallback
     * @returns {Object} Object with approaching and receding sections
     */
    extractSections(samples, sampleRate, strategy = 'peak_rms_energy') {
        const duration = samples.length / sampleRate;
        
        // Use peak RMS energy detection for production-level analysis
        if (strategy === 'peak_rms_energy') {
            if (ApproachDetector.isShortFile(duration)) {
                const shortSections = AudioSlicer.extractShortFileSections(samples, sampleRate);
                shortSections.sectioningMethod = 'quarters';
                return shortSections;
            } else {
                const closestApproachIndex = ApproachDetector.detectClosestApproach(samples);
                const sections = AudioSlicer.extractSections(samples, sampleRate, closestApproachIndex, duration);
                
                // Validate sections and fallback if needed
                if (AudioSlicer.validateSections(sections)) {
                    sections.sectioningMethod = 'peak_rms_energy';
                    return sections;
                } else {
                    console.warn('Peak RMS energy sectioning failed validation, falling back to quarters');
                    const fallbackSections = this.extractSimpleSections(samples, sampleRate);
                    fallbackSections.sectioningMethod = 'quarters';
                    return fallbackSections;
                }
            }
        }
        
        // Fallback to simple quarters method
        const simpleSections = this.extractSimpleSections(samples, sampleRate);
        simpleSections.sectioningMethod = 'quarters';
        return simpleSections;
    }
    
    /**
     * Simple quarter-based sectioning (original implementation)
     * @param {Array} samples - Audio samples
     * @param {number} sampleRate - Sample rate in Hz
     * @returns {Object} Object with approaching and receding sections
     */
    extractSimpleSections(samples, sampleRate) {
        const totalSamples = samples.length;
        const quarterLength = Math.floor(totalSamples / 4);
        
        return {
            approaching: samples.slice(0, quarterLength),
            receding: samples.slice(totalSamples - quarterLength),
            approachDuration: quarterLength / sampleRate,
            recedeDuration: quarterLength / sampleRate
        };
    }
    
    /**
     * Filter frequencies to reasonable range for vehicle analysis
     * @param {Array} frequencies - Array of frequency objects
     * @returns {Array} Filtered frequency array
     */
    filterReasonableFrequencies(frequencies) {
        // Filter for vehicle frequencies (50-2000Hz to match working NodeJS version)
        const filtered = frequencies.filter(freq => {
            return freq.frequency >= 50 && freq.frequency <= 2000 && freq.power > 0;
        });
        
        console.log(`Filtered frequencies: ${filtered.length} of ${frequencies.length} candidates (50-2000Hz range)`);
        if (filtered.length > 0) {
            console.log(`Top frequencies: ${filtered.slice(0,3).map(f => f.frequency.toFixed(0)).join(', ')} Hz`);
        } else {
            console.log(`No frequencies in vehicle range - raw frequencies: ${frequencies.slice(0,3).map(f => f.frequency.toFixed(0)).join(', ')} Hz`);
        }
        
        return filtered;
    }
    
    /**
     * Find best speed calculation (backward compatibility)
     * @param {Array} approachFrequencies - Approach frequencies
     * @param {Array} recedeFrequencies - Recede frequencies
     * @param {number} expectedSpeed - Expected speed (optional)
     * @returns {Object} Best speed calculation
     */
    async findBestSpeedCalculation(approachFrequencies, recedeFrequencies, expectedSpeed = null) {
        try {
            console.log(`Attempting to match ${approachFrequencies.length} approach freqs with ${recedeFrequencies.length} recede freqs`);
            
            // Try all strategies and collect valid results
            const strategies = [];
            
            // Primary strategy
            const primaryResult = this.frequencyMatcher.findOptimalSpeedCalculation(
                approachFrequencies,
                recedeFrequencies,
                expectedSpeed || 30
            );
            
            if (primaryResult.valid) {
                strategies.push({
                    ...primaryResult,
                    strategy: 'Primary'
                });
                console.log(`Primary strategy result: ${primaryResult.speedMph.toFixed(1)} mph`);
            }
            
            // Secondary strategy: Try different frequency ranges
            const secondaryResult = await this.trySecondaryStrategy(approachFrequencies, recedeFrequencies, expectedSpeed);
            if (secondaryResult.valid) {
                strategies.push(secondaryResult);
                console.log(`Secondary strategy result: ${secondaryResult.speedMph.toFixed(1)} mph`);
            }
            
            // Tertiary strategy: Try more lenient matching  
            const tertiaryResult = await this.tryTertiaryStrategy(approachFrequencies, recedeFrequencies, expectedSpeed);
            if (tertiaryResult.valid) {
                strategies.push(tertiaryResult);
                console.log(`Tertiary strategy result: ${tertiaryResult.speedMph.toFixed(1)} mph`);
            }
            
            if (strategies.length === 0) {
                return {
                    valid: false,
                    error: 'No valid frequency pairs found',
                    speedMph: null,
                    speedKmh: null,
                    confidence: 0
                };
            }
            
            // Choose the most reasonable result:
            // 1. Prefer speeds in reasonable range (10-100 mph)
            // 2. Among reasonable speeds, prefer lower speeds
            // 3. If no reasonable speeds, take the lowest speed overall
            
            const reasonableStrategies = strategies.filter(s => s.speedMph >= 10 && s.speedMph <= 100);
            let bestResult;
            
            if (reasonableStrategies.length > 0) {
                // Choose lowest reasonable speed
                bestResult = reasonableStrategies.reduce((best, current) => 
                    current.speedMph < best.speedMph ? current : best
                );
                console.log(`🎯 Choosing lowest reasonable speed: ${bestResult.speedMph.toFixed(1)} mph (${bestResult.strategy})`);
            } else {
                // No reasonable speeds, choose lowest overall
                bestResult = strategies.reduce((best, current) => 
                    current.speedMph < best.speedMph ? current : best
                );
                console.log(`⚠️ No reasonable speeds found, choosing lowest: ${bestResult.speedMph.toFixed(1)} mph (${bestResult.strategy})`);
            }
            
            return bestResult;
        } catch (error) {
            return {
                valid: false,
                error: error.message,
                speedMph: null,
                speedKmh: null,
                confidence: 0
            };
        }
    }
    
    /**
     * Secondary strategy: Try with relaxed frequency matching
     */
    async trySecondaryStrategy(approachFrequencies, recedeFrequencies, expectedSpeed) {
        try {
            // Create a new FrequencyMatcher with more lenient settings
            const lenientCalculator = new (this.dopplerCalculator.constructor)();
            lenientCalculator.setSpeedLimits(0, 500); // Allow higher speeds
            
            const lenientMatcher = new (this.frequencyMatcher.constructor)(lenientCalculator);
            
            const matchResult = lenientMatcher.findOptimalSpeedCalculation(
                approachFrequencies,
                recedeFrequencies,
                expectedSpeed || 50 // Higher default expected speed
            );
            
            if (matchResult.valid) {
                return {
                    valid: true,
                    speedMph: matchResult.speedMph,
                    speedKmh: matchResult.speedKmh,
                    approachFreq: matchResult.approachFreq,
                    recedeFreq: matchResult.recedeFreq,
                    error: matchResult.error,
                    accuracy: matchResult.accuracy,
                    strategy: 'Secondary'
                };
            }
            
            return { valid: false };
        } catch (error) {
            return { valid: false };
        }
    }
    
    /**
     * Tertiary strategy: Try all frequency combinations with very lenient matching
     */
    async tryTertiaryStrategy(approachFrequencies, recedeFrequencies, expectedSpeed) {
        try {
            // Most lenient approach - try any frequency combination
            const veryLenientCalculator = new (this.dopplerCalculator.constructor)();
            veryLenientCalculator.setSpeedLimits(0, 1000); // Very high speed limit
            
            let bestResult = null;
            let bestError = Infinity;
            
            // Try all combinations with very lenient error checking
            for (const approachFreq of approachFrequencies.slice(0, 10)) {
                for (const recedeFreq of recedeFrequencies.slice(0, 10)) {
                    // Allow any frequency order (reverse if needed)
                    const pairs = [
                        [approachFreq.frequency, recedeFreq.frequency],
                        [recedeFreq.frequency, approachFreq.frequency] // Try reverse order
                    ];
                    
                    for (const [freq1, freq2] of pairs) {
                        const speedKmh = veryLenientCalculator.calculateSpeed(freq1, freq2);
                        if (speedKmh > 0 && speedKmh < 1000) {
                            const speedMph = speedKmh * 0.621371;
                            const error = expectedSpeed ? Math.abs(speedMph - expectedSpeed) : 0;
                            
                            if (error < bestError || !bestResult) {
                                bestResult = {
                                    valid: true,
                                    speedMph,
                                    speedKmh,
                                    approachFreq: freq1,
                                    recedeFreq: freq2,
                                    error,
                                    accuracy: expectedSpeed ? 100 - (error / expectedSpeed * 100) : 100,
                                    strategy: 'Tertiary'
                                };
                                bestError = error;
                            }
                        }
                    }
                }
            }
            
            return bestResult || { valid: false };
        } catch (error) {
            return { valid: false };
        }
    }
}

export default AudioAnalyzer;
/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo

 * Spectrum Analyzer for Pure JavaScript implementation
 */

import { fft } from './fft-wrapper.js';
import WindowingUtils from '../shared/windowing-utils.js';

class SpectrumAnalyzer {
    constructor(samples, sampleRate, options = {}) {
        this.samples = [...samples];
        this.sampleRate = sampleRate;
        this.windowType = options.windowType || 'hamming';
        this.powerSpectrum = null;
        this.frequencies = null;
    }
    
    calculatePowerSpectrum() {
        // Find next power of 2 for FFT
        const originalLength = this.samples.length;
        const fftLength = Math.pow(2, Math.ceil(Math.log2(originalLength)));
        
        // Pad or truncate to power of 2
        let processedSamples = [...this.samples];
        if (processedSamples.length < fftLength) {
            // Zero-pad
            processedSamples = processedSamples.concat(new Array(fftLength - processedSamples.length).fill(0));
        } else if (processedSamples.length > fftLength) {
            // Truncate
            processedSamples = processedSamples.slice(0, fftLength);
        }
        
        // Apply windowing
        const windowedSamples = WindowingUtils.applyWindowByType(processedSamples, this.windowType);
        const windowGain = WindowingUtils.getCoherentGain(this.windowType, fftLength);
        
        // Perform FFT
        const fftResult = fft(windowedSamples);
        
        // Calculate power spectrum (magnitude squared)
        const halfLength = fftLength / 2;
        this.powerSpectrum = new Array(halfLength);
        this.frequencies = new Array(halfLength);
        
        for (let i = 0; i < halfLength; i++) {
            const real = fftResult[i * 2];
            const imag = fftResult[i * 2 + 1];
            const magnitude = Math.sqrt(real * real + imag * imag);
            
            // Apply window gain correction and normalize
            this.powerSpectrum[i] = (magnitude * windowGain) / fftLength;
            this.frequencies[i] = (i * this.sampleRate) / fftLength;
        }
    }
    
    findPeakFrequency() {
        if (!this.powerSpectrum) {
            throw new Error('Must call calculatePowerSpectrum() first');
        }
        
        let maxPower = 0;
        let peakIndex = 0;
        
        for (let i = 1; i < this.powerSpectrum.length; i++) {
            if (this.powerSpectrum[i] > maxPower) {
                maxPower = this.powerSpectrum[i];
                peakIndex = i;
            }
        }
        
        return this.frequencies[peakIndex];
    }
    
    getStrongestFrequencies(count = 5) {
        if (!this.powerSpectrum) {
            throw new Error('Must call calculatePowerSpectrum() first');
        }
        
        const candidates = [];
        for (let i = 0; i < this.frequencies.length; i++) {
            candidates.push({
                frequency: this.frequencies[i],
                power: this.powerSpectrum[i]
            });
        }
        
        // Sort by power (descending)
        candidates.sort((a, b) => b.power - a.power);
        
        return candidates.slice(0, count);
    }
}

export default SpectrumAnalyzer;
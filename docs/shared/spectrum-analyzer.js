/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo

 * Universal Spectrum Analyzer for all FFT implementations
 * Automatically detects and uses the best available FFT implementation
 */

import WindowingUtils from '../shared/windowing-utils.js';

class SpectrumAnalyzer {
    constructor(samples, sampleRate, options = {}) {
        this.samples = [...samples];
        this.sampleRate = sampleRate;
        this.windowType = options.windowType || 'hamming';
        this.powerSpectrum = null;
        this.frequencies = null;
        this.fftMode = options.fftMode || 'auto'; // 'WASM+SIMD', 'WASM+noSIMD', 'JavaScript', 'auto'
        this.fftImplementation = null;
    }
    
    async calculatePowerSpectrum() {
        // Load FFT implementation if not already loaded
        if (!this.fftImplementation) {
            this.fftImplementation = await this.loadFFTImplementation();
        }
        
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
        
        // Perform FFT (handles both sync and async)
        const fftResult = this.fftImplementation.isAsync 
            ? await this.fftImplementation.fft(windowedSamples)
            : this.fftImplementation.fft(windowedSamples);
        
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
    
    async loadFFTImplementation() {
        let selectedMode = this.fftMode;
        
        // Auto-detect best implementation if mode is 'auto'
        if (selectedMode === 'auto') {
            selectedMode = await this.autoDetectBestFFT();
        }
        
        try {
            switch (selectedMode) {
                case 'WASM+SIMD': {
                    const { fft } = await import('../simd/fft-wrapper.js');
                    console.log('🚀 Using WASM+SIMD FFT implementation');
                    return { fft, isAsync: true, mode: 'WASM+SIMD' };
                }
                
                case 'WASM+noSIMD': {
                    const { fft } = await import('../non-simd/fft-wrapper.js');
                    console.log('⚡ Using WASM+noSIMD FFT implementation');
                    return { fft, isAsync: true, mode: 'WASM+noSIMD' };
                }
                
                case 'JavaScript': {
                    const { fft } = await import('../pure-js/fft-wrapper.js');
                    console.log('📝 Using Pure JavaScript FFT implementation');
                    return { fft, isAsync: false, mode: 'JavaScript' };
                }
                
                default:
                    throw new Error(`Unknown FFT mode: ${selectedMode}`);
            }
        } catch (error) {
            console.warn(`Failed to load ${selectedMode} FFT, falling back to JavaScript:`, error);
            const { fft } = await import('../pure-js/fft-wrapper.js');
            return { fft, isAsync: false, mode: 'JavaScript' };
        }
    }
    
    async autoDetectBestFFT() {
        // Try implementations in order of preference: SIMD > noSIMD > JavaScript
        const implementations = [
            { mode: 'WASM+SIMD', test: () => this.testWASMSIMDSupport() },
            { mode: 'WASM+noSIMD', test: () => this.testWASMSupport() },
            { mode: 'JavaScript', test: () => true } // Always available
        ];
        
        for (const impl of implementations) {
            try {
                if (await impl.test()) {
                    console.log(`🔍 Auto-detected best FFT implementation: ${impl.mode}`);
                    return impl.mode;
                }
            } catch (error) {
                console.log(`❌ ${impl.mode} not available:`, error.message);
            }
        }
        
        // Fallback to JavaScript (should never reach here)
        return 'JavaScript';
    }
    
    async testWASMSIMDSupport() {
        try {
            // Try to load SIMD implementation
            await import('../simd/fft-wrapper.js');
            
            // Test SIMD capability with a small FFT
            const testData = new Float32Array([1, 0, 0, 0, 0, 0, 0, 0]);
            const { fft } = await import('../simd/fft-wrapper.js');
            await fft(testData);
            
            return true;
        } catch (error) {
            throw new Error('WASM+SIMD not supported');
        }
    }
    
    async testWASMSupport() {
        try {
            // Try to load non-SIMD implementation
            await import('../non-simd/fft-wrapper.js');
            
            // Test WASM capability with a small FFT
            const testData = new Float32Array([1, 0, 0, 0, 0, 0, 0, 0]);
            const { fft } = await import('../non-simd/fft-wrapper.js');
            await fft(testData);
            
            return true;
        } catch (error) {
            throw new Error('WASM not supported');
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
    
    /**
     * Get information about the currently loaded FFT implementation
     */
    getImplementationInfo() {
        return this.fftImplementation ? {
            mode: this.fftImplementation.mode,
            isAsync: this.fftImplementation.isAsync,
            description: this.getImplementationDescription(this.fftImplementation.mode)
        } : null;
    }
    
    getImplementationDescription(mode) {
        const descriptions = {
            'WASM+SIMD': 'WebAssembly with SIMD optimizations - Maximum Performance',
            'WASM+noSIMD': 'WebAssembly without SIMD - Balanced Performance & Compatibility', 
            'JavaScript': 'Pure JavaScript Cooley-Tukey Algorithm - Universal Compatibility'
        };
        return descriptions[mode] || 'Unknown implementation';
    }
}

export default SpectrumAnalyzer;
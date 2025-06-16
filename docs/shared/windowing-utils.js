/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo

 * Windowing Functions for Audio Signal Processing
 * Used to reduce spectral leakage in FFT analysis for Doppler speed detection
 */

class WindowingUtils {
    /**
     * Create a Hann window (also called Hanning window)
     * Reduces spectral leakage by tapering audio frames to zero at edges
     * 
     * @param {number} size - Window size (should match FFT frame size)
     * @returns {Float32Array} Hann window coefficients
     */
    static createHannWindow(size) {
        const window = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
        }
        return window;
    }

    /**
     * Create a Hamming window
     * Alternative windowing function with different characteristics
     * 
     * @param {number} size - Window size
     * @returns {Float32Array} Hamming window coefficients
     */
    static createHammingWindow(size) {
        const window = new Float32Array(size);
        const alpha = 0.54;
        const beta = 1 - alpha;
        
        for (let i = 0; i < size; i++) {
            window[i] = alpha - beta * Math.cos(2 * Math.PI * i / (size - 1));
        }
        return window;
    }

    /**
     * Create a Blackman window
     * Lower side lobes but wider main lobe than Hann
     * 
     * @param {number} size - Window size
     * @returns {Float32Array} Blackman window coefficients
     */
    static createBlackmanWindow(size) {
        const window = new Float32Array(size);
        const a0 = 0.42;
        const a1 = 0.5;
        const a2 = 0.08;
        
        for (let i = 0; i < size; i++) {
            window[i] = a0 - a1 * Math.cos(2 * Math.PI * i / (size - 1)) + 
                       a2 * Math.cos(4 * Math.PI * i / (size - 1));
        }
        return window;
    }

    /**
     * Apply a window function to an audio frame
     * Multiplies each sample by the corresponding window coefficient
     * 
     * @param {Float32Array|Array} frame - Audio frame to window
     * @param {Float32Array} window - Window coefficients
     * @returns {Float32Array} Windowed audio frame
     */
    static applyWindow(frame, window) {
        if (frame.length !== window.length) {
            throw new Error(`Frame length (${frame.length}) must match window length (${window.length})`);
        }
        
        const windowed = new Float32Array(frame.length);
        for (let i = 0; i < frame.length; i++) {
            windowed[i] = frame[i] * window[i];
        }
        return windowed;
    }

    /**
     * Apply a windowing function to audio samples (legacy string-based API)
     * @param {Array} samples - Input audio samples
     * @param {string} windowType - Type of window ('hamming', 'hann', 'blackman', 'none')
     * @returns {Array} Windowed audio samples
     */
    static applyWindowByType(samples, windowType = 'hamming') {
        if (windowType === 'none') {
            return [...samples];
        }
        
        const N = samples.length;
        const windowed = new Array(N);
        
        for (let i = 0; i < N; i++) {
            let windowValue;
            
            switch (windowType.toLowerCase()) {
                case 'hamming':
                    windowValue = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (N - 1));
                    break;
                case 'hann':
                case 'hanning':
                    windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
                    break;
                case 'blackman':
                    windowValue = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (N - 1));
                    break;
                default:
                    windowValue = 1.0; // Rectangular window
            }
            
            windowed[i] = samples[i] * windowValue;
        }
        
        return windowed;
    }
    
    /**
     * Get the coherent gain of a window function
     * Used for amplitude correction after windowing
     * @param {string} windowType - Type of window
     * @param {number} length - Window length
     * @returns {number} Coherent gain factor
     */
    static getCoherentGain(windowType, length) {
        if (windowType === 'none') return 1.0;
        
        // Calculate the sum of window values for normalization
        let sum = 0;
        for (let i = 0; i < length; i++) {
            let windowValue;
            
            switch (windowType.toLowerCase()) {
                case 'hamming':
                    windowValue = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (length - 1));
                    break;
                case 'hann':
                case 'hanning':
                    windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (length - 1)));
                    break;
                case 'blackman':
                    windowValue = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (length - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (length - 1));
                    break;
                default:
                    windowValue = 1.0;
            }
            sum += windowValue;
        }
        
        return length / sum;
    }

    /**
     * Get recommended window type for Doppler analysis
     * Hann window provides good balance of frequency resolution and side lobe suppression
     * 
     * @param {number} size - Window size
     * @returns {Float32Array} Recommended window (Hann)
     */
    static getRecommendedWindow(size) {
        return this.createHannWindow(size);
    }
}

export default WindowingUtils;
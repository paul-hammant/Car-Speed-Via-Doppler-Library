/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo

 * Audio processing utilities for web and Node.js deployment
 * Unified audio processing utilities that work in both web and Node.js environments
 */

class AudioProcessor {
    /**
     * Decode Web Audio API AudioBuffer to samples array
     * @param {AudioBuffer} audioBuffer - Web Audio API AudioBuffer
     * @returns {Object} Audio data with samples array and sample rate
     */
    static decodeAudioBuffer(audioBuffer) {
        // Get the first channel (mono)
        const channelData = audioBuffer.getChannelData(0);
        const samples = Array.from(channelData);
        const sampleRate = audioBuffer.sampleRate;
        return { samples, sampleRate };
    }
    
    /**
     * Normalize audio amplitude to prevent clipping
     * @param {Array} samples - Audio sample data
     * @returns {Array} Normalized audio samples
     */
    static normalizeAmplitude(samples) {
        // Find max amplitude without stack overflow
        let maxAmplitude = 0;
        for (let i = 0; i < samples.length; i++) {
            const abs = Math.abs(samples[i]);
            if (abs > maxAmplitude) {
                maxAmplitude = abs;
            }
        }
        
        if (maxAmplitude === 0) return samples;
        
        const scaleFactor = 0.95 / maxAmplitude;
        const normalized = new Array(samples.length);
        for (let i = 0; i < samples.length; i++) {
            normalized[i] = samples[i] * scaleFactor;
        }
        return normalized;
    }
    
    /**
     * Split audio into time-based sections
     * @param {Array} samples - Audio sample data
     * @param {number} sampleRate - Sample rate in Hz
     * @param {Object} timeRanges - Object with section names and [startTime, endTime] arrays
     * @returns {Object} Object with section names as keys and sample arrays as values
     */
    static extractTimeSections(samples, sampleRate, timeRanges) {
        const sections = {};
        
        for (const [sectionName, [startTime, endTime]] of Object.entries(timeRanges)) {
            const startIndex = Math.floor(startTime * sampleRate);
            const endIndex = Math.floor(endTime * sampleRate);
            const validEndIndex = Math.min(endIndex, samples.length);
            
            if (startIndex < validEndIndex) {
                sections[sectionName] = samples.slice(startIndex, validEndIndex);
            } else {
                sections[sectionName] = [];
            }
        }
        
        return sections;
    }
    
    /**
     * Load and decode a WAV audio file (Node.js only)
     * @param {string} filePath - Path to the WAV file
     * @returns {Object} Audio data with samples array and sample rate
     */
    static async loadWavFile(filePath) {
        if (typeof window !== 'undefined') {
            throw new Error('loadWavFile is only available in Node.js environment. Use fetch() + decodeAudioBuffer() in browsers.');
        }
        
        try {
            const fs = (await import('fs')).default;
            const pkg = await import('wavefile');
            const { WaveFile } = pkg.default;
            
            const audioBuffer = fs.readFileSync(filePath);
            const wav = new WaveFile(audioBuffer);
            const samples = wav.getSamples(true, Float32Array);
            const sampleRate = wav.fmt.sampleRate;
            return { samples: Array.from(samples), sampleRate };
        } catch (error) {
            throw new Error(`Failed to load WAV file: ${error.message}. Make sure 'wavefile' package is installed.`);
        }
    }
    
    /**
     * Load raw PCM audio data (Node.js only)
     * @param {string} filePath - Path to the raw audio file
     * @param {number} sampleRate - Sample rate in Hz (default: 48000)
     * @param {number} channels - Number of channels (default: 1)
     * @param {number} bitDepth - Bit depth (default: 16)
     * @returns {Object} Audio data with samples array and sample rate
     */
    static async loadRawFile(filePath, sampleRate = 48000, channels = 1, bitDepth = 16) {
        if (typeof window !== 'undefined') {
            throw new Error('loadRawFile is only available in Node.js environment.');
        }
        
        try {
            const fs = (await import('fs')).default;
            const buffer = fs.readFileSync(filePath);
            const samples = [];
            
            if (bitDepth === 16) {
                // Read 16-bit signed integers and normalize to [-1, 1]
                for (let i = 0; i < buffer.length; i += 2) {
                    if (i + 1 < buffer.length) {
                        const sample = buffer.readInt16LE(i);
                        samples.push(sample / 32768.0);
                    }
                }
            }
            
            return { samples, sampleRate };
        } catch (error) {
            throw new Error(`Failed to load raw file: ${error.message}`);
        }
    }
}

export default AudioProcessor;
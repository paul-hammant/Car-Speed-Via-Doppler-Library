# Runtime-Linked Doppler Library Integration Guide

This document explains how to integrate the Doppler Car Speed Analysis from `paul-hammant.github.io/Car-Speed-Via-Doppler/` into React+JS applications using runtime linkage via dynamic ES6 imports.

## Overview

The Doppler analysis library is deployed separately at https://paul-hammant.github.io/Car-Speed-Via-Doppler/ and uses runtime linkage for integration. This follows a late-binding pattern where modules are resolved at execution time rather than build time.

The library provides three runtime-linkable implementations:
- **SIMD WASM**: Fastest performance with SIMD optimizations
- **Non-SIMD WASM**: Balanced performance and compatibility  
- **Pure JS**: Maximum compatibility, slower performance

## Runtime Linkage Pattern

### Basic Runtime Integration

```javascript
// Runtime linkage via dynamic imports - modules resolved at execution time
const BASE_URL = 'https://paul-hammant.github.io/Car-Speed-Via-Doppler';

// Late-bound module loading (recommended: Non-SIMD WASM implementation)
const AudioAnalyzer = (await import(`${BASE_URL}/shared/audio-analyzer.js`)).default;
const SpectrumAnalyzer = (await import(`${BASE_URL}/non-simd/spectrum-analyzer.js`)).default;
const AudioProcessor = (await import(`${BASE_URL}/shared/audio-utils.js`)).default;

// Initialize analyzer
const analyzer = new AudioAnalyzer({
    fftMode: 'wasm-no-simd',
    windowType: 'hamming',
    confidenceThreshold: 0.7
});

// Process audio file
async function analyzeCarSpeed(audioFile) {
    try {
        // Load and decode audio
        const audioBuffer = await loadAudioFile(audioFile);
        const { samples, sampleRate } = AudioProcessor.decodeAudioBuffer(audioBuffer);
        const normalizedSamples = AudioProcessor.normalizeAmplitude(samples);
        
        // Extract approach and recede sections
        const sections = analyzer.extractSections(normalizedSamples, sampleRate, 'peak_rms_energy');
        
        // Analyze frequencies
        const approachAnalyzer = new SpectrumAnalyzer(sections.approaching, sampleRate, { windowType: 'hamming' });
        const recedeAnalyzer = new SpectrumAnalyzer(sections.receding, sampleRate, { windowType: 'hamming' });
        
        await approachAnalyzer.calculatePowerSpectrum();
        await recedeAnalyzer.calculatePowerSpectrum();
        
        const approachFreqs = analyzer.filterReasonableFrequencies(approachAnalyzer.getStrongestFrequencies(5));
        const recedeFreqs = analyzer.filterReasonableFrequencies(recedeAnalyzer.getStrongestFrequencies(5));
        
        // Calculate speed
        const speedResult = await analyzer.findBestSpeedCalculation(approachFreqs, recedeFreqs);
        
        return {
            success: true,
            speedMph: speedResult.speedMph,
            speedKmh: speedResult.speedKmh,
            confidence: speedResult.confidence,
            strategy: speedResult.strategy,
            processingTime: performance.now() - startTime
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            details: error.stack
        };
    }
}

// Helper function to load audio files
async function loadAudioFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    return await audioContext.decodeAudioData(arrayBuffer);
}
```

### React Component Example

```jsx
import React, { useState, useCallback } from 'react';

const DopplerSpeedAnalyzer = () => {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const analyzeFile = useCallback(async (file) => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const BASE_URL = 'https://paul-hammant.github.io/Car-Speed-Via-Doppler';
            
            // Runtime-linked module imports
            const AudioAnalyzer = (await import(`${BASE_URL}/shared/audio-analyzer.js`)).default;
            const SpectrumAnalyzer = (await import(`${BASE_URL}/non-simd/spectrum-analyzer.js`)).default;
            const AudioProcessor = (await import(`${BASE_URL}/shared/audio-utils.js`)).default;
            
            const analyzer = new AudioAnalyzer();
            
            // Process file
            const arrayBuffer = await file.arrayBuffer();
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            const { samples, sampleRate } = AudioProcessor.decodeAudioBuffer(audioBuffer);
            const normalizedSamples = AudioProcessor.normalizeAmplitude(samples);
            
            const sections = analyzer.extractSections(normalizedSamples, sampleRate, 'peak_rms_energy');
            
            const approachAnalyzer = new SpectrumAnalyzer(sections.approaching, sampleRate);
            const recedeAnalyzer = new SpectrumAnalyzer(sections.receding, sampleRate);
            
            await approachAnalyzer.calculatePowerSpectrum();
            await recedeAnalyzer.calculatePowerSpectrum();
            
            const approachFreqs = analyzer.filterReasonableFrequencies(approachAnalyzer.getStrongestFrequencies(5));
            const recedeFreqs = analyzer.filterReasonableFrequencies(recedeAnalyzer.getStrongestFrequencies(5));
            
            const speedResult = await analyzer.findBestSpeedCalculation(approachFreqs, recedeFreqs);
            
            setResult({
                success: true,
                speedMph: speedResult.speedMph?.toFixed(1),
                speedKmh: speedResult.speedKmh?.toFixed(1),
                confidence: speedResult.confidence,
                strategy: speedResult.strategy
            });
            
        } catch (err) {
            setError(err.message);
            setResult({ success: false });
        } finally {
            setLoading(false);
        }
    }, []);

    return (
        <div>
            <input 
                type="file" 
                accept="audio/*"
                onChange={(e) => e.target.files[0] && analyzeFile(e.target.files[0])}
                disabled={loading}
            />
            
            {loading && <div>Analyzing audio...</div>}
            {error && <div>Error: {error}</div>}
            {result?.success && (
                <div>
                    Speed: {result.speedMph} mph ({result.speedKmh} km/h)
                    <br />Strategy: {result.strategy}
                </div>
            )}
        </div>
    );
};

export default DopplerSpeedAnalyzer;
```

## API Reference

### Core Classes

#### `AudioAnalyzer`
Main analysis coordinator class.

**Constructor Options:**
- `fftMode`: 'auto', 'wasm-simd', 'wasm-no-simd', 'pure-js'
- `windowType`: 'hamming', 'hann', 'blackman'
- `confidenceThreshold`: 0.0-1.0 (default: 0.7)

**Key Methods:**
- `extractSections(samples, sampleRate, strategy)` - Extract approach/recede sections
- `filterReasonableFrequencies(frequencies)` - Filter valid car frequencies
- `findBestSpeedCalculation(approachFreqs, recedeFreqs)` - Calculate final speed

#### `SpectrumAnalyzer` 
FFT-based frequency analysis.

**Constructor:** `new SpectrumAnalyzer(samples, sampleRate, options)`

**Methods:**
- `calculatePowerSpectrum()` - Perform FFT analysis
- `getStrongestFrequencies(count)` - Get top frequency peaks

#### `AudioProcessor`
Audio processing utilities.

**Static Methods:**
- `decodeAudioBuffer(audioBuffer)` - Extract samples and sample rate
- `normalizeAmplitude(samples)` - Normalize audio levels

## Success/Failure Handling

### Success Response
```javascript
{
    success: true,
    speedMph: 25.3,
    speedKmh: 40.7,
    confidence: 0.85,
    strategy: 'primary',
    processingTime: 245,
    valid: true
}
```

### Failure Response  
```javascript
{
    success: false,
    error: "No valid frequency pairs found",
    details: "Stack trace...",
    valid: false
}
```

### State Information

The analyzer exposes internal state through the analysis results:

- **`strategy`**: Analysis strategy used ('primary', 'secondary', 'tertiary')
- **`confidence`**: Quality score 0.0-1.0
- **`sectioningMethod`**: How audio was split ('peak_rms_energy', 'closest_approach')
- **`processingTime`**: Analysis duration in milliseconds
- **`clipDuration`**: Original audio length in seconds

## Implementation Selection

Choose runtime linkage target based on your needs:

```javascript
// Maximum performance runtime linkage (requires modern browser with SIMD support)
const SpectrumAnalyzer = (await import(`${BASE_URL}/simd/spectrum-analyzer.js`)).default;

// Balanced performance runtime linkage (recommended)
const SpectrumAnalyzer = (await import(`${BASE_URL}/non-simd/spectrum-analyzer.js`)).default;

// Maximum compatibility runtime linkage (slowest)
const SpectrumAnalyzer = (await import(`${BASE_URL}/pure-js/spectrum-analyzer.js`)).default;
```

## Browser Compatibility

- **SIMD WASM**: Chrome 91+, Firefox 89+, Safari 16.4+
- **Non-SIMD WASM**: Chrome 57+, Firefox 52+, Safari 11+
- **Pure JS**: All modern browsers

## Performance Expectations

Typical processing times for 2-3 second audio clips:
- **SIMD WASM**: 50-150ms
- **Non-SIMD WASM**: 100-400ms  
- **Pure JS**: 500-2000ms

## Runtime Linkage Considerations

**CORS Support**: GitHub Pages serves files with appropriate CORS headers, enabling cross-origin runtime linkage from any domain.

**Late Binding Benefits**:
- Library updates without rebuilding consumer applications
- Separate deployment lifecycles
- Runtime performance optimization selection
- Reduced bundle sizes (modules loaded on-demand)

**Architecture Notes**:
- Modules are resolved at execution time, not build time
- Similar to Java's dynamic class loading or C++ late linking
- No build-time dependencies on the Doppler library required

## Common Gotchas

### FFT Length Requirements
- FFT library requires power-of-2 lengths
- Always pad audio to next power of 2
- Use `SpectrumAnalyzer` which handles this automatically

### Frequency Resolution
- Longer audio = better frequency resolution
- Too short audio (< 1 second) may be unreliable
- Have the gap between approach and recede near the middle of the clip

### Audio File Formats
- WAV files work best and MP3/AAC may have compression artifacts (unproven TBH)
- Always normalize amplitude if you can
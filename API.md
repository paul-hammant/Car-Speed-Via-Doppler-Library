# API Reference

> **Note**: This reference covers both local development APIs and runtime-linked web deployment APIs. For web integration via runtime linkage, see [DOPPLER_SERVICE_INTEGRATION.md](DOPPLER_SERVICE_INTEGRATION.md).

## Core Classes

### DopplerSpeedCalculator

Main class for car speed calculations using Doppler effect.

#### Constructor
```javascript
new DopplerSpeedCalculator(soundSpeed = 343, temperature = 20)
```

#### Methods

##### `calculateSpeed(approachingFrequency, recedingFrequency)`
Calculate car speed from frequency shift.

**Parameters:**
- `approachingFrequency` (number): Frequency when vehicle approaches (Hz)
- `recedingFrequency` (number): Frequency when vehicle recedes (Hz)

**Returns:** number - Car speed in km/h

##### `calculateSpeedWithValidation(f1, f2)`
Enhanced calculation with validation and error handling.

**Returns:** Object with `{ speedKMH, speedMPH, valid, error, frequencyShift, relativeFactor }`

### AudioProcessor / AudioAnalyzer

Static utility class for audio file operations (local) and audio analysis orchestration (web runtime).

#### Local Development Methods

##### `loadWavFile(filePath)`
Load and decode WAV audio file (Node.js only).

**Returns:** `{ samples: Array, sampleRate: number }`

##### `normalizeAmplitude(samples)`
Normalize audio samples to [-1, 1] range.

##### `extractTimeSections(samples, sampleRate, timeRanges)`
Extract audio sections based on time ranges.

#### Web Runtime Methods (AudioAnalyzer)

For runtime-linked web usage, use the `AudioAnalyzer` class:

##### `extractSections(samples, sampleRate, strategy)`
Extract approach and recede sections using automatic detection.

**Parameters:**
- `samples` (Array): Normalized audio samples
- `sampleRate` (number): Audio sample rate
- `strategy` (string): Detection method ('peak_rms_energy', 'closest_approach')

**Returns:** `{ approaching: Array, receding: Array }`

##### `filterReasonableFrequencies(frequencies)`
Filter frequency candidates to reasonable car frequency ranges.

##### `findBestSpeedCalculation(approachFreqs, recedeFreqs)`
Calculate final speed using optimal frequency pair selection.

### SpectrumAnalyzer

FFT-based frequency analysis for single audio segments.

#### Constructor
```javascript
new SpectrumAnalyzer(audioSamples, sampleRate = 48000)
```

#### Methods

##### `calculatePowerSpectrum()`
Compute power spectral density from audio samples.

##### `findPeakFrequency()`
Find dominant frequency component.

**Returns:** number - Peak frequency in Hz

##### `getStrongestFrequencies(count = 5)`
Get top N frequency components by power.

**Returns:** Array of `{ frequency, power }` objects

### DualFrequencyAnalyzer

Specialized analyzer for comparing approach and recede audio sections simultaneously.

#### Constructor
```javascript
new DualFrequencyAnalyzer(approachSamples, recedeSamples, sampleRate = 44100)
```

**Parameters:**
- `approachSamples` (Array): Audio samples from approaching vehicle
- `recedeSamples` (Array): Audio samples from receding vehicle  
- `sampleRate` (number): Sample rate in Hz (default: 44100)

#### Methods

##### `calculatePowerSpectralDensity()`
Compute Power Spectral Density for both approach and recede sections.

##### `findPeakFrequencies()`
Find dominant frequencies in both sections for Doppler analysis.

**Returns:** `{ approachFrequency, recedeFrequency }` - Peak frequencies in Hz

##### `getFFTSpectra()`
Get raw FFT results for advanced analysis.

**Returns:** `{ approach: Array, recede: Array }` - Complex FFT spectra

##### `displaySpectrumAnalysis()`
Display detailed frequency analysis results to console.

## FFT Implementation

### PffftWrapper

High-performance FFT implementation with WASM acceleration and JavaScript fallback.

#### Methods

##### `fft(signal)`
Perform Fast Fourier Transform on real-valued signal.

**Parameters:**
- `signal` (Array): Input signal as array of real numbers

**Returns:** Array of `[real, imag]` pairs representing frequency domain

##### `getFFTStatus()`
Get current FFT implementation status and capabilities.

**Returns:** Object with:
```javascript
{
  mode: 'SIMD' | 'WASM' | 'FALLBACK' | 'AUTO',     // Requested mode
  implementation: 'WASM' | 'JavaScript',            // Actual implementation used
  wasmLoaded: boolean,                              // Whether WASM loaded successfully
  wasmWorking: boolean,                             // Whether WASM is functional
  simdSize: number | null                           // SIMD capability (4=enabled, 1=disabled)
}
```

##### `waitForWasmReady()`
Wait for WASM initialization to complete (async).

**Returns:** Promise<boolean> - True if WASM is ready and functional

#### Environment Variables

Control FFT implementation via environment variables:

- `FFT_MODE=FALLBACK` - Force pure JavaScript FFT
- `FFT_MODE=SIMD` - Force SIMD WASM (with fallback)
- `FFT_MODE=WASM` - Force non-SIMD WASM (with fallback)

#### Example Usage

```javascript
const { fft, getFFTStatus } = require('./lib/PffftWrapper');

// Check what FFT implementation is actually being used
const status = getFFTStatus();
console.log(`Using ${status.implementation} FFT (requested: ${status.mode})`);

// Perform FFT
const signal = [1, 0, -1, 0]; // Simple test signal
const spectrum = fft(signal);
console.log('Frequency spectrum:', spectrum);

// Wait for WASM to be ready (if using WASM modes)
await waitForWasmReady();
const updatedStatus = getFFTStatus();
console.log('WASM ready:', updatedStatus.wasmWorking);
```

## Error Handling

All methods include proper error handling:

```javascript
try {
    const speed = calculator.calculateSpeed(f1, f2);
} catch (error) {
    console.error('Calculation failed:', error.message);
}
```

## Example Usage

### Local Development (Node.js)

```javascript
const DopplerSpeedCalculator = require('./lib/DopplerCalculator');
const AudioProcessor = require('./lib/AudioUtils');
const SpectrumAnalyzer = require('./lib/SpectrumAnalyzer');

// Basic speed calculation
const calculator = new DopplerSpeedCalculator();
const speed = calculator.calculateSpeed(1100, 950);
console.log(`Speed: ${speed.toFixed(1)} km/h`);

// Audio analysis workflow
const { samples, sampleRate } = AudioProcessor.loadWavFile('vehicle.wav');
const normalizedSamples = AudioProcessor.normalizeAmplitude(samples);

const analyzer = new SpectrumAnalyzer(normalizedSamples, sampleRate);
analyzer.calculatePowerSpectrum();
const peakFreq = analyzer.findPeakFrequency();
```

### Web Runtime Linkage

```javascript
// Runtime linkage via dynamic imports
const BASE_URL = 'https://paul-hammant.github.io/Car-Speed-Via-Doppler';

const AudioAnalyzer = (await import(`${BASE_URL}/shared/audio-analyzer.js`)).default;
const SpectrumAnalyzer = (await import(`${BASE_URL}/non-simd/spectrum-analyzer.js`)).default;
const AudioProcessor = (await import(`${BASE_URL}/shared/audio-utils.js`)).default;

// Initialize and analyze
const analyzer = new AudioAnalyzer({
    fftMode: 'wasm-no-simd',
    windowType: 'hamming',
    confidenceThreshold: 0.7
});

const sections = analyzer.extractSections(samples, sampleRate, 'peak_rms_energy');
const speedResult = await analyzer.findBestSpeedCalculation(approachFreqs, recedeFreqs);
```

See [DOPPLER_SERVICE_INTEGRATION.md](DOPPLER_SERVICE_INTEGRATION.md) for complete web integration examples.
# Car Speed Via Doppler

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-GPL-green.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://paul-hammant.github.io/Car-Speed-Via-Doppler-Library/)

**Web-based car speed detection using the Doppler effect from audio recordings.**

🎯 [**Try the Live Demo**](https://paul-hammant.github.io/Car-Speed-Via-Doppler/) | 🚀 [**Integration Guide**](DOPPLER_SERVICE_INTEGRATION.md) | 📚 [**API Documentation**](API.md) | 🔬 [**Algorithm Details**](ARCHITECTURE.md)

## Quick Start

**For developers**: See [**DOPPLER_SERVICE_INTEGRATION.md**](DOPPLER_SERVICE_INTEGRATION.md) for complete integration examples and runtime linkage patterns.

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [How It Works](#how-it-works)
- [Integration](#integration)
- [Limitations](#limitations)
- [Development](#development)

## Overview

Car Speed Via Doppler analyzes audio recordings of passing vehicles to estimate their speed using the Doppler effect. When a car approaches, the frequency of its sound increases; when it recedes, the frequency decreases. By measuring this frequency shift, we can calculate the vehicle's speed.

**⚠️ Important**: This tool provides rough speed estimates and is **not accurate enough for law enforcement** or precise measurements. It's designed for educational and experimental purposes.

### Key Features

- **🌐 Web-Based**: Runs entirely in your browser - no installation required
- **🎯 Real-Time Analysis**: Upload audio files and get instant speed calculations  
- **⚡ Multiple FFT Modes**: Choose from WASM+SIMD, WASM, or Pure JavaScript implementations
- **📊 Multi-Strategy Detection**: Advanced fallback algorithms for challenging recordings
- **🔧 Production Ready**: Handles various audio formats and recording conditions
- **📈 Performance Metrics**: Detailed timing and accuracy statistics

### Current Success Rate

✅ **100% Detection Rate** on test files  
📊 **Average Error**: ~11 mph on successful detections  
⚡ **Processing Speed**: 30-200ms per audio file

## Live Demo

Visit the live demo to try speed detection with your own audio files:

🎯 **[https://paul-hammant.github.io/Car-Speed-Via-Doppler-Library/](https://paul-hammant.github.io/Car-Speed-Via-Doppler-Library/)**

### Available Demo Modes:

- 🚀 **[WASM+SIMD](https://paul-hammant.github.io/Car-Speed-Via-Doppler-Library/simd/)** - Fastest performance (Chrome 91+, Firefox 89+)
- ⚡ **[WASM](https://paul-hammant.github.io/Car-Speed-Via-Doppler-Library/non-simd/)** - Good performance (Most modern browsers)  
- 📝 **[Pure JavaScript](https://paul-hammant.github.io/Car-Speed-Via-Doppler-Library/pure-js/)** - Universal compatibility

## How It Works

### The Doppler Effect

When a vehicle approaches an observer, sound waves are compressed, increasing frequency. When it recedes, waves are stretched, decreasing frequency. The speed calculation uses:

```
v = c × (f₁ - f₂) / (f₁ + f₂)
```

Where:
- `v` = vehicle speed
- `c` = speed of sound (343 m/s)  
- `f₁` = approaching frequency
- `f₂` = receding frequency

### Analysis Pipeline

1. **Audio Processing**: Load and normalize audio file
2. **Approach Detection**: Find the closest approach point using energy analysis
3. **Section Extraction**: Split audio into approaching/receding segments
4. **Frequency Analysis**: Perform FFT analysis to identify dominant frequencies
5. **Speed Calculation**: Apply Doppler formula with multi-strategy fallback
6. **Validation**: Check results for reasonableness and accuracy

## Integration

### Runtime Linkage (Recommended)

This library uses runtime linkage via dynamic ES6 imports from GitHub Pages:

```javascript
const BASE_URL = 'https://paul-hammant.github.io/Car-Speed-Via-Doppler';
const AudioAnalyzer = (await import(`${BASE_URL}/shared/audio-analyzer.js`)).default;
const SpectrumAnalyzer = (await import(`${BASE_URL}/non-simd/spectrum-analyzer.js`)).default;

// Analyze audio and calculate speed
const speedResult = await analyzer.findBestSpeedCalculation(approachFreqs, recedeFreqs);
```

### Implementation Options

- **🚀 SIMD WASM**: 50-150ms processing time (modern browsers)
- **⚡ Non-SIMD WASM**: 100-400ms processing time (most browsers)  
- **📝 Pure JavaScript**: 500-2000ms processing time (universal compatibility)

**📖 Complete integration examples**: See [**DOPPLER_SERVICE_INTEGRATION.md**](DOPPLER_SERVICE_INTEGRATION.md)

## Limitations

### Recording Conditions
- **Single Vehicle**: Only one car should be audible during recording
- **Clear Audio**: Background noise can affect accuracy
- **Complete Pass**: Recording should capture approach → closest point → recede
- **Recording Distance**: Vehicle should pass reasonably close to microphone

### Vehicle Types
- **Conventional Cars**: Works best with internal combustion engines
- **Electric Vehicles**: Limited testing - may not work reliably
- **Motorcycles**: Often work well due to distinctive sound
- **Vehicles with Trailers**: May be harder to analyze due to complex acoustics

### Technical Limitations
- **Speed Range**: Most accurate for 10-100 mph
- **Frequency Range**: Requires audible engine/tire noise (50-2000 Hz)
- **No Trigonometry**: Assumes vehicle passes directly by observer
- **Weather Effects**: Wind, rain, etc. can degrade accuracy

## Development

### Project Structure
```
docs/                   # Web-based implementations and demos
├── index.html          # Main landing page
├── simd/              # WASM+SIMD implementation  
├── non-simd/          # WASM implementation
├── pure-js/           # JavaScript implementation
└── shared/            # Shared analysis modules
    ├── audio-analyzer.js
    ├── doppler-calculator.js
    ├── frequency-matcher.js
    └── ...
examples/              # Example code and integrations
├── analyze-one-file.js
├── basic-speed-calc.js
└── web-*.html         # Web integration examples
test/                  # Test suites
├── playwright/        # Browser-based tests
├── unit/             # Unit tests
└── integration/      # Integration tests
```

### Running Tests
```bash
# Install dependencies
npm install

# Run browser tests
npx playwright test

# Run specific test suite
npx playwright test test/playwright/web-doppler.spec.js
```

### Local Development
```bash
# Serve locally
npx http-server docs -p 8080

# Visit http://localhost:8080
```

### WASM Build
For information about building the WebAssembly components, see [WASM_BUILD.md](WASM_BUILD.md).

## License

This project is licensed under the GPL License - see the [LICENSE](LICENSE) file for details.

---

**🚗💨 Happy speed detecting!** 

*Remember: This tool is for educational and experimental use only. Always follow traffic laws and use proper equipment for any official speed measurements.*
# Doppler Speed Analysis - GitHub Pages Demo

This directory contains a static, deployable version of the Car Speed Via Doppler that compares three different FFT implementations:

## 🌐 Live Demo

Visit the GitHub Pages deployment to see the interactive comparison in action.

## 📁 Directory Structure

```
docs/
├── index.html                 # Main test harness page
├── simd/                      # WASM+SIMD implementation
│   ├── pffft.js              # WASM+SIMD FFT module
│   ├── pffft.wasm            # WASM+SIMD binary
│   ├── fft-wrapper.js        # SIMD FFT wrapper
│   └── spectrum-analyzer.js   # SIMD spectrum analyzer
├── non-simd/                  # WASM+noSIMD implementation
│   ├── pffft.js              # WASM+noSIMD FFT module
│   ├── pffft.wasm            # WASM+noSIMD binary
│   ├── fft-wrapper.js        # noSIMD FFT wrapper
│   └── spectrum-analyzer.js   # noSIMD spectrum analyzer
├── pure-js/                   # Pure JavaScript implementation
│   ├── fft-wrapper.js        # Pure JS Cooley-Tukey FFT
│   └── spectrum-analyzer.js   # Pure JS spectrum analyzer
└── shared/                    # Shared utilities and test data
    ├── audio-utils.js         # Web Audio API utilities
    ├── windowing-utils.js     # Window functions (Hamming, Hann, etc.)
    ├── doppler-calculator.js  # Doppler effect calculations
    ├── audio-analyzer.js      # Audio analysis logic
    └── *.wav                  # Test audio files (23-37 mph)
```

## 🚀 FFT Implementations

### 1. WASM+SIMD
- **Technology**: WebAssembly with SIMD optimizations
- **Performance**: Highest performance for large FFTs
- **Compatibility**: Requires SIMD-capable browsers
- **Use Case**: Production applications with performance requirements

### 2. WASM+noSIMD  
- **Technology**: WebAssembly without SIMD optimizations
- **Performance**: Good performance, broader compatibility
- **Compatibility**: All modern browsers with WASM support
- **Use Case**: Balanced performance and compatibility

### 3. Pure JavaScript
- **Technology**: Native JavaScript Cooley-Tukey algorithm
- **Performance**: Slower but universally compatible
- **Compatibility**: All browsers supporting ES6 modules
- **Use Case**: Fallback implementation or educational purposes

## 🎵 Test Audio Files

The demo includes real vehicle recordings at various speeds:
- `23_mph.wav` - 23 mph vehicle pass-by
- `28_mph.wav` - 28 mph vehicle pass-by  
- `30_mph.wav` - 30 mph vehicle pass-by
- `30_mph_2.wav` - 30 mph vehicle pass-by (variant)
- `33_mph.wav` - 33 mph vehicle pass-by
- `37_mph.wav` - 37 mph vehicle pass-by

## 📊 Performance Metrics

The demo measures and compares:
- **Processing Time**: How long each implementation takes
- **Accuracy**: Error between calculated and expected speeds
- **Success Rate**: Percentage of successful speed calculations
- **Memory Usage**: Browser memory consumption (via dev tools)

## 🛠️ Local Development

To run locally:

1. Start a local HTTP server in the `docs/` directory:
   ```bash
   cd docs/
   python -m http.server 8000
   # or
   npx http-server
   ```

2. Open http://localhost:8000 in your browser

3. Click "Run FFT Performance Comparison" to start the analysis

## 🔧 Technical Notes

- **Web Audio API**: Used for loading and decoding audio files
- **ES6 Modules**: All code uses modern ES6 module syntax
- **CORS**: Requires HTTP server (not file://) for audio loading
- **Browser Compatibility**: Chrome 91+, Firefox 89+, Safari 15+

## 📈 Expected Results

Typical performance characteristics:
- **WASM+SIMD**: ~50-200ms per file, highest accuracy
- **WASM+noSIMD**: ~100-400ms per file, good accuracy  
- **Pure JavaScript**: ~300-2000ms per file, baseline accuracy

Results may vary based on browser, device, and audio file complexity.
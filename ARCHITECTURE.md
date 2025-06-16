# Architecture Overview

## System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Car Speed Via Doppler                   │
├─────────────────────────────────────────────────────────────┤
│  CLI Interface (bin/doppler-analyzer)                      │
│  ├── Command parsing                                       │
│  └── Main application orchestration                        │
├─────────────────────────────────────────────────────────────┤
│  Application Layer (main.js)                               │
│  ├── Audio workflow coordination                           │
│  ├── Result processing and display                         │
│  └── Error handling and logging                            │
├─────────────────────────────────────────────────────────────┤
│  Core Libraries (lib/)                                     │
│  ├── AudioProcessor: File I/O and audio processing         │
│  ├── SpectrumAnalyzer: FFT and frequency analysis          │
│  ├── DualFrequencyAnalyzer: Dual freq analysis             │
│  └── DopplerSpeedCalculator: Speed calculation engine      │
├─────────────────────────────────────────────────────────────┤
│  External Dependencies                                     │
│  ├── fft-js: Fast Fourier Transform implementation         │
│  └── wavefile: WAV audio file parsing                      │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Audio Input Processing
```
Audio File (.wav) 
    ↓ AudioProcessor.loadWavFile()
Normalized Sample Array + Sample Rate
    ↓ AudioProcessor.extractTimeSections() or auto-detection
Approach Samples + Recede Samples
```

### 2. Frequency Analysis
```
Audio Samples
    ↓ SpectrumAnalyzer.constructor()
Zero-padded, Power-of-2 Length Array
    ↓ SpectrumAnalyzer.calculatePowerSpectrum()
Power Spectral Density + Frequency Bins
    ↓ SpectrumAnalyzer.findPeakFrequency()
Dominant Frequency (Hz)
```

### 3. Speed Calculation
```
Approach Frequency + Recede Frequency
    ↓ DopplerSpeedCalculator.calculateSpeed()
Doppler Formula: v = c × (f1 - f2) / (f1 + f2)
    ↓ Unit conversion and validation
Car Speed (km/h, mph)
```

## Class Relationships

### Core Classes
- **AudioProcessor**: Static utility class for file operations
- **SpectrumAnalyzer**: Instance-based FFT analysis
- **DopplerSpeedCalculator**: Stateless calculation engine
- **DualFrequencyAnalyzer**: Dual analysis of freqs

### Dependency Graph
```
main.js
├── AudioProcessor (lib/AudioUtils.js)
├── DualFrequencyAnalyzer (lib/FrequencyAnalysis.js)
│   └── fft-js
└── DopplerSpeedCalculator (lib/DopplerCalculator.js)

test/doppler-speed-tests.js
├── AudioProcessor (lib/AudioUtils.js)
├── SpectrumAnalyzer (lib/SpectrumAnalyzer.js)
│   └── fft-js
└── DopplerSpeedCalculator (lib/DopplerCalculator.js)
```

## Algorithm Pipeline

### main.js
1. Load entire audio file
2. Extract predefined time sections (4.0-7.6s, 7.9-10.0s)
3. Apply dual frequency analysis
4. Calculate speed from peak frequencies

### Advanced Mode (test/doppler-speed-tests.js)
1. Load audio file with normalization
2. Auto-detect closest approach using RMS energy
3. Adaptively section around closest approach
4. Evaluate multiple frequency candidates
5. Select best frequency pair for speed calculation

## Error Handling Strategy

### Validation Layers
1. **Input Validation**: File existence, format compatibility
2. **Data Validation**: Sample rate, audio length, amplitude
3. **Algorithm Validation**: FFT length, frequency range
4. **Result Validation**: Speed reasonableness, calculation errors

### Error Recovery
- **Graceful Degradation**: Continue with warnings for non-critical issues
- **Alternative Strategies**: Multiple analysis approaches for robustness
- **Clear Error Messages**: Actionable feedback for common problems

## Performance Characteristics

### Time Complexity
- **FFT**: O(n log n) where n = padded audio length
- **Peak Detection**: O(n) where n = frequency bins
- **Overall**: O(n log n) dominated by FFT computation

### Space Complexity
- **Audio Storage**: O(n) for original samples
- **FFT Buffers**: O(2n) for zero-padded FFT
- **Frequency Data**: O(n/2) for positive frequencies only

### Optimizations
- **Power-of-2 FFT**: Ensures optimal performance
- **Minimal Memory Allocation**: Reuse buffers where possible
- **Lazy Evaluation**: Calculate only when needed

## Testing Architecture

### Test Structure
```
test/
├── integration/                 # Integration tests
│   └── test-audio-file-analysis.js # Real audio file speed detection tests
└── unit/                        # Unit tests for individual modules
    ├── run-all-unit-tests.js   # Master test runner
    ├── test-doppler-calculator.js # Mathematical accuracy tests
    ├── test-audio-processor.js # Audio processing utilities
    ├── test-spectrum-analyzer.js # FFT and frequency analysis
    ├── test-approach-detector.js # Vehicle approach detection
    ├── test-audio-slicer.js    # Audio slicing operations
    ├── test-audio-timing-strategy.js # Time-based sectioning
    ├── test-frequency-matcher.js # Frequency pairing algorithms
    └── test-test-reporter.js   # Result formatting and statistics
```

### Test Coverage
- **Unit Tests**: 100% coverage of mathematical functions
- **Integration Tests**: Real-world audio file validation
- **Performance Tests**: Speed and memory benchmarks
- **Regression Tests**: Prevent accuracy degradation

## Extension Points

### Adding New Audio Formats
1. Extend `AudioProcessor` with new `loadXxxFile()` method
2. Ensure output format consistency: `{ samples, sampleRate }`
3. Add format detection logic if needed

### Adding New Analysis Algorithms
1. Create new analyzer class in `lib/`
2. Implement standard interface: constructor, calculate, getResults
3. Add corresponding unit tests
4. Update main workflow if needed

### Adding New Speed Calculation Methods
1. Extend `DopplerSpeedCalculator` with new methods
2. Maintain backward compatibility with legacy `dopplerSpeed()`
3. Add validation and error handling
4. Update documentation and tests
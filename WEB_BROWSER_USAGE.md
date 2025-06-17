# Web Browser Usage Guide

This guide shows how to use the Doppler Speed Calculator library in web browsers with real-time microphone input, specifically for Safari on iOS 18.

> **Note**: This guide covers microphone input specifically. For general web integration via runtime linkage, see [DOPPLER_SERVICE_INTEGRATION.md](DOPPLER_SERVICE_INTEGRATION.md).

## Overview

The library works directly with raw audio sample arrays from the Web Audio API using runtime linkage, eliminating the need for file system operations or WAV file creation.

## Basic Setup

### 1. Request Microphone Permission

```javascript
// Request microphone access
const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false
    }
});
```

### 2. Initialize Web Audio Context

```javascript
// Create audio context (let browser choose optimal sample rate)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const actualSampleRate = audioContext.sampleRate;
console.log(`Using sample rate: ${actualSampleRate} Hz`);

// Create audio processing chain
const source = audioContext.createMediaStreamSource(stream);
const processor = audioContext.createScriptProcessor(4096, 1, 1);
```

### 3. Collect Audio Samples

```javascript
const audioBuffer = [];
let isRecording = false;

processor.onaudioprocess = (event) => {
    if (isRecording) {
        const inputData = event.inputBuffer.getChannelData(0); // Float32Array
        audioBuffer.push(...inputData);
        
        // Stop after collecting ~5-10 seconds
        if (audioBuffer.length > actualSampleRate * 8) {
            isRecording = false;
            analyzeSpeed();
        }
    }
};

// Connect the audio processing chain
source.connect(processor);
processor.connect(audioContext.destination);
```

### 4. Analyze Speed

```javascript
async function analyzeSpeed() {
    // Runtime linkage via dynamic imports
    const BASE_URL = 'https://paul-hammant.github.io/Car-Speed-Via-Doppler';
    
    const AudioAnalyzer = (await import(`${BASE_URL}/shared/audio-analyzer.js`)).default;
    const AudioProcessor = (await import(`${BASE_URL}/shared/audio-utils.js`)).default;
    
    // Initialize analyzer
    const analyzer = new AudioAnalyzer({
        fftMode: 'wasm-no-simd',
        windowType: 'hamming',
        confidenceThreshold: 0.7
    });
    
    // Normalize audio samples
    const normalizedSamples = AudioProcessor.normalizeAmplitude(audioBuffer);
    
    // Extract approach and recede sections
    const sections = analyzer.extractSections(normalizedSamples, actualSampleRate, 'peak_rms_energy');
    
    // Analyze frequencies and calculate speed
    const speedResult = await analyzer.findBestSpeedCalculation(
        await analyzer.analyzeFrequencies(sections.approaching, actualSampleRate),
        await analyzer.analyzeFrequencies(sections.receding, actualSampleRate)
    );
    
    // Display results
    if (speedResult.valid) {
        console.log(`Vehicle Speed: ${speedResult.speedMph.toFixed(1)} mph (${speedResult.speedKmh.toFixed(1)} km/h)`);
        console.log(`Strategy: ${speedResult.strategy}`);
        console.log(`Confidence: ${speedResult.confidence}`);
    } else {
        console.log(`Analysis failed: ${speedResult.error}`);
    }
}
```

## Complete Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>Doppler Speed Detection</title>
</head>
<body>
    <button id="startBtn">Start Recording</button>
    <div id="results"></div>
    
    <script>
        let audioContext, processor, source, stream;
        let audioBuffer = [];
        let isRecording = false;
        
        document.getElementById('startBtn').addEventListener('click', async () => {
            try {
                // Request microphone permission
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        channelCount: 1,
                        echoCancellation: false,
                        noiseSuppression: false
                    }
                });
                
                // Initialize audio context
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                await audioContext.resume(); // Required for iOS
                
                source = audioContext.createMediaStreamSource(stream);
                processor = audioContext.createScriptProcessor(4096, 1, 1);
                
                processor.onaudioprocess = (event) => {
                    if (isRecording) {
                        const inputData = event.inputBuffer.getChannelData(0);
                        audioBuffer.push(...inputData);
                        
                        // Analyze after 8 seconds
                        if (audioBuffer.length > audioContext.sampleRate * 8) {
                            isRecording = false;
                            analyzeSpeed();
                        }
                    }
                };
                
                source.connect(processor);
                processor.connect(audioContext.destination);
                
                // Start recording
                audioBuffer = [];
                isRecording = true;
                document.getElementById('startBtn').textContent = 'Recording... (8s)';
                
            } catch (error) {
                console.error('Error accessing microphone:', error);
            }
        });
        
        async function analyzeSpeed() {
            // Runtime linkage via dynamic imports
            const BASE_URL = 'https://paul-hammant.github.io/Car-Speed-Via-Doppler';
            
            const AudioAnalyzer = (await import(`${BASE_URL}/shared/audio-analyzer.js`)).default;
            const AudioProcessor = (await import(`${BASE_URL}/shared/audio-utils.js`)).default;
            
            // Initialize analyzer
            const analyzer = new AudioAnalyzer({
                fftMode: 'wasm-no-simd',
                windowType: 'hamming',
                confidenceThreshold: 0.7
            });
            
            // Normalize audio samples
            const normalizedSamples = AudioProcessor.normalizeAmplitude(audioBuffer);
            
            // Extract approach and recede sections
            const sections = analyzer.extractSections(normalizedSamples, audioContext.sampleRate, 'peak_rms_energy');
            
            // Analyze frequencies and calculate speed
            const speedResult = await analyzer.findBestSpeedCalculation(
                await analyzer.analyzeFrequencies(sections.approaching, audioContext.sampleRate),
                await analyzer.analyzeFrequencies(sections.receding, audioContext.sampleRate)
            );
            
            const resultsDiv = document.getElementById('results');
            if (speedResult.valid) {
                resultsDiv.innerHTML = `
                    <h3>Speed Analysis Results</h3>
                    <p>Speed: ${speedResult.speedKmh.toFixed(1)} km/h (${speedResult.speedMph.toFixed(1)} mph)</p>
                    <p>Strategy: ${speedResult.strategy}</p>
                    <p>Confidence: ${speedResult.confidence}</p>
                `;
            } else {
                resultsDiv.innerHTML = `<p>Analysis failed: ${speedResult.error}</p>`;
            }
            
            document.getElementById('startBtn').textContent = 'Start Recording';
            
            // Clean up
            stream.getTracks().forEach(track => track.stop());
        }
    </script>
</body>
</html>
```

## iOS Safari Considerations

### Sample Rates
- **iPhone**: Typically 48000 Hz
- **iPad**: Often 44100 Hz
- Always use `audioContext.sampleRate` instead of hardcoding

### Permissions and Activation
- Microphone access requires user gesture (button click)
- Audio context may need manual resumption: `await audioContext.resume()`
- Test on actual iOS devices, not just simulators

### Performance
- Use appropriate buffer sizes (4096 samples works well)
- Consider shorter analysis windows for real-time applications
- Monitor memory usage during extended recording

## Integration with Bundlers

### Webpack
```javascript
// webpack.config.js
module.exports = {
    resolve: {
        fallback: {
            "fs": false,
            "path": false
        }
    }
};
```

### Browserify
```bash
browserify main.js -o bundle.js --ignore fs --ignore path
```

## Key Differences from Node.js Usage

| Aspect | Node.js | Web Browser |
|--------|---------|-------------|
| Audio Source | WAV files via `fs` | Microphone via Web Audio API |
| Sample Rate | From file metadata | From `audioContext.sampleRate` |
| Data Format | File buffer → Float32Array | Direct Float32Array from `getChannelData()` |
| Processing | Batch file analysis | Real-time stream processing |

## Troubleshooting

### Common Issues
- **No microphone permission**: Check browser settings and ensure HTTPS
- **Audio context suspended**: Call `audioContext.resume()` after user interaction
- **Poor frequency detection**: Ensure vehicle is clearly audible and minimize background noise
- **CORS errors**: Serve files over HTTPS when testing locally

### Testing Tips
- Test with actual vehicle recordings first
- Use headphones to prevent feedback
- Position device appropriately for clear Doppler effect capture
- Verify sample rates match between recording and analysis

## Security Considerations

- Always request minimal required permissions
- Inform users about microphone usage
- Stop audio streams when analysis is complete
- Consider implementing audio data encryption for sensitive applications
# Web Browser Usage Guide

This guide shows how to use the Doppler Speed Calculator library in web browsers with real-time microphone input, specifically for Safari on iOS 18.

## Overview

The library works directly with raw audio sample arrays from the Web Audio API, eliminating the need for file system operations or WAV file creation.

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
function analyzeSpeed() {
    // Import the library (adjust path for your bundler)
    const { DopplerSpeedCalculator, SpectrumAnalyzer } = require('car-speed-via-doppler');
    
    // Split audio into approach and recede sections
    const midpoint = Math.floor(audioBuffer.length / 2);
    const approachSection = audioBuffer.slice(0, midpoint);
    const recedeSection = audioBuffer.slice(midpoint);
    
    // Analyze approach frequency
    const approachAnalyzer = new SpectrumAnalyzer(approachSection, actualSampleRate);
    approachAnalyzer.calculatePowerSpectrum();
    const approachFreq = approachAnalyzer.findPeakFrequency();
    
    // Analyze recede frequency
    const recedeAnalyzer = new SpectrumAnalyzer(recedeSection, actualSampleRate);
    recedeAnalyzer.calculatePowerSpectrum();
    const recedeFreq = recedeAnalyzer.findPeakFrequency();
    
    // Calculate vehicle speed
    const calculator = new DopplerSpeedCalculator();
    const result = calculator.calculateSpeedWithValidation(approachFreq, recedeFreq);
    
    // Display results
    if (result.valid) {
        console.log(`Vehicle Speed: ${result.speedKMH.toFixed(1)} km/h (${result.speedMPH.toFixed(1)} mph)`);
        console.log(`Frequency shift: ${result.frequencyShift.toFixed(1)} Hz`);
    } else {
        console.log(`Analysis failed: ${result.error}`);
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
    
    <script src="your-bundled-doppler-lib.js"></script>
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
        
        function analyzeSpeed() {
            const { DopplerSpeedCalculator, SpectrumAnalyzer } = DopplerSpeedLib;
            
            const midpoint = Math.floor(audioBuffer.length / 2);
            const approachSection = audioBuffer.slice(0, midpoint);
            const recedeSection = audioBuffer.slice(midpoint);
            
            const approachAnalyzer = new SpectrumAnalyzer(approachSection, audioContext.sampleRate);
            approachAnalyzer.calculatePowerSpectrum();
            const approachFreq = approachAnalyzer.findPeakFrequency();
            
            const recedeAnalyzer = new SpectrumAnalyzer(recedeSection, audioContext.sampleRate);
            recedeAnalyzer.calculatePowerSpectrum();
            const recedeFreq = recedeAnalyzer.findPeakFrequency();
            
            const calculator = new DopplerSpeedCalculator();
            const result = calculator.calculateSpeedWithValidation(approachFreq, recedeFreq);
            
            const resultsDiv = document.getElementById('results');
            if (result.valid) {
                resultsDiv.innerHTML = `
                    <h3>Speed Analysis Results</h3>
                    <p>Speed: ${result.speedKMH.toFixed(1)} km/h (${result.speedMPH.toFixed(1)} mph)</p>
                    <p>Approach frequency: ${approachFreq.toFixed(1)} Hz</p>
                    <p>Recede frequency: ${recedeFreq.toFixed(1)} Hz</p>
                    <p>Frequency shift: ${result.frequencyShift.toFixed(1)} Hz</p>
                `;
            } else {
                resultsDiv.innerHTML = `<p>Analysis failed: ${result.error}</p>`;
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
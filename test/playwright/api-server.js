import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Enable CORS for browser requests
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Serve static files from project root
app.use(express.static(path.resolve(__dirname, '../..')));

// Run doppler analysis with specific FFT mode
async function runAnalysis(fftMode) {
    return new Promise((resolve, reject) => {
        const env = { ...process.env, FFT_MODE: fftMode };
        const child = spawn('node', ['test/integration/test-audio-file-analysis.js'], {
            env,
            cwd: path.resolve(__dirname, '../..'),
            stdio: 'pipe'
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(`Process failed with code ${code}: ${stderr}`));
            }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            child.kill();
            reject(new Error('Analysis timeout'));
        }, 30000);
    });
}

// Parse test output to extract results
function parseTestOutput(output) {
    const lines = output.split('\n');
    const results = [];
    
    // Look for the summary table in the output
    let inSummaryTable = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Start of summary table
        if (line.includes('| File | Expected Speed | Calculated Speed | Error | Strategy Used | Clip Duration | Processing Time |')) {
            inSummaryTable = true;
            continue;
        }
        
        // Skip header separator
        if (line.includes('|------|') && inSummaryTable) {
            continue;
        }
        
        // Parse table rows
        if (inSummaryTable && line.includes('mph.wav')) {
            const match = line.match(/\|\s*(\w+_mph\.wav)\s*\|\s*(\d+) mph \((\d+\.?\d*) km\/h\)\s*\|\s*(\d+\.?\d*) mph \((\d+\.?\d*) km\/h\)\s*\|\s*±?(\d+\.?\d*) mph\s*\|\s*(Primary|Secondary|Tertiary)\s*\|\s*(\d+\.?\d*)s\s*\|\s*(\d+)ms\s*\|/);
            
            if (match) {
                const [, file, expectedMph, expectedKmh, calculatedMph, calculatedKmh, error, strategy, duration, processingTime] = match;
                
                results.push({
                    file,
                    expectedSpeedMph: parseInt(expectedMph),
                    expectedSpeedKmh: parseFloat(expectedKmh),
                    calculatedSpeedMph: parseFloat(calculatedMph),
                    calculatedSpeedKmh: parseFloat(calculatedKmh),
                    error: parseFloat(error),
                    strategy,
                    clipDuration: parseFloat(duration),
                    processingTime: parseInt(processingTime)
                });
            }
        }
        
        // End of summary table
        if (inSummaryTable && line.trim() === '') {
            break;
        }
    }
    
    return results;
}

// API endpoint to run analysis with specific FFT mode
app.get('/analyze/:mode', async (req, res) => {
    const { mode } = req.params;
    
    if (!['WASM+SIMD', 'WASM+noSIMD', 'JavaScript FFT implementation'].includes(mode)) {
        return res.status(400).json({ error: 'Invalid FFT mode' });
    }

    try {
        const output = await runAnalysis(mode);
        const results = parseTestOutput(output);
        
        res.json({
            mode,
            results,
            rawOutput: output
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            mode 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Combined server running on http://localhost:${PORT}`);
});

export default app;
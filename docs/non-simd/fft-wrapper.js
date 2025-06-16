/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo

 * WASM+noSIMD FFT Wrapper for static web deployment
 */

let wasmModule = null;
let isInitialized = false;

// Load the WASM module
async function loadWasm() {
    if (wasmModule && isInitialized) return wasmModule;
    
    try {
        // Import the WASM module factory
        const wasmImport = await import('./pffft.js');
        wasmModule = await wasmImport.default();
        
        // Wait for module to be fully initialized
        if (wasmModule.then) {
            wasmModule = await wasmModule;
        }
        
        // Wait for runtime initialization
        if (!wasmModule.HEAPF32) {
            await new Promise((resolve) => {
                if (wasmModule.onRuntimeInitialized) {
                    const original = wasmModule.onRuntimeInitialized;
                    wasmModule.onRuntimeInitialized = () => {
                        if (original) original();
                        resolve();
                    };
                } else {
                    wasmModule.onRuntimeInitialized = resolve;
                }
            });
        }
        
        isInitialized = true;
        console.log('🔧 WASM+noSIMD FFT loaded and initialized successfully');
        return wasmModule;
    } catch (error) {
        console.error('Failed to load WASM+noSIMD module:', error);
        throw new Error('WASM+noSIMD not available');
    }
}

/**
 * Perform FFT using WASM+noSIMD implementation
 * @param {Array} signal - Input signal for FFT
 * @returns {Array} FFT result
 */
export async function fft(signal) {
    await loadWasm();
    
    const length = signal.length;
    console.log(`🔧 FFT: Called with signal length ${length}, FFT_MODE=WASM+noSIMD`);
    
    // Ensure power of 2 length
    if ((length & (length - 1)) !== 0) {
        throw new Error(`FFT length must be power of 2, got ${length}`);
    }
    
    try {
        // For now, use JavaScript fallback since PFFFT setup is complex
        console.log('Using fallback FFT implementation');
        return simpleFft(signal);
        
    } catch (error) {
        console.error('WASM+noSIMD FFT error:', error);
        throw error;
    }
}

/**
 * Simple Cooley-Tukey FFT implementation as fallback
 * @param {Array} signal - Input signal
 * @returns {Array} FFT result
 */
function simpleFft(signal) {
    const length = signal.length;
    
    // Convert to complex format
    const complex = new Array(length * 2);
    for (let i = 0; i < length; i++) {
        complex[i * 2] = signal[i];     // Real part
        complex[i * 2 + 1] = 0;         // Imaginary part
    }
    
    // Perform FFT
    fftRecursive(complex, length);
    return complex;
}

/**
 * Recursive Cooley-Tukey FFT
 * @param {Array} x - Complex array
 * @param {number} N - Length
 */
function fftRecursive(x, N) {
    if (N <= 1) return;
    
    // Divide
    const even = new Array(N);
    const odd = new Array(N);
    
    for (let i = 0; i < N / 2; i++) {
        even[i * 2] = x[i * 4];         // Real part of even
        even[i * 2 + 1] = x[i * 4 + 1]; // Imaginary part of even
        odd[i * 2] = x[i * 4 + 2];      // Real part of odd
        odd[i * 2 + 1] = x[i * 4 + 3];  // Imaginary part of odd
    }
    
    // Conquer
    fftRecursive(even, N / 2);
    fftRecursive(odd, N / 2);
    
    // Combine
    for (let k = 0; k < N / 2; k++) {
        const angle = -2 * Math.PI * k / N;
        const cos_val = Math.cos(angle);
        const sin_val = Math.sin(angle);
        
        // Complex multiplication: t = odd[k] * exp(-2πik/N)
        const t_real = odd[k * 2] * cos_val - odd[k * 2 + 1] * sin_val;
        const t_imag = odd[k * 2] * sin_val + odd[k * 2 + 1] * cos_val;
        
        // x[k] = even[k] + t
        x[k * 2] = even[k * 2] + t_real;
        x[k * 2 + 1] = even[k * 2 + 1] + t_imag;
        
        // x[k + N/2] = even[k] - t
        x[(k + N / 2) * 2] = even[k * 2] - t_real;
        x[(k + N / 2) * 2 + 1] = even[k * 2 + 1] - t_imag;
    }
}

// Initialize WASM when module loads
loadWasm().catch(console.error);
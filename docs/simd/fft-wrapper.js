/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo

 * WASM+SIMD FFT Wrapper for static web deployment
 * NO FALLBACKS - WASM+SIMD only
 */

let wasmModule = null;
let fftSetup = null;

// Load the WASM module
async function loadWasm() {
    if (wasmModule) return wasmModule;
    
    try {
        // Check if WASM+SIMD is supported in this browser
        if (!WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 127, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 26, 11]))) {
            throw new Error('WASM+SIMD not supported in this browser');
        }
        
        console.log('🔧 WASM+SIMD support detected, loading module...');
        
        // Import the WASM module factory
        const wasmImport = await import('./pffft.js');
        wasmModule = await wasmImport.default();
        
        // Wait for module to be fully initialized
        if (wasmModule.then) {
            wasmModule = await wasmModule;
        }
        
        // Wait for runtime initialization
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('WASM+SIMD initialization timeout'));
            }, 30000); // Much longer timeout for slow initialization
            
            const checkReady = () => {
                console.log(`🔧 WASM+SIMD init check: HEAPF32=${!!wasmModule.HEAPF32}, _pffft_new_setup=${!!wasmModule._pffft_new_setup}`);
                if (wasmModule.HEAPF32 && wasmModule._pffft_new_setup) {
                    console.log('✅ WASM+SIMD fully initialized');
                    clearTimeout(timeout);
                    resolve();
                    return true;
                }
                return false;
            };
            
            // Check if already ready
            if (checkReady()) return;
            
            // Set up initialization callback
            if (wasmModule.onRuntimeInitialized) {
                const original = wasmModule.onRuntimeInitialized;
                wasmModule.onRuntimeInitialized = () => {
                    if (original) original();
                    checkReady();
                };
            } else {
                wasmModule.onRuntimeInitialized = () => {
                    checkReady();
                };
            }
            
            // Fallback polling
            const poll = () => {
                if (!checkReady()) {
                    setTimeout(poll, 100);
                }
            };
            setTimeout(poll, 100);
        });
        
        // Verify WASM+SIMD functions are available
        if (!wasmModule._pffft_new_setup || !wasmModule._pffft_transform || !wasmModule._malloc || !wasmModule._free) {
            throw new Error('WASM+SIMD functions not available');
        }
        
        console.log('🔧 WASM+SIMD FFT loaded successfully');
        console.log(`🔧 HEAPF32 length: ${wasmModule.HEAPF32?.length || 'undefined'}`);
        console.log(`🔧 Available functions: setup=${!!wasmModule._pffft_new_setup}, transform=${!!wasmModule._pffft_transform_ordered}, malloc=${!!wasmModule._pffft_aligned_malloc}`);
        return wasmModule;
    } catch (error) {
        console.error('Failed to load WASM+SIMD module:', error);
        throw new Error(`WASM+SIMD not available: ${error.message}`);
    }
}

/**
 * Perform FFT using WASM+SIMD implementation ONLY
 * @param {Array} signal - Input signal for FFT
 * @returns {Array} FFT result
 */
export async function fft(signal) {
    if (!wasmModule) {
        await loadWasm();
    }
    
    const length = signal.length;
    console.log(`🔧 FFT: Called with signal length ${length}, FFT_MODE=WASM+SIMD`);
    
    // Ensure power of 2 length
    if ((length & (length - 1)) !== 0) {
        throw new Error(`FFT length must be power of 2, got ${length}`);
    }
    
    try {
        // Create setup if needed
        if (!fftSetup || fftSetup.length !== length) {
            if (fftSetup) {
                wasmModule._pffft_destroy_setup(fftSetup.setupPtr);
            }
            
            // PFFFT_REAL = 0
            const setupPtr = wasmModule._pffft_new_setup(length, 0);
            if (!setupPtr) {
                throw new Error('Failed to create PFFFT setup');
            }
            fftSetup = { setupPtr, length };
        }
        
        // Allocate memory for input and output
        const inputPtr = wasmModule._pffft_aligned_malloc(length * 4); // Float32
        const outputPtr = wasmModule._pffft_aligned_malloc(length * 4);
        
        if (!inputPtr || !outputPtr) {
            throw new Error('Failed to allocate WASM+SIMD memory');
        }
        
        // Copy input data
        const heap = wasmModule.HEAPF32;
        if (!heap) {
            wasmModule._pffft_aligned_free(inputPtr);
            wasmModule._pffft_aligned_free(outputPtr);
            throw new Error('WASM+SIMD heap not available');
        }
        
        const inputOffset = inputPtr / 4;
        const outputOffset = outputPtr / 4;
        
        // Verify heap bounds
        if (inputOffset + length > heap.length || outputOffset + length > heap.length) {
            wasmModule._pffft_aligned_free(inputPtr);
            wasmModule._pffft_aligned_free(outputPtr);
            throw new Error('WASM+SIMD heap out of bounds');
        }
        
        for (let i = 0; i < length; i++) {
            heap[inputOffset + i] = signal[i];
        }
        
        // Perform FFT using PFFFT
        wasmModule._pffft_transform_ordered(fftSetup.setupPtr, inputPtr, outputPtr, null, 1);
        
        // Read results - PFFFT real-to-complex output format
        const result = new Array(length * 2);
        
        // DC component
        result[0] = heap[outputOffset];
        result[1] = 0;
        
        // AC components
        for (let i = 1; i < length / 2; i++) {
            result[i * 2] = heap[outputOffset + i * 2];       // Real
            result[i * 2 + 1] = heap[outputOffset + i * 2 + 1]; // Imaginary
        }
        
        // Nyquist component
        if (length > 1) {
            result[length] = heap[outputOffset + 1];
            result[length + 1] = 0;
        }
        
        // Free memory
        wasmModule._pffft_aligned_free(inputPtr);
        wasmModule._pffft_aligned_free(outputPtr);
        
        return result;
        
    } catch (error) {
        console.error('WASM+SIMD FFT error:', error);
        throw new Error(`WASM+SIMD FFT failed: ${error.message}`);
    }
}


/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo

 * Pure JavaScript FFT implementation for static web deployment
 * Uses Cooley-Tukey FFT algorithm
 */

/**
 * Pure JavaScript FFT implementation using Cooley-Tukey algorithm
 * @param {Array} signal - Input signal for FFT
 * @returns {Array} FFT result (complex numbers as [real, imag, real, imag, ...])
 */
export function fft(signal) {
    const length = signal.length;
    console.log(`🔧 FFT: Called with signal length ${length}, FFT_MODE=JavaScript FFT implementation`);
    
    // Ensure power of 2 length
    if ((length & (length - 1)) !== 0) {
        throw new Error(`FFT length must be power of 2, got ${length}`);
    }
    
    // Convert real signal to complex (real, imaginary pairs)
    const complex = new Array(length * 2);
    for (let i = 0; i < length; i++) {
        complex[i * 2] = signal[i];     // Real part
        complex[i * 2 + 1] = 0;         // Imaginary part
    }
    
    // Perform FFT using Cooley-Tukey algorithm
    fftRecursive(complex, length);
    
    return complex;
}

/**
 * Recursive Cooley-Tukey FFT implementation
 * @param {Array} x - Complex array [real, imag, real, imag, ...]
 * @param {number} N - Length of the transform
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

console.log('🔧 Pure JavaScript FFT implementation loaded');
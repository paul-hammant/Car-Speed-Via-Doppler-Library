/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo

 * Doppler effect calculator for car speed determination
 * Uses frequency shift between approaching and receding vehicle sounds
 */
class DopplerSpeedCalculator {
    /**
     * Initialize calculator with physical constants
     * @param {number} soundSpeed - Speed of sound in m/s (default: 343 at 20°C)
     * @param {number} temperature - Ambient temperature in Celsius (default: 20)
     */
    constructor(soundSpeed = 343, temperature = 20) {
        this.soundSpeed = soundSpeed;
        this.ambientTemperature = temperature;
        this.maxReasonableSpeed = 1000; // km/h - upper limit for reasonable car speeds
        this.minReasonableSpeed = 0;   // km/h - lower limit
    }
    
    /**
     * Calculate car speed from Doppler frequency shift
     * Uses the formula: v = c * (f1 - f2) / (f1 + f2)
     * where f1 = approaching frequency, f2 = receding frequency, c = sound speed
     * 
     * @param {number} approachingFrequency - Frequency when vehicle approaches (Hz)
     * @param {number} recedingFrequency - Frequency when vehicle recedes (Hz)
     * @returns {number} Car speed in km/h (0 if calculation invalid)
     */
    calculateSpeed(approachingFrequency, recedingFrequency) {
        // Apply Doppler effect formula
        let speedMs = this.soundSpeed * (approachingFrequency - recedingFrequency) / 
                      (approachingFrequency + recedingFrequency);
        
        // Convert from m/s to km/h
        let speedKmh = speedMs * 3.6;
        
        // Validate result is within reasonable bounds
        if (speedKmh >= this.maxReasonableSpeed || speedKmh < this.minReasonableSpeed) {
            console.log(`Speed calculation error: ${approachingFrequency.toFixed(0)}Hz → ${recedingFrequency.toFixed(0)}Hz = ${speedKmh.toFixed(1)} km/h (out of bounds 0-${this.maxReasonableSpeed})`);
            return 0;
        }
        
        return speedKmh;
    }
    
    /**
     * Calculate speed with error handling and validation
     * @param {number} f1 - First frequency measurement (Hz)
     * @param {number} f2 - Second frequency measurement (Hz) 
     * @returns {Object} Result object with speedKMH, speedMPH, validity, and error info
     */
    calculateSpeedWithValidation(f1, f2) {
        try {
            // Basic frequency validation
            if (f1 <= 0 || f2 <= 0) {
                return { speedKMH: 0, speedMPH: 0, valid: false, error: 'Invalid frequency values' };
            }
            
            if (Math.abs(f1 - f2) < 1) {
                return { speedKMH: 0, speedMPH: 0, valid: false, error: 'Frequency difference too small' };
            }
            
            const speedKMH = this.calculateSpeed(f1, f2);
            const speedMPH = speedKMH * 0.621371; // Convert km/h to mph
            
            return {
                speedKMH: speedKMH,
                speedMPH: speedMPH,
                valid: speedKMH > 0,
                error: speedKMH === 0 ? 'Speed outside reasonable range' : null,
                frequencyShift: Math.abs(f1 - f2),
                relativeFactor: Math.abs(f1 - f2) / Math.max(f1, f2)
            };
            
        } catch (error) {
            return { speedKMH: 0, speedMPH: 0, valid: false, error: error.message };
        }
    }
    
    /**
     * Set custom speed validation limits
     * @param {number} minSpeed - Minimum reasonable speed (km/h)
     * @param {number} maxSpeed - Maximum reasonable speed (km/h)
     */
    setSpeedLimits(minSpeed, maxSpeed) {
        this.minReasonableSpeed = minSpeed;
        this.maxReasonableSpeed = maxSpeed;
    }
    
    /**
     * Legacy method name for backward compatibility
     * @deprecated Use calculateSpeed() instead
     */
    dopplerSpeed(freq1, freq2) {
        return this.calculateSpeed(freq1, freq2);
    }
}

export default DopplerSpeedCalculator;
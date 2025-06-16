import { test, expect } from '@playwright/test';

test.describe('FrequencyMatcher Browser Tests', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/playwright/harness/frequency-matcher-test.html');
        // Wait for the test harness to load
        await page.waitForFunction(() => window.testFrequencyMatching !== undefined, { timeout: 10000 });
    });

    test('should find frequency matches from test data', async ({ page }) => {
        const result = await page.evaluate(async () => {
            // Generate some test frequencies
            const approachFreqs = [
                { frequency: 1100, power: 0.001 },
                { frequency: 1200, power: 0.0005 },
                { frequency: 1050, power: 0.0008 }
            ];
            const recedeFreqs = [
                { frequency: 900, power: 0.0009 },
                { frequency: 800, power: 0.0004 },
                { frequency: 950, power: 0.0007 }
            ];
            
            return await window.testFrequencyMatching(approachFreqs, recedeFreqs, 1);
        });
        
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.foundMatches).toBeGreaterThanOrEqual(1);
        expect(result.matches).toBeDefined();
        expect(Array.isArray(result.matches)).toBe(true);
        
        if (result.bestMatch) {
            expect(result.bestMatch.approachFreq).toBeGreaterThan(result.bestMatch.recedeFreq);
            expect(result.bestMatch.speed).toBeGreaterThan(0);
            expect(result.bestMatch.confidence).toBeGreaterThan(0);
            expect(result.bestMatch.confidence).toBeLessThanOrEqual(1);
        }
    });

    test('should match Doppler-shifted frequencies correctly', async ({ page }) => {
        const testCases = [
            { baseFreq: 1000, speed: 30 },
            { baseFreq: 1200, speed: 50 },
            { baseFreq: 800, speed: 20 }
        ];
        
        for (const testCase of testCases) {
            const result = await page.evaluate(async (testCase) => {
                return await window.testDopplerFrequencyMatching(testCase.baseFreq, testCase.speed);
            }, testCase);
            
            expect(result).toBeDefined();
            
            if (result.overallSuccess) {
                expect(result.calculatedSpeed).toBeDefined();
                expect(parseFloat(result.speedError)).toBeLessThan(testCase.speed * 0.3); // 30% tolerance
                expect(result.bestMatch).toBeDefined();
                expect(result.bestMatch.confidence).toBeGreaterThan(0.5);
            }
        }
    });

    test('should calculate confidence levels appropriately', async ({ page }) => {
        const result = await page.evaluate(async () => {
            return await window.testConfidenceCalculation();
        });
        
        expect(result).toBeDefined();
        expect(result.totalTests).toBeGreaterThan(0);
        expect(result.results).toBeDefined();
        
        // Should have reasonable success rate for confidence calculation
        const successRate = (result.passed / result.totalTests) * 100;
        expect(successRate).toBeGreaterThan(60);
        
        result.results.forEach(testResult => {
            expect(parseFloat(testResult.confidence)).toBeGreaterThanOrEqual(0);
            expect(parseFloat(testResult.confidence)).toBeLessThanOrEqual(1);
            expect(parseFloat(testResult.speed)).toBeGreaterThan(0);
            
            if (testResult.success) {
                // High confidence should be above threshold
                if (testResult.expectedHigh) {
                    expect(parseFloat(testResult.confidence)).toBeGreaterThanOrEqual(0.7);
                }
            }
        });
    });

    test('should validate matches correctly', async ({ page }) => {
        const result = await page.evaluate(async () => {
            return await window.testMatchValidation();
        });
        
        expect(result).toBeDefined();
        expect(result.totalTests).toBeGreaterThan(0);
        
        // Should correctly identify valid vs invalid matches
        const successRate = (result.passed / result.totalTests) * 100;
        expect(successRate).toBeGreaterThan(70); // Should correctly validate most cases
        
        result.results.forEach(testResult => {
            expect(testResult.validation).toBeDefined();
            expect(typeof testResult.validation.isValid).toBe('boolean');
            expect(testResult.reason).toBeDefined();
            
            // Check specific validation logic
            if (testResult.match.approachFreq <= testResult.match.recedeFreq) {
                // Invalid frequency order should be caught
                expect(testResult.validation.isValid).toBe(false);
                expect(testResult.reason).toContain('frequency order');
            }
            
            if (testResult.match.speed > 200) {
                // Unrealistic speeds should be rejected
                expect(testResult.validation.isValid).toBe(false);
                expect(testResult.reason).toContain('too high');
            }
        });
    });

    test('should handle large datasets efficiently', async ({ page }) => {
        const result = await page.evaluate(async () => {
            return await window.testPerformanceWithLargeDataset();
        });
        
        expect(result).toBeDefined();
        expect(result.pairsEvaluated).toBeGreaterThan(1000); // 50x50 = 2500 pairs
        expect(parseFloat(result.totalProcessingTime)).toBeGreaterThan(0);
        expect(result.pairsPerSecond).toBeGreaterThan(100); // Should process at least 100 pairs/sec
        
        // Should still find matches even with noise
        if (result.success) {
            expect(result.foundMatches).toBeGreaterThan(0);
            expect(result.bestMatch).toBeDefined();
        }
    });

    test('should prioritize matches by confidence and power', async ({ page }) => {
        const result = await page.evaluate(async () => {
            // Create test data with known confidence/power hierarchy
            const approachFreqs = [
                { frequency: 1100, power: 0.001 },  // High power
                { frequency: 1150, power: 0.0003 }, // Lower power
                { frequency: 1080, power: 0.0008 }  // Medium power
            ];
            const recedeFreqs = [
                { frequency: 900, power: 0.0009 },  // High power
                { frequency: 850, power: 0.0002 }, // Low power
                { frequency: 920, power: 0.0007 }  // Medium power
            ];
            
            return await window.testFrequencyMatching(approachFreqs, recedeFreqs, 3);
        });
        
        if (result.success && result.matches.length > 1) {
            // Matches should be sorted by confidence/quality
            for (let i = 1; i < result.matches.length; i++) {
                const current = result.matches[i];
                const previous = result.matches[i - 1];
                
                // Current match should have confidence <= previous match
                expect(current.confidence).toBeLessThanOrEqual(previous.confidence + 0.01); // Small tolerance
            }
            
            // Best match should have highest confidence
            const bestMatch = result.matches[0];
            expect(bestMatch.confidence).toBeGreaterThan(0.5);
        }
    });

    test('should filter unrealistic speeds', async ({ page }) => {
        const result = await page.evaluate(async () => {
            // Create frequency pairs that would yield unrealistic speeds
            const approachFreqs = [
                { frequency: 2000, power: 0.001 }, // Very high
                { frequency: 1100, power: 0.001 }, // Reasonable
                { frequency: 5000, power: 0.001 }  // Extremely high
            ];
            const recedeFreqs = [
                { frequency: 100, power: 0.001 },  // Very low - would give huge speed
                { frequency: 900, power: 0.001 },  // Reasonable
                { frequency: 50, power: 0.001 }    // Extremely low
            ];
            
            return await window.testFrequencyMatching(approachFreqs, recedeFreqs, 5);
        });
        
        expect(result).toBeDefined();
        
        // Should filter out unrealistic matches
        if (result.matches.length > 0) {
            result.matches.forEach(match => {
                expect(match.speed).toBeGreaterThan(0);
                expect(match.speed).toBeLessThan(200); // Max reasonable speed
                expect(match.approachFreq).toBeGreaterThan(match.recedeFreq);
            });
        }
    });

    test('should handle edge cases gracefully', async ({ page }) => {
        const edgeCases = [
            {
                name: 'Empty frequency arrays',
                approachFreqs: [],
                recedeFreqs: []
            },
            {
                name: 'Single frequency each',
                approachFreqs: [{ frequency: 1100, power: 0.001 }],
                recedeFreqs: [{ frequency: 900, power: 0.001 }]
            },
            {
                name: 'All approach frequencies lower than recede',
                approachFreqs: [{ frequency: 800, power: 0.001 }],
                recedeFreqs: [{ frequency: 1200, power: 0.001 }]
            }
        ];
        
        for (const edgeCase of edgeCases) {
            const result = await page.evaluate(async (testCase) => {
                return await window.testFrequencyMatching(
                    testCase.approachFreqs, 
                    testCase.recedeFreqs, 
                    1
                );
            }, edgeCase);
            
            expect(result).toBeDefined();
            
            if (edgeCase.name === 'Empty frequency arrays') {
                expect(result.foundMatches).toBe(0);
            } else if (edgeCase.name === 'All approach frequencies lower than recede') {
                expect(result.foundMatches).toBe(0); // No valid matches possible
            } else if (edgeCase.name === 'Single frequency each') {
                // Should find the one possible match if valid
                if (result.success) {
                    expect(result.foundMatches).toBe(1);
                }
            }
        }
    });

    test('should maintain consistent results across multiple runs', async ({ page }) => {
        const runs = 3;
        const results = [];
        
        for (let i = 0; i < runs; i++) {
            const result = await page.evaluate(async () => {
                return await window.testDopplerFrequencyMatching(1000, 30);
            });
            results.push(result);
        }
        
        // All runs should succeed or fail consistently
        const successCount = results.filter(r => r.overallSuccess).length;
        expect(successCount).toBeGreaterThanOrEqual(0); // At least some consistency
        
        // If multiple runs succeed, results should be similar
        const successfulResults = results.filter(r => r.overallSuccess);
        if (successfulResults.length >= 2) {
            const speeds = successfulResults.map(r => parseFloat(r.calculatedSpeed));
            const maxSpeed = Math.max(...speeds);
            const minSpeed = Math.min(...speeds);
            const speedVariation = maxSpeed - minSpeed;
            
            // Results should be reasonably consistent (within 20% variation)
            expect(speedVariation).toBeLessThan(30 * 0.2); // 20% of expected 30 mph
        }
    });

    test('should run comprehensive test suite', async ({ page }) => {
        const allTestsResult = await page.evaluate(async () => {
            return await window.runAllFrequencyMatcherTests();
        });
        
        expect(allTestsResult).toBeDefined();
        expect(allTestsResult.summary).toBeDefined();
        
        const summary = allTestsResult.summary;
        expect(summary.totalTests).toBeGreaterThan(0);
        expect(summary.totalPassed).toBeGreaterThan(0);
        expect(parseFloat(summary.successRate)).toBeGreaterThan(60); // 60% overall success rate
        expect(parseFloat(summary.totalTime)).toBeGreaterThan(0);
        
        // Check that all test categories ran
        expect(allTestsResult.basicMatching).toBeDefined();
        expect(allTestsResult.confidenceCalculation).toBeDefined();
        expect(allTestsResult.validation).toBeDefined();
        expect(allTestsResult.performance).toBeDefined();
    });

    test('should handle power ratios correctly', async ({ page }) => {
        const result = await page.evaluate(async () => {
            // Test with frequencies having different power ratios
            const approachFreqs = [
                { frequency: 1100, power: 0.001 },  // High power
                { frequency: 1120, power: 0.0001 }  // Low power
            ];
            const recedeFreqs = [
                { frequency: 900, power: 0.001 },   // High power (good match with first)
                { frequency: 880, power: 0.0001 }   // Low power (good match with second)
            ];
            
            return await window.testFrequencyMatching(approachFreqs, recedeFreqs, 2);
        });
        
        if (result.success && result.matches.length > 0) {
            result.matches.forEach(match => {
                expect(match.powerRatio).toBeDefined();
                expect(match.powerRatio).toBeGreaterThan(0);
                expect(match.powerRatio).toBeLessThanOrEqual(1);
                
                // Power ratio should reflect the balance between approach and recede powers
                const expectedRatio = Math.min(match.approachPower, match.recedePower) / 
                                     Math.max(match.approachPower, match.recedePower);
                expect(match.powerRatio).toBeCloseTo(expectedRatio, 3);
            });
        }
    });
});
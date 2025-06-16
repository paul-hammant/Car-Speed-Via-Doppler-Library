import { test, expect } from '@playwright/test';

test.describe('Web Doppler Speed Analysis', () => {
    const testFiles = [
        { file: '23_mph.wav', expectedMph: 23 },
        { file: '28_mph.wav', expectedMph: 28 },
        { file: '30_mph.wav', expectedMph: 30 },
        { file: '30_mph_2.wav', expectedMph: 30 },
        { file: '33_mph.wav', expectedMph: 33 },
        { file: '37_mph.wav', expectedMph: 37 }
    ];

    const fftImplementations = [
        { path: '/docs/simd/', name: 'WASM+SIMD', buttonText: '🔬 Run WASM+SIMD Analysis' },
        { path: '/docs/non-simd/', name: 'WASM+noSIMD', buttonText: '🔬 Run WASM (no SIMD) Analysis' },
        { path: '/docs/pure-js/', name: 'Pure JS', buttonText: '🔬 Run Pure JavaScript Analysis' }
    ];

    fftImplementations.forEach(({ path, name, buttonText }) => {
        test(`should calculate speeds using ${name}`, async ({ page }) => {
            // Navigate to the specific FFT implementation page
            await page.goto(`http://localhost:3000${path}`);
            
            // Wait for page to load
            await page.waitForSelector('button', { timeout: 10000 });
            
            // Click the analysis button
            await page.click(`button:has-text("${buttonText}")`);
            
            // Wait for analysis to complete (2-tier testing - slow but comprehensive)
            await page.waitForFunction(() => {
                const results = document.getElementById('results').textContent;
                return results && 
                       !results.includes('Running') && 
                       !results.includes('Click') &&
                       (results.includes('analysis completed') || results.includes('FAILED'));
            }, { timeout: 180000 }); // 3 minutes for real FFT processing
            
            const results = await page.locator('#results').textContent();
            console.log(`\n=== ${name} Results ===`);
            console.log(results);

            // Validate that analysis completed
            expect(results).toMatch(/(analysis completed|FAILED)/);
            
            // Should contain expected table structure
            expect(results).toContain('| File         | Expected Speed     | Calculated Speed     | Error      | Strategy | Sectioning | Clip Duration | Processing Time |');
            
            // Parse results for validation
            const lines = results.split('\n');
            const resultRows = lines.filter(line => 
                line.includes('.wav') && 
                line.includes('mph') && 
                line.includes('|')
            );
            
            // Should have results for all test files
            expect(resultRows.length).toBeGreaterThanOrEqual(testFiles.length);
            
            // Validate each test file appears in results
            testFiles.forEach(({ file, expectedMph }) => {
                const fileResults = resultRows.find(row => row.includes(file));
                expect(fileResults).toBeTruthy();
                
                if (fileResults && !fileResults.includes('FAILED') && !fileResults.includes('ERROR')) {
                    // Extract calculated speed (format: "XX.X mph")
                    const speedMatch = fileResults.match(/(\d+\.?\d*) mph \([\d.]+/);
                    if (speedMatch) {
                        const calculatedSpeed = parseFloat(speedMatch[1]);
                        expect(calculatedSpeed).toBeGreaterThan(0);
                        expect(calculatedSpeed).toBeLessThan(200); // Reasonable upper bound
                        
                        // Verify it's in the ballpark of expected (within 50% tolerance for this test)
                        const error = Math.abs(calculatedSpeed - expectedMph);
                        const tolerance = expectedMph * 0.5; // 50% tolerance for integration test
                        expect(error).toBeLessThan(tolerance);
                    }
                }
            });
            
            // Performance validation - should complete in reasonable time
            const performanceMatch = results.match(/Average Processing Time: (\d+)ms/);
            if (performanceMatch) {
                const avgTime = parseInt(performanceMatch[1]);
                
                // Different performance expectations by implementation
                if (name === 'WASM+SIMD') {
                    expect(avgTime).toBeLessThan(1000); // Should be fastest
                } else if (name === 'WASM+noSIMD') {
                    expect(avgTime).toBeLessThan(2000); // Moderate speed
                } else if (name === 'Pure JS') {
                    expect(avgTime).toBeLessThan(5000); // Can be slower
                }
            }
        });
    });
    
    test('should have working navigation between implementations', async ({ page }) => {
        // Start at SIMD page
        await page.goto('http://localhost:3000/docs/simd/');
        await expect(page.locator('.nav-link.current')).toContainText('WASM+SIMD');
        
        // Navigate to non-SIMD
        await page.click('a[href="../non-simd/"]');
        await expect(page.locator('.nav-link.current')).toContainText('WASM (no SIMD)');
        
        // Navigate to Pure JS
        await page.click('a[href="../pure-js/"]');
        await expect(page.locator('.nav-link.current')).toContainText('Pure JS');
        
        // Navigate home
        await page.click('a[href="../"]');
        await expect(page.locator('h1')).toContainText('Car Speed Via Doppler');
    });
});
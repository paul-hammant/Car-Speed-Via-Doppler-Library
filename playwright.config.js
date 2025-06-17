/**
 * Copyright Paul Hammant 2025, see GPL3 LICENSE in this repo
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './test/playwright',
    testMatch: '**/*.spec.js',
    timeout: 240000,              // Long timeout for real FFT processing (2-tier testing)
    retries: 1,
    use: {
        headless: false,
        ignoreHTTPSErrors: true,
        bypassCSP: true,
    },
    reporter: [['list'], ['html', { open: 'never' }]],
    webServer: {
        command: 'node test/playwright/simple-server.js',  // Simplified static server
        port: 3000,
        reuseExistingServer: !process.env.CI,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});

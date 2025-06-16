import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable CORS for browser requests and disable caching
app.use((req, res, next) => {
    console.log('Request:', req.method, req.url);
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    next();
});

// Serve the entire repository root
const staticPath = path.resolve(__dirname, '../..');
console.log('Serving static files from:', staticPath);

// Health check endpoint first
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Serve static files
app.use(express.static(staticPath));

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Static server serving repository root on http://localhost:${PORT}`);
});

export default app;
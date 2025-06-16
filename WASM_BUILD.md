# Build Instructions for PFFFT WASM

This project uses PFFFT WASM for high-performance FFT computation with SIMD acceleration. The built WASM files are committed to the repository in `docs/` for web deployment, but you may need to rebuild them when updating PFFFT or for development purposes.

## Prerequisites

- Node.js 22+ 
- Git
- ~1GB disk space for EMSDK

## Quick Start (Using Committed Artifacts)

The repository includes pre-built WASM files in `docs/`. For normal development, no build is required:

```bash
npm install
npm test
```

## Rebuilding PFFFT WASM (Development Only)

### 1. Setup Emscripten SDK

```bash
# Clone EMSDK (this will be ~300MB)
git clone https://github.com/emscripten-core/emsdk

# Install and activate latest version
cd emsdk
git pull
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
cd ..
```

### 2. Clone and Build PFFFT WASM

```bash
# Clone PFFFT WASM source
git clone https://github.com/echogarden-project/pffft-wasm

# Build with SIMD support
cd pffft-wasm
make SIMD=1

# Verify build artifacts exist
ls -la dist/simd/
ls -la dist/non-simd/
cd ..
```

### 3. Update Build Artifacts

```bash
# Copy new build artifacts to docs (web deployment)
cp pffft-wasm/dist/simd/pffft.js docs/simd/
cp pffft-wasm/dist/simd/pffft.wasm docs/simd/
cp pffft-wasm/dist/non-simd/pffft.js docs/non-simd/
cp pffft-wasm/dist/non-simd/pffft.wasm docs/non-simd/

# Test the new build
npm test

# Commit updated artifacts
git add docs/simd/pffft.* docs/non-simd/pffft.*
git commit -m "Update PFFFT WASM build artifacts"
```

## Build Artifacts Structure

```
docs/                        # Web deployment artifacts
├── simd/
│   ├── pffft.js      # SIMD-enabled WASM module
│   ├── pffft.wasm    # SIMD-enabled WASM binary
│   ├── fft-wrapper.js
│   └── spectrum-analyzer.js
├── non-simd/
│   ├── pffft.js      # Fallback WASM module
│   ├── pffft.wasm    # Fallback WASM binary
│   ├── fft-wrapper.js
│   └── spectrum-analyzer.js
└── shared/
    ├── *.wav         # Test audio files
    └── *.js          # Shared utilities
```

## Troubleshooting

### EMSDK Installation Issues
- Ensure you have sufficient disk space (~1GB)
- On Windows, use Git Bash or WSL
- Set environment variables: `source emsdk/emsdk_env.sh`

### Build Failures
- Verify EMSDK is activated: `emcc --version`
- Check for missing dependencies: `make --version`
- Clean and rebuild: `cd pffft-wasm && make clean && make SIMD=1`

### Runtime Issues
- The wrapper automatically falls back to basic FFT if WASM fails to load
- Check browser console for WASM loading errors
- Verify WASM files are properly served (correct MIME types)

## Performance Notes

- **SIMD Version**: Fastest, requires modern CPU with SIMD support
- **Non-SIMD Version**: Good performance, broader compatibility  
- **Basic FFT Fallback**: Slowest but works everywhere

The `PffftWrapper.js` automatically selects the best available option at runtime.

## Development Workflow

1. **Normal Development**: Use committed artifacts, no rebuild needed
2. **PFFFT Updates**: Follow rebuild instructions above
3. **Testing**: Run `npm test` to verify FFT functionality
4. **Deployment**: Commit updated artifacts for GitHub Pages

## Build Dependencies Summary

- **Runtime**: None (all artifacts committed)
- **Development Rebuild**: EMSDK (~300MB), make, git
- **CI/CD**: Not required (manual rebuild process)

This approach keeps GitHub Pages deployment simple while maintaining the ability to update WASM builds when needed.
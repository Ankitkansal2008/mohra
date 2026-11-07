import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const BUDGET_APP_SHELL_GZIP_BYTES = 400 * 1024; // 400 KB
const BUDGET_ENGINE_BROTLI_BYTES = Math.round(1.2 * 1024 * 1024); // 1.2 MB

const distDir = path.resolve('dist');

if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist. Run "npm run build" first.');
  process.exit(1);
}

function getFilesRecursively(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

const allDistFiles = getFilesRecursively(distDir);

// App shell: dist/index.html and dist/assets/* (excluding dist/engine)
const appShellFiles = allDistFiles.filter((file) => {
  const relative = path.relative(distDir, file).replace(/\\/g, '/');
  return !relative.startsWith('engine/');
});

// Engine assets: dist/engine/*
const engineFiles = allDistFiles.filter((file) => {
  const relative = path.relative(distDir, file).replace(/\\/g, '/');
  return relative.startsWith('engine/');
});

let totalAppShellRaw = 0;
let totalAppShellGzip = 0;

console.log('\n--- App Shell Bundle Size (Gzip budget: 400 KB) ---');
for (const file of appShellFiles) {
  const content = fs.readFileSync(file);
  const rawSize = content.length;
  const gzipSize = zlib.gzipSync(content).length;
  totalAppShellRaw += rawSize;
  totalAppShellGzip += gzipSize;
  const rel = path.relative(distDir, file).replace(/\\/g, '/');
  console.log(`  ${rel.padEnd(35)} Raw: ${(rawSize / 1024).toFixed(2).padStart(7)} KB | Gzip: ${(gzipSize / 1024).toFixed(2).padStart(7)} KB`);
}

let totalEngineRaw = 0;
let totalEngineBrotli = 0;

console.log('\n--- Engine Assets Size (Brotli budget: 1.2 MB) ---');
for (const file of engineFiles) {
  const content = fs.readFileSync(file);
  const rawSize = content.length;
  const brotliSize = zlib.brotliCompressSync(content, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
    },
  }).length;
  totalEngineRaw += rawSize;
  totalEngineBrotli += brotliSize;
  const rel = path.relative(distDir, file).replace(/\\/g, '/');
  console.log(`  ${rel.padEnd(35)} Raw: ${(rawSize / 1024).toFixed(2).padStart(7)} KB | Brotli: ${(brotliSize / 1024).toFixed(2).padStart(7)} KB`);
}

const appShellKb = (totalAppShellGzip / 1024).toFixed(2);
const engineKb = (totalEngineBrotli / 1024).toFixed(2);

console.log('\n--- Budget Summary ---');
console.log(`App Shell Gzip:     ${appShellKb} KB / 400.00 KB ${totalAppShellGzip <= BUDGET_APP_SHELL_GZIP_BYTES ? '✓ PASS' : '✗ FAIL'}`);
console.log(`Engine Assets Brotli: ${engineKb} KB / ${(BUDGET_ENGINE_BROTLI_BYTES / 1024).toFixed(2)} KB ${totalEngineBrotli <= BUDGET_ENGINE_BROTLI_BYTES ? '✓ PASS' : '✗ FAIL'}`);

let failed = false;

if (totalAppShellGzip > BUDGET_APP_SHELL_GZIP_BYTES) {
  console.error(`\n[BUDGET EXCEEDED] App shell gzipped size (${appShellKb} KB) exceeds 400 KB budget!`);
  failed = true;
}

if (totalEngineBrotli > BUDGET_ENGINE_BROTLI_BYTES) {
  console.error(`\n[BUDGET EXCEEDED] Engine assets brotli size (${engineKb} KB) exceeds 1.2 MB budget!`);
  failed = true;
}

if (failed) {
  process.exit(1);
} else {
  console.log('\nAll bundle performance budgets passed!');
  process.exit(0);
}

// Copies MediaPipe's WebAssembly runtime into public/ so the app does not
// need a CDN for it. Runs automatically after `npm install`.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const dest = join(root, 'public', 'mediapipe');

if (!existsSync(src)) {
    console.warn(
        '[copy-mediapipe-wasm] @mediapipe/tasks-vision not installed yet, skipping.',
    );
    process.exit(0);
}
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('[copy-mediapipe-wasm] Copied MediaPipe wasm to public/mediapipe');

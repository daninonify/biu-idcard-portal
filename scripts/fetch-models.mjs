// Downloads the Fast engine's model (MediaPipe selfie segmentation, Apache-2.0)
// into public/models, so browsers load it from the portal and never from Google.
// Run once on the server: npm run fetch-models
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'public', 'models');
const file = 'selfie_multiclass_256x256.tflite';
const url = `https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/${file}`;
const dest = join(dir, file);

mkdirSync(dir, { recursive: true });

if (existsSync(dest) && statSync(dest).size > 1_000_000) {
    console.log(`${file} already present.`);
    process.exit(0);
}

process.stdout.write(`Downloading ${file} ... `);
const res = await fetch(url);
if (!res.ok) {
    console.log(`failed (${res.status})`);
    process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
writeFileSync(dest, buf);
console.log(`${(buf.length / 1e6).toFixed(1)} MB`);

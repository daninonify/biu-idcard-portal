// Starts the rembg background-removal server for the "Offline" engine.
// Run: npm run rembg   (leave it running next to `npm run dev`)
//
// Listens on 127.0.0.1:7000 only; the Vite dev server proxies /rembg to it,
// so other PCs using the app go through Vite and never reach rembg directly.
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = process.env.REMBG_PORT || '7000';
// Keep one model in RAM: BiRefNet alone needs several GB, and with all three loaded
// rembg ran out of memory ("bad allocation"). Switching model costs a reload instead.
const MAX_SESSIONS = process.env.REMBG_MAX_SESSIONS || '1';
const args = [
    's',
    '--host',
    '127.0.0.1',
    '--port',
    PORT,
    '--no-ui',
    '--max-sessions',
    MAX_SESSIONS,
];
const launch =
    "import sys; from rembg.cli import main; sys.argv[0] = 'rembg'; main()";

// Windows: try the py launcher, then the default per-user install folders (in case
// PATH has not caught up since Python was installed), then plain `python`.
function windowsCandidates() {
    const local = process.env.LOCALAPPDATA || '';
    const progs = join(local, 'Programs', 'Python');
    const installed = existsSync(progs)
        ? readdirSync(progs)
              .filter((d) => /^Python3\d+$/.test(d))
              .sort()
              .reverse()
              .map((d) => join(progs, d, 'python.exe'))
        : [];
    return [
        ['py', ['-3.12', '-c', launch, ...args]],
        [join(progs, 'Launcher', 'py.exe'), ['-3.12', '-c', launch, ...args]],
        ...installed
            .filter(existsSync)
            .map((exe) => [exe, ['-c', launch, ...args]]),
        ['python', ['-c', launch, ...args]],
    ];
}
const candidates =
    process.platform === 'win32'
        ? windowsCandidates()
        : [
              ['python3', ['-c', launch, ...args]],
              ['python', ['-c', launch, ...args]],
          ];

// rembg opens a browser tab on startup; a BROWSER that cannot run turns that off.
const env = { ...process.env, BROWSER: 'none', PYTHONUNBUFFERED: '1' };

function tryNext(i) {
    if (i >= candidates.length) {
        console.error(
            '\nCould not start rembg. Install Python 3.12 and rembg first:',
        );
        console.error('  winget install Python.Python.3.12');
        console.error('  py -3.12 -m pip install "rembg[cpu,cli]"');
        process.exit(1);
    }
    const [cmd, a] = candidates[i];
    const child = spawn(cmd, a, { env, stdio: ['inherit', 'pipe', 'pipe'] });
    let errText = '';
    child.stdout.on('data', (d) => process.stdout.write(d));
    child.stderr.on('data', (d) => {
        errText += d;
        process.stderr.write(d);
    });
    child.on('error', () => tryNext(i + 1)); // command not found
    child.on('exit', (code) => {
        if (
            code &&
            /No module named .?rembg|No suitable Python|not found/i.test(
                errText,
            ) &&
            !/Uvicorn running/.test(errText)
        ) {
            return tryNext(i + 1);
        }
        process.exit(code ?? 0);
    });
    process.on('SIGINT', () => child.kill('SIGINT'));
    console.log(
        `Starting rembg on http://127.0.0.1:${PORT} using ${String(cmd)} ...`,
    );
}

tryNext(0);

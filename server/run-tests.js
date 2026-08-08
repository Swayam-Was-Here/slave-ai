import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { rmSync, existsSync } from 'fs';
import net from 'net';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testDbPath = join(__dirname, 'test.db');
const TEST_PORT = 3002;

// Clean up previous test database
if (existsSync(testDbPath)) {
  rmSync(testDbPath);
}

// 1. Start the server as a child process
console.log('Starting SLAVE server in test mode...');
const serverProcess = spawn('node', [join(__dirname, 'index.js')], {
  env: {
    ...process.env,
    PORT: TEST_PORT,
    DATABASE_PATH: testDbPath,
    AI_FALLBACK: 'true',
    NODE_ENV: 'test'
  },
  stdio: 'pipe'
});

// We only want to log server errors in test mode to reduce noise
serverProcess.stderr.on('data', (data) => {
  console.error(`[Server Error]: ${data}`);
});

// Wait for port to be ready
async function waitForPort(port, timeout = 5000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - start > timeout) {
          reject(new Error(`Timeout waiting for port ${port}`));
        } else {
          setTimeout(tryConnect, 100);
        }
      });
      socket.connect(port, '127.0.0.1');
    };
    tryConnect();
  });
}

async function runTestScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n========================================`);
    console.log(`Running ${scriptName}...`);
    console.log(`========================================`);
    const proc = spawn('node', [join(__dirname, scriptName)], {
      env: {
        ...process.env,
        TEST_PORT,
        DATABASE_PATH: testDbPath
      },
      stdio: 'inherit'
    });

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptName} failed with exit code ${code}`));
    });
  });
}

async function runAllTests() {
  try {
    await waitForPort(TEST_PORT);
    console.log(`Server is up on port ${TEST_PORT}. Running tests...\n`);

    await runTestScript('test-phase3.js');
    await runTestScript('test-phase4.js');
    await runTestScript('test-phase5.js');

    console.log(`\n✅ ALL TESTS PASSED!`);
    process.exitCode = 0;
  } catch (err) {
    console.error(`\n❌ TEST SUITE FAILED: ${err.message}`);
    process.exitCode = 1;
  } finally {
    console.log('\nShutting down test server...');
    serverProcess.kill('SIGTERM');
    if (existsSync(testDbPath)) {
      rmSync(testDbPath); // cleanup
    }
  }
}

runAllTests();

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { execFile, spawn } from 'child_process';
import https from 'https';
import { createWriteStream } from 'fs';

const IS_WIN = process.platform === 'win32';
const JDK_CACHE =
  process.env.JDK_CACHE_DIR ||
  path.join(os.tmpdir(), '.codemaster-jdk');
const JDK_VERSION = 17;

let javaHomePromise = null;

function execFilePromise(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { ...options, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) return reject({ error, stdout, stderr });
      resolve({ stdout, stderr });
    });
  });
}

function javaBin(name, home) {
  const bin = path.join(home, 'bin', IS_WIN ? `${name}.exe` : name);
  return bin;
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function findJdkInDir(dir) {
  if (!(await pathExists(dir))) return null;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const home = path.join(dir, entry.name);
    if (await pathExists(javaBin('javac', home))) return home;
  }
  const direct = dir;
  if (await pathExists(javaBin('javac', direct))) return direct;
  return null;
}

async function findSystemJava() {
  const envHome = process.env.JAVA_HOME;
  if (envHome && (await pathExists(javaBin('javac', envHome)))) {
    return envHome;
  }

  const commonPaths = IS_WIN
    ? [
        'C:\\Program Files\\Java',
        'C:\\Program Files\\Eclipse Adoptium',
        'C:\\Program Files\\Microsoft',
        'C:\\Program Files\\Amazon Corretto',
      ]
    : ['/usr/lib/jvm', '/Library/Java/JavaVirtualMachines'];

  for (const base of commonPaths) {
    if (!(await pathExists(base))) continue;
    const found = await findJdkInDir(base);
    if (found) return found;
  }

  try {
    await execFilePromise(IS_WIN ? 'where' : 'which', ['javac'], { timeout: 5000 });
    const javacPath = IS_WIN ? 'javac' : 'javac';
    return '__PATH__';
  } catch {
    return null;
  }
}

function getAdoptiumUrl() {
  const osName = IS_WIN ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux';
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x64';
  return `https://api.adoptium.net/v3/binary/latest/${JDK_VERSION}/ga/${osName}/${arch}/jdk/hotspot/normal/eclipse?project=jdk`;
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const follow = (targetUrl, redirects = 0) => {
      if (redirects > 8) return reject(new Error('Too many redirects downloading JDK'));
      https
        .get(targetUrl, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return follow(res.headers.location, redirects + 1);
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`JDK download failed (${res.statusCode})`));
          }
          const file = createWriteStream(dest);
          res.pipe(file);
          file.on('finish', () => file.close(() => resolve()));
          file.on('error', reject);
        })
        .on('error', reject);
    };
    follow(url);
  });
}

async function extractTarGz(archivePath, destDir) {
  await fs.mkdir(destDir, { recursive: true });
  await execFilePromise('tar', ['-xzf', archivePath, '-C', destDir], { timeout: 180000 });
}

async function downloadBundledJdk(onProgress) {
  // Ensure the configured cache directory is writable. If not, fall back to the OS temp dir.
  let cacheDir = JDK_CACHE;
  try {
    await fs.mkdir(cacheDir, { recursive: true });
  } catch (err) {
    const fallback = path.join(os.tmpdir(), '.codemaster-jdk');
    try {
      await fs.mkdir(fallback, { recursive: true });
      cacheDir = fallback;
    } catch (err2) {
      throw new Error(
        `Cannot create JDK cache directory. Set the environment variable JDK_CACHE_DIR to a writable path. Errors: ${err.message}; ${err2.message}`
      );
    }
  }

  const archivePath = path.join(cacheDir, `jdk-${JDK_VERSION}.tar.gz`);
  onProgress?.('Downloading Java JDK (one-time setup, ~180MB)…');
  try {
    await downloadFile(getAdoptiumUrl(), archivePath);
  } catch (err) {
    throw new Error(`JDK download failed: ${err.message}`);
  }

  onProgress?.('Extracting JDK…');
  const extractDir = path.join(cacheDir, 'extracted');
  await fs.rm(extractDir, { recursive: true, force: true });
  await fs.mkdir(extractDir, { recursive: true });

  try {
    await extractTarGz(archivePath, extractDir);
  } catch {
    await execFilePromise('tar', ['-xzf', archivePath, '-C', extractDir], { timeout: 180000 });
  }

  const home = await findJdkInDir(extractDir);
  if (!home) throw new Error('JDK extracted but javac was not found.');
  await fs.writeFile(path.join(cacheDir, 'java-home.txt'), home, 'utf8');
  onProgress?.('JDK ready.');
  return home;
}

async function resolveJavaHome() {
  const system = await findSystemJava();
  if (system && system !== '__PATH__') return system;
  if (system === '__PATH__') return '__PATH__';

  const marker = path.join(JDK_CACHE, 'java-home.txt');
  if (await pathExists(marker)) {
    const home = (await fs.readFile(marker, 'utf8')).trim();
    if (home && (await pathExists(javaBin('javac', home)))) return home;
  }

  return downloadBundledJdk();
}

export async function getJavaHome() {
  if (!javaHomePromise) {
    javaHomePromise = resolveJavaHome().catch((err) => {
      javaHomePromise = null;
      throw err;
    });
  }
  return javaHomePromise;
}

export async function getJavaCommands() {
  const home = await getJavaHome();
  if (home === '__PATH__') {
    return { javac: 'javac', java: 'java', javaHome: null };
  }
  return {
    javac: javaBin('javac', home),
    java: javaBin('java', home),
    javaHome: home,
  };
}

export function mergeJavaCode(driverCode, userCode) {
  const marker = '// {{USER_CODE}}';
  const driver = (driverCode || '').trim();
  const user = (userCode || '').trim();

  if (!driver && !user) return '';
  if (!driver) return user;
  if (driver.includes(marker)) {
    return driver.replace(marker, user ? `\n${user}\n` : '\n// Write your solution above\n');
  }
  if (!user) return driver;

  return `${driver}\n\n/* --- User Solution --- */\n${user}`;
}

const tempBase = path.join(os.tmpdir(), 'codemaster-next');

export async function compileAndRun({ driverCode, userCode, code, stdin, timeLimit, tests }) {
  const merged = code || mergeJavaCode(driverCode, userCode);
  if (!merged.trim()) {
    throw new Error('No Java code to compile.');
  }

  const { javac, java, javaHome } = await getJavaCommands();
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const workdir = path.join(tempBase, requestId);

  await fs.mkdir(workdir, { recursive: true });
  const javaPath = path.join(workdir, 'Solution.java');
  await fs.writeFile(javaPath, merged, 'utf8');

  const env = javaHome ? { ...process.env, JAVA_HOME: javaHome } : { ...process.env };

  try {
    await execFilePromise(javac, ['Solution.java'], { cwd: workdir, timeout: 30000, env });
  } catch (compileError) {
    const errMsg = (compileError.stderr || compileError.stdout || compileError.error?.message || 'Compilation failed').toString().trim();
    return { compileError: errMsg, merged };
  }

  const limitSec = Number(timeLimit) || 2;

  const runOnce = (input) =>
    new Promise((resolve) => {
      const child = spawn(java, ['-Xmx256m', 'Solution'], {
        cwd: workdir,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let output = '';
      let error = '';
      let killed = false;

      const timeout = setTimeout(() => {
        killed = true;
        try {
          if (IS_WIN) {
            spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], { windowsHide: true });
          } else {
            child.kill('SIGKILL');
          }
        } catch {
          /* ignore */
        }
        resolve({ output: '', error: `Time Limit Exceeded (${limitSec}s)`, timedOut: true });
      }, limitSec * 1000);

      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        error += chunk.toString();
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ output: '', error: err.message, timedOut: false });
      });

      child.on('close', (code) => {
        if (killed) return;
        clearTimeout(timeout);
        if (code !== 0 && !error.trim()) {
          error = `Process exited with code ${code}`;
        }
        resolve({ output: output.trim(), error: error.trim(), timedOut: false });
      });

      const stdinData = input ?? '';
      if (stdinData) {
        child.stdin.write(stdinData.endsWith('\n') ? stdinData : `${stdinData}\n`);
      }
      child.stdin.end();
    });

  if (Array.isArray(tests)) {
    const normalize = (text) =>
      (text || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n');

    const results = [];
    for (const test of tests) {
      const { output, error, timedOut } = await runOnce(test.input || '');
      const expected = (test.expected || '').trim();
      const actual = (output || '').trim();
      const passed = !timedOut && !error && normalize(actual) === normalize(expected);

      let message = 'Accepted';
      if (timedOut) message = `Time Limit Exceeded (${limitSec}s)`;
      else if (error) message = error;
      else if (!passed) message = 'Wrong Answer';

      results.push({
        passed,
        message,
        input: test.input || '',
        expected,
        actual,
        timedOut: !!timedOut,
        error: error || null,
      });
    }

    return { results, compileError: null, merged };
  }

  const { output, error, timedOut } = await runOnce(stdin || '');
  return { output, error, timedOut, compileError: null, merged };
}

export async function checkJavaSetup() {
  try {
    const { javac, java, javaHome } = await getJavaCommands();
    await execFilePromise(javac, ['-version'], { timeout: 10000, env: javaHome ? { ...process.env, JAVA_HOME: javaHome } : process.env });
    return { ok: true, javaHome: javaHome || 'system PATH' };
  } catch (err) {
    return { ok: false, error: err.message || 'Java not available' };
  }
}

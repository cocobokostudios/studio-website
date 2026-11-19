import { readFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';

const site = new URL(process.env.SITE_URL);
const release = await readFile('dist/release.txt', 'utf8');
const routes = ['/', '/privacy-policy/', '/code-of-conduct/', '/generative-ai-disclosure/', '/credits/'];
const deadline = Date.now() + 120_000;
let consecutivePasses = 0;

async function check(path) {
  const url = new URL(path, site);
  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  const body = await response.text();
  if (path === '/release.txt' ? body !== release : !body.includes('<main')) {
    throw new Error(`${path} did not serve the expected content`);
  }
}

while (Date.now() < deadline) {
  try {
    await Promise.all(['/release.txt', ...routes].map(check));
    consecutivePasses++;
    if (consecutivePasses === 3) {
      console.log(`Verified release ${release.trim()} at ${site.origin}`);
      break;
    }
  } catch (error) {
    consecutivePasses = 0;
    console.log(`Waiting for ${site.origin}: ${error.message}`);
  }
  await setTimeout(5_000);
}

if (consecutivePasses !== 3) throw new Error(`Release readiness timed out at ${site.origin}`);

'use strict';

const { spawn } = require('node:child_process');

const apiBase = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/+$/, '');
const usage = `Usage:
  snip add <url>    Create a short link
  snip ls           List all links
  snip open <code>  Open a short link in the browser
  snip help         Show this help`;

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0;
  } catch {
    return false;
  }
}

async function readResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function responseError(response, body) {
  if (body && typeof body.error === 'string') {
    return body.error;
  }

  return `Snip API returned ${response.status} ${response.statusText}.`;
}

async function apiRequest(path, options) {
  let response;
  try {
    response = await fetch(`${apiBase}${path}`, options);
  } catch {
    throw new Error(`Could not reach the Snip API at ${apiBase}.`);
  }

  const body = await readResponse(response);
  if (!response.ok) {
    throw new Error(responseError(response, body));
  }

  return body;
}

async function addLink(args) {
  if (args.length !== 1 || !isHttpUrl(args[0])) {
    throw new Error('Usage: snip add <http(s)://url>');
  }

  const link = await apiRequest('/api/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: args[0] }),
  });

  if (!link || typeof link.shortUrl !== 'string') {
    throw new Error('The Snip API returned an invalid link.');
  }

  console.log(link.shortUrl);
}

async function listLinks(args) {
  if (args.length !== 0) {
    throw new Error('Usage: snip ls');
  }

  const links = await apiRequest('/api/links');
  if (!Array.isArray(links)) {
    throw new Error('The Snip API returned an invalid link list.');
  }

  if (links.length === 0) {
    console.log('No links yet.');
    return;
  }

  const codeWidth = Math.max(4, ...links.map((link) => String(link.code).length));
  const hitsWidth = Math.max(4, ...links.map((link) => String(link.hits).length));
  console.log(`${'CODE'.padEnd(codeWidth)}  ${'HITS'.padStart(hitsWidth)}  URL`);
  console.log(`${'-'.repeat(codeWidth)}  ${'-'.repeat(hitsWidth)}  ---`);

  for (const link of links) {
    console.log(
      `${String(link.code).padEnd(codeWidth)}  ${String(link.hits).padStart(hitsWidth)}  ${link.url}`,
    );
  }
}

async function openLink(args) {
  if (args.length !== 1 || !/^[A-Za-z0-9]{6}$/.test(args[0])) {
    throw new Error('Usage: snip open <6-character-code>');
  }

  let response;
  try {
    response = await fetch(`${apiBase}/${encodeURIComponent(args[0])}`, { redirect: 'manual' });
  } catch {
    throw new Error(`Could not reach the Snip API at ${apiBase}.`);
  }

  const location = response.headers.get('location');
  if (response.status < 300 || response.status >= 400 || !location) {
    const body = await readResponse(response);
    throw new Error(responseError(response, body));
  }

  await openBrowser(location);
  console.log(`Opening ${location}`);
}

function openBrowser(url) {
  let command;
  let args;

  if (process.platform === 'darwin') {
    command = 'open';
    args = [url];
  } else if (process.platform === 'win32') {
    command = 'cmd.exe';
    args = ['/c', 'start', '', url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(command, args, { detached: true, stdio: 'ignore' });
    } catch (error) {
      reject(new Error(`Could not open the browser: ${error.message}`));
      return;
    }

    child.once('error', (error) => reject(new Error(`Could not open the browser: ${error.message}`)));
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(usage);
    return;
  }

  if (command === 'add') {
    await addLink(args);
  } else if (command === 'ls') {
    await listLinks(args);
  } else if (command === 'open') {
    await openLink(args);
  } else {
    throw new Error(`Unknown command "${command}".\n\n${usage}`);
  }
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});

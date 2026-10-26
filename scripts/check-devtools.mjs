// In-memory browser/fetch harness: never calls the backend.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpile(fs.readFileSync(filename, 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), filename);
const storage = new Map();
globalThis.sessionStorage = globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
let calls = 0;
const rawFetch = async input => {
  calls++;
  if (String(input).includes('fail')) throw new TypeError('offline');
  return new Response(JSON.stringify({ value: 'original', token: 'private-value' }), { status: 200, headers: { 'content-type': 'application/json' } });
};
globalThis.window = { fetch: rawFetch, location: { origin: 'http://localhost', pathname: '/' }, setTimeout, clearTimeout };
const { setupFetchInterceptor } = require('../src/components/dev/networkLogger.ts');
const { useNetworkLogger } = require('../src/components/dev/useNetworkLogger.ts');
setupFetchInterceptor(); const wrapped = window.fetch; setupFetchInterceptor(); assert.equal(window.fetch, wrapped);
const response = await window.fetch('/api/test', { method: 'POST', headers: { Authorization: 'Bearer private-value' }, body: '{"senha":"private-value","value":"request"}' });
assert.equal((await response.json()).token, 'private-value');
await new Promise(resolve => setTimeout(resolve, 30));
let log = useNetworkLogger.getState().logs[0];
assert.equal(log.status, 200); assert.equal(log.headers.authorization, '[REDACTED]');
assert.equal(log.bodyPayload.senha, '[REDACTED]'); assert.equal(log.response.token, '[REDACTED]');
await assert.rejects(window.fetch('/fail'), /offline/);
assert.equal(useNetworkLogger.getState().logs[0].status, 0);
assert.equal(calls, 2);
console.log('PASS: idempotent installation, original response intact, redaction, failure propagation, one fetch per call.');

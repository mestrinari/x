// Offline contract checks. No request is made to an API or database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const calls = [];
let metadata = { id: 9, chamadoId: '12', versao: 'AAAAAAAAAAE=', criadoEm: '', mensagemId: null };
let failUpload = false;
let detail = () => ({ imagem: metadata, arquivo: { largura: 10, altura: 20, possuiOriginal: true }, trackingSteps: [], editorItems: [], markers: [] });
const http = {
  async post(path, body) { calls.push({ method: 'post', path, body }); if(path === '/api/imagens') { metadata = {...metadata,...body}; return metadata; } return { id: 42 }; },
  async put(path, body) { calls.push({ method: 'put', path, body }); if(path.endsWith('/arquivo')) { if(failUpload) throw Error('Upload failure'); metadata = {...metadata, versao:'AAAAAAAAAAI='}; return {}; } metadata = {...metadata,...body}; return metadata; },
  async get(path, options) { calls.push({method:'get',path,options}); return path.includes('/chamado/') ? {itens:[metadata],total:1} : detail(); },
  async delete(path, body, options) { calls.push({method:'delete',path,body,options}); },
};
const moduleResult = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('src/api/ticketImages.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
new Function('require', 'module', 'exports', code)(name => {
  if (name === './http') return { http };
  if (name === './config') return { apiConfig: { baseUrl: '', credentials: 'same-origin' } };
  throw Error(`Unexpected import ${name}`);
}, moduleResult, moduleResult.exports);
global.FileReader = class {
  readAsDataURL(blob) { blob.arrayBuffer().then(buffer => { this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`; this.onload(); }); }
};
const nativeFetch = global.fetch;
global.fetch = (url, options) => { assert.match(url, /^data:/, 'Only local data URLs may be read'); return nativeFetch(url, options); };
const { imagemPayload, saveTicketImage, loadTicketImages, deleteTicketImage } = moduleResult.exports;
const step = { id: 'step', code: '1', name: 'Erro', description: 'Descrição', color: '#ff0000' };
const evidence = { id: 'local', imageDataUrl: 'data:image/png;base64,AQID', attachmentDataUrl: 'data:image/png;base64,BAUG', width: 10, height: 20, createdAt: '', trackingSteps: [step], steps: [{ ...step, markers: [{ id: 'marker', xPercent: 10, yPercent: 20 }] }], editorItems: [{ id: 'text', tool: 'text', text: 'Preservar texto', x: 1, y: 2, fontSize: 14, fontWeight: 'bold', color: '#ff0000', rotation: 0 }] };
(async () => {
  const body = await imagemPayload(evidence, { ordem: 3 });
  assert.equal(body.arquivo.imagemOriginalBytes, 'AQID');
  assert.equal(body.arquivo.imagemBytes, 'BAUG');
  assert.equal(body.ordem, 3);
  assert.equal(body.mensagemId, null);
  assert.deepEqual(body.trackingSteps[0].markers, evidence.steps[0].markers);
  assert.equal(JSON.parse(body.descricao).schema, 'qa-ticket-image-evidence/v2');
  assert.deepEqual(JSON.parse(body.descricao).editorItems, evidence.editorItems);
  const checkpoints = [];
  const saved = await saveTicketImage('12', evidence, '7', 3, image => checkpoints.push(image));
  assert.equal(saved.versao, 'AAAAAAAAAAI=');
  const create = calls.find(x => x.path === '/api/imagens');
  assert.equal(create.body.usuarioId, 7);
  assert.equal(create.body.chamadoId, '12');
  const upload = calls.find(x => x.path === '/api/imagens/9/arquivo');
  assert.equal(upload.body.imagemBase64, 'BAUG');
  assert.equal(upload.body.imagemOriginalBase64, 'AQID');
  assert(calls.some(x => x.path === '/api/imagens/9/etapas-visuais/42/marcadores'));
  assert.equal(checkpoints[0].pending, true);
  assert.equal(checkpoints.at(-1).pending, false);
  assert.equal(checkpoints.at(-1).versaoImagem, 'AAAAAAAAAAI=');
  const loaded = await loadTicketImages('12');
  assert.match(loaded[0].imageDataUrl, /^\/api\/imagens\/9\/arquivo\/download\?original=true/);
  assert.deepEqual(loaded[0].editorItems, evidence.editorItems);
  await deleteTicketImage(checkpoints.at(-1));
  assert.equal(calls.at(-1).options.query.versao, 'AAAAAAAAAAI=');
  failUpload = true;
  const partial = [];
  await assert.rejects(() => saveTicketImage('12', evidence, '7', 0, image => partial.push(image)), /Upload failure/);
  assert.equal(partial.at(-1).imagemId, 9);
  assert.equal(partial.at(-1).pending, true);
  const creations = calls.filter(x => x.path === '/api/imagens').length;
  failUpload = false;
  await saveTicketImage('12', partial.at(-1), '7');
  assert.equal(calls.filter(x => x.path === '/api/imagens').length, creations, 'Retry must update the checkpointed image');
  await assert.rejects(() => imagemPayload({ ...evidence, imagemId: 9 }), /versão inválida/);
  await assert.rejects(() => imagemPayload({ ...evidence, imageDataUrl: 'data:text/plain;base64,AQID' }), /Formato/);
  await assert.rejects(() => imagemPayload({ ...evidence, imageDataUrl: 'data:image/png;base64,' }), /20 MiB/);
  console.log('Image contract checks passed (offline).');
})().catch(error => { console.error(error); process.exitCode = 1; });


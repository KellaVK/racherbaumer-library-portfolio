import fs from 'node:fs';
import path from 'node:path';
import { validateCapture, matchCapture, captureHash, extractRules, validateFacts, buildPrompt, validateBudget, reserveCost, VERSION } from './extraction.js';
const args = process.argv.slice(2);
const directory = args[0];
if (!directory || directory.startsWith('--')) throw new Error('Usage: node scripts/research/runExtraction.js CAPTURE_DIR [--ai-config CONFIG.json]');
const read = file => JSON.parse(fs.readFileSync(file,'utf8'));
const catalog = new Map(read('tests/fixtures/catalog-snapshot.json').map(d=>[d.id,d]));
const aiPosition = args.indexOf('--ai-config');
const config = aiPosition >= 0 ? validateBudget(read(args[aiPosition+1])) : null;
const output = '.cache/catalog-research';
fs.mkdirSync(output,{recursive:true});
// Serial runs prevent two processes from spending the same run budget concurrently.
const lock = path.join(output,'run.lock');
const handle = fs.openSync(lock,'wx');
const ledger = { startedAt:new Date().toISOString(), calls:0, reservedUsd:0, model:config?.model || null, results:[] };
const ledgerPath = path.join(output,`run-${Date.now()}.json`);
let client;
try {
  if (config) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY required for optional AI; no call made');
    const {default:Anthropic} = await import('@anthropic-ai/sdk');
    client = new Anthropic({maxRetries:0,timeout:60000});
  }
  for (const file of fs.readdirSync(directory).filter(f=>f.endsWith('.json')).sort()) {
    const capture=validateCapture(read(path.join(directory,file)));
    const dvd=catalog.get(capture.dvdId);
    if (!dvd) throw new Error(`Unknown DVD ID in ${file}`);
    const identity=matchCapture(dvd,capture);
    const key=captureHash(capture,config?.model);
    const resultPath=path.join(output,`${key}.json`);
    if (fs.existsSync(resultPath)) {ledger.results.push({file,status:'cached',resultPath});continue;}
    const parsed=extractRules(capture);
    let facts=parsed.facts, method='rules';
    if (config && parsed.needsAI && identity.status==='identity_candidate') {
      const prompt=buildPrompt(capture), reservation=reserveCost(prompt,config);
      if (ledger.calls>=config.maxCalls || ledger.reservedUsd+reservation>config.maxUsd) {ledger.results.push({file,status:'budget_deferred'});continue;}
      ledger.calls++;ledger.reservedUsd+=reservation;
      fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2));
      const response=await client.messages.create({model:config.model,max_tokens:config.maxOutputTokens,temperature:0,messages:[{role:'user',content:prompt}]});
      if (response.stop_reason!=='end_turn') throw new Error('Incomplete extraction; reserved spend retained, no automatic retry');
      facts=JSON.parse(response.content.filter(b=>b.type==='text').map(b=>b.text).join('')).facts;
      method='ai';
    }
    const checked=validateFacts({facts},capture.text);
    const result={version:VERSION,dvdId:dvd.id,title:dvd.title,url:capture.url,captureHash:key,identity,method,status:'needs_human_review',facts:checked};
    fs.writeFileSync(resultPath,JSON.stringify(result,null,2)+'\n');
    ledger.results.push({file,status:checked.length?'extracted_needs_review':'no_structured_facts',resultPath});
  }
} finally {
  fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+'\n');
  fs.closeSync(handle);fs.unlinkSync(lock);
}
console.log(JSON.stringify({calls:ledger.calls,reservedUsd:ledger.reservedUsd,results:ledger.results},null,2));

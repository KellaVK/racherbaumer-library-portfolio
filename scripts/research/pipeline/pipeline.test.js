// @vitest-environment node
import {test,expect} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runPipeline} from './run.js';
import {createHttp} from './http.js';
import {atomicJson,readJson} from './storage.js';
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'catalog-pipeline-'));
const catalog=[{id:'one',title:'Example',magician:['Test Author']},{id:'two',title:'Second',magician:['Other Author']}];
const index={complete:true,records:[],errors:[]};
test('default uses saved catalog without requesting live Firestore',async()=>{
 const root=temporary();atomicJson(path.join(root,'tests/fixtures/catalog-snapshot.json'),catalog);
 const state=await runPipeline({root,index,http:{metrics:{}},publish:false,log:()=>{}});
 expect(state.completed).toBe(2);expect(state.catalogSource).toBe('saved_snapshot');
 fs.rmSync(root,{recursive:true});
});
test('partial run preserves published overlay and resumes all remaining DVDs',async()=>{
 const root=temporary(),publish=path.join(root,'src/data/machine-enrichment.json');atomicJson(publish,{existing:{title:'Preserve me'}});
 const first=await runPipeline({root,catalog,index,http:{metrics:{}},limit:1,log:()=>{}});
 expect(first.status).toBe('partial');expect(readJson(publish)).toHaveProperty('existing');
 const second=await runPipeline({root,catalog,index,http:{metrics:{}},log:()=>{}});
 expect(second.status).toBe('completed');expect(second.completed).toBe(2);
 const third=await runPipeline({root,catalog,index,http:{metrics:{}},log:()=>{}});
 expect(third.completed).toBe(2);
 fs.rmSync(root,{recursive:true});
});
test('retailer redirects cannot bypass robots exclusions',async()=>{
 const directory=temporary();const visited=[];
 const http=createHttp({directory,delayMs:0,transport:async url=>{
 visited.push(url);return url.endsWith('robots.txt')?{status:200,body:'User-agent: *\nDisallow: /search/'}:url.endsWith('/product')?{status:302,location:'/search/private',body:''}:{status:200,body:'should not fetch'};
 }});
 const result=await http.get('https://www.vanishingincmagic.com/product');
 expect(result.outcome).toBe('robots_disallowed');expect(visited.some(u=>u.includes('/search/'))).toBe(false);
 fs.rmSync(directory,{recursive:true});
});

test('sitemap discovery follows product maps once and matches catalog titles',async()=>{
 const {retailerDiscovery}=await import('./discovery.js');const visited=[];
 const http={get:async url=>{visited.push(url);return {url,status:200,outcome:'ok',body:url.endsWith('robots.txt')?'User-agent: *':url.endsWith('sitemap-index.xml')?'<sitemapindex><sitemap><loc>https://www.vanishingincmagic.com/products.xml</loc></sitemap></sitemapindex>':'<urlset><url><loc>https://www.vanishingincmagic.com/magic-dvds/example/</loc></url></urlset>'};}};
 const result=await retailerDiscovery(http,catalog);
 expect(result.rows.find(r=>r.id==='one').candidates[0].url).toContain('/magic-dvds/example/');
 expect(new Set(visited).size).toBe(visited.length);
});

test('cache prevents repeated downloads and access errors block later requests to that host',async()=>{
 const directory=temporary();let count=0;
 const transport=async url=>{count++;return {status:url.endsWith('/denied')?403:200,body:'User-agent: *'};};
 const http=createHttp({directory,delayMs:0,permission:true,transport});
 await http.get('https://www.conjuringarchive.com/allowed');await http.get('https://www.conjuringarchive.com/allowed');
 expect(count).toBe(1);
 await http.get('https://www.conjuringarchive.com/denied');
 expect((await http.get('https://www.conjuringarchive.com/another')).outcome).toBe('host_blocked');expect(count).toBe(2);
 const offline=createHttp({directory,offline:true,permission:true});
 expect((await offline.get('https://www.conjuringarchive.com/allowed')).outcome).toBe('ok');
 expect((await offline.get('https://www.conjuringarchive.com/missing')).outcome).toBe('offline_cache_miss');
 fs.rmSync(directory,{recursive:true});
});

test('a redirected archive publication cannot inherit the original title match',async()=>{
 const {processDVD}=await import('./run.js');
 const dvd={id:'one',title:'Example',magician:['Alice Example']};
 const index={complete:true,records:[{title:'Example',creators:['Alice Example'],format:'Video',url:'https://www.conjuringarchive.com/list/publication/1'}]};
 const http={get:async()=>({outcome:'ok',url:'https://www.conjuringarchive.com/list/publication/2',body:'<h1>Different DVD</h1><table id="entries"><tbody><tr class="content"><td class="title"><span class="show">Wrong Trick</span></td></tr></tbody></table>'})};
 const result=await processDVD(dvd,{http,index,inventory:[],reviewed:{}});
 expect(result.status).not.toBe('matched');expect(result.sources[0].status).toBe('identity_mismatch');
});

test('CLI rejects accidental unlimited runs and recognizes help without running',async()=>{
 const {parseArguments}=await import('./run.js');
 expect(parseArguments(['--help']).help).toBe(true);
 for(const args of [['--limit','0'],['--limit','oops'],['--limt','3'],['--limit']])expect(()=>parseArguments(args)).toThrow();
 expect(parseArguments(['--offline','--no-publish'])).toMatchObject({offline:true,publish:false});
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filtered,restore,shareHash,safeUrl} from '../src/core.js';
const {camps}=JSON.parse(readFileSync(new URL('../public/camps.json',import.meta.url)));
test('346 unique entries and original status counts',()=>{
 assert.equal(camps.length,346);assert.equal(new Set(camps.map(x=>x.id)).size,346);
 assert.deepEqual(Object.fromEntries(['A','B','C','X','S'].map(s=>[s,camps.filter(x=>x.status===s).length])),{A:102,B:28,C:196,X:7,S:13});
 assert.equal(camps.filter(x=>x.visited).length,4);
});
test('filters intersect and retain unknowns',()=>{
 assert.equal(filtered(camps,{}).length,102);
 assert.equal(filtered(camps,{visit:'yes'}).length,4);
 assert.equal(filtered(camps,{q:'ヒマラヤ'}).length,1);
 assert.equal(filtered(camps,{q:'ＨＩＭＡＬＡＹＡ'}).length,0);
 assert.equal(filtered(camps,{status:''}).length,346);
 assert.ok(filtered(camps,{type:'フリー'}).every(x=>x.types.includes('フリー')));
 assert.ok(filtered(camps,{status:'',type:'未確認'}).length>0);
 assert.equal(filtered(camps,{q:'不存在の施設XYZ'}).length,0);
});
test('share restores across phones and ignores invalid/duplicate IDs',()=>{
 assert.deepEqual(restore(shareHash(['C001','C107','C324']),camps),['C001','C107','C324']);
 assert.deepEqual(restore('#compare=BAD,C001,C001,%3Cscript%3E,C107,C324,C336',camps),['C001','C107','C324']);
 assert.deepEqual(restore('#compare=%E0%A4%A',camps),[]);
});
test('links cannot execute scripts',()=>{assert.equal(safeUrl('javascript:alert(1)'),'');assert.equal(safeUrl('data:text/html,test'),'');assert.ok(safeUrl('https://www.nap-camp.com/aichi/14972'));});
test('map pins require verified source coordinates',()=>{for(const x of camps){assert.ok(x.address);if(x.location.status==='verified'){assert.ok(x.location.lat>33&&x.location.lat<37);assert.ok(x.location.lng>134&&x.location.lng<139);assert.ok(safeUrl(x.location.source));}else{assert.equal(x.location.lat,undefined);assert.equal(x.location.lng,undefined);}}});

test('discovery respects filters and only includes suitable candidates',async()=>{
 const {discover,discoveryCandidates}=await import('../src/core.js');
 assert.equal(discoveryCandidates(camps,{status:''}).length,130);
 for(const status of ['C','X','S'])assert.equal(discover(camps,{status}),undefined);
 assert.equal(discover(camps,{q:'不存在の施設XYZ'}),undefined);
 assert.equal(discover(camps,{q:'ヒマラヤ'}).id,'C107');
 const options=discoveryCandidates(camps,{status:'',region:camps[0].region});
 assert.ok(options.every(x=>['A','B'].includes(x.status)&&x.region===camps[0].region));
 assert.equal(discover(camps,{status:''},()=>0).id,discoveryCandidates(camps,{status:''})[0].id);
 assert.equal(discover(camps,{status:''},()=>.999999).id,discoveryCandidates(camps,{status:''}).at(-1).id);
});

test('each facility has a concise introduction with a source',()=>{
 const intros=JSON.parse(readFileSync(new URL('../public/intros.json',import.meta.url)));
 assert.deepEqual(Object.keys(intros).sort(),camps.map(x=>x.id).sort());
 for(const x of camps){const v=intros[x.id];assert.ok(v.text.length>=15&&v.text.length<=120,x.id);assert.ok(safeUrl(v.source),x.id);assert.match(v.checked,/^\d{4}-\d{2}-\d{2}$/);}
});

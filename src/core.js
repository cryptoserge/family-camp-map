export const statuses = {A:'候補', B:'条件付き', C:'情報不足', X:'対象外', S:'休廃業など'};
export function restore(hash, data) {
 const ids = new Set(data.map(x=>x.id));
 const p = new URLSearchParams(hash.replace(/^#/,''));
 return [...new Set((p.get('compare')||'').split(','))].filter(id=>ids.has(id)).slice(0,3);
}
export function filtered(data,{q='',region='',visit='',type='',status='A'}) {
 const text=q.normalize('NFKC').toLowerCase().trim();
 return data.filter(x=>(!status||x.status===status)&&(!region||x.region===region)&&(!visit||(visit==='yes' ? x.visited : !x.visited))&&(!type||x.types.includes(type))&&(!text||`${x.name} ${x.address}`.normalize('NFKC').toLowerCase().includes(text)));
}
export function safeUrl(value) {try { const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}}
export function shareHash(ids) {return '#'+new URLSearchParams({compare:ids.slice(0,3).join(',')});}

export function discoveryCandidates(data,filters) {return filtered(data,filters).filter(x=>x.status==='A'||x.status==='B');}
export function discover(data,filters,random=Math.random) {const rows=discoveryCandidates(data,filters);return rows.length?rows[Math.floor(random()*rows.length)]:undefined;}

import {statuses,restore,filtered,safeUrl,shareHash,discoveryCandidates,discover} from './core.js';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data=[],selected=[],active='',map,group,markers=new Map(),tileErrors=0,toastTimer;
const filters={status:'A',q:'',region:'',visit:'',type:''};
function toast(s){$('toast').textContent=s;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',3200);}
function href(url,label){const u=safeUrl(url);return u?`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:'';}
function tags(x){return `<span class="tag ${x.status}">${statuses[x.status]}</span>${x.visited?'<span class="visited"><span aria-hidden="true">VISITED</span>訪問済み</span>':''}${x.location.status!=='verified'?'<span class="tag">位置未確認</span>':''}`;}
function compareLabel(id){return selected.includes(id)?'✓ 行き先候補から外す':'＋ 行き先候補に追加';}
function makeMap(){
 try{
  if(!window.L)throw Error('map unavailable');
  map=L.map('map',{zoomControl:true}).setView([35.25,136.85],8);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).on('tileerror',()=>{if(++tileErrors>=3)$('map-error').hidden=false;}).on('tileload',()=>{$('map-error').hidden=true;tileErrors=0;}).addTo(map);
  L.control.scale({imperial:false,position:'bottomleft'}).addTo(map);
  group=typeof L.markerClusterGroup==='function'?L.markerClusterGroup({maxClusterRadius:45,showCoverageOnHover:false,iconCreateFunction:c=>L.divIcon({html:String(c.getChildCount()),className:'camp-cluster',iconSize:[40,40]})}):L.layerGroup();group.addTo(map);
 }catch(e){$('map-error').hidden=false;setView('list');}
}
function setView(view){document.querySelector('.workspace').dataset.view=view;for(const v of ['map','list'])$('view-'+v).setAttribute('aria-pressed',String(v===view));if(view==='map')setTimeout(()=>map?.invalidateSize(),0);}
function fit(){if(!map)return;const points=[...markers.values()].map(m=>m.getLatLng());if(points.length)map.fitBounds(L.latLngBounds(points),{padding:[35,45],maxZoom:13});}
function draw(){
 const rows=filtered(data,filters);
 $('result-count').textContent=`${filters.status?statuses[filters.status]:'すべて'} ${rows.length}件`;
 const located=rows.filter(x=>x.location.status==='verified').length;
 $('location-count').textContent=`地図 ${located}件 · 位置未確認 ${rows.length-located}件`;
 $('list').innerHTML=rows.length?rows.map((x,i)=>`<article class="camp-row ${active===x.id?'selected':''}" id="row-${x.id}"><div class="row-top"><span class="row-number">${i+1}</span><div><button class="row-title" data-detail="${x.id}">${esc(x.name)} <span aria-hidden="true">›</span></button><p class="address">${esc(x.address)}</p></div></div><p class="row-site">${esc(x.site||'利用区画を確認中')}</p><div class="row-facts"><span>広さ：${esc(x.size||'未確認')}</span><span>定員：${esc(x.capacity||'未確認')}</span></div><div class="row-bottom"><div class="tags">${tags(x)}</div><button data-add="${x.id}" aria-label="${esc(x.name)}を${selected.includes(x.id)?'行き先候補から外す':'行き先候補に追加'}">${compareLabel(x.id)}</button></div></article>`).join(''):'<p class="empty">条件に合う施設がありません。<br>地域や判定を変更して探してみてください。</p>';
 if(group){group.clearLayers();markers=new Map();rows.forEach((x,i)=>{if(x.location.status!=='verified')return;const m=L.marker([x.location.lat,x.location.lng],{title:x.name,icon:L.divIcon({className:`marker-pin ${x.status} ${active===x.id?'active':''}`,html:`${i+1}${x.visited?'<small>✓</small>':''}`,iconSize:[28,28]})}).on('add',()=>m.getElement()?.setAttribute('aria-label',x.name)).on('click',()=>openDetail(x.id));group.addLayer(m);markers.set(x.id,m);});}
 document.querySelectorAll('[data-status]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.status===filters.status)));
 $('compare-count').textContent=`${selected.length} / 3`;
 $('share').disabled=!selected.length;
 const eligible=discoveryCandidates(data,filters).length;
 $('discover').disabled=!eligible;
 $('discover-label').innerHTML=eligible?'今日はここを<br class="desktop-break">見てみる':'候補・条件付きが<br class="desktop-break">ありません';
 $('discover-note').textContent=eligible?'検索条件に合う候補・条件付きから1件を選びます':'この条件には候補・条件付きの施設がありません';
 $('discover').title=$('discover-note').textContent;
 $('tray-count').textContent=`${selected.length} / 3`;
 $('tray-open').disabled=!selected.length;
 $('tray-hint').hidden=!!selected.length;
 $('tray-camps').innerHTML=selected.map(id=>{const x=data.find(x=>x.id===id);return `<button data-detail="${id}" title="${esc(x.name)}">${esc(x.name)}</button>`;}).join('');
}
function openDetail(id){
 const x=data.find(x=>x.id===id);if(!x)return;active=id;draw();
 $('row-'+id)?.scrollIntoView({block:'nearest'});
 if(map&&x.location.status==='verified'){map.setView([x.location.lat,x.location.lng],Math.max(map.getZoom(),11));}
 const geo=x.location.status==='verified';
 const dest=encodeURIComponent(`${x.name} ${x.address}`);
 $('detail-body').innerHTML=`<div class="tags">${tags(x)}</div><h2 id="detail-title">${esc(x.name)}</h2><p class="address">${esc(x.address)}</p><p class="prose">${esc(x.addressNote)}</p><div class="detail-facts"><div><small>使う区画・エリア</small>${esc(x.site||'未確認')}</div><div><small>広さ / 定員</small>${esc(x.size||'未確認')}<br>${esc(x.capacity||'未確認')}</div><div><small>家族5人</small>${esc(x.family)}</div><div><small>ランドロック</small>${esc(x.landlock)}</div></div><h3>候補の判断根拠</h3><p class="prose">${esc(x.reason)}</p><h3>利用前に確認すること</h3><p class="prose">${esc(x.note||'最新の利用条件を施設でご確認ください。')}</p><div class="detail-links">${href(x.official,'公式サイト')}${href(x.booking,'なっぷ')}${href('https://www.google.com/maps/dir/?api=1&destination='+dest,'経路案内')}</div><button class="primary detail-action" data-add="${x.id}">${compareLabel(x.id)}</button><details class="sources"><summary>情報の確認日・出典</summary><p>条件の資料確認日：${esc(x.checked)}<br>再判定：${esc(x.reassessed)}<br>位置：${geo?'施設掲載位置を確認':'未確認'} ${esc(x.location.checked)}<br>${esc(x.location.note)}</p>${x.sources.map((s,i)=>href(s,'判定の出典 '+(i+1))).join('')}${href(x.addressSource,'住所の出典')}${href(x.location.source,'位置の出典')}</details>`;
 if(!$('detail').open)$('detail').showModal();
}
function syncHash(){history.replaceState(null,'',selected.length?shareHash(selected):location.pathname+location.search);}
function add(id){
 if(!data.some(x=>x.id===id))return;
 if(selected.includes(id))selected=selected.filter(x=>x!==id);else{if(selected.length===3){toast('比較は3件までです。1件外してから追加してください。');return;}selected.push(id);}
 syncHash();draw();if($('comparison').open)drawComparison();
 if($('detail').open){const b=$('detail-body').querySelector('[data-add]');if(b)b.textContent=compareLabel(b.dataset.add);}
}
function drawComparison(){
 const camps=selected.map(id=>data.find(x=>x.id===id));
 const fields=[['判定',x=>statuses[x.status]+(x.visited?' / 訪問済み':'')],['住所',x=>x.address],['使う区画',x=>x.site],['広さ',x=>x.size],['人数条件',x=>x.capacity+' / '+x.family],['ランドロック',x=>x.landlock],['判断根拠',x=>x.reason],['注意事項',x=>x.note],['確認日',x=>x.checked]];
 $('comparison-body').innerHTML=camps.length?`<table><thead><tr><th scope="col">比較項目</th>${camps.map(x=>`<th scope="col">${esc(x.name)}<button data-add="${x.id}">${esc(x.name)}を外す</button></th>`).join('')}</tr></thead><tbody>${fields.map(([label,fn])=>`<tr><th scope="row">${label}</th>${camps.map(x=>`<td>${esc(fn(x)||'未確認')}</td>`).join('')}</tr>`).join('')}<tr><th scope="row">施設リンク</th>${camps.map(x=>`<td>${href(x.official,'公式サイト')}<br>${href(x.booking,'なっぷ')}</td>`).join('')}</tr></tbody></table>`:'<p class="empty">一覧や施設詳細から、比較したいキャンプ場を追加してください。</p>';
 $('share').disabled=!selected.length;$('copy-fallback').hidden=true;
}
function openComparison(){drawComparison();if(!$('comparison').open)$('comparison').showModal();}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.detail)openDetail(b.dataset.detail);if(b.dataset.add)add(b.dataset.add);if(b.dataset.close)$(b.dataset.close).close();if(b.hasAttribute('data-status')){filters.status=b.dataset.status;draw();fit();}});
for(const id of ['region','visit','type'])$(id).addEventListener('change',e=>{filters[id]=e.target.value;draw();fit();});
$('search').addEventListener('input',e=>{filters.q=e.target.value;draw();fit();});
$('reset').onclick=()=>{Object.assign(filters,{status:'A',q:'',region:'',visit:'',type:''});for(const id of ['region','visit','type','search'])$(id).value='';draw();fit();};
$('fit-map').onclick=fit;$('view-map').onclick=()=>setView('map');$('view-list').onclick=()=>setView('list');$('compare-open').onclick=openComparison;$('tray-open').onclick=openComparison;
$('discover').onclick=()=>{const x=discover(data,filters);if(x)openDetail(x.id);};
$('share').onclick=async()=>{const url=new URL(location.href);url.hash=shareHash(selected);try{await navigator.clipboard.writeText(url.href);toast('共有URLをコピーしました');}catch{$('copy-fallback').hidden=false;$('share-url').value=url.href;$('share-url').select();}};
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
window.addEventListener('hashchange',()=>{selected=restore(location.hash,data);draw();if(selected.length)openComparison();else $('comparison').close();});
try{
 const res=await fetch('./camps.json');if(!res.ok)throw Error('data');const payload=await res.json();data=payload.camps;
 $('region').insertAdjacentHTML('beforeend',[...new Set(data.map(x=>x.region))].map(r=>`<option>${esc(r)}</option>`).join(''));
 $('statuses').innerHTML=Object.entries(statuses).map(([key,label])=>`<button data-status="${key}" aria-pressed="${key==='A'}">${label}<span>${data.filter(x=>x.status===key).length}</span></button>`).join('')+'<button data-status="" aria-pressed="false">すべて<span>346</span></button>';
 $('updated').textContent='データ更新 '+payload.updated;
 selected=restore(location.hash,data);makeMap();draw();fit();if(selected.length)openComparison();
}catch(e){$('result-count').textContent='データを読み込めませんでした';$('list').innerHTML='<p class="empty">通信状況を確認し、ページを再読み込みしてください。</p>';}

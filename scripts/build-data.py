"""Read the original CSV; publish only campsite fields and the visited boolean."""
import csv,json,re,sys,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
source=pathlib.Path(sys.argv[1]); coords=json.loads(pathlib.Path(sys.argv[2]).read_text())
rows=list(csv.DictReader(source.open(encoding='utf-8-sig')))
fields={'id':'ID','name':'施設名','region':'地域','address':'住所','site':'選ぶ区画・プラン','size':'公表サイズ','capacity':'定員','family':'ファミリー5人','landlock':'ランドロック','reason':'判定根拠','note':'残る確認事項','checked':'条件の資料確認日','reassessed':'再判定日','addressNote':'住所注記'}
overrides={'C211':['区画'],'C186':['区画'],'C159':['区画'],'C336':['区画']}
out=[]
for row in rows:
 x={a:row[b] for a,b in fields.items()}; c=coords.get(x['id'],{})
 x['status']=row['一次判定'][0]; x['visited']='該当なし' not in row['訪問履歴'] and '訪問' in row['訪問履歴']
 site=x['site']; types=[]
 if re.search('フリー|区画分けなし',site+' '+x['size']):types.append('フリー')
 if re.search('区画|[0-9０-９]+番|[A-ZＡ-Ｚ][0-9０-９]+|⑥|⑦',site) or (not types and re.search(r'\d+\s*[×x㎡]|\d+平米',x['size'])):types.append('区画')
 x['address']=re.sub(r'\s*地図を見る$','',x['address'])
 x['types']=overrides.get(x['id'],types or ['未確認'])
 x['official']=row['公式URL'] or c.get('official','');x['booking']=row['なっぷURL']
 x['sources']=re.findall(r'https?://[^\s、]+',row['判定出典'])
 x['addressSource']=row['住所出典']
 x['location']={'status':c.get('status','unverified'),'source':c.get('source',''),'checked':c.get('checked',''),'note':c.get('reason','位置を確認中') if c.get('status')=='verified' else '施設名・所在地と掲載座標の照合が未完了。施設案内をご確認ください。'}
 if c.get('status')=='verified': x['location'].update(lat=c['lat'],lng=c['lng'])
 out.append(x)
assert len(out)==346 and len({x['id'] for x in out})==346
assert sum(x['visited'] for x in out)==4
(root/'public/camps.json').write_text(json.dumps({'updated':'2026-09-09','camps':out},ensure_ascii=False,indent=2))
print('346施設 / 訪問済み4 / 位置確認済み',sum(x['location']['status']=='verified' for x in out))

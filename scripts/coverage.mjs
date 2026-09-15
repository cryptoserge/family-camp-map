export function checkCoverage(camps, entries, originalIds) {
 const ids = new Set(camps.map(x => x.id));
 if (ids.size !== camps.length) throw new Error('施設IDが重複しています');
 for (const id of originalIds) if (!ids.has(id)) throw new Error(`既存施設が消えています: ${id}`);
 const urls = new Set();
 for (const entry of entries) {
  if (urls.has(entry.url)) throw new Error(`収集URLが重複しています: ${entry.url}`);
  urls.add(entry.url);
  if (!ids.has(entry.campId) || !entry.reason || !['existing','alias','added'].includes(entry.disposition)) throw new Error(`収集施設が一覧に未反映です: ${entry.name}`);
 }
}

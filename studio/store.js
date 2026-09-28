// ============================================================================
// Store: the changes made in the studio.
// Always kept on this device (IndexedDB). In the published studio page they are
// also kept in the page's shared database (collection "changes"), where an agent
// such as Claude can read them back; uploaded images go to the page's assets.
// A change is a plain object: {id, kind, ...}. Kinds:
//   key      a pose keyframe for one actor on one frame
//   timing   a named moment moved in time
//   sound    one sound's edits (level, pan, shift, mute, spectrum, replacement)
//   newsound an uploaded sound placed on the timeline
//   note     text on a target (film, shot, moment, actor, action, sound)
//   draw     strokes drawn over one frame
//   ref      an uploaded image or sound attached to a target
// ============================================================================
const Store = (() => {
  const map = new Map();
  const subs = new Set();
  const undoS = [], redoS = [];
  let idb = null, db = null, assets = null, downloads = null, shared = false;
  const docOf = id => id.replace(/[^A-Za-z0-9_\-.~:@+]/g, '~').slice(0, 190);
  const clone = o => o == null ? o : JSON.parse(JSON.stringify(o));
  const emit = () => subs.forEach(f => { try { f(); } catch (e) { console.error(e); } });

  // ---- this device ----
  function openIDB() {
    return new Promise(res => {
      try {
        const r = indexedDB.open('umbrella-walk-studio', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
      } catch (e) { res(null); }
    });
  }
  function idbGet(k) { return new Promise(res => { try { const q = idb.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); } catch (e) { res(null); } }); }
  let idbT = null;
  function saveLocal() {
    clearTimeout(idbT);
    idbT = setTimeout(() => { try { if (idb) idb.transaction('kv', 'readwrite').objectStore('kv').put([...map.values()], 'changes'); } catch (e) { } }, 250);
  }

  // ---- the published page's database ----
  const pend = new Map(); let dbT = null, dbBusy = false;
  function queueShared(id) {
    if (!db) return;
    pend.set(id, true);
    clearTimeout(dbT); dbT = setTimeout(flushShared, 600);
    setSync('saving');
  }
  async function flushShared() {
    if (dbBusy) { dbT = setTimeout(flushShared, 400); return; }
    dbBusy = true;
    const ids = [...pend.keys()]; pend.clear();
    for (const id of ids) {
      const c = map.get(id), ref = db.collection('changes').doc(docOf(id));
      try {
        if (!c) await ref.delete();
        else {
          const body = clone(c);
          if (body.blob && body.blob.data && body.blob.data.length > 190000) {   // big uploads go in pieces
            const parts = Math.ceil(body.blob.data.length / 190000);
            for (let i = 0; i < parts; i++) await db.collection('blobs').doc(docOf(id) + '~' + i).set({ part: body.blob.data.slice(i * 190000, (i + 1) * 190000) });
            body.blob = Object.assign({}, body.blob, { data: null, parts });
          }
          await ref.set(body);
        }
      } catch (e) { toast('Could not save to the shared copy: ' + (e.code || e.message)); }
    }
    dbBusy = false;
    setSync(shared ? 'shared' : 'local');
  }
  async function blobData(c) {
    if (!c || !c.blob) return null;
    if (c.blob.data) return c.blob.data;
    if (c.blob.asset) { try { const b = await (await fetch('/_blob/' + c.blob.asset)).blob(); return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); } catch (e) { return null; } }
    if (c.blob.parts && db) {
      let s = '';
      for (let i = 0; i < c.blob.parts; i++) { const d = await db.collection('blobs').doc(docOf(c.id) + '~' + i).get(); if (!d.exists) return null; s += d.data().part; }
      c.blob.data = s; return s;
    }
    return null;
  }
  function blobUrl(c) { return !c || !c.blob ? null : c.blob.data || (c.blob.asset ? '/_blob/' + c.blob.asset : null); }

  function setSync(state) {
    const el = document.getElementById('sync'); if (!el) return;
    el.className = 'sync ' + state;
    el.querySelector('span').textContent = state === 'local' ? 'on this device' : state === 'saving' ? 'saving…' : 'saved to the shared studio';
    el.title = state === 'local' ? 'Your changes are kept in this browser. Use Brief to hand them on.' : 'Your changes are kept with this studio page, where Claude can read them.';
  }

  async function init() {
    idb = await openIDB();
    if (idb) { const all = await idbGet('changes'); if (Array.isArray(all)) all.forEach(c => c && c.id && map.set(c.id, c)); }
    emit();
    if (window.claude && window.claude.use) {
      window.claude.use('downloads').then(d => { downloads = d; }).catch(() => { });
      window.claude.use('assets').then(a => { assets = a; }).catch(() => { });
      const d = await window.claude.use('db').catch(() => null);
      if (d) {
        db = d; shared = true; setSync('shared');
        let first = true;
        db.collection('changes').onSnapshot(snap => {
          const seen = new Set();
          snap.docs.forEach(s => {
            const c = s.data(); if (!c || !c.id) return; seen.add(c.id);
            const mine = map.get(c.id);
            if (!mine || (c.updated || 0) >= (mine.updated || 0)) { const cc = clone(c); if (mine && mine.blob && mine.blob.data && cc.blob && !cc.blob.data) cc.blob.data = mine.blob.data; map.set(c.id, cc); }
          });
          const definitive = !(snap.metadata && snap.metadata.fromCache);
          if (first && definitive) {                     // push what this device had and the page didn't
            first = false;
            for (const id of map.keys()) if (!seen.has(id)) queueShared(id);
          } else if (!first && definitive) for (const id of [...map.keys()]) if (!seen.has(id) && !pend.has(id) && !open.has(id)) map.delete(id);
          saveLocal(); emit();
        }, e => { shared = false; setSync('local'); });
      }
    }
  }

  // every change gets a short reference ([c7]) the first time it is kept, and keeps it: answers point back with it
  const nextRef = () => 'c' + (1 + Math.max(0, ...[...map.values()].map(x => +String(x.ref || '').slice(1) || 0)));
  function put(c, opt = {}) {
    if (!opt.keepTime) c.updated = Date.now();
    c.ck = c.ck || (SD.checkpoint.commit || 'dev');
    if (!c.ref) { const prev = map.get(c.id); c.ref = prev && prev.ref || nextRef(); }
    const before = clone(map.get(c.id) || null);
    map.set(c.id, c);
    if (opt.undo !== false) { undoS.push({ id: c.id, before, after: clone(c) }); if (undoS.length > 200) undoS.shift(); redoS.length = 0; }
    saveLocal(); queueShared(c.id); emit();
    return c;
  }
  function del(id, opt = {}) {
    if (!map.has(id)) return;
    if (opt.undo !== false) { undoS.push({ id, before: clone(map.get(id)), after: null }); redoS.length = 0; }
    map.delete(id); saveLocal(); queueShared(id); emit();
  }
  // a gesture (painting, scrubbing, dragging) writes many times but undoes as one step
  const open = new Map();
  function begin(id) { if (!open.has(id)) open.set(id, clone(map.get(id) || null)); }
  function commit(id) {
    if (!open.has(id)) return;
    const before = open.get(id); open.delete(id);
    const after = clone(map.get(id) || null);
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    undoS.push({ id, before, after }); if (undoS.length > 200) undoS.shift(); redoS.length = 0;
  }
  function step(from, to, useBefore) {
    const u = from.pop(); if (!u) return false;
    to.push(u);
    const v = useBefore ? u.before : u.after;
    if (v) { map.set(u.id, clone(v)); } else map.delete(u.id);
    saveLocal(); queueShared(u.id); emit();
    return true;
  }
  async function uploadImage(file) {
    if (assets) { try { const r = await assets.upload(file); return { asset: r.id, name: file.name, mime: file.type }; } catch (e) { } }
    const data = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });
    return { data, name: file.name, mime: file.type };
  }
  async function save(filename, text) {
    if (downloads) { try { await downloads.save({ filename, data: text }); return 'saved'; } catch (e) { if (e && e.code === 'declined') return 'declined'; } }
    try {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = filename;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      return 'saved';
    } catch (e) { return 'failed'; }
  }
  return {
    init, put, del, begin, commit, get: id => map.get(id), all: () => [...map.values()], on: f => subs.add(f),
    undo: () => step(undoS, redoS, true), redo: () => step(redoS, undoS, false),
    uploadImage, blobData, blobUrl, save, get shared() { return shared; },
    clearAll() { const ids = [...map.keys()]; ids.forEach(id => { map.delete(id); queueShared(id); }); undoS.length = 0; redoS.length = 0; saveLocal(); emit(); },
  };
})();

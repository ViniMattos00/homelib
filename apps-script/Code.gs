/**
 * HomeLib - backend em Google Apps Script (planilha do Google como banco de dados).
 *
 * Como usar: veja o README.md na raiz do projeto.
 * Resumo: cole este arquivo em Extensões > Apps Script de uma planilha,
 * rode a função setup() uma vez e publique como "App da Web"
 * (executar como: você / acesso: qualquer pessoa).
 */

var SHEETS = {
  Users: ['username', 'displayName', 'salt', 'hash', 'photo'],
  Sessions: ['token', 'username', 'expires'],
  Books: ['id', 'title', 'author', 'pages', 'genre', 'cover', 'isbn', 'addedBy', 'addedAt', 'readBy'],
  Wishlist: ['id', 'title', 'author', 'pages', 'genre', 'cover', 'isbn', 'addedBy', 'addedAt'],
  Shares: ['id', 'title', 'author', 'pages', 'genre', 'cover', 'isbn', 'fromUser', 'toUser', 'message', 'createdAt', 'seen']
};

// Preencha as senhas APENAS no editor do Apps Script, antes de rodar setup().
// Não versione senhas no repositório. Depois do setup() pode apagá-las daqui:
// elas já ficam gravadas (com hash) na aba Users.
var SEED_USERS = {
  'vinicius.mattos': { displayName: 'Vinicius', password: '' },
  'evelyn.mattos': { displayName: 'Evelyn', password: '' }
};

var DRAFT_FIELDS = ['title', 'author', 'pages', 'genre', 'cover', 'isbn'];
var SESSION_MS = 30 * 24 * 60 * 60 * 1000;

/* ---------- Setup (rode uma vez) ---------- */

function setup() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach(function (name) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    var cols = SHEETS[name];
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Página1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);

  Object.keys(SEED_USERS).forEach(function (username) {
    var u = SEED_USERS[username];
    if (!u.password) throw new Error('Preencha a senha de "' + username + '" em SEED_USERS antes de rodar setup() (não commite a senha).');
    seedUser_(username, u.displayName, u.password);
  });
  Logger.log('Setup concluído.');
}

function seedUser_(username, displayName, password) {
  if (rows_('Users').some(function (u) { return u.username === username; })) return;
  var salt = Utilities.getUuid();
  append_('Users', { username: username, displayName: displayName, salt: salt, hash: hash_(salt, password), photo: '' });
}

/* ---------- Entrada HTTP ---------- */

function doGet() {
  return ContentService.createTextOutput('HomeLib API ok');
}

function doPost(e) {
  var out;
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var req = JSON.parse(e.postData.contents);
    out = { ok: true, data: handle_(req) };
  } catch (err) {
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function handle_(req) {
  if (req.action === 'login') return login_(req);
  var me = auth_(req.token);
  switch (req.action) {
    case 'sync': return sync_(me);
    case 'addBook': return addItem_('Books', me, req.book, { readBy: '' });
    case 'updateBook': return updateItem_('Books', req.id, req.fields);
    case 'deleteBook': return deleteItem_('Books', req.id);
    case 'toggleRead': return toggleRead_(me, req.id, !!req.read);
    case 'addWish': return addItem_('Wishlist', me, req.item, {});
    case 'deleteWish': return deleteItem_('Wishlist', req.id);
    case 'updateProfile': return updateProfile_(me, req);
    case 'shareBook': return shareBook_(me, req);
    case 'markSeen': return markSeen_(me);
    default: throw new Error('Ação desconhecida');
  }
}

/* ---------- Autenticação ---------- */

function hash_(salt, password) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + password);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function login_(req) {
  var username = String(req.username || '').trim().toLowerCase();
  var user = rows_('Users').filter(function (u) { return u.username === username; })[0];
  if (!user || user.hash !== hash_(user.salt, String(req.password || ''))) {
    throw new Error('Usuário ou senha inválidos');
  }
  cleanSessions_();
  var token = Utilities.getUuid() + Utilities.getUuid();
  append_('Sessions', { token: token, username: username, expires: Date.now() + SESSION_MS });
  return { token: token, username: username };
}

function auth_(token) {
  var s = rows_('Sessions').filter(function (r) { return r.token === token; })[0];
  if (!token || !s || Number(s.expires) < Date.now()) throw new Error('unauthorized');
  return s.username;
}

function cleanSessions_() {
  var now = Date.now();
  rows_('Sessions').reverse().forEach(function (s) {
    if (Number(s.expires) < now) removeRow_('Sessions', s._row);
  });
}

/* ---------- Leitura ---------- */

function publicUser_(u) {
  return { username: u.username, displayName: u.displayName, photo: u.photo || '' };
}

function book_(r) {
  return {
    id: String(r.id), title: String(r.title), author: String(r.author), pages: Number(r.pages) || 0,
    genre: String(r.genre), cover: String(r.cover), isbn: String(r.isbn),
    addedBy: String(r.addedBy), addedAt: Number(r.addedAt),
    readBy: String(r.readBy || '').split(',').filter(Boolean)
  };
}

function wish_(r) {
  var b = book_(r); delete b.readBy; return b;
}

function share_(r) {
  return {
    id: String(r.id), title: String(r.title), author: String(r.author), pages: Number(r.pages) || 0,
    genre: String(r.genre), cover: String(r.cover), isbn: String(r.isbn),
    fromUser: String(r.fromUser), toUser: String(r.toUser), message: String(r.message),
    createdAt: Number(r.createdAt), seen: String(r.seen).toUpperCase() === 'TRUE'
  };
}

function sync_(me) {
  return {
    me: me,
    users: rows_('Users').map(publicUser_),
    books: rows_('Books').map(book_),
    wishlist: rows_('Wishlist').map(wish_),
    shares: rows_('Shares').map(share_).filter(function (s) { return s.fromUser === me || s.toUser === me; })
  };
}

/* ---------- Escrita ---------- */

function pick_(obj) {
  obj = obj || {};
  var d = {};
  DRAFT_FIELDS.forEach(function (k) {
    if (obj[k] !== undefined) d[k] = obj[k];
  });
  if (d.title !== undefined) d.title = String(d.title).trim().slice(0, 200);
  if (d.author !== undefined) d.author = String(d.author).trim().slice(0, 200);
  if (d.genre !== undefined) d.genre = String(d.genre).trim().slice(0, 60) || 'Outros';
  if (d.pages !== undefined) d.pages = Math.max(0, Math.round(Number(d.pages) || 0));
  if (d.cover !== undefined) d.cover = String(d.cover).trim().slice(0, 500);
  if (d.isbn !== undefined) d.isbn = String(d.isbn).trim().slice(0, 20);
  return d;
}

function findRow_(sheet, id) {
  var r = rows_(sheet).filter(function (x) { return String(x.id) === String(id); })[0];
  if (!r) throw new Error('Item não encontrado');
  return r;
}

function addItem_(sheet, me, draft, extra) {
  var d = pick_(draft);
  if (!d.title) throw new Error('Título obrigatório');
  var item = { id: Utilities.getUuid(), author: '', pages: 0, genre: 'Outros', cover: '', isbn: '', addedBy: me, addedAt: Date.now() };
  Object.keys(d).forEach(function (k) { item[k] = d[k]; });
  Object.keys(extra).forEach(function (k) { item[k] = extra[k]; });
  append_(sheet, item);
  return sheet === 'Books' ? book_(item) : wish_(item);
}

function updateItem_(sheet, id, fields) {
  var r = findRow_(sheet, id);
  var d = pick_(fields);
  if (d.title === '') throw new Error('Título obrigatório');
  updateRow_(sheet, r._row, d);
  var merged = findRow_(sheet, id);
  return sheet === 'Books' ? book_(merged) : wish_(merged);
}

function deleteItem_(sheet, id) {
  removeRow_(sheet, findRow_(sheet, id)._row);
  return { id: id };
}

function toggleRead_(me, id, read) {
  var r = findRow_('Books', id);
  var list = String(r.readBy || '').split(',').filter(Boolean).filter(function (u) { return u !== me; });
  if (read) list.push(me);
  updateRow_('Books', r._row, { readBy: list.join(',') });
  return { id: id, readBy: list };
}

function updateProfile_(me, req) {
  var u = rows_('Users').filter(function (x) { return x.username === me; })[0];
  var patch = {};
  if (req.displayName !== undefined) {
    var name = String(req.displayName).trim().slice(0, 40);
    if (!name) throw new Error('Nome obrigatório');
    patch.displayName = name;
  }
  if (req.photo !== undefined) {
    var photo = String(req.photo);
    if (photo && (photo.indexOf('data:image/') !== 0 || photo.length > 45000)) throw new Error('Foto inválida ou grande demais');
    patch.photo = photo;
  }
  updateRow_('Users', u._row, patch);
  return publicUser_(rows_('Users').filter(function (x) { return x.username === me; })[0]);
}

function shareBook_(me, req) {
  var to = String(req.toUser || '');
  if (to === me || !rows_('Users').some(function (u) { return u.username === to; })) throw new Error('Destinatário inválido');
  var d = pick_(req.book);
  if (!d.title) throw new Error('Título obrigatório');
  var item = { id: Utilities.getUuid(), author: '', pages: 0, genre: 'Outros', cover: '', isbn: '',
    fromUser: me, toUser: to, message: String(req.message || '').slice(0, 300), createdAt: Date.now(), seen: false };
  Object.keys(d).forEach(function (k) { item[k] = d[k]; });
  append_('Shares', item);
  return share_(item);
}

function markSeen_(me) {
  rows_('Shares').forEach(function (s) {
    if (s.toUser === me && String(s.seen).toUpperCase() !== 'TRUE') updateRow_('Shares', s._row, { seen: true });
  });
  return { ok: true };
}

/* ---------- Helpers de planilha ---------- */

function sheet_(name) {
  var s = SpreadsheetApp.getActive().getSheetByName(name);
  if (!s) throw new Error('Aba "' + name + '" não existe. Rode setup().');
  return s;
}

function rows_(name) {
  var v = sheet_(name).getDataRange().getValues();
  var head = v.shift();
  return v.map(function (r, i) {
    var o = { _row: i + 2 };
    head.forEach(function (k, j) { o[k] = r[j]; });
    return o;
  });
}

function append_(name, obj) {
  var cols = SHEETS[name];
  var s = sheet_(name);
  var rowIdx = s.getLastRow() + 1;
  // força texto puro em colunas que podem parecer números/datas (isbn, ids)
  s.getRange(rowIdx, 1, 1, cols.length).setNumberFormat('@');
  s.getRange(rowIdx, 1, 1, cols.length).setValues([cols.map(function (c) { return obj[c] === undefined ? '' : obj[c]; })]);
}

function updateRow_(name, row, obj) {
  var cols = SHEETS[name];
  var range = sheet_(name).getRange(row, 1, 1, cols.length);
  var cur = range.getValues()[0];
  range.setValues([cols.map(function (c, i) { return obj[c] === undefined ? cur[i] : obj[c]; })]);
}

function removeRow_(name, row) {
  sheet_(name).deleteRow(row);
}

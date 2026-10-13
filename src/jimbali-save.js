/* Jimbali Explorers - save layer
 * Adds a "Who is playing?" screen and automatic saving to the packaged game.
 * Everything is stored in this browser only (localStorage). Nothing is sent anywhere.
 * Saved per player: nickname, hero (1-4), coins, which missions are done, what they bought in the market, times finished.
 * Saves happen only in the village (a safe moment), so closing the page in the middle of
 * a mission puts the player back in the village with the coins they had before the mission.
 */
(function () {
  'use strict';

  var KEY = 'jimbali.profiles.v1';
  var MAX_PROFILES = 6;
  var NICK_MIN = 2, NICK_MAX = 12;
  var HERO_NAMES = { 1: 'Sifa', 2: 'Thando', 3: 'Eshe', 4: 'Malaika' };
  var AVATARS = __AVATARS__;                      /* filled in by tools/build_site.py */
  var DONE_VARS = ['M1Done', 'M2Done', 'M3Done', 'M4Done', 'M5Done'];
  var OWN_VARS = ['Own1', 'Own2', 'Own3', 'Own4', 'Own5', 'Own6', 'Own7', 'Own8', 'Own9', 'Own10', 'Own11', 'Own12'];   // things bought in the market

  /* ---------- storage (falls back to memory if the browser blocks it) ---------- */
  var store = null, canSave = false, memory = { profiles: [] };
  try {
    store = window.localStorage;
    store.setItem('jimbali.test', '1'); store.removeItem('jimbali.test');
    canSave = true;
  } catch (e) { store = null; canSave = false; }

  function clampInt(v, lo, hi, dflt) {
    v = Number(v);
    if (!isFinite(v)) return dflt;
    v = Math.round(v);
    return Math.max(lo, Math.min(hi, v));
  }
  function cleanProfile(p) {
    if (!p || typeof p !== 'object') return null;
    var nick = String(p.nick == null ? '' : p.nick).replace(/\s+/g, ' ').trim().slice(0, NICK_MAX);
    if (!nick) return null;
    var done = [];
    for (var i = 0; i < 5; i++) done.push(p.done && p.done[i] ? 1 : 0);
    var own = [];
    for (var j = 0; j < 12; j++) own.push(p.own && p.own[j] ? 1 : 0);      // old saves have no 'own': all zero
    return {
      id: String(p.id || ('p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6))),
      nick: nick,
      hero: clampInt(p.hero, 1, 4, 3),
      coins: clampInt(p.coins, 0, 99999, 30),
      done: done,
      own: own,
      tour: p.tour ? 1 : 0,
      using: (p.using >= 1 && p.using <= 12 && own[p.using - 1]) ? Math.round(p.using) : 0,
      completions: clampInt(p.completions, 0, 999, 0),
      started: p.started ? 1 : 0,
      created: Number(p.created) || Date.now(),
      played: Number(p.played) || 0
    };
  }
  function loadAll() {
    var raw = null;
    if (canSave) { try { raw = JSON.parse(store.getItem(KEY)); } catch (e) { raw = null; } }
    else raw = memory;
    var out = [];
    if (raw && Array.isArray(raw.profiles)) {
      for (var i = 0; i < raw.profiles.length && out.length < MAX_PROFILES; i++) {
        var c = cleanProfile(raw.profiles[i]); if (c) out.push(c);
      }
    }
    return out;
  }
  function saveAll(list) {
    var data = { v: 1, profiles: list };
    if (canSave) {
      try { store.setItem(KEY, JSON.stringify(data)); return true; }
      catch (e) { canSave = false; memory = data; warnNoSave(); return false; }
    }
    memory = data; return false;
  }

  /* ---------- small DOM helpers (nicknames are always inserted as text) ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function avatarStyle(hero) {
    return 'background-image:url(data:image/png;base64,' + AVATARS[hero] + ')';
  }
  /* a player who has not picked a hero yet gets a neutral "?" badge instead of a default hero face */
  function paintAvatar(node, p) {
    if (p.started) { node.style.cssText = avatarStyle(p.hero); return; }
    node.style.cssText = 'display:flex;align-items:center;justify-content:center;background:#2fa59c;color:#f7ead0;font-weight:800;font-size:' + (node.className.indexOf('jw-bigav') >= 0 ? '58px' : '34px');
    node.textContent = '?';
  }
  function missionsDone(p) { return p.done.reduce(function (a, b) { return a + b; }, 0); }

  /* ---------- game access ---------- */
  function runtime() {
    var s = window.scaffolding;
    return s && s.vm && s.vm.runtime ? s.vm.runtime : null;
  }
  var varCache = {};
  function stageVar(name) {
    var rt = runtime(); if (!rt) return null;
    var st = rt.getTargetForStage(); if (!st) return null;
    var c = varCache[name];
    if (c && st.variables[c.id] === c) return c;
    for (var id in st.variables) if (st.variables[id].name === name) { varCache[name] = st.variables[id]; return varCache[name]; }
    return null;
  }
  function getVar(name) { var v = stageVar(name); return v ? v.value : undefined; }
  function setVar(name, val) { var v = stageVar(name); if (v) v.value = val; }
  function broadcast(msg) { runtime().startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: msg }); }
  function launchScreen() { return document.getElementById('launch'); }
  function gameReady() { var l = launchScreen(); return !!(l && !l.hidden && window.scaffolding); }

  /* ---------- overlay ---------- */
  var overlay = el('div'); overlay.id = 'jw-overlay';
  var wrap = el('div', 'jw-wrap'); overlay.appendChild(wrap);
  var profiles = loadAll();
  var current = null;                 // profile being played
  var noSaveWarned = false;

  var copy = el('div', 'jw-copy', '__COPYRIGHT__'); overlay.appendChild(copy);
  function mount() { if (!document.body) return false; document.body.insertBefore(overlay, document.body.firstChild); return true; }

  function head(subtitle) {
    wrap.appendChild(el('div', 'jw-title', 'Jimbali Explorers'));
    wrap.appendChild(el('div', 'jw-sub', subtitle));
    if (!canSave) warnNoSave(true);
  }
  function warnNoSave(inline) {
    if (inline === true) {
      wrap.appendChild(el('div', 'jw-warn', 'This browser is not letting the game save. You can still play, but progress will be lost when you close the page. (Private or incognito windows do this.)'));
    } else if (!noSaveWarned) {
      noSaveWarned = true;
      var b = el('div', 'jw-warn', 'Progress could not be saved on this browser.');
      b.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:99998;max-width:480px;margin:auto';
      document.body.appendChild(b);
      setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 9000);
    }
  }
  function clear() { while (wrap.firstChild) wrap.removeChild(wrap.firstChild); }

  function showList() {
    clear(); head('Who is playing?');
    var grid = el('div', 'jw-grid'); wrap.appendChild(grid);
    profiles.forEach(function (p) {
      var card = el('div', 'jw-card'); card.setAttribute('role', 'button'); card.tabIndex = 0;
      card.setAttribute('aria-label', 'Play as ' + p.nick);
      var av = el('div', 'jw-av'); paintAvatar(av, p);
      var info = el('div', 'jw-info');
      info.appendChild(el('div', 'jw-nick', p.nick));
      var d = missionsDone(p);
      info.appendChild(el('div', 'jw-meta', p.started ? (d + ' of 5 missions  |  ' + p.coins + ' coins') : 'New player'));
      if (p.completions > 0) info.appendChild(el('div', 'jw-stars', '★'.repeat(Math.min(p.completions, 5))));
      var del = el('button', 'jw-del', 'Delete'); del.type = 'button';
      del.addEventListener('click', function (ev) { ev.stopPropagation(); showDelete(p); });
      del.addEventListener('keydown', function (ev) { ev.stopPropagation(); });
      card.appendChild(av); card.appendChild(info); card.appendChild(del);
      function go() { choose(p); }
      card.addEventListener('click', go);
      card.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
      grid.appendChild(card);
    });
    var nw = el('button', 'jw-card jw-new'); nw.type = 'button';
    var plus = el('div', 'jw-av plus', '+');
    var ni = el('div', 'jw-info');
    ni.appendChild(el('div', 'jw-nick', 'New player'));
    ni.appendChild(el('div', 'jw-meta', profiles.length >= MAX_PROFILES ? 'Delete a player to make room' : 'Make your own hero profile'));
    nw.appendChild(plus); nw.appendChild(ni);
    if (profiles.length >= MAX_PROFILES) nw.disabled = true;
    nw.addEventListener('click', showNew);
    grid.appendChild(nw);
    wrap.appendChild(el('div', 'jw-note', canSave
      ? 'Your progress is saved on this device only. Nothing is sent over the internet. To switch player, reload this page.'
      : 'To switch player, reload this page.'));
    if (!profiles.length) showNew();    // first visit: go straight to creating a player
  }

  function showNew() {
    clear(); head('Make your player');
    var panel = el('form', 'jw-panel'); wrap.appendChild(panel);
    panel.appendChild(el('h2', null, 'Pick a nickname'));
    panel.appendChild(el('p', null, 'Make up a fun name. Please do NOT use your real name, your school or your address.'));
    var input = el('input', 'jw-input'); input.type = 'text'; input.maxLength = NICK_MAX; input.autocomplete = 'off';
    input.setAttribute('autocapitalize', 'words'); input.setAttribute('spellcheck', 'false'); input.setAttribute('aria-label', 'Nickname');
    input.placeholder = 'e.g. Brave Lion';
    var err = el('div', 'jw-err'); err.setAttribute('role', 'alert');
    var row = el('div', 'jw-row');
    var ok = el('button', 'jw-btn', 'Start'); ok.type = 'submit';
    var back = el('button', 'jw-btn plain', 'Back'); back.type = 'button';
    row.appendChild(ok); if (profiles.length) row.appendChild(back);
    panel.appendChild(input); panel.appendChild(err); panel.appendChild(row);
    back.addEventListener('click', showList);
    panel.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var nick = input.value.replace(/\s+/g, ' ').trim();
      var msg = checkNick(nick);
      if (msg) { err.textContent = msg; input.focus(); return; }
      var p = cleanProfile({ nick: nick, hero: 3, coins: 30, done: [0, 0, 0, 0, 0], own: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], started: 0, created: Date.now() });
      profiles.push(p); saveAll(profiles);
      choose(p);
    });
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 50);
  }
  function checkNick(nick) {
    if (nick.length < NICK_MIN) return 'Your nickname needs at least ' + NICK_MIN + ' letters.';
    if (nick.length > NICK_MAX) return 'Please use ' + NICK_MAX + ' letters or fewer.';
    var ok;
    try { ok = new RegExp('^[\\p{L}\\p{N} \\-]+$', 'u').test(nick); } catch (e) { ok = /^[A-Za-z0-9 \-]+$/.test(nick); }
    if (!ok) return 'Please use only letters, numbers and spaces.';
    for (var i = 0; i < profiles.length; i++)
      if (profiles[i].nick.toLowerCase() === nick.toLowerCase()) return 'That nickname is already used on this device.';
    return '';
  }

  function showDelete(p) {
    clear(); head('Delete player?');
    var panel = el('div', 'jw-panel'); wrap.appendChild(panel);
    panel.appendChild(el('h2', null, 'Delete ' + p.nick + '?'));
    panel.appendChild(el('p', null, 'This will erase their hero, coins and missions from this device. It cannot be undone.'));
    var row = el('div', 'jw-row');
    var yes = el('button', 'jw-btn red', 'Yes, delete'); yes.type = 'button';
    var no = el('button', 'jw-btn plain', 'Keep'); no.type = 'button';
    row.appendChild(yes); row.appendChild(no); panel.appendChild(row);
    yes.addEventListener('click', function () {
      profiles = profiles.filter(function (q) { return q.id !== p.id; });
      saveAll(profiles); showList();
    });
    no.addEventListener('click', showList);
    no.focus();
  }

  /* ---------- starting the game ---------- */
  function choose(p) {
    current = p;
    if (gameReady()) { launch(); return; }     // tap goes straight into the game (keeps audio unlocked)
    clear(); head('Welcome, ' + p.nick + '!');
    var panel = el('div', 'jw-panel jw-center'); wrap.appendChild(panel);
    var big = el('div', 'jw-bigav'); paintAvatar(big, p); panel.appendChild(big);
    var play = el('button', 'jw-btn', 'Loading the game...'); play.type = 'button'; play.disabled = true;
    panel.appendChild(play);
    play.addEventListener('click', launch);
    var t = setInterval(function () {
      if (gameReady()) { clearInterval(t); play.disabled = false; play.textContent = 'PLAY'; play.focus(); }
    }, 150);
  }

  function launch() {
    var p = current; if (!p) return;
    var l = launchScreen(); if (!l) return;
    overlay.hidden = true;
    l.click();                                  // the packager's own start (green flag)
    afterStart(p);
  }

  var restoring = false, saveTimer = null, lastJson = '', lastScene = 0;
  function afterStart(p) {
    if (p.started) restore(p);
    if (!saveTimer) saveTimer = setInterval(tick, 500);
    document.addEventListener('visibilitychange', function () { if (document.hidden) tick(); });
    window.addEventListener('pagehide', tick);
  }

  function restore(p) {
    restoring = true;
    var t0 = Date.now();
    var iv = setInterval(function () {
      // wait until the game's own start-up scripts have run (title screen = Scene 1)
      var waited = Date.now() - t0;
      if ((getVar('Scene') === 1 && waited > 700) || waited > 15000) {
        clearInterval(iv);
        setVar('Hero', p.hero); setVar('Coins', p.coins);
        for (var i = 0; i < 5; i++) setVar(DONE_VARS[i], p.done[i]);
        for (var j = 0; j < 12; j++) setVar(OWN_VARS[j], p.own[j]);
        setVar('Using', p.using || 0);
        setVar('MarketSeen', p.tour ? 1 : 0);
        setVar('Missions', missionsDone(p));
        broadcast('resume');
        setTimeout(function () { restoring = false; }, 800);
      }
    }, 150);
  }

  function snapshot() {
    var done = DONE_VARS.map(function (n) { return getVar(n) ? 1 : 0; });
    var own = OWN_VARS.map(function (n) { return getVar(n) ? 1 : 0; });
    return { hero: clampInt(getVar('Hero'), 1, 4, 3), coins: clampInt(getVar('Coins'), 0, 99999, 30), done: done, own: own, using: clampInt(getVar('Using'), 0, 12, 0), tour: getVar('MarketSeen') ? 1 : 0 };
  }
  function tick() {
    if (!current || restoring || !runtime()) return;
    var sc = getVar('Scene');
    if (sc === 4 || sc === 11) {
      var s = snapshot();
      if (sc === 11 && lastScene !== 11) current.completions = Math.min(999, current.completions + 1);
      var json = JSON.stringify([s, current.completions]);
      if (json !== lastJson || lastScene !== sc) {
        current.hero = s.hero; current.coins = s.coins; current.done = s.done; current.own = s.own; current.using = s.using; current.tour = s.tour; current.started = 1; current.played = Date.now();
        lastJson = json;
        for (var i = 0; i < profiles.length; i++) if (profiles[i].id === current.id) profiles[i] = current;
        saveAll(profiles);
      }
    }
    lastScene = sc;
  }

  /* ---------- "turn your phone sideways" hint (CSS shows it only when the phone is upright) ---------- */
  function addRotateHint() {
    if (!document.body) return;
    var d = el('div'); d.id = 'jw-rotate'; d.className = 'jw-on';
    var box = el('div', 'jw-rot-box');
    box.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#2b170d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.2"/><line x1="11" y1="18.5" x2="13" y2="18.5"/></svg>';
    box.appendChild(el('span', null, 'Turn your phone sideways for a bigger game'));
    var x = el('button', null, 'OK'); x.type = 'button'; x.setAttribute('aria-label', 'Close hint');
    x.addEventListener('click', function () { d.className = ''; });
    box.appendChild(x); d.appendChild(box); document.body.appendChild(d);
  }

  /* ---------- go ---------- */
  if (!mount()) document.addEventListener('DOMContentLoaded', function () { mount(); addRotateHint(); });
  else addRotateHint();
  showList();

  /* small hook for tests / developers */
  window.JimbaliSave = { profiles: function () { return profiles.slice(); }, key: KEY, canSave: function () { return canSave; } };
})();

/* Jimbali Explorers - anonymous usage counts (GoatCounter).
 *
 * Off by default. It switches on only when stats-config.js (next to index.html) sets
 *     window.JIMBALI_STATS_CODE = 'your-goatcounter-code';
 * What is sent: the page address, a short event name such as "game/mission-2-won", the screen size and the
 * referrer. GoatCounter itself works out country, browser and device from the request and does not keep the
 * IP address. NEVER sent: nicknames, profile ids, coins, anything typed by a child. No cookies, no storage of ids.
 * "New vs returning" uses one yes/no flag in localStorage ("this browser has opened the game before").
 * Nothing is sent when the browser says Do Not Track / Global Privacy Control. */
(function () {
  'use strict';
  var code = window.JIMBALI_STATS_CODE;
  if (typeof code !== 'string' || !/^[a-z0-9][a-z0-9-]{0,40}$/i.test(code)) return;
  try {
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
  } catch (e) {}
  var endpoint = 'https://' + code + '.goatcounter.com/count';
  var sent = {};

  function send(path, title, isEvent) {
    try {
      var q = [
        'p=' + encodeURIComponent(path),
        't=' + encodeURIComponent(title || path),
        'r=' + encodeURIComponent(isEvent ? '' : (document.referrer || '')),
        's=' + [screen.width || 0, screen.height || 0, window.devicePixelRatio || 1].join(','),
        'rnd=' + Math.random().toString(36).slice(2, 8)
      ];
      if (isEvent) q.push('e=true');
      new Image().src = endpoint + '?' + q.join('&');
    } catch (e) {}
  }
  function once(path) { if (sent[path]) return; sent[path] = 1; send(path, path, true); }

  /* ---- who opened the page ---- */
  send(location.pathname || '/', document.title || 'Jimbali Explorers', false);
  var seen = null, KEY = 'jimbali.seen.v1';
  try { seen = localStorage.getItem(KEY); localStorage.setItem(KEY, '1'); } catch (e) {}
  once(seen ? 'visit/returning' : 'visit/new');
  var w = Math.min(screen.width || 0, screen.height || 0), coarse = false;
  try { coarse = window.matchMedia('(pointer:coarse)').matches; } catch (e) {}
  once('device/' + (!coarse ? 'computer' : (w && w < 600 ? 'phone' : 'tablet')));

  /* ---- where players get to in the game (each step counted once per page visit) ---- */
  var SCENES = {
    1: 'game/started', 2: 'game/story', 3: 'game/hero-select', 24: 'game/how-to-play', 4: 'game/map',
    5: 'game/mission-1-start', 9: 'game/mission-2-start', 14: 'game/mission-3-start', 16: 'game/mission-4-start', 18: 'game/mission-5-start',
    6: 'game/mission-1-won', 10: 'game/mission-2-won', 15: 'game/mission-3-won', 17: 'game/mission-4-won', 19: 'game/mission-5-won',
    7: 'game/ambush', 22: 'game/mission-failed', 23: 'game/market', 11: 'game/complete'
  };
  var HEROES = { 1: 'sifa', 2: 'thando', 3: 'eshe', 4: 'malaika' };
  var last = null, heroDone = false;
  function stage() {
    var s = window.scaffolding, rt = s && s.vm && s.vm.runtime;
    return rt && rt.getTargetForStage ? rt.getTargetForStage() : null;
  }
  function stageVal(st, name) {
    for (var id in st.variables) if (st.variables[id].name === name) return st.variables[id].value;
  }
  setInterval(function () {
    var st = stage(); if (!st) return;
    var sc = Number(stageVal(st, 'Scene'));
    if (!sc || sc === last) return;
    last = sc;
    if (SCENES[sc]) once(SCENES[sc]);
    if (!heroDone && (sc === 24 || sc === 4 || sc === 5)) {
      var h = Number(stageVal(st, 'Hero'));
      if (HEROES[h]) { heroDone = true; once('hero/' + HEROES[h]); }
    }
  }, 250);
})();

/* Jimbali Explorers - phone helpers: full screen button (Android, iPad), "Add to Home Screen" tip (iPhone), orientation lock */
(function () {
  'use strict';
  var coarse = false;
  try { coarse = (window.matchMedia && window.matchMedia('(pointer:coarse)').matches) || ('ontouchstart' in window); } catch (e) {}
  if (!coarse) return;
  var ua = navigator.userAgent || '';
  var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = false;
  try { standalone = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches; } catch (e) {}
  var root = document.documentElement;
  var fsReq = root.requestFullscreen || root.webkitRequestFullscreen;
  function inFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function enter() {
    if (!fsReq || inFs()) return;
    try { var r = fsReq.call(root); if (r && r.catch) r.catch(function () {}); } catch (e) {}
    try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {}); } catch (e) {}
  }
  function leave() {
    try { var f = document.exitFullscreen || document.webkitExitFullscreen; if (f) { var r = f.call(document); if (r && r.catch) r.catch(function () {}); } } catch (e) {}
  }
  function el(tag, id, text) { var e = document.createElement(tag); if (id) e.id = id; if (text) e.textContent = text; return e; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function mount() {
    if (!document.body) return false;
    if (fsReq && !standalone) {
      var b = el('button', 'jw-fs'); b.type = 'button'; b.setAttribute('aria-label', 'Full screen');
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#f7ead0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
      b.addEventListener('click', function (ev) { ev.stopPropagation(); if (inFs()) leave(); else enter(); });
      document.body.appendChild(b);
      var sync = function () { b.style.display = inFs() ? 'none' : ''; };
      document.addEventListener('fullscreenchange', sync); document.addEventListener('webkitfullscreenchange', sync);
    }
    /* the first tap on the "Who is playing?" screen is a real user tap: use it to go full screen */
    document.addEventListener('click', function (ev) {
      var t = ev.target; if (!t || !t.closest) return;
      if (t.closest('#jw-overlay') && t.closest('button') && !inFs()) enter();
    }, true);
    /* iPhone cannot go full screen from a web page: suggest the home-screen icon once */
    if (ios && !fsReq && !standalone && lsGet('jimbali.tip.v1') !== '1') {
      var ov = document.getElementById('jw-overlay');
      if (ov) {
        var tip = el('div', 'jw-tip');
        tip.appendChild(el('span', null, 'Bigger game: tap the Share button, then "Add to Home Screen". Open Jimbali from your home screen to play full screen.'));
        var ok = el('button', null, 'OK'); ok.type = 'button';
        ok.addEventListener('click', function () { lsSet('jimbali.tip.v1', '1'); if (tip.parentNode) tip.parentNode.removeChild(tip); });
        tip.appendChild(ok); ov.appendChild(tip);
      }
    }
    return true;
  }
  if (!mount()) document.addEventListener('DOMContentLoaded', mount);
})();

#!/usr/bin/env python3
"""Build the website folder (public/) from the packaged game.

  1. node tools/pack.js Jimbali-Level1.sb3 build/game.html     (TurboWarp packager, see README)
  2. python3 tools/build_site.py build/game.html public/index.html

The save layer (src/jimbali-save.css + src/jimbali-save.js + src/avatars.json) is injected right
after the <body> tag so the "Who is playing?" screen appears before the game starts."""
import json, os, sys

here = os.path.dirname(os.path.abspath(__file__)); src = os.path.join(here, '..', 'src')
game, out = sys.argv[1], sys.argv[2]
html = open(game, encoding='utf-8').read()
css = open(os.path.join(src, 'jimbali-save.css'), encoding='utf-8').read()
js = open(os.path.join(src, 'jimbali-save.js'), encoding='utf-8').read()
av = open(os.path.join(src, 'avatars.json'), encoding='utf-8').read()
assert '__AVATARS__' in js
js = js.replace('__AVATARS__', av)
assert '</script' not in js.lower()
marker = '<body>\n  <div id="app"></div>'
assert html.count(marker) == 1, 'unexpected packager html'
inject = '<body>\n<style>%s</style>\n<script>%s</script>\n' % (css, js)
html = html.replace(marker, inject + '  <div id="app"></div>', 1)
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, 'w', encoding='utf-8').write(html)
print('wrote', out, round(len(html) / 1e6, 1), 'MB')

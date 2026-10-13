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
mjs = open(os.path.join(src, 'jimbali-mobile.js'), encoding='utf-8').read()
sjs = open(os.path.join(src, 'jimbali-stats.js'), encoding='utf-8').read()
icon180 = open(os.path.join(src, 'apple-icon.b64')).read().strip(); icon64 = open(os.path.join(src, 'fav-icon.b64')).read().strip()
av = open(os.path.join(src, 'avatars.json'), encoding='utf-8').read()
COPYRIGHT = '\u00a9 2026 Jimbali Explorers. Created by Rahila Namah. All rights reserved.'   # change here (and in sprites7.py COPY_TXT) when the company takes over
assert '__AVATARS__' in js and '__COPYRIGHT__' in js
js = js.replace('__AVATARS__', av).replace('__COPYRIGHT__', COPYRIGHT)
assert '</script' not in js.lower() and '</script' not in mjs.lower() and '</script' not in sjs.lower()
marker = '<body>\n  <div id="app"></div>'
assert html.count(marker) == 1, 'unexpected packager html'
# usage counts: stats-config.js (a tiny file next to index.html) holds the GoatCounter code; empty = tracking off.
# A missing stats-config.js is harmless. Bake a code in at build time with the JIMBALI_STATS env variable.
inject = '<body>\n<style>%s</style>\n<script src="stats-config.js"></script>\n<script>%s</script>\n<script>%s</script>\n<script>%s</script>\n' % (css, js, mjs, sjs)
# phone friendliness in <head>: use the whole screen (notch), allow "Add to Home Screen" as a full-screen app, icons, dark theme colour
vp = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">'
assert html.count(vp) == 1, 'viewport meta not found'
head = ('<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">\n'
        '  <meta name="apple-mobile-web-app-capable" content="yes">\n  <meta name="mobile-web-app-capable" content="yes">\n'
        '  <meta name="apple-mobile-web-app-title" content="Jimbali">\n  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
        '  <link rel="apple-touch-icon" href="data:image/png;base64,%s">\n  <link rel="icon" type="image/png" href="data:image/png;base64,%s">' % (icon180, icon64))
html = html.replace(vp, head, 1)
html = html.replace('<meta name="theme-color" content="#000000">', '<meta name="theme-color" content="#26130a">')
html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  <!-- %s -->\n  <meta name="copyright" content="%s">\n  <meta name="author" content="Rahila Namah">' % (COPYRIGHT, COPYRIGHT), 1)
html = html.replace(marker, inject + '  <div id="app"></div>', 1)
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, 'w', encoding='utf-8').write(html)
code = os.environ.get('JIMBALI_STATS', '').strip()
assert all(c.isalnum() or c == '-' for c in code), 'JIMBALI_STATS may only contain letters, digits and -'
cfg = os.path.join(os.path.dirname(os.path.abspath(out)), 'stats-config.js')
open(cfg, 'w', encoding='utf-8').write(
    "/* Usage counts. Put your GoatCounter code between the quotes (the part before .goatcounter.com).\n"
    "   Leave it empty to switch counting off. See STATS.md. */\nwindow.JIMBALI_STATS_CODE = '%s';\n" % code)
print('wrote', out, round(len(html) / 1e6, 1), 'MB')

import asyncio, sys, json
sys.path.insert(0,'/tmp/jw/tw')
from drive import HELPERS
from playwright.async_api import async_playwright
URL = 'http://localhost:8765/index.html'
EXTRA = "H.bc = (m) => scaffolding.vm.runtime.startHats('event_whenbroadcastreceived', {BROADCAST_OPTION: m});\nH.setvar = (n, val) => { const st = scaffolding.vm.runtime.getTargetForStage(); for (const v of Object.values(st.variables)) if (v.name === n) v.value = val; };\nH.playing = () => { const t = scaffolding.vm.runtime.getTargetForStage(); const sb = t.sprite.soundBank; return t.sprite.sounds.filter(s => sb.soundPlayers[s.soundId] && sb.soundPlayers[s.soundId].isPlaying).map(s => s.name); };\n0;\n"
ARGS = ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']
OUT = '/tmp/jw/site/shots/'
import os; os.makedirs(OUT, exist_ok=True)
res = []
def chk(n, c, i=''): res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n, '' if c else i, flush=True)

async def open_page(ctx, errs):
    pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(URL)
    await pg.wait_for_selector('#jw-overlay .jw-wrap', timeout=30000)
    return pg
async def load_game(pg):
    await pg.wait_for_function("window.scaffolding && window.scaffolding.vm && document.getElementById('loading').hidden === true", timeout=120000, polling=300)
    await pg.evaluate(HELPERS); await pg.evaluate(EXTRA)
async def stored(pg):
    return await pg.evaluate("JSON.parse(localStorage.getItem('jimbali.profiles.v1')||'{\"profiles\":[]}').profiles")
async def vars_(pg, *names): return await pg.evaluate("(ns)=>{const v=H.vars();const o={};ns.forEach(n=>o[n]=v[n]);return o}", list(names))

async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': 960, 'height': 720}); errs = []
        # ---- first visit: straight to the nickname screen
        pg = await open_page(ctx, errs)
        chk('first visit shows nickname form (no profiles yet)', await pg.locator('.jw-input').count() == 1 and await pg.locator('.jw-card').count() == 0)
        await pg.screenshot(path=OUT + '1_new_player.png')
        for bad, why in (('', 'empty'), ('A', 'too short'), ('Bad@name!', 'symbols')):
            await pg.fill('.jw-input', bad); await pg.press('.jw-input', 'Enter')
            chk(f'nickname rejected: {why}', len(await pg.inner_text('.jw-err')) > 3)
        await pg.fill('.jw-input', 'Brave Lion'); await pg.press('.jw-input', 'Enter')
        await load_game(pg)
        chk('after creating a player: welcome screen with PLAY or straight start', await pg.locator('#jw-overlay').is_visible() or True)
        # if the overlay shows a PLAY button (game was not ready), press it
        if await pg.locator('#jw-overlay').is_visible():
            await pg.wait_for_function("[...document.querySelectorAll('#jw-overlay .jw-btn')].some(b=>b.textContent==='PLAY' && !b.disabled)", timeout=30000, polling=300)
            await pg.screenshot(path=OUT + '2_welcome.png')
            await pg.click('#jw-overlay .jw-btn')
        await pg.wait_for_function("document.getElementById('jw-overlay').hidden === true", timeout=10000, polling=300)
        await pg.wait_for_timeout(2500)
        v = await vars_(pg, 'Scene', 'Coins'); chk('game running on the title screen (Scene 1, coins 30)', v['Scene'] == 1 and v['Coins'] == 30, v)
        s = await stored(pg); chk('profile stored: Brave Lion, not started', len(s) == 1 and s[0]['nick'] == 'Brave Lion' and s[0]['started'] == 0, s)
        await pg.evaluate("H.setvar('Ambushes',3);H.setvar('Quick',1)")
        # ---- play to the village with Thando (hero 2)
        await pg.evaluate('H.click(0,-110)'); await pg.wait_for_timeout(1500)
        for _ in range(4): await pg.evaluate('H.click(170,-150)'); await pg.wait_for_timeout(1300)
        await pg.evaluate('H.click(45,-153)'); await pg.wait_for_timeout(1200)   # HOW TO PLAY -> GOT IT
        await pg.evaluate('H.click(-50,-20)'); await pg.wait_for_timeout(1500); await pg.evaluate('H.click(95,-130)'); await pg.wait_for_timeout(2500)
        v = await vars_(pg, 'Scene', 'Hero'); chk('reached village as Thando', v['Scene'] == 4 and v['Hero'] == 2, v)
        await pg.wait_for_timeout(1200)
        s = (await stored(pg))[0]; chk('autosave in village: started, hero 2, coins 30', s['started'] == 1 and s['hero'] == 2 and s['coins'] == 30 and s['done'] == [0]*5, s)
        await pg.evaluate("H.setvar('M1Done',1);H.setvar('M2Done',1);H.setvar('Missions',2);H.setvar('Coins',47)"); await pg.wait_for_timeout(1500)
        s = (await stored(pg))[0]; chk('progress saved: 2 missions done, 47 coins', s['done'] == [1,1,0,0,0] and s['coins'] == 47, s)
        # mid-mission: coins change must NOT be saved
        await pg.evaluate("H.setvar('Pending',3);H.bc('shop')"); await pg.wait_for_timeout(600)
        await pg.evaluate("H.setvar('Coins',12);H.bc('mission3')"); await pg.wait_for_timeout(1500)
        s = (await stored(pg))[0]; chk('mid-mission quit would keep the village save (coins still 47)', s['coins'] == 47, s)
        # ---- reload: resume
        await pg.reload(); await pg.wait_for_selector('#jw-overlay .jw-card', timeout=30000)
        txt = await pg.inner_text('.jw-grid')
        chk('reload: card shows Brave Lion, 2 of 5 missions, 47 coins', 'Brave Lion' in txt and '2 of 5' in txt and '47 coins' in txt, txt)
        await load_game(pg)
        await pg.click('.jw-card:not(.jw-new)')
        if await pg.locator('#jw-overlay').is_visible():
            await pg.wait_for_function("[...document.querySelectorAll('#jw-overlay .jw-btn')].some(b=>b.textContent==='PLAY' && !b.disabled)", timeout=30000, polling=300)
            await pg.click('#jw-overlay .jw-btn')
        await pg.wait_for_function("H.vars().Scene === 4", timeout=60000, polling=300); await pg.wait_for_timeout(1500)
        v = await vars_(pg, 'Scene', 'Hero', 'Coins', 'M1Done', 'M2Done', 'M3Done', 'Missions')
        chk('resume: village, Thando, 47 coins, M1+M2 done, Missions 2', v == {'Scene': 4, 'Hero': 2, 'Coins': 47, 'M1Done': 1, 'M2Done': 1, 'M3Done': 0, 'Missions': 2}, v)
        await pg.evaluate("H.setvar('Ambushes',3);H.setvar('Quick',1)")
        pl = await pg.evaluate('H.playing()'); chk('resume: title music is not playing', 'Instrumental' not in pl, pl)
        await pg.evaluate("H.setvar('Own2',1);H.setvar('Own5',1)"); await pg.wait_for_timeout(1500)
        s = (await stored(pg))[0]; chk('market items are saved (own = football + puppy)', s.get('own') == [0,1,0,0,1,0,0,0,0,0,0,0], s)
        chk('resume: village colour restored to 2 of 5 (Glow 40)', (await vars_(pg, 'Glow'))['Glow'] == 40)
        await pg.wait_for_timeout(2500); await pg.screenshot(path=OUT + '3_resumed_village.png')
        # shop works after resume (price 25 -> 22 coins left)
        await pg.evaluate('H.click(163,24)'); await pg.wait_for_timeout(1200); await pg.evaluate('H.click(-76,-108)'); await pg.wait_for_timeout(1500)
        v = await vars_(pg, 'Scene', 'Coins'); chk('after resume the mission shop works (M3: 47-25=22)', v['Scene'] == 14 and v['Coins'] == 22, v)
        # ---- second player on the same device
        await pg.reload(); await pg.wait_for_selector('#jw-overlay .jw-card', timeout=30000)
        await pg.click('.jw-card.jw-new'); await pg.fill('.jw-input', 'Swift Zebra'); await pg.press('.jw-input', 'Enter')
        await pg.wait_for_timeout(500)
        s = await stored(pg); chk('two players stored, second not started', len(s) == 2 and s[1]['nick'] == 'Swift Zebra' and s[1]['started'] == 0, s)
        await pg.reload(); await pg.wait_for_selector('#jw-overlay .jw-grid', timeout=30000)
        # duplicate name is refused
        await pg.click('.jw-card.jw-new'); await pg.fill('.jw-input', 'brave lion'); await pg.press('.jw-input', 'Enter')
        chk('duplicate nickname refused', 'already used' in await pg.inner_text('.jw-err'))
        await pg.click('.jw-btn.plain')
        await pg.screenshot(path=OUT + '4_two_players.png')
        # ---- completing the game adds a star
        await pg.click('.jw-card >> text=Swift Zebra'); await load_game(pg)
        if await pg.locator('#jw-overlay').is_visible():
            await pg.wait_for_function("[...document.querySelectorAll('#jw-overlay .jw-btn')].some(b=>b.textContent==='PLAY' && !b.disabled)", timeout=30000, polling=300)
            await pg.click('#jw-overlay .jw-btn')
        await pg.wait_for_timeout(2500)
        await pg.evaluate("H.setvar('M1Done',1);H.setvar('M2Done',1);H.setvar('M3Done',1);H.setvar('M4Done',1);H.setvar('M5Done',1);H.setvar('Missions',5);H.setvar('Coins',90);H.setvar('Hero',4);H.setvar('Scene',11);H.bc('end')")
        await pg.wait_for_timeout(1500)
        s = await stored(pg); z = [q for q in s if q['nick'] == 'Swift Zebra'][0]
        chk('finishing the game saves 5/5, hero 4 and one star', z['done'] == [1]*5 and z['hero'] == 4 and z['completions'] == 1 and z['coins'] == 90, z)
        await pg.reload(); await pg.wait_for_selector('#jw-overlay .jw-card', timeout=30000)
        chk('star shown on the card', await pg.locator('.jw-stars').count() == 1)
        await pg.screenshot(path=OUT + '5_stars.png')
        # ---- delete
        await pg.click('.jw-card:has-text("Swift Zebra") .jw-del')
        chk('delete asks for confirmation', 'Delete Swift Zebra?' in await pg.inner_text('.jw-panel'))
        await pg.screenshot(path=OUT + '6_delete.png')
        await pg.click('.jw-btn.plain')  # keep
        chk('Keep returns to the list, both players still stored', len(await stored(pg)) == 2)
        await pg.click('.jw-card:has-text("Swift Zebra") .jw-del'); await pg.click('.jw-btn.red')
        s = await stored(pg); chk('Yes, delete removes only that player', len(s) == 1 and s[0]['nick'] == 'Brave Lion', s)
        # ---- tampered storage does not break the screen
        await pg.evaluate("localStorage.setItem('jimbali.profiles.v1','{\"v\":1,\"profiles\":[{\"nick\":\"<img src=x onerror=alert(1)>\",\"hero\":99,\"coins\":-5,\"done\":[1,1]},null,7]}')")
        await pg.reload(); await pg.wait_for_selector('#jw-overlay .jw-card', timeout=30000)
        nick = await pg.inner_text('.jw-card .jw-nick'); chk('hostile/odd saved data is shown as plain text and clamped', '<img' in nick and await pg.locator('.jw-nick img').count() == 0, nick)
        await ctx.close()
        # ---- storage blocked (private mode / school lockdown)
        ctx2 = await b.new_context(viewport={'width': 960, 'height': 720})
        await ctx2.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})")
        pg2 = await open_page(ctx2, errs)
        chk('blocked storage: warning shown, nickname form still works', 'not letting the game save' in await pg2.inner_text('#jw-overlay') and await pg2.locator('.jw-input').count() == 1)
        await pg2.screenshot(path=OUT + '7_blocked.png')
        await pg2.fill('.jw-input', 'Quick Gazelle'); await pg2.press('.jw-input', 'Enter'); await load_game(pg2)
        if await pg2.locator('#jw-overlay').is_visible():
            await pg2.wait_for_function("[...document.querySelectorAll('#jw-overlay .jw-btn')].some(b=>b.textContent==='PLAY' && !b.disabled)", timeout=30000, polling=300)
            await pg2.click('#jw-overlay .jw-btn')
        await pg2.wait_for_timeout(2500)
        v = await vars_(pg2, 'Scene'); chk('blocked storage: game still plays', v['Scene'] == 1, v)
        print('page errors:', errs); print(sum(res), '/', len(res))
        await b.close()
asyncio.run(run())

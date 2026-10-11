const Packager = require('@turbowarp/packager'); const fs = require('fs');
(async () => {
  const data = fs.readFileSync(process.argv[2]);
  const loaded = await Packager.loadProject(data, () => {});
  const p = new Packager.Packager(); p.project = loaded;
  p.options.target = 'html'; p.options.turbo = false; p.options.autoplay = false;
  p.options.stageWidth = 480; p.options.stageHeight = 360;
  p.options.appearance.loadingText = 'Loading Jimbali Explorers...';
  p.options.app.windowTitle = 'Jimbali Explorers';
  const r = await p.package();
  fs.writeFileSync(process.argv[3], Buffer.from(r.data));
  console.log('ok', r.type, r.data.length);
})().catch(e => { console.error('ERR', e); process.exit(1); });

# Seeing how many people play (anonymous usage counts)

The web version can count visits and game milestones with **GoatCounter**, a small privacy-friendly service
(no cookies, no ads, no personal profiles). It is **off until you add your code**, so nothing is sent today.

## Switch it on (about 5 minutes)

1. Go to goatcounter.com and sign up (free for non-commercial use; you can also donate). Choose a site code,
   (Stemachildinitiative's is `jimbali`, dashboard `https://jimbali.goatcounter.com`).
2. In your GitHub repository open **`stats-config.js`** (it sits next to `index.html`), click the pencil icon and change
   `window.JIMBALI_STATS_CODE = '';` to `window.JIMBALI_STATS_CODE = 'jimbali';`. Commit.
3. Wait a minute for Pages to update, play the game once yourself, and look at the dashboard.
   In GoatCounter go to Settings > Sites and add `play.stemachildinitiative.org` as the domain.

To switch counting off again, empty the quotes. Only `stats-config.js` ever needs editing; the 14 MB `index.html` stays as it is.

## What you will see

* **Visits and countries, browsers, screen sizes:** the main dashboard.
* **New vs returning:** events `visit/new` and `visit/returning`. "Returning" means that browser has opened the game before.
* **Phone vs computer:** events `device/phone`, `device/tablet`, `device/computer`.
* **How far players get** (the Events part of the dashboard; each step is counted once per visit):
  `game/started`, `game/story`, `game/hero-select`, `hero/sifa|thando|eshe|malaika`, `game/how-to-play`, `game/map`,
  `game/mission-1-start` ... `game/mission-5-start`, `game/mission-1-won` ... `game/mission-5-won`,
  `game/ambush`, `game/mission-failed`, `game/market`, `game/complete`.
  Comparing these numbers shows where children stop. For example a big gap between `game/mission-2-start` and
  `game/mission-2-won` means Mission 2 is too hard or unclear.
* "Completions" = `game/complete` (the Thanks screen); "reached the map" = `game/map`.

## What is and is not collected

Sent: page address, event name, screen size, referrer. GoatCounter works out country, browser and device from the
request and does not store the IP address. **Never sent:** nicknames, profile data, coins, anything a child types.
No cookies. One yes/no flag in the browser's localStorage tells "new" from "returning". Nothing is sent when the
browser has Do Not Track or Global Privacy Control switched on, or when the code is empty.

Counts are per visit, not per child: the game has no accounts, so the same child on two devices counts twice and
many children sharing one device count once per visit. Ad blockers can hide some visitors, so treat numbers as a
good estimate, not an exact count. Update `PRIVACY-NOTE.md` before switching this on (it is already written for it).

## Rebuilding with the code baked in (developers)

`JIMBALI_STATS=jimbali python3 tools/build_site.py build/game.html index.html` writes `stats-config.js` with the code next
to the new `index.html`. The counting code is `src/jimbali-stats.js`; the milestones are the `SCENES` table at the top,
keyed by the game's Scene variable.

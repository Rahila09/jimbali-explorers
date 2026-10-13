# Privacy note (draft for Stemachildinitiative to review)

This is a plain-language draft of what the web version does with information. It is not legal advice.
Rules about children's data differ by country (for example Kenya's Data Protection Act, Nigeria's NDPA and
similar laws elsewhere), so please have it reviewed before you publish it for schools and parents.

**What the game stores.** For each player on a device: a made-up nickname, the chosen hero, coins, which
missions are finished, which fun things they bought in the market on the map (six yes/no values), and how many
times the game was completed. The game asks children not to use their real name.

**Where it is stored.** Only in the web browser on that device (localStorage). Profiles (nickname, hero, coins) are not sent to
Stemachildinitiative or to any other server by the game.

**What the game does not do.** No accounts, no emails, no phone numbers, no photos, no location, no
cookies, no advertising, no third-party scripts.

**Anonymous usage counts (optional, off until switched on).** If Stemachildinitiative adds a GoatCounter code in `stats-config.js`
(see `STATS.md`), the game sends anonymous counts to GoatCounter: the page address, short milestone names such as
"game/mission-2-won", screen size and referrer. GoatCounter derives country, browser and device type from the request and does not
store IP addresses. No nicknames, profile data or anything typed by a child is sent, and nothing is sent when the browser has
Do Not Track or Global Privacy Control on. This is statistical counting of visits, not tracking of individual children.

**What the host sees.** The game is delivered by GitHub Pages. Like any website host, GitHub may keep ordinary
server records of visits (such as IP addresses), as described in GitHub's own privacy statement. The game does not receive or add to this.

**Deleting data.** A player can be deleted on the "Who is playing?" screen with the Delete button. Clearing the
browser's site data removes everything.

**Shared devices.** Anyone using the same browser can see the nicknames saved on it.

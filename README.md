# CREASE — The cricket board game

A complete browser game with real player portraits, AI opponents, online party codes and an ordered match setup.

Start with **Solo vs AI or Multiplayer**, then choose **Board Cricket or Cricket Monopoly**. Board Cricket adds a team-formation step: **Live auction or Roll & Recruit**. After both squads are full, call the toss; the winner chooses to bat or bowl, then play the dice cricket match. The homepage opens a compact New Game window. Every captain chooses a name, avatar and franchise; the host chooses overs and players per squad. The lobby shows joined captains first. The host can remove other captains, adjust overs and squad size, then proceed to team formation.

- **The Auction:** bid or pass on 200 curated IPL stars, then play a head-to-head dice cricket match.
- **Roll & Recruit:** roll two dice around a player board, buy your squad, then take the field.
- **Cricket Monopoly:** 2–4 captains buy players, earn and transfer runs, dodge wickets, and chase the highest score.

Choose 1, 2, 5, 10 or 20 overs and squads of 3, 5, 7 or 11. Budgets and prices adjust to squad size and lobby capacity. The host can select a custom purse (₹5–100 Cr presets, or enter any affordable amount up to ₹500 Cr) in setup or the lobby; the setup minimum covers a budget squad. Human bids are limited only by actual remaining cash; only the CPU plans reserves for later slots. Gray players start at ₹0.3 Cr before market scaling. The automatic purse is reduced to roughly ₹2.2 Cr per slot before game-size scaling. Player base prices stay fixed when changing only the purse. Auction and draft matches are head-to-head. Monopoly supports 2–4 captains, including AI seats. Solo games save on the current browser; online parties save on the server. Party codes expire after 24 hours of inactivity.

## What's new in this version

- **Screen-locked game views.** Auction, board, toss and match screens now fit inside the browser window (no page scrolling). On phones the play area scrolls inside itself and the main action buttons stay pinned to the bottom.
- **New stadium.** Floodlit ground with crowd, boundary boards, proper cricketers (batters with pads and helmets, keeper, umpire) and a full replay for every ball: bowler run-up, delivery, shot, fielder chase, running between wickets, stumps flying, catches, run-outs, umpire signals, boundary rope flash and fireworks for sixes.
- **Auction sets and tags.** Players come up in order: Gold **MARQUEE** set, then Red **ELITE**, Blue **CORE** and Gray **ROOKIE**. Tags are shown everywhere players appear.
- **UNSOLD popup**, an **Up next** card, and an **Auction tracker** table at the bottom with every lot's status (on the block / sold / unsold / auto-fill), buyer and price.
- **Play online from a Claude link.** When the game is opened as a Claude artifact, parties are stored in the artifact's shared database instead of the party server. Your friend needs edit access to the artifact.

Note: multiplayer from GitHub Pages still uses the hosted party server configured in `lib/paths.ts`. That server runs the game rules it was deployed with, so Pages parties keep its older auction order until the server is redeployed from this source. Solo games on Pages use the new rules.

## Play online

Full source archive: https://crease-cricket-club.relaxedtang1.chatgpt.site/downloads/crease-source.tar.gz

The full game and party server: https://crease-cricket-club.relaxedtang1.chatgpt.site

This address is configured as the default multiplayer service for GitHub Pages clients. Keep this service running if you publish the frontend on Pages. The site address above is only live after its deployment succeeds.

## Publish on GitHub Pages

1. Create a GitHub repository named `crease-cricket` (or any name) and upload/push this project to its `main` branch. Do not include `node_modules`, `.wrangler`, local saves, or credentials.
2. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
3. The included `.github/workflows/pages.yml` downloads the verified source archive into its temporary build workspace, installs dependencies, runs the rules tests, builds the static game, and deploys it to Pages. The workflow has read-only access to repository contents; it does not push commits. You can also run it from the **Actions** tab.
4. Once the deployment completes, open `https://anisoni109.github.io/Crease/`, create a party, and share the invite link or 8-character code with your friends.

No account or API key is required for game players. The Pages build uses relative asset paths, so repository subdirectories work. The party service handles server-authoritative dice, bids, purchases, turn validation and concurrent updates. GitHub Pages itself is static and cannot run this shared service.

To use a different party server, set the repository Actions variable `PARTY_SERVER_URL` to its HTTPS origin and rerun the workflow. The supplied server allows requests from the game origin and HTTPS `*.github.io` clients. Add an explicit origin allowlist if you use a custom domain. Never put server secrets in `VITE_` variables; they are public in the browser build.

Official GitHub documentation: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Develop locally

Requires Node 24 (Node 22.13+ also supports the server framework).

```sh
npm ci
npm test
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_flaky_beast.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_uneven_norman_osborn.sql
npm run dev -- --port 5173
```

The local database migration is needed once for multiplayer. Solo games work without the database. `npm start -- --port 5174` previews the production Worker after a build, using the same local database.

```sh
npm run build:pages
```

This creates the static site in `github-pages/`. Serve it with any static web server. All 200 portraits and fonts are included locally. For local static previews connecting to a separate server, pass `VITE_PARTY_SERVER` during the build and configure that server to allow the preview origin. A normal Pages build uses the default online service.

## Game rules

### Dice cricket

Each captain chooses a player before rolling one die. Batting and bowling have separate skill ratings and tiers:

| Tier | Skill | Batting | Bowling |
| --- | --- | --- | --- |
| Gold | 90+ | die +3 | die +1 |
| Red | 80–89 | die +2 | die |
| Blue | 68–79 | die +1 | die −1 |
| Gray | below 68 | die | die −2 |

A lower batting total is a wicket; equal totals are a dot ball. A higher batting total scores the **difference** between the batting total and bowling total, capped at **6**. A difference of **5 scores 4**. For example, batting 8 versus bowling 5 earns 3 runs. One batter roll plus one bowler roll together count as **one ball**, never two. Both captains must roll before the ball resolves. Bowlers complete full overs, rotate at over boundaries, and have a quota of `ceil(overs / min(5, squadSize))` overs each. The automatic selection balances their workload, avoids consecutive overs when another eligible bowler is available, and falls back to a continuing bowler only when no alternative has quota. Each captain can enable autoplay for selected overs or the rest of the innings. Batters run only on scores of 1, 2 or 3; boundaries of 4 or 6 have no running animation. The field places both sets of stumps, popping creases, striker, non-striker, bowler and keeper separately. Shot directions vary on each delivery and are shared between all players. The opponent's current die is concealed. Dismissed batters cannot return. The innings ends after overs × 6 balls or after every squad member is dismissed. After team formation, the first captain calls heads or tails. The toss winner chooses to bat or bowl; either seat can bat first. The other captain chases, and equal final scores are a tie. A broadcast-style score strip shows live team totals, wickets, overs, batter and bowler figures, current/required rates, target and recent balls.

### Auctions and drafting

The bid increases by ₹0.2 Cr. Passing eliminates that captain from the current lot; the last bidder gets the player. Money for the remaining squad places is reserved. Unsold pools and a 120-roll draft limit have a finite squad-completion fallback. The host can also quick-complete squads. AI captains consider remaining batting and bowling needs, preserve squad reserves, and explain unwanted-player skips. Both captains may pass so a lot goes unsold. Auto-completion uses a balanced snake order and base prices, preserving prior signings.

### Cricket Monopoly

The board has 32 spaces, including 24 unique player spaces. It prioritizes the selected franchises and adds world-pool players if needed. One roll is one ball; each captain gets overs × 6 rolls. Purchases score `ceil(price × 2)`. Own-player landings score `ceil(price × 3)`; rival-player landings transfer up to that many runs to the owner. Scores cannot be negative. Passing Powerplay gives +6; landing exactly on Powerplay adds its tile bonus as well. Wides/no balls add a run and a free roll, capped at two consecutive free rolls. Wickets cost up to 6 runs. A ×2 tile adds the most recent positive scoring gain again. The highest final run total wins.

## Scorebook and rematches

The bottom broadcast panel shows batting/bowling teams, runs, wickets, overs, target, required runs and balls, run rates, batter and bowler figures, and recent balls. Finished matches offer a scorecard, Statistics, and Rematch. A board-cricket rematch preserves the squads and starts a fresh toss; Monopoly resets its board and purse. The host starts rematches, while guests can request one.

Multiplayer results and both teams’ full batting/bowling cards are saved in D1 once per party round. Captain totals include wins, losses, ties, runs, bowling wickets (excluding run outs), fours and sixes. The Statistics page lists opponents from your matches and paginates older results. A browser-held random captain ID and private key protect history access; clearing browser data or changing browser/device creates a different captain profile. There is no cross-device account login. Solo play keeps the latest 30 results on the device.

## Validation

`npm test` covers run caps and the 5-to-4 conversion, host kick permissions, bowler quotas and rotation, selected-over autoplay, squad-balance advice, actual-cash human bids, independent CPU passes, Gold priorities, bid ceilings, cheap-player completion, auction payments and CPU budget reserves, full-draft fallbacks, purchases and run transfers, free rolls and wickets, tier comparisons, hidden opponent dice, player selection and dismissal, all franchise board combinations, 4-captain Monopoly, and 45 seeded full-game simulations. `npm exec tsc -- --noEmit` checks the interface and server types.

For a running production preview, `TEST_ORIGIN=http://127.0.0.1:5174 node scripts/smoke-party.mjs` checks two independent seats, token isolation, code joining, host permissions, full-party rejection, stale writes, duplicate roll rejection, ball resolution, saved full-match history, profile isolation, idempotent result recording, rematches and GitHub Pages CORS. The development server intentionally rejects external origins before the application, so run this integration check against the production preview.

## Source and assets

- `app/page.tsx` — full client game and menus.
- `components/CricketArt.tsx` — board illustration and animated field.
- `lib/game.mjs` — shared game engine used by solo play and the server.
- `lib/players.json` — curated 200-player roster, game ratings and source URLs.
- `app/api/room/route.ts` — shared-party API with private seat tokens and optimistic concurrency.
- `db/schema.ts`, `drizzle/` — D1 room storage and migration.
- `pages-app/`, `vite.pages.config.ts` — independent static frontend build for GitHub Pages.

Player names, roles and portraits were retrieved from the official IPL team directory, with portrait repairs from Punjab Kings, BCCI and ESPNcricinfo (https://www.iplt20.com/teams) on 9 Nov 2026. The pool is curated and is not an official popularity ranking. Ratings, tiers and prices are game design estimates, not official sporting ratings, auction prices or financial valuations. Team symbols are original simple typographic emblems, not official team crests. This is an independent fan project; player portraits and franchise names belong to their respective rights holders. Fonts are Barlow Condensed and DM Sans, from Google Fonts.

Auction AI reference: official IPL 2026 retained-squad/purse disclosures (https://www.iplt20.com/news/article/tata-ipl-2026-player-retentions-announced), the official auction reserve-price list (https://www.iplt20.com/news/article/tata-ipl-2026-player-auction-list-announced), and Mumbai Indians’ auction guide (https://www.mumbaiindians.com/news/timings-rules-slots-money-ultimate-mi-guide-for-ipl-2025-mega-auction-day-faqs). Game AI prioritizes Gold/Red players, caps bids using its remaining purse and slots, waits for stronger remaining role options, and only considers cheaper fillers as the auction progresses or its purse tightens.

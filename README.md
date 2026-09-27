# TUN Gaming & War Simulator — Discord Bot

This is a working foundation for the platform described in your spec
document, built to the **MVP scope your own spec recommends in section
24** — the architecturally hardest pieces are all here and working, so
every remaining game/feature in your roadmap can be added later without a
rewrite.

**Read this before anything else:** the full spec describes a huge,
multi-team platform (chess, scrabble, minesweeper, racing, tournaments,
a full PnW-style war simulator, a training academy with scoring, admin
dashboards...). What's in this zip is not a mockup — it's real, working
code — but it is the MVP slice: the session framework, the independent
combat/economy rules engine, PnW linking, the war simulator (ground/air/
naval/missile/nuke attacks), the scenario/override system for
instructors, chess (vs a friend or a simple AI), a lottery game, and all
the permissions/audit-log plumbing everything else will plug into. See
**"What's built vs. what's next"** near the bottom for the honest
breakdown.

---

## 0. What you'll need

- **Node.js 18 or newer** — download from https://nodejs.org (pick the
  "LTS" version). To check if you already have it, open a terminal and run
  `node -v`.
- **VS Code** (you already have this).
- A **Discord account** and a server where you can add bots.
- Nothing else — no database to install. This project uses SQLite, which
  is just a file on your computer, not a program you install or run.

---

## 1. Create the Discord bot application

1. Go to https://discord.com/developers/applications → **New Application**.
   Name it (e.g. "TUN Gaming Bot").
2. In the left sidebar, click **Bot** → **Reset Token** (or "Add Bot" if
   it's your first time) → copy the token. Keep this secret — anyone with
   it can control your bot. You'll paste it into `.env` in step 3.
3. On the same **Bot** page, scroll to **Privileged Gateway Intents** and
   turn ON **Message Content Intent**.
4. In the left sidebar, click **OAuth2 → URL Generator**:
   - Under **Scopes**, check `bot` and `applications.commands`.
   - Under **Bot Permissions**, check: Send Messages, Embed Links, Read
     Message History, Use Slash Commands, Manage Messages (nice-to-have).
   - Copy the generated URL at the bottom, open it in your browser, and
     add the bot to your server.
5. Back on the **General Information** page of your application, copy the
   **Application ID** — this is your `DISCORD_CLIENT_ID`.

---

## 2. Open the project in VS Code

1. Unzip the folder you downloaded anywhere on your computer.
2. In VS Code: **File → Open Folder…** → select the unzipped `tun-bot`
   folder.
3. Open a terminal inside VS Code: **Terminal → New Terminal**.
4. Install dependencies (downloads all the code libraries this project
   needs — only needs to be done once, or after you change `package.json`):

   ```
   npm install
   ```

---

## 3. Configure your `.env` file

1. In the file explorer (left side of VS Code), find `.env.example`.
   Right-click it → **Copy**, then **Paste**, then rename the copy to
   `.env` (exactly that, with the leading dot).
2. Open `.env` and fill in:
   - `DISCORD_TOKEN` — from step 1.2 above.
   - `DISCORD_CLIENT_ID` — from step 1.5 above.
   - `DISCORD_GUILD_ID` — (recommended while testing) right-click your
     Discord server icon → Copy Server ID (you need Developer Mode on:
     Discord Settings → Advanced → Developer Mode). Commands registered
     to one server show up instantly; global commands can take an hour.
   - Leave `DB_DIALECT=sqlite` and `DB_STORAGE_PATH` as-is — this is the
     "no Postgres headache" setup you asked for.
   - The `ROLE_*` variables are optional but recommended: create Discord
     roles like "Game Admin" and "Sim Admin" in your server, then paste
     their role IDs in here (right-click a role in Server Settings →
     Roles → ... → Copy Role ID). Without these set, only server
     Administrators can use admin/instructor commands.

**Never commit or share your `.env` file** — it contains your bot's
password, essentially. `.gitignore` is already set up to keep it out of
git if you use version control.

---

## 4. Register the slash commands

Every time you add or change a command, run:

```
npm run deploy-commands
```

This tells Discord what commands exist (`/hub`, `/chess`, `/sim`, etc.).
You only need to re-run it when commands change, not every time you start
the bot.

---

## 5. Run the bot

```
npm start
```

You should see `Logged in as YourBotName#1234...` in the terminal. In
Discord, type `/hub` in a channel the bot can see.

To stop the bot, press `Ctrl+C` in the terminal.

While developing, `npm run dev` restarts the bot automatically whenever
you save a file.

---

## 6. Try it out

- `/hub` — opens the Gaming Hub with buttons for Chess, Lottery, and the
  War Simulator.
- `/chess start` — start a chess game (add `vs_ai:true` to play the bot).
- `/sim nation create` — create a sandbox nation with no PnW account
  needed, so anyone can try the war simulator immediately.
- `/sim link api_key:<your PnW API key>` — import your real Politics &
  War nation's stats as a starting point. **Your API key is never
  stored** — it's used once to verify you own the nation, then discarded.
  We recommend regenerating your key on politicsandwar.com right after.
- `/sim war declare target:@someone` then use the attack buttons on the
  war dashboard, or `/sim attack launch`.
- `/sim scenario create/add/override/start/end` — instructor tools. A
  scenario clones a participant's nation; overrides only ever touch that
  clone, so their real simulator nation is untouched and is automatically
  "restored" the moment the scenario ends.
- `/lottery buy`, `/daily`, `/balance` — casual gaming currency, kept
  completely separate from the war simulator's economy.
- `/admin give_currency`, `/admin force_end_war` — admin tools (Game
  Admin / Sim Admin roles or server Administrators only). Every admin
  action is written to an audit log in the database.

---

## 7. Deploying to Railway

1. Push this folder to a GitHub repo (or use Railway's "Deploy from
   local folder" / drag-and-drop if you prefer not to use git).
2. In Railway: **New Project → Deploy from GitHub repo**.
3. Under your service's **Variables** tab, add the same variables from
   your `.env` file (DISCORD_TOKEN, DISCORD_CLIENT_ID, etc.). Leave
   `DISCORD_GUILD_ID` blank once you're ready for the bot to work in any
   server it's invited to (commands then take up to an hour to appear
   globally the first time).
4. **Important for SQLite on Railway:** Railway's filesystem resets on
   every redeploy unless you attach a **Volume**. In your service →
   **Settings → Volumes**, add a volume mounted at `/data`, then set the
   variable `DB_STORAGE_PATH=/data/tun-bot.sqlite`. This keeps your
   nations, wars, and currency saved across deploys.
   - If you'd rather not deal with volumes at all, Railway also offers a
     one-click **Postgres** plugin — attach it, copy the `DATABASE_URL`
     it gives you into your variables, and set `DB_DIALECT=postgres`.
     Nothing else in the code needs to change.
5. Set the **Start Command** to `npm start` (Railway usually detects this
   automatically from `package.json`).
6. After the first deploy, run `npm run deploy-commands` once (either
   locally with the same `DISCORD_TOKEN`/`DISCORD_CLIENT_ID`, or via
   Railway's one-off "Run Command" feature) so Discord knows your
   commands.

---

## 8. Project structure

```
tun-bot/
  src/
    commands/        one file per slash command (/hub, /chess, /sim, ...)
    interactions/     button, select-menu, and modal handlers
    events/           Discord.js event listeners (ready, interactionCreate)
    database/
      models/         Sequelize models = your database tables
    services/
      rulesEngine/     combat/economy/turn math — no Discord/DB code, unit-testable
      pnwService.js    talks to the real Politics & War API (read-only)
      sessionService.js  shared "join/leave/ready/resign/rematch" logic for every game
      dashboardService.js  renders/updates the live embed for any game
      auditService.js  writes every sensitive action to the audit log
    simulation/        war/nation/scenario orchestration (uses the rules engine)
    games/
      chess/           chess.js wrapper + board rendering
      lottery/          ticket sales and draws
    ui/                embed + button builders, kept separate from logic
    utils/             logger, permissions, economy helpers, embed helpers
  test/                unit tests for the rules engine (run with `npm test`)
  deploy-commands.js   registers slash commands with Discord
```

The separation in `services/rulesEngine/` is deliberate (your spec asks
for this in section 13): combat and economy math live in plain functions
with no Discord or database code, so they can be tested and tuned in
isolation. Run `npm test` any time to check them.

---

## 9. What's built vs. what's next

**Built and working:**
- Unified game-session framework (join/leave/ready/resign/rematch) used
  by every game
- Chess (2-player or vs. a simple AI, 3 difficulty levels)
- Lottery with a separate, isolated gaming-currency economy
- PnW account linking (read-only, key never stored) and nation import
- Sandbox nations for anyone without a PnW account
- Independent combat rules engine: ground/air/naval/missile/nuke, with
  the four PnW-style outcome tiers, tuned but original formulas
- Independent economy engine: income, upkeep, resource production
- War declaration, attack execution, resistance tracking, battle log
- Scenario system: instructor-only, clone-and-override, non-destructive
  to a member's real simulator nation
- Role-based permissions (Game Admin, Sim Admin, Training Instructor,
  Tournament Manager, Moderator) and a full audit log
- SQLite storage (no install) with a one-line swap to Postgres if you
  ever want it

**Not built yet (roadmap, per your spec's later phases):**
- Scrabble, Minesweeper, racing/wheel games, tournaments/brackets
- Leaderboards (the button exists, currently a placeholder)
- Training/after-action scoring UI (the data model exists —
  `SimulationTrainingScore` — but no command uses it yet)
- Coalition/multi-nation wars, alliances
- A moderation/logging dashboard beyond the raw audit-log table

Every one of these plugs into the same session/dashboard/rules-engine
pattern already in place — none of them require rearchitecting what's
here.

---

## 10. If something breaks

- **"DISCORD_TOKEN is not set"** — you haven't created/filled in `.env`
  (see step 3).
- **Slash commands don't show up in Discord** — run
  `npm run deploy-commands`, and if you didn't set `DISCORD_GUILD_ID`,
  wait up to an hour (global commands are slow to propagate the first
  time).
- **"Cannot find module ..."** — run `npm install` again.
- Everything else: the terminal running `npm start` will print an error
  message — that's the first place to look.

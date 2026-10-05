# Inflation Lab

A small classroom simulator for inflation, purchasing power, and savings interest.

Open `dist/index.html` in any modern browser. Everything works offline; no installation or build is required. The Bank of England learning link needs internet access.

## Run as a website

With Node.js 24 installed, run these commands from the `inflation-lab` folder:

```sh
npm start
```

Open **http://localhost:3000**. Stop the server with Ctrl+C. There are no npm dependencies to install. Run `npm test` to check the server, site assets, and health endpoint.

## Deploy to Railway

1. Commit and push this project's files to your GitHub repository, including `dist/`, `Dockerfile`, `server.mjs`, and `package.json`.
2. In Railway, create a project using **Deploy from GitHub repo** and select that repository.
3. Use the directory containing `Dockerfile` as the service's **Root Directory**. This checkout is already rooted at `inflation-lab`, so leave the setting at `/` when uploading this repository. If your GitHub repository instead contains an outer `inflation-lab/` folder, set it to `/inflation-lab`.
4. Railway detects the Dockerfile and starts the server automatically. Leave custom Build Command and Start Command empty. If you need an explicit Start Command, use `node server.mjs`.
5. Under the service's deployment settings, set **Healthcheck Path** to `/health`.
6. Under **Settings → Networking → Public Networking**, select **Generate Domain**. Open that address to present the site.

The server listens on `0.0.0.0` and the `PORT` Railway supplies, with port 3000 as the local default. No API keys, database, volume, or other environment variables are required. `EXPOSE 3000` in the Dockerfile documents the local default; the running server still uses Railway's assigned `PORT`.

The generated domain serves the site publicly. Class Challenge runs independently in each browser tab; students participate through the host's projected screen, and scores reset on reload.

Railway's current documentation: [Dockerfile detection](https://docs.railway.com/builds/dockerfiles), [health checks](https://docs.railway.com/deployments/healthchecks), [root directories](https://docs.railway.com/deployments/monorepo), and [public domains](https://docs.railway.com/networking/public-networking).

The Dockerfile copies only the server and public site files. It does not need a build step or package installation. The `dist/` files can still be opened directly for an offline presentation.

## Using the simulator

Adjust starting savings, inflation, annual savings interest, and years. Use the three scenarios or **Watch time pass** to present the changes year by year. **Reset** restores the starting example. The explanation and optional formulas are below the simulator.

The model assumes constant rates, annual compounding, no deposits or withdrawals, and no taxes or fees. The lunch is a hypothetical item that follows the selected average inflation rate. The savings rate is independent of inflation in this model; monetary policy is explained separately.

Files: `dist/index.html` (content), `dist/styles.css` (appearance), `dist/app.js` (calculations and interaction).

Calculations use full precision and round only for display. Dollar amounts use US formatting. Example rates are not live economic data.

## Class Challenge

Select **Class challenge**, enter five team names, and start. This is a shared-screen activity: groups of 4–5 students discuss and write answers on paper, then the host enters them. Students do not need devices or accounts.

Each of the four prediction rounds starts with $100 and hides results until **Reveal results**. The optional 45-second discussion timer can pause, resume, or reset. Time running out does not reveal the answer or prevent the host from entering the teams' written responses.

Correct predictions automatically earn 2 points. The host can award or undo a 1-point explanation bonus per team per round. The mystery-number finale awards 2 points to the closest estimate; ties share the bonus. Comparisons use cents, matching the displayed answer. A skipped prediction or blank finale guess earns no points. Each team can earn up to 14 points.

Switching back to Explore pauses the discussion timer and keeps the game. Reloading or closing the page resets it. **New game** asks before clearing scores. The final screen supports tied winners.

`dist/challenge.js` contains the round definitions, scoring, timer, and game interactions. `dist/challenge.css` styles the game. Both modes use the same calculations and chart renderer from `dist/app.js`.

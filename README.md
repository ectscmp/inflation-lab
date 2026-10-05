# Inflation Lab

A small classroom simulator for inflation, purchasing power, and savings interest.

Open `dist/index.html` in any modern browser. Everything works offline; no installation or build is required. The Bank of England learning link needs internet access.

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

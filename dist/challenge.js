'use strict';

const CHALLENGE_ROUNDS = [
  { title: 'The $100 question', inflation: 5, interest: 0, years: 5,
    question: 'You still have $100 after five years. Can it buy more, less, or the same as it buys today?',
    answer: 'less', reveal: 'The same $100 buys less.',
    explanation: 'Your balance stays at $100, but prices rise each year. With no interest to help your money grow, its purchasing power falls.' },
  { title: 'A growing balance', inflation: 5, interest: 2, years: 5,
    question: 'Your account earns interest. After five years, can your savings buy more, less, or the same as today?',
    answer: 'less', reveal: 'More dollars can still buy less.',
    explanation: 'Your savings grow at 2% a year, while prices rise at 5%. Your account balance increases, but it cannot keep up with the cost of goods and services.' },
  { title: 'An even match', inflation: 4, interest: 4, years: 10,
    question: 'Interest and inflation are both 4%. After ten years, will your savings buy more, less, or the same as today?',
    answer: 'same', reveal: 'Your buying power stays the same.',
    explanation: 'Your savings and prices grow at exactly the same rate. You have more dollars, but those dollars buy the same amount as your original $100.' },
  { title: 'A different pace', inflation: 2, interest: 5, years: 10,
    question: 'Savings earn 5% while prices rise 2%. After ten years, can your money buy more, less, or the same as today?',
    answer: 'more', reveal: 'Your savings gain buying power.',
    explanation: 'Your savings grow faster than prices. After adjusting for inflation, you can afford more than your original $100 could buy.' },
  { title: 'The mystery number', inflation: 3, interest: 1, years: 10, finale: true,
    question: 'After ten years, what is your savings’ buying power in today’s dollars?',
    explanation: 'Interest grows the balance, but inflation reduces what it buys. Divide the future balance by the growth in prices to find its value in today’s dollars.' }
];

// Score each revealed round from its answers, rather than incrementing totals.
// This makes repeated rendering and changing an explanation bonus safe.
function scoreChallengeRound(round, record, calculator) {
  const scores = Array(5).fill(0);
  if (!record?.revealed) return scores;
  if (!round.finale) {
    return scores.map((_, i) => {
      const answered = ['more', 'less', 'same'].includes(record.predictions[i]);
      return (record.predictions[i] === round.answer ? 2 : 0) + (answered && record.bonuses[i] ? 1 : 0);
    });
  }
  // Compare cents so a guess matching the displayed answer is exact.
  const target = Math.round(calculator(100, round.inflation, round.interest, round.years).purchasing * 100);
  const distances = record.predictions.map(value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000000 ? Math.abs(Math.round(value * 100) - target) : Infinity);
  const closest = Math.min(...distances);
  return distances.map(distance => Number.isFinite(closest) && distance === closest ? 2 : 0);
}

if (typeof module !== 'undefined' && module.exports) module.exports = { CHALLENGE_ROUNDS, scoreChallengeRound };

if (typeof document !== 'undefined') {
  (() => {
    const $ = id => document.getElementById(id);
    const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    const labels = { more: 'More', less: 'Less', same: 'The same', pass: 'No answer' };
    const create = (tag, className, text) => {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = text;
      return element;
    };
    const announce = text => { $('challenge-announcement').textContent = text; };
    const game = { teams: [], records: [], round: 0, active: false, finished: false };
    const teamInputs = [];
    let predictionInputs = [];
    let mode = 'explore';
    let timerHandle = null;
    let remaining = 45000;
    let deadline = 0;
    let timerStarted = false;

    for (let i = 0; i < 5; i++) {
      const row = create('div', 'team-name-row');
      const label = create('label', '', `Team ${i + 1}`);
      const input = create('input');
      input.id = `team-name-${i}`;
      input.name = `team-${i + 1}`;
      input.type = 'text';
      input.maxLength = 24;
      input.value = `Team ${i + 1}`;
      input.autocomplete = 'off';
      label.htmlFor = input.id;
      row.append(label, input);
      $('team-name-fields').append(row);
      teamInputs.push(input);
    }

    function stopClock() {
      if (timerHandle !== null) clearInterval(timerHandle);
      timerHandle = null;
    }

    function drawClock() {
      const seconds = Math.ceil(remaining / 1000);
      $('timer-display').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      $('timer-display').setAttribute('aria-label', `${seconds} seconds remaining`);
      $('discussion-timer').classList.toggle('time-up', remaining === 0);
      $('timer-toggle').disabled = remaining === 0;
      $('timer-toggle').textContent = timerHandle !== null ? 'Pause timer' : timerStarted ? 'Resume timer' : 'Start timer';
    }

    function tick() {
      remaining = Math.max(0, deadline - Date.now());
      if (remaining === 0) {
        stopClock();
        $('timer-status').textContent = "Time’s up! Pens down.";
        announce('Time is up. Teams, show your written answers together. The host can now enter them and reveal results.');
      }
      drawClock();
    }

    function pauseClock() {
      if (timerHandle === null) return;
      tick();
      stopClock();
      if (remaining > 0) $('timer-status').textContent = 'Paused';
      drawClock();
    }

    function resetClock() {
      stopClock();
      remaining = 45000;
      timerStarted = false;
      $('timer-status').textContent = '';
      drawClock();
    }

    function setMode(nextMode) {
      mode = nextMode;
      if (mode === 'challenge') window.inflationLab.pause();
      else pauseClock();
      $('explore-view').hidden = mode !== 'explore';
      $('challenge-view').hidden = mode !== 'challenge';
      $('explore-mode').setAttribute('aria-pressed', String(mode === 'explore'));
      $('challenge-mode').setAttribute('aria-pressed', String(mode === 'challenge'));
      if (mode === 'challenge') $('challenge-title').focus();
    }

    function totals() {
      const points = Array(5).fill(0);
      game.records.forEach((record, index) => scoreChallengeRound(CHALLENGE_ROUNDS[index], record, window.inflationLab.calculate).forEach((score, i) => { points[i] += score; }));
      return points;
    }

    function standings() {
      const scores = totals();
      return game.teams.map((name, index) => ({ name, index, score: scores[index] })).sort((a, b) => b.score - a.score || a.index - b.index);
    }

    function renderScoreboard() {
      $('scoreboard-list').replaceChildren();
      const ranked = standings();
      ranked.forEach((team, index) => {
        const rank = ranked.findIndex(other => other.score === team.score) + 1;
        const row = create('li');
        const score = create('span', 'team-score-value', String(team.score));
        score.append(create('small', '', 'pts'));
        row.append(create('span', 'team-rank', String(rank)), create('span', 'team-score-name', team.name), score);
        $('scoreboard-list').append(row);
      });
      const revealedCount = game.records.filter(record => record.revealed).length;
      $('scoreboard-note').textContent = revealedCount ? `${revealedCount} of 5 rounds scored. Equal scores share a place.` : 'Points appear after each reveal.';
    }

    function renderProgress() {
      $('round-progress').replaceChildren();
      CHALLENGE_ROUNDS.forEach((round, index) => {
        const item = create('li', game.records[index].revealed ? 'completed' : '', round.finale ? 'Finale' : `Round ${index + 1}`);
        if (index === game.round && !game.finished) item.setAttribute('aria-current', 'step');
        $('round-progress').append(item);
      });
    }

    function renderRound() {
      resetClock();
      const round = CHALLENGE_ROUNDS[game.round];
      $('round-stage').hidden = false;
      $('game-finish').hidden = true;
      $('round-reveal').hidden = true;
      $('discussion-timer').hidden = false;
      $('prediction-area').hidden = false;
      $('reveal-results').hidden = false;
      $('round-error').textContent = '';
      $('reveal-title').textContent = '';
      $('reveal-explanation').textContent = '';
      $('challenge-chart').replaceChildren();
      $('round-awards').replaceChildren();
      ['challenge-balance', 'challenge-purchasing', 'challenge-change'].forEach(id => { $(id).textContent = ''; });
      $('round-counter').textContent = round.finale ? 'BONUS FINALE · ROUND 5 OF 5' : `ROUND ${game.round + 1} OF 5`;
      $('round-title').textContent = round.title;
      $('round-state').textContent = round.finale ? 'Estimate' : 'Predict';
      $('round-question').textContent = round.question;
      $('round-instruction').textContent = round.finale ? 'Write one dollar estimate per team. The closest guess earns 2 points; tied closest guesses all earn 2. Leave a field blank for no guess.' : 'Choose more, less, or the same—and write down why. Show answers together before the host enters them. Choose “No answer” if a team skips.';
      $('round-settings').replaceChildren();
      for (const [name, value] of [['Starting savings', '$100'], ['Annual inflation', `${round.inflation}%`], ['Savings interest', `${round.interest}%`], ['Time', `${round.years} years`]]) {
        const pair = create('div');
        pair.append(create('dt', '', name), create('dd', '', value));
        $('round-settings').append(pair);
      }
      $('team-predictions').replaceChildren();
      predictionInputs = [];
      game.teams.forEach((name, index) => {
        const row = create('div', 'prediction-row');
        const label = create('label', '', name);
        const input = create(round.finale ? 'input' : 'select');
        input.id = `prediction-${index}`;
        input.setAttribute('aria-label', `${name}: ${round.finale ? 'buying power estimate in dollars' : 'prediction'}`);
        label.htmlFor = input.id;
        if (round.finale) {
          input.type = 'number'; input.min = '0'; input.max = '1000000'; input.step = '0.01'; input.inputMode = 'decimal'; input.placeholder = 'No guess';
        } else {
          const placeholder = create('option', '', 'Choose an answer'); placeholder.value = '';
          input.append(placeholder);
          Object.entries(labels).forEach(([value, text]) => { const option = create('option', '', text); option.value = value; input.append(option); });
        }
        row.append(label, input);
        $('team-predictions').append(row);
        predictionInputs.push(input);
      });
      renderProgress();
      renderScoreboard();
      $('round-title').focus();
    }

    function renderAwards() {
      const round = CHALLENGE_ROUNDS[game.round];
      const record = game.records[game.round];
      const scores = scoreChallengeRound(round, record, window.inflationLab.calculate);
      $('round-awards').replaceChildren();
      $('scoring-hint').textContent = round.finale ? 'Closest guesses earn 2 points automatically. Tied closest guesses share the bonus. No explanation bonus in the finale.' : 'Prediction points are automatic. Ask each speaker for the team’s reason, then award +1 for a clear explanation. Tap again to undo a bonus.';
      game.teams.forEach((name, index) => {
        const row = create('div', 'award-row');
        const description = create('div');
        const detail = create('p');
        const answer = record.predictions[index];
        description.append(create('strong', '', name), detail);
        row.append(description);
        if (round.finale) {
          const targetCents = Math.round(window.inflationLab.calculate(100, round.inflation, round.interest, round.years).purchasing * 100);
          detail.textContent = answer === null ? 'No guess submitted' : `Guess: ${money(answer)} · ${money(Math.abs(Math.round(answer * 100) - targetCents) / 100)} from the answer`;
          row.append(create('span', 'points-badge', `+${scores[index]} pts`));
        } else {
          const updateDetail = () => { detail.textContent = `${labels[answer]} · ${answer === round.answer ? '2 prediction points' : '0 prediction points'}${record.bonuses[index] ? ' + 1 explanation point' : ''}`; };
          const bonus = create('button', 'bonus-button');
          bonus.type = 'button';
          bonus.disabled = answer === 'pass';
          const updateButton = () => {
            bonus.textContent = record.bonuses[index] ? 'Bonus awarded ✓' : 'Explanation +1';
            bonus.setAttribute('aria-pressed', String(record.bonuses[index]));
            bonus.setAttribute('aria-label', `${record.bonuses[index] ? 'Remove' : 'Award'} explanation bonus for ${name}`);
          };
          bonus.addEventListener('click', () => {
            record.bonuses[index] = !record.bonuses[index];
            updateButton(); updateDetail(); renderScoreboard();
            announce(`${name}: ${totals()[index]} points in total.`);
          });
          updateButton(); updateDetail(); row.append(bonus);
        }
        $('round-awards').append(row);
      });
    }

    function reveal() {
      if (!game.active || game.finished) return;
      const round = CHALLENGE_ROUNDS[game.round];
      const record = game.records[game.round];
      if (record.revealed) return;
      const answers = [];
      for (let i = 0; i < predictionInputs.length; i++) {
        const input = predictionInputs[i];
        const value = input.value.trim();
        if (!round.finale && !Object.hasOwn(labels, value)) {
          $('round-error').textContent = `Choose an answer for ${game.teams[i]}, or select “No answer”.`;
          input.focus(); return;
        }
        const number = Number(value);
        if (round.finale && (!input.checkValidity() || (value !== '' && (!Number.isFinite(number) || number < 0 || number > 1000000 || Math.abs(number * 100 - Math.round(number * 100)) > 0.000001)))) {
          $('round-error').textContent = `Enter a valid dollar amount with up to two decimal places for ${game.teams[i]}, or leave it blank.`;
          input.focus(); return;
        }
        answers.push(round.finale ? (value === '' ? null : number) : value);
      }
      record.predictions = answers;
      record.revealed = true;
      pauseClock();
      $('discussion-timer').hidden = true;
      $('prediction-area').hidden = true;
      $('reveal-results').hidden = true;
      $('round-error').textContent = '';
      $('round-state').textContent = 'Revealed';
      $('round-reveal').hidden = false;
      const result = window.inflationLab.calculate(100, round.inflation, round.interest, round.years);
      $('reveal-title').textContent = round.finale ? `The mystery value: ${money(result.purchasing)}` : round.reveal;
      $('reveal-title').tabIndex = -1;
      $('reveal-explanation').textContent = round.explanation;
      $('challenge-balance').textContent = money(result.balance);
      $('challenge-purchasing').textContent = money(result.purchasing);
      const change = Math.abs(result.change) < 0.0000001 ? 0 : result.change;
      $('challenge-change').textContent = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
      window.inflationLab.renderChart($('challenge-chart'), { amount: 100, inflation: round.inflation, interest: round.interest, years: round.years });
      $('next-round').textContent = round.finale ? 'Show final scores' : 'Next round';
      renderAwards(); renderScoreboard(); renderProgress();
      announce(`${$('reveal-title').textContent} Prediction points have been added.`);
      $('reveal-title').focus();
    }

    function finishGame() {
      game.finished = true;
      stopClock();
      $('round-stage').hidden = true;
      $('game-finish').hidden = false;
      const ranked = standings();
      const winners = ranked.filter(team => team.score === ranked[0].score);
      $('winner-title').textContent = winners.length === 1 ? `${winners[0].name} wins!` : 'A shared victory!';
      $('winner-description').textContent = `${winners.map(team => team.name).join(' & ')} ${winners.length === 1 ? 'finishes' : 'finish'} with ${ranked[0].score} ${ranked[0].score === 1 ? 'point' : 'points'} out of 14. Every round is scored.`;
      $('final-standings').replaceChildren();
      ranked.forEach(team => {
        const rank = ranked.findIndex(other => other.score === team.score) + 1;
        const row = create('div', 'standings-row');
        row.append(create('span', '', `#${rank}`), create('strong', '', team.name), create('b', '', `${team.score} pts`));
        $('final-standings').append(row);
      });
      renderProgress(); renderScoreboard();
      $('winner-title').focus();
      announce(`${$('winner-title').textContent} ${$('winner-description').textContent}`);
    }

    function startGame(event) {
      event.preventDefault();
      const names = teamInputs.map((input, index) => input.value.trim().slice(0, 24) || `Team ${index + 1}`);
      if (new Set(names.map(name => name.toLocaleLowerCase())).size !== 5) {
        $('setup-error').textContent = 'Give each team a different name so the scores are easy to follow.'; return;
      }
      game.teams = names;
      game.records = CHALLENGE_ROUNDS.map(() => ({ revealed: false, predictions: Array(5).fill(null), bonuses: Array(5).fill(false) }));
      game.round = 0; game.active = true; game.finished = false;
      $('challenge-view').classList.add('game-active');
      $('setup-error').textContent = '';
      $('challenge-setup').hidden = true;
      $('challenge-game').hidden = false;
      $('restart-confirmation').hidden = true;
      renderRound();
      announce('Round 1 is ready. Discuss your prediction, then reveal results when every team has answered.');
    }

    function restartGame() {
      resetClock();
      game.active = false; game.finished = false;
      $('challenge-view').classList.remove('game-active');
      game.records = []; game.round = 0;
      $('challenge-game').hidden = true;
      $('challenge-setup').hidden = false;
      $('restart-confirmation').hidden = true;
      $('setup-error').textContent = '';
      teamInputs[0].focus();
      announce('Scores cleared. Name your teams and start a new challenge.');
    }

    $('team-setup-form').addEventListener('submit', startGame);
    $('explore-mode').addEventListener('click', () => setMode('explore'));
    $('challenge-mode').addEventListener('click', () => setMode('challenge'));
    $('key-terms-link').addEventListener('click', () => {
      pauseClock();
      window.inflationLab.pause();
    });
    $('timer-toggle').addEventListener('click', () => {
      if (timerHandle !== null) { pauseClock(); return; }
      if (!game.active || game.finished || game.records[game.round].revealed || remaining <= 0) return;
      timerStarted = true;
      deadline = Date.now() + remaining;
      timerHandle = setInterval(tick, 200);
      $('timer-status').textContent = 'Discuss with your team';
      drawClock();
    });
    $('timer-reset').addEventListener('click', resetClock);
    $('reveal-results').addEventListener('click', reveal);
    $('next-round').addEventListener('click', () => {
      if (!game.active || game.finished || !game.records[game.round].revealed) return;
      if (game.round === CHALLENGE_ROUNDS.length - 1) { finishGame(); return; }
      game.round++; renderRound();
      announce(`Round ${game.round + 1} is ready. Scores are carried forward.`);
    });
    $('new-game').addEventListener('click', () => {
      pauseClock(); $('restart-confirmation').hidden = false; $('cancel-restart').focus();
    });
    $('cancel-restart').addEventListener('click', () => { $('restart-confirmation').hidden = true; $('new-game').focus(); });
    $('confirm-restart').addEventListener('click', restartGame);
    $('play-again').addEventListener('click', restartGame);
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseClock(); });
    window.addEventListener('pagehide', stopClock);
  })();
}

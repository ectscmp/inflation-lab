'use strict';

// Values are rounded only for display, never between compounding steps.
function calculate(amount, inflation, interest, years) {
  const priceMultiplier = Math.pow(1 + inflation / 100, years);
  const balance = amount * Math.pow(1 + interest / 100, years);
  const purchasing = balance / priceMultiplier;
  return { balance, purchasing, lunch: 10 * priceMultiplier, basket: 100 * priceMultiplier, priceIndex: 100 * priceMultiplier, change: (purchasing / amount - 1) * 100 };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { calculate };

if (typeof document !== 'undefined') {
  const byId = id => document.getElementById(id);
  const defaults = { amount: 100, inflation: 3, interest: 1, years: 10 };
  const state = { ...defaults };
  const presets = { steady: { inflation: 0, interest: 0 }, behind: { inflation: 5, interest: 2 }, ahead: { inflation: 2, interest: 5 }, deflation: { inflation: -2, interest: 0 } };
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const wholeMoney = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  const percent = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
  const say = (id, value) => { byId(id).textContent = value; };
  let displayYear = state.years;
  let timer = null;
  let paused = false;
  let announcementTimer = null;

  function stopAnimation() {
    if (timer !== null) clearInterval(timer);
    timer = null;
    say('play-symbol', '▶');
    say('play-label', paused ? 'Continue' : 'Watch time pass');
  }

  function syncControls() {
    for (const key of Object.keys(defaults)) {
      const input = byId(key);
      input.value = state[key];
      input.style.setProperty('--fill', `${(state[key] - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
      const label = key === 'amount' ? wholeMoney(state[key]) : key === 'years' ? `${state.years} ${state.years === 1 ? 'year' : 'years'}` : `${percent(state[key])}%`;
      say(`${key}-output`, label);
      input.setAttribute('aria-valuetext', label);
    }
    document.querySelectorAll('[data-preset]').forEach(button => {
      const preset = presets[button.dataset.preset];
      button.setAttribute('aria-pressed', String(state.inflation === preset.inflation && state.interest === preset.interest));
    });
  }

  function niceMaximum(value) {
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const normalized = value / magnitude;
    return ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(step => step >= normalized) || 10) * magnitude;
  }

  function drawChart(result, options = {}) {
    const settings = options.settings || state;
    const yearShown = options.year ?? displayYear;
    const prefix = options.prefix || 'graph';
    const width = 740, height = 280;
    const left = 64, right = 21, top = 20, bottom = 40;
    const plotWidth = width - left - right, plotHeight = height - top - bottom;
    const end = calculate(settings.amount, settings.inflation, settings.interest, settings.years);
    const maxValue = niceMaximum(Math.max(end.balance, end.purchasing, settings.amount) * 1.14);
    const x = year => left + year / settings.years * plotWidth;
    const y = value => top + plotHeight - value / maxValue * plotHeight;
    const tickMoney = value => value >= 1000 ? `$${percent(value / 1000)}k` : wholeMoney(value);
    let svg = `<title id="${prefix}-title">Account balance and buying power over ${settings.years} years</title><desc id="${prefix}-description">At year ${yearShown}, your account holds ${money(result.balance)}, with buying power of ${money(result.purchasing)} in today's dollars. The solid blue line is the account balance. The dashed orange line is buying power. The vertical axis shows dollars and the horizontal axis shows years.</desc>`;
    for (let i = 0; i <= 4; i++) {
      const value = maxValue * i / 4;
      svg += `<line x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}" stroke="#e9edf5" ${i ? 'stroke-dasharray="3 5"' : ''}/><text x="${left - 12}" y="${y(value) + 4}" text-anchor="end" fill="#748198" font-size="12" font-family="inherit">${tickMoney(value)}</text>`;
    }
    const ticks = Array.from(new Set([0, ...Array.from({ length: 4 }, (_, i) => Math.round((i + 1) * settings.years / 4))]));
    ticks.forEach(year => {
      svg += `<text x="${x(year)}" y="${height - 15}" text-anchor="middle" fill="#748198" font-size="12" font-family="inherit">${year === 0 ? 'Today' : `Year ${year}`}</text>`;
    });
    const samples = Math.max(1, yearShown * 6);
    const points = Array.from({ length: samples + 1 }, (_, index) => {
      const year = yearShown * index / samples;
      const value = calculate(settings.amount, settings.inflation, settings.interest, year);
      return { x: x(year), balance: y(value.balance), purchasing: y(value.purchasing) };
    });
    const path = key => points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)},${point[key].toFixed(2)}`).join(' ');
    const area = `${path('balance')} ${[...points].reverse().map(point => `L${point.x.toFixed(2)},${point.purchasing.toFixed(2)}`).join(' ')} Z`;
    svg += `<path d="${area}" fill="#eef1fd"/><path d="${path('balance')}" fill="none" stroke="#244be8" stroke-width="3" stroke-linecap="round"/><path d="${path('purchasing')}" fill="none" stroke="#d65a37" stroke-width="3" stroke-dasharray="7 5" stroke-linecap="round"/>`;
    svg += `<line x1="${x(yearShown)}" y1="${top}" x2="${x(yearShown)}" y2="${height - bottom}" stroke="#b9c4dc" stroke-dasharray="3 5"/><circle cx="${x(yearShown)}" cy="${y(result.balance)}" r="5" fill="#244be8" stroke="white" stroke-width="2"/><circle cx="${x(yearShown)}" cy="${y(result.purchasing)}" r="5" fill="#d65a37" stroke="white" stroke-width="2"/>`;
    (options.target || byId('chart')).innerHTML = svg;
  }

  function render(announce = true) {
    const result = calculate(state.amount, state.inflation, state.interest, displayYear);
    const same = Math.abs(result.change) < 0.00000001;
    const ahead = result.change > 0;
    say('balance', money(result.balance));
    say('purchasing', money(result.purchasing));
    say('earned', `${money(result.balance - state.amount)} earned in interest`);
    say('change', `${percent(Math.abs(result.change))}%`);
    say('change-label', same ? 'Buying power change' : ahead ? 'Buying power gained' : 'Buying power lost');
    say('change-note', displayYear === 0 ? 'This is your starting point' : same ? 'Your savings keep up with prices' : state.inflation < 0 ? 'Falling prices help your money buy more' : ahead ? 'Savings grew faster than prices' : 'Prices grew faster than savings');
    say('chart-title', displayYear === 0 ? 'Every experiment starts here.' : same ? 'Same buying power. Over time.' : state.inflation < 0 ? 'Lower prices. More buying power.' : ahead ? 'Your savings get ahead of prices.' : state.interest === 0 ? 'Same dollars. Less buying power.' : 'More dollars. Less buying power.');
    say('chart-gap-note', state.inflation < 0 ? 'The gap is the effect of deflation.' : 'The gap is the effect of inflation.');
    say('year-badge', displayYear === 0 ? 'Today' : `Year ${displayYear}`);
    say('lunch-year', displayYear === 0 ? 'TODAY' : `IN ${displayYear} ${displayYear === 1 ? 'YEAR' : 'YEARS'}`);
    say('lunch-price', money(result.lunch));
    const priceChange = result.priceIndex - 100;
    say('lunch-change', state.inflation === 0 || displayYear === 0 ? 'The same price' : `${percent(Math.abs(priceChange))}% ${priceChange < 0 ? 'less' : 'more'} expensive`);
    say('lunch-note', displayYear === 0 ? 'This is the starting price of your lunch.' : state.inflation === 0 ? 'With no inflation, the price stays the same.' : state.inflation < 0 ? 'With deflation, the same lunch costs less.' : "Your lunch hasn't changed. The value of a dollar has.");
    say('basket-year', displayYear === 0 ? 'Today' : `Year ${displayYear}`);
    say('groceries-price', money(result.basket * 0.5));
    say('transport-price', money(result.basket * 0.3));
    say('supplies-price', money(result.basket * 0.2));
    say('basket-total', money(result.basket));
    say('price-index', result.priceIndex.toFixed(1));
    say('index-formula', `(${money(result.basket)} ÷ $100.00) × 100 ≈ ${result.priceIndex.toFixed(1)}`);
    say('index-explanation', displayYear === 0 ? 'Today is our base period. The basket costs $100 and the index is 100.' : state.inflation === 0 ? `At 0% inflation, the basket stays at $100 and the index stays at 100 after ${displayYear} ${displayYear === 1 ? 'year' : 'years'}.` : `At ${percent(state.inflation)}% per year, this basket costs ${percent(Math.abs(priceChange))}% ${priceChange < 0 ? 'less' : 'more'} after ${displayYear} ${displayYear === 1 ? 'year' : 'years'}.`);
    const takeaway = displayYear === 0 ? `You start with ${wholeMoney(state.amount)}. Let's see what happens as time passes.` : `After ${displayYear} ${displayYear === 1 ? 'year' : 'years'}, your ${wholeMoney(state.amount)} ${state.interest ? 'grows to' : 'stays at'} ${money(result.balance)}, but buys what ${money(result.purchasing)} buys today.`;
    clearTimeout(announcementTimer);
    if (announce) announcementTimer = setTimeout(() => say('takeaway', takeaway), 150);
    else say('takeaway', takeaway);
    drawChart(result);
    return { ...state, displayedYear: displayYear, ...result };
  }

  function configure(values) {
    // Validate the full update before changing any state.
    if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Provide an object with simulation settings.');
    for (const [key, value] of Object.entries(values)) {
      if (!Object.hasOwn(defaults, key)) throw new Error(`Unknown setting: ${key}`);
      const input = byId(key);
      if (typeof value !== 'number' || !Number.isFinite(value) || value < Number(input.min) || value > Number(input.max)) throw new Error(`${key} must be between ${input.min} and ${input.max}.`);
      const steps = (value - Number(input.min)) / Number(input.step);
      if (Math.abs(steps - Math.round(steps)) > 0.0000001) throw new Error(`${key} must use increments of ${input.step}.`);
    }
    paused = false;
    stopAnimation();
    Object.assign(state, values);
    displayYear = state.years;
    syncControls();
    return render();
  }

  for (const key of Object.keys(defaults)) byId(key).addEventListener('input', event => configure({ [key]: Number(event.target.value) }));
  byId('reset').addEventListener('click', () => configure(defaults));
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => configure(presets[button.dataset.preset])));
  byId('play').addEventListener('click', () => {
    if (timer !== null) {
      paused = true;
      stopAnimation();
      return;
    }
    if (!paused || displayYear >= state.years) displayYear = 0;
    paused = false;
    say('play-symbol', 'Ⅱ');
    say('play-label', 'Pause');
    render();
    timer = setInterval(() => {
      displayYear = Math.min(state.years, displayYear + 1);
      render();
      if (displayYear >= state.years) stopAnimation();
    }, 650);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && timer !== null) { paused = true; stopAnimation(); }
  });
  syncControls();
  render(false);

  window.inflationLab = {
    calculate,
    renderChart(target, settings) {
      drawChart(calculate(settings.amount, settings.inflation, settings.interest, settings.years), {
        target, settings, year: settings.years, prefix: 'challenge-graph'
      });
    },
    pause() { if (timer !== null) { paused = true; stopAnimation(); } }
  };

  // Optional browser tool support; ordinary browsers use the same UI without it.
  const context = document.modelContext;
  if (context?.registerTool) {
    const lifecycle = new AbortController();
    window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
    try {
      Promise.resolve(context.registerTool({
        name: 'configure_inflation_simulation',
        title: 'Set inflation simulation',
        description: 'Update the visible inflation simulator and return the results at the selected year. Rates are percentages and interest compounds annually.',
        inputSchema: { type: 'object', properties: {
          amount: { type: 'number', minimum: 20, maximum: 1000, multipleOf: 10 },
          inflation: { type: 'number', minimum: -5, maximum: 15, multipleOf: 0.5 },
          interest: { type: 'number', minimum: 0, maximum: 15, multipleOf: 0.5 },
          years: { type: 'integer', minimum: 1, maximum: 30 }
        }, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: input => configure(input)
      }, { signal: lifecycle.signal })).catch(() => {});
    } catch { /* The simulator remains available if this experimental API fails. */ }
  }
}

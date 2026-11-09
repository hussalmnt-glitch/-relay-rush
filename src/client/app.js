const $ = (selector, root = document) => root.querySelector(selector);
function storageGet(bucket, key) { try { return window[bucket].getItem(key); } catch { return null; } }
function storageSet(bucket, key, value) { try { window[bucket].setItem(key, value); } catch { /* Storage may be disabled by browser policy. */ } }
function storageRemove(bucket, key) { try { window[bucket].removeItem(key); } catch { /* Storage may be disabled by browser policy. */ } }
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const copy = {
  en: {
    eyebrow: 'TACTICAL CONTROL // SEASON 01', title: 'Relay Rush', subtitle: 'Outthink. Outmaneuver. Hold the signal.',
    create: 'Create match', join: 'Join a match', playerName: 'Callsign', namePlaceholder: 'e.g. Nova', seats: 'Players',
    createHint: 'Open a room and invite humans or agents.', joinHint: 'Enter a six-character room code.', code: 'Match code', codePlaceholder: 'AB12CD',
    start: 'Start match', fillBots: 'Fill empty seats with bots', waiting: 'Waiting for commanders', lobby: 'MATCH LOBBY', share: 'Share code', copied: 'Copied',
    board: 'TACTICAL GRID', round: 'ROUND', turn: 'TURN', actions: 'ACTIONS LEFT', pulses: 'PULSES', endTurn: 'End turn', yourTurn: 'Your turn', waitingTurn: 'Waiting for turn',
    relayCore: 'CORE', relayNorth: 'NORTH', relayEast: 'EAST', relaySouth: 'SOUTH', relayWest: 'WEST', neutral: 'Neutral', jammed: 'Jammed',
    moveHint: 'Select a highlighted cell to move.', relayHint: 'Choose an action for this relay.', claim: 'Claim relay', jam: 'Jam relay', noAction: 'No legal action here.',
    events: 'MATCH FEED', standings: 'STANDINGS', online: 'LIVE', finished: 'MATCH COMPLETE', winner: 'Winner', draw: 'Shared victory', finalScores: 'Final scores', playAgain: 'New match', replay: 'Match log', close: 'Close',
    human: 'Human', agent: 'Agent', bot: 'Bot', host: 'Host', connected: 'Connected', disconnected: 'Reconnecting…',
    statusLobby: 'Waiting room', statusPlaying: 'In progress', statusFinished: 'Complete', score: 'Score', relays: 'Relays',
    errorName: 'Enter a callsign first.', errorCode: 'Enter a valid match code.', errorApi: 'The request could not be completed.',
    rulesTitle: 'HOW TO PLAY', rulesBody: 'Relay Rush is a turn-based strategy game for 2–4 players on a 7×7 grid, lasting six rounds. On your turn you have two action points: move one orthogonal cell, claim a relay from an adjacent cell, or spend a pulse to jam an enemy relay within two cells until the round ends. Outer relays score 1 point and the Core scores 2 at the end of each round unless jammed. After round six, the highest score wins; ties are broken by relays held, then shared.',
    objective: 'Control the network', objectiveText: 'Claim relays to score at round end. The Core is worth double — but it is exposed.',
    apiNote: 'Humans play here. Agents use the HTTP/JSON API.',
  },
  ar: {
    eyebrow: 'قيادة تكتيكية // الموسم 01', title: 'Relay Rush', subtitle: 'فكّر أسرع. تحرّك أذكى. سيطر على الإشارة.',
    create: 'إنشاء مباراة', join: 'الانضمام لمباراة', playerName: 'اسم اللاعب', namePlaceholder: 'مثال: نوفا', seats: 'عدد المقاعد',
    createHint: 'أنشئ غرفة وادعُ لاعبين أو وكلاء.', joinHint: 'أدخل رمز الغرفة المكوّن من ستة أحرف.', code: 'رمز المباراة', codePlaceholder: 'AB12CD',
    start: 'بدء المباراة', fillBots: 'املأ المقاعد الفارغة بالبوتات', waiting: 'بانتظار القادة', lobby: 'ردهة المباراة', share: 'نسخ الرمز', copied: 'تم النسخ',
    board: 'الخريطة التكتيكية', round: 'الجولة', turn: 'الدور', actions: 'الأفعال المتبقية', pulses: 'الشحنات', endTurn: 'إنهاء الدور', yourTurn: 'دورك الآن', waitingTurn: 'بانتظار دورك',
    relayCore: 'المركز', relayNorth: 'الشمال', relayEast: 'الشرق', relaySouth: 'الجنوب', relayWest: 'الغرب', neutral: 'محايدة', jammed: 'معطّلة',
    moveHint: 'اختر خلية مضيئة للتحرك إليها.', relayHint: 'اختر فعلاً لهذه المحطة.', claim: 'استحواذ', jam: 'تعطيل', noAction: 'لا يوجد فعل متاح هنا.',
    events: 'سجل المباراة', standings: 'الترتيب', online: 'مباشر', finished: 'انتهت المباراة', winner: 'الفائز', draw: 'فوز مشترك', finalScores: 'النتائج النهائية', playAgain: 'مباراة جديدة', replay: 'سجل اللعب', close: 'إغلاق',
    human: 'إنسان', agent: 'وكيل', bot: 'بوت', host: 'المضيف', connected: 'متصل', disconnected: 'إعادة الاتصال…',
    statusLobby: 'غرفة انتظار', statusPlaying: 'قيد اللعب', statusFinished: 'مكتملة', score: 'النقاط', relays: 'المحطات',
    errorName: 'أدخل اسم اللاعب أولاً.', errorCode: 'أدخل رمز مباراة صحيحاً.', errorApi: 'تعذّر إكمال الطلب.',
    rulesTitle: 'طريقة اللعب', rulesBody: 'Relay Rush لعبة استراتيجية تناوبية من لاعبين إلى أربعة على شبكة 7×7، وتستمر ست جولات. لديك نقطتا فعل في دورك: تحرّك خلية أفقياً أو رأسياً، أو استحوذ على محطة من خلية مجاورة، أو أنفق شحنة لتعطيل محطة خصم ضمن مسافة خليتين حتى نهاية الجولة. تمنح المحطات الخارجية نقطة واحدة والمركز نقطتين في نهاية كل جولة ما لم تكن معطّلة. بعد الجولة السادسة يفوز صاحب أعلى رصيد؛ ويُكسر التعادل بعدد المحطات المملوكة، ثم يكون الفوز مشتركاً.',
    objective: 'سيطر على شبكة الإرسال', objectiveText: 'استحوذ على المحطات لتحصل على نقاط في نهاية الجولة. المركز يساوي الضعف لكنه مكشوف.',
    apiNote: 'العب من المتصفح. الوكلاء يستخدمون واجهة HTTP/JSON.',
  },
};

const state = {
  lang: storageGet('localStorage', 'relay-lang') || 'en',
  screen: 'home',
  match: null,
  token: null,
  hostToken: null,
  playerId: null,
  legalActions: [],
  selectedRelay: null,
  eventView: false,
  error: '',
  busy: false,
  fillBots: true,
  polling: null,
};

const t = (key) => copy[state.lang][key] ?? key;
const dir = () => (state.lang === 'ar' ? 'rtl' : 'ltr');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const getCode = () => state.match?.code || '';

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (options.auth || state.token) headers.Authorization = `Bearer ${options.auth || state.token}`;
  const response = await fetch(path, { ...options, headers, body: options.body ? JSON.stringify(options.body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || t('errorApi'));
  return data;
}

function saveSession() {
  if (!state.match || !state.token) return;
  storageSet('sessionStorage', 'relay-session', JSON.stringify({ code: state.match.code, token: state.token, hostToken: state.hostToken, playerId: state.playerId }));
}
function clearSession() {
  storageRemove('sessionStorage', 'relay-session');
  stopPolling();
  state.match = null; state.token = null; state.hostToken = null; state.playerId = null;
  state.legalActions = []; state.selectedRelay = null; state.screen = 'home';
}

async function createMatch(form) {
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  if (!name) throw new Error(t('errorName'));
  const maxPlayers = Number(data.get('maxPlayers') || 4);
  const result = await api('/api/matches', { method: 'POST', body: { name, maxPlayers } });
  state.token = result.playerToken;
  state.hostToken = result.hostToken;
  state.playerId = result.playerId;
  state.match = result.match;
  saveSession();
  await refresh();
  startPolling();
}

async function joinMatch(form) {
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const code = String(data.get('code') || '').trim().toUpperCase();
  if (!name) throw new Error(t('errorName'));
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) throw new Error(t('errorCode'));
  const result = await api(`/api/matches/${encodeURIComponent(code)}/join`, { method: 'POST', body: { name } });
  state.token = result.playerToken;
  state.playerId = result.playerId;
  state.hostToken = null;
  state.match = result.match;
  saveSession();
  await refresh();
  startPolling();
}

async function refresh() {
  if (!state.match) return;
  const [match, gameState] = await Promise.all([
    api(`/api/matches/${getCode()}`),
    api(`/api/matches/${getCode()}/state`, { auth: state.token }).catch((error) => ({ waiting: true, error: error.message })),
  ]);
  state.match = match;
  if (gameState && !gameState.waiting) {
    state.game = gameState;
    state.legalActions = gameState.legalActions || [];
  } else {
    state.game = null;
    state.legalActions = [];
  }
  state.screen = match.phase === 'lobby' ? 'lobby' : 'match';
  render();
}

function startPolling() {
  stopPolling();
  state.polling = setInterval(async () => {
    if (!state.match) return stopPolling();
    try { await refresh(); } catch { /* temporary network failure; keep last state visible */ }
  }, 1100);
}
function stopPolling() { if (state.polling) clearInterval(state.polling); state.polling = null; }

async function startGame() {
  if (!state.hostToken) throw new Error('Only the host can start this match.');
  const result = await api(`/api/matches/${getCode()}/start`, {
    method: 'POST', body: { hostToken: state.hostToken, fillWithBots: state.fillBots },
  });
  state.match = result;
  await refresh();
}

async function takeAction(action) {
  if (!state.game || state.busy) return;
  state.busy = true;
  state.error = '';
  render();
  try {
    await api(`/api/matches/${getCode()}/action`, {
      method: 'POST',
      body: { action, turnId: state.game.turnId, requestId: crypto.randomUUID() },
    });
    state.selectedRelay = null;
    await refresh();
  } catch (error) {
    state.error = error.message;
    await refresh().catch(() => {});
  } finally {
    state.busy = false;
    render();
  }
}

function setLanguage(lang) {
  state.lang = lang;
  storageSet('localStorage', 'relay-lang', lang);
  render();
}

function shell(content) {
  return `<div class="shell" dir="${dir()}">
    <header class="topbar">
      <a class="brand" href="#" data-home><span class="brand-mark"><i></i><i></i><i></i><i></i></span><span>RELAY<span class="brand-light">RUSH</span></span></a>
      <div class="top-actions"><span class="season-tag">${t('eyebrow')}</span><div class="lang-switch"><button class="${state.lang === 'en' ? 'active' : ''}" data-lang="en">EN</button><button class="${state.lang === 'ar' ? 'active' : ''}" data-lang="ar">ع</button></div></div>
    </header>
    ${content}
    <footer class="footer"><span>RELAY RUSH <b>·</b> V1.0</span><span>${t('apiNote')}</span><a href="/api-reference.html" target="_blank" rel="noreferrer">HTTP / JSON API ↗</a></footer>
  </div>`;
}

function renderHome() {
  const hero = `${state.error ? `<div class="inline-error">${escapeHtml(state.error)}</div>` : ''}<main class="home-grid">
    <section class="hero-panel">
      <div class="hero-signal"><span></span> ${t('eyebrow')}</div>
      <div class="hero-title-wrap"><div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div><div class="hero-core">R</div><div class="orbit-node node-a"></div><div class="orbit-node node-b"></div><div class="orbit-node node-c"></div></div>
      <h1>${t('title')}<span class="title-period">.</span></h1>
      <p class="hero-subtitle">${t('subtitle')}</p>
      <div class="hero-metrics"><div><strong>02–04</strong><span>${t('seats')}</span></div><div><strong>06</strong><span>${t('round')}</span></div><div><strong>07×07</strong><span>${t('board')}</span></div></div>
      <div class="rules-mini"><span class="rules-icon">✳</span><div><strong>${t('objective')}</strong><p>${t('objectiveText')}</p></div></div>
    </section>
    <section class="entry-panel">
      <div class="entry-card create-card"><div class="card-kicker">01 / ${t('create').toUpperCase()}</div><h2>${t('create')}</h2><p>${t('createHint')}</p>
        <form id="create-form" class="stack-form"><label>${t('playerName')}<input name="name" maxlength="18" required placeholder="${t('namePlaceholder')}" autocomplete="nickname" /></label><label>${t('seats')}<select name="maxPlayers"><option value="2">2 ${t('seats').toLowerCase()}</option><option value="3">3 ${t('seats').toLowerCase()}</option><option value="4" selected>4 ${t('seats').toLowerCase()}</option></select></label><button class="button button-primary" type="submit">${t('create')} <span>↗</span></button></form>
      </div>
      <div class="entry-card join-card"><div class="card-kicker">02 / ${t('join').toUpperCase()}</div><h2>${t('join')}</h2><p>${t('joinHint')}</p>
        <form id="join-form" class="stack-form"><label>${t('playerName')}<input name="name" maxlength="18" required placeholder="${t('namePlaceholder')}" autocomplete="nickname" /></label><label>${t('code')}<input name="code" maxlength="6" required placeholder="${t('codePlaceholder')}" class="code-input" autocapitalize="characters" /></label><button class="button button-secondary" type="submit">${t('join')} <span>→</span></button></form>
      </div>
    </section>
  </main>
  <section class="rules-strip"><div class="rules-heading"><span>FIELD MANUAL</span><h3>${t('rulesTitle')}</h3></div><p>${t('rulesBody')}</p></section>`;
  return shell(hero);
}

function renderLobby() {
  const m = state.match;
  const isHost = Boolean(state.hostToken);
  const seats = Array.from({ length: m.maxPlayers }, (_, index) => m.players.find((p) => p.seat === index) || null);
  const content = `${state.error ? `<div class="inline-error">${escapeHtml(state.error)}</div>` : ''}<main class="lobby-layout">
    <section class="lobby-main panel"><div class="section-overline">${t('lobby')} / ${m.code}</div><h1>${t('waiting')}</h1><p class="muted">${state.lang === 'ar' ? 'شارك الرمز مع البشر، أو املأ المقاعد بالبوتات.' : 'Share the code with humans, or fill the remaining seats with bots.'}</p>
      <div class="room-code"><div><small>${t('code')}</small><strong>${m.code}</strong></div><button class="icon-button" data-copy-code aria-label="${t('share')}">▢</button></div>
      <div class="seat-grid">${seats.map((seat, index) => seat ? `<div class="seat-card occupied"><div class="seat-avatar" style="--seat-color:var(--p${index + 1})">${escapeHtml(seat.name.slice(0, 1).toUpperCase())}</div><div><strong>${escapeHtml(seat.name)}</strong><small>${seat.kind === 'bot' ? t('bot') : seat.kind === 'agent' ? t('agent') : t('human')}${seat.id === m.players[0]?.id ? ` · ${t('host')}` : ''}</small></div><span class="seat-state">●</span></div>` : `<div class="seat-card empty"><div class="empty-avatar">＋</div><div><strong>${state.lang === 'ar' ? `مقعد ${index + 1}` : `Seat ${index + 1}`}</strong><small>${t('waiting')}</small></div></div>`).join('')}</div>
      <div class="lobby-actions">${isHost ? `<label class="toggle-row"><input type="checkbox" id="fill-bots" ${state.fillBots ? 'checked' : ''}><span class="toggle-ui"></span><span>${t('fillBots')}</span></label><button class="button button-primary" data-start ${m.players.length < 2 && !state.fillBots ? 'disabled' : ''}>${t('start')} <span>↗</span></button>` : `<div class="waiting-note"><span class="pulse-dot"></span>${t('waiting')}</div>`}</div>
    </section>
    <aside class="lobby-side panel"><div class="side-overline">MATCH PROTOCOL</div><div class="protocol-number">06<span> / ROUNDS</span></div><p>${t('rulesBody')}</p><div class="protocol-line"><span>MODE</span><strong>HUMAN + AGENT</strong></div><div class="protocol-line"><span>ROOM</span><strong>PUBLIC CODE</strong></div><div class="protocol-line"><span>TURN LIMIT</span><strong>20 SEC</strong></div></aside>
  </main>`;
  return shell(content);
}

function relayLabel(id) { return t(`relay${id[0].toUpperCase()}${id.slice(1)}`); }
function renderBoard(game) {
  const playersAt = new Map(game.players.map((p) => [`${p.x},${p.y}`, p]));
  const relaysAt = new Map(game.relays.map((r) => [`${r.x},${r.y}`, r]));
  const legalMoves = state.legalActions.filter((a) => a.type === 'MOVE').map((a) => `${a.to.x},${a.to.y}`);
  const cells = [];
  for (let y = 0; y < 7; y += 1) for (let x = 0; x < 7; x += 1) {
    const key = `${x},${y}`;
    const player = playersAt.get(key);
    const relay = relaysAt.get(key);
    let inner = '';
    let classes = 'board-cell';
    if ((x + y) % 2 === 0) classes += ' cell-alt';
    if (legalMoves.includes(key)) classes += ' move-available';
    if (player) {
      classes += ` player-cell p${game.players.findIndex((p) => p.id === player.id) + 1}`;
      inner = `<span class="unit-token"><i></i><b>${escapeHtml(player.name.slice(0, 1).toUpperCase())}</b></span>`;
    } else if (relay) {
      classes += ` relay-cell relay-${relay.id}${relay.ownerId ? ' owned' : ''}${relay.jammedRound === game.round ? ' jammed' : ''}${state.selectedRelay === relay.id ? ' selected' : ''}`;
      const owner = game.players.find((p) => p.id === relay.ownerId);
      if (owner) classes += ` owned-p${game.players.findIndex((p) => p.id === owner.id) + 1}`;
      inner = `<span class="relay-token"><i>${relay.id === 'core' ? '✦' : '◇'}</i><b>${relay.value}</b></span>`;
    } else {
      inner = '<span class="grid-grain"></span>';
    }
    cells.push(`<button class="${classes}" data-cell-x="${x}" data-cell-y="${y}" aria-label="${relay ? relayLabel(relay.id) : player ? player.name : `Cell ${x}, ${y}`}" ${(!player && !relay && !legalMoves.includes(key)) ? 'tabindex="-1"' : ''}>${inner}</button>`);
  }
  return `<div class="board-shell"><div class="board-topline"><span>${t('board')}</span><span>SECTOR 07 / 07</span></div><div class="board-coordinates top">${[0,1,2,3,4,5,6].map((n) => `<span>${n + 1}</span>`).join('')}</div><div class="board-row"><div class="board-coordinates side">${[0,1,2,3,4,5,6].map((n) => `<span>${String.fromCharCode(65 + n)}</span>`).join('')}</div><div class="board-grid">${cells.join('')}</div></div><div class="board-legend"><span><i class="legend-unit"></i>${state.lang === 'ar' ? 'وحدة' : 'UNIT'}</span><span><i class="legend-relay"></i>${state.lang === 'ar' ? 'محطة' : 'RELAY'}</span><span><i class="legend-move"></i>${state.lang === 'ar' ? 'حركة متاحة' : 'LEGAL MOVE'}</span></div></div>`;
}

function renderMatch() {
  const game = state.game;
  if (!game) return renderLobby();
  if (game.phase === 'finished') return renderResults(game);
  const current = game.players.find((p) => p.id === game.currentPlayerId);
  const me = game.players.find((p) => p.id === state.playerId);
  const myTurn = game.isYourTurn;
  const relay = game.relays.find((r) => r.id === state.selectedRelay);
  const claimAction = relay && state.legalActions.find((a) => a.type === 'CLAIM' && a.relayId === relay.id);
  const jamAction = relay && state.legalActions.find((a) => a.type === 'JAM' && a.relayId === relay.id);
  const content = `<main class="game-layout">
    <section class="game-main">
      <div class="match-header panel"><div><div class="section-overline">${t('round')} ${game.round} / 06 <span class="live-mark">● ${t('online')}</span></div><h1>${t('title')} <small>#${getCode()}</small></h1></div><button class="icon-button" data-copy-code title="${t('share')}">▢</button></div>
      <div class="game-board-panel panel">${renderBoard(game)}
        <div class="action-dock"><div class="turn-status"><span class="turn-avatar" style="--turn-color:${current?.color || '#fff'}">${escapeHtml(current?.name?.slice(0,1) || '?')}</span><div><strong>${myTurn ? t('yourTurn') : `${current?.name || ''} · ${t('waitingTurn')}`}</strong><small>${myTurn ? t('moveHint') : `${t('turn')} ${game.turnId}`} · ${Math.max(0, Math.ceil((game.turnDeadline - Date.now()) / 1000))}s</small></div></div>
          <div class="action-stats"><div><small>${t('actions')}</small><strong>${game.actionPoints}<em>/2</em></strong><span class="ap-pips"><i class="${game.actionPoints >= 1 ? 'on' : ''}"></i><i class="${game.actionPoints >= 2 ? 'on' : ''}"></i></span></div><div><small>${t('pulses')}</small><strong>${me?.pulses ?? 0}<em>/2</em></strong><span class="pulse-pips">${[0,1].map((n) => `<i class="${n < (me?.pulses ?? 0) ? 'on' : ''}"></i>`).join('')}</span></div></div>
          <button class="button button-end" data-end-turn ${!myTurn || state.busy ? 'disabled' : ''}>${t('endTurn')} ↗</button>
        </div>
        ${relay ? `<div class="relay-action-pop"><div><strong>${relayLabel(relay.id)}</strong><small>${relay.ownerId ? (game.players.find(p=>p.id===relay.ownerId)?.name || '') : t('neutral')} · ${relay.value} ${state.lang === 'ar' ? 'نقطة' : 'PT'}</small></div><div class="relay-action-buttons">${claimAction ? `<button class="small-action claim-action" data-relay-action="claim">${t('claim')}</button>` : ''}${jamAction ? `<button class="small-action jam-action" data-relay-action="jam">${t('jam')}</button>` : ''}<button class="small-action cancel-action" data-clear-relay>×</button></div></div>` : ''}
        ${state.error ? `<div class="inline-error">${escapeHtml(state.error)}</div>` : ''}
      </div>
    </section>
    <aside class="game-sidebar">
      <section class="panel standings-panel"><div class="panel-heading"><span>${t('standings')}</span><span>01—04</span></div>${game.players.slice().sort((a,b)=>b.score-a.score || b.relaysOwned-a.relaysOwned).map((p) => `<div class="standing-row ${p.id === current?.id ? 'active' : ''}"><span class="standing-color" style="--seat-color:${p.color}"></span><div class="standing-name"><strong>${escapeHtml(p.name)} ${p.id === state.playerId ? '<small>YOU</small>' : ''}</strong><small>${p.kind === 'bot' ? t('bot') : p.kind === 'agent' ? t('agent') : t('human')}</small></div><div class="standing-score"><strong>${p.score}</strong><small>${t('score')}</small></div><div class="standing-relays"><strong>${p.relaysOwned}</strong><small>${t('relays')}</small></div></div>`).join('')}</section>
      <section class="panel feed-panel"><div class="panel-heading"><span>${t('events')}</span><button class="text-button" data-toggle-events>${state.eventView ? t('close') : t('replay')}</button></div><div class="event-list">${game.events.slice(state.eventView ? -60 : -6).reverse().map((event) => eventLine(event, game)).join('') || `<p class="muted">${t('waiting')}</p>`}</div></section>
      <section class="panel hint-panel"><div class="hint-symbol">✳</div><div><strong>${t('objective')}</strong><p>${t('objectiveText')}</p></div></section>
    </aside>
  </main>`;
  return shell(content);
}

function eventLine(event, game) {
  const p = game.players.find((player) => player.id === event.playerId);
  const name = p ? escapeHtml(p.name) : '';
  const lex = state.lang === 'ar';
  const messages = {
    PLAYER_MOVED: lex ? `${name} تحرّك إلى (${event.to.x + 1}, ${String.fromCharCode(65 + event.to.y)})` : `${name} moved to (${event.to.x + 1}, ${String.fromCharCode(65 + event.to.y)})`,
    RELAY_CLAIMED: lex ? `${name} استحوذ على ${relayLabel(event.relayId)}` : `${name} claimed ${relayLabel(event.relayId)}`,
    RELAY_JAMMED: lex ? `${name} عطّل ${relayLabel(event.relayId)}` : `${name} jammed ${relayLabel(event.relayId)}`,
    ROUND_SCORED: lex ? `تم احتساب نقاط الجولة ${event.round}` : `Round ${event.round} scored`,
    TURN_STARTED: lex ? `بدأ دور ${game.players.find(x=>x.id===event.playerId)?.name || ''}` : `${game.players.find(x=>x.id===event.playerId)?.name || ''} started a turn`,
    TURN_ENDED: lex ? `انتهى دور ${name}` : `${name} ended their turn`,
    ROUND_STARTED: lex ? `بدأت الجولة ${event.round}` : `Round ${event.round} started`,
    MATCH_STARTED: lex ? 'بدأت المباراة' : 'Match started',
    MATCH_FINISHED: lex ? 'انتهت المباراة' : 'Match finished',
    PULSES_RECHARGED: lex ? 'تمت إعادة شحن النبضات' : 'Pulses recharged',
  };
  return `<div class="event-row"><i class="event-dot event-${event.type.toLowerCase()}"></i><span>${messages[event.type] || event.type}</span><small>${new Date(event.at).toLocaleTimeString(state.lang === 'ar' ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' })}</small></div>`;
}

function renderResults(game) {
  const winners = game.players.filter((p) => game.winnerIds.includes(p.id));
  const content = `<main class="results-layout"><div class="results-glow"></div><section class="results-card panel"><div class="result-emblem">✦</div><div class="section-overline">${t('finished')} / ${getCode()}</div><h1>${game.draw ? t('draw') : `${t('winner')}: ${escapeHtml(winners[0]?.name || '')}`}</h1><p class="muted">${state.lang === 'ar' ? 'اكتملت ست جولات. هذه هي النتيجة النهائية.' : 'Six rounds complete. Here is the final network report.'}</p><div class="final-score-list">${game.players.slice().sort((a,b)=>b.score-a.score || b.relaysOwned-a.relaysOwned).map((p,i)=>`<div class="final-score-row ${game.winnerIds.includes(p.id)?'winner':''}"><span class="rank">0${i+1}</span><span class="standing-color" style="--seat-color:${p.color}"></span><strong>${escapeHtml(p.name)}</strong><span class="score-value">${p.score}<small> ${t('score')}</small></span><span class="relay-value">${p.relaysOwned} <small>${t('relays')}</small></span></div>`).join('')}</div><div class="result-actions"><button class="button button-primary" data-new-match>${t('playAgain')} ↗</button><button class="button button-secondary" data-toggle-events>${state.eventView ? t('close') : t('replay')}</button></div><div class="result-events">${game.events.slice(state.eventView ? -200 : -12).reverse().map((event)=>eventLine(event,game)).join('')}</div></section></main>`;
  return shell(content);
}

function render() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = dir();
  const root = $('#app');
  if (state.screen === 'home' || !state.match) root.innerHTML = renderHome();
  else if (state.screen === 'lobby' || state.match.phase === 'lobby') root.innerHTML = renderLobby();
  else if (state.game?.phase === 'finished') root.innerHTML = renderResults(state.game);
  else root.innerHTML = renderMatch();
  bindEvents();
}

function bindEvents() {
  $$('[data-lang]').forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
  $('[data-home]')?.addEventListener('click', (event) => { event.preventDefault(); clearSession(); render(); });
  $('#create-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const form = event.currentTarget; await busyAction(() => createMatch(form));
  });
  $('#join-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const form = event.currentTarget; await busyAction(() => joinMatch(form));
  });
  $('[data-start]')?.addEventListener('click', () => busyAction(startGame));
  $('#fill-bots')?.addEventListener('change', (event) => { state.fillBots = event.target.checked; });
  $('[data-copy-code]')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(getCode()); const el = $('[data-copy-code]'); el.textContent = '✓'; setTimeout(() => { if (el) el.textContent = '▢'; }, 1000); } catch { state.error = getCode(); render(); }
  });
  $('[data-end-turn]')?.addEventListener('click', () => takeAction({ type: 'END_TURN' }));
  $$('[data-cell-x]').forEach((button) => button.addEventListener('click', () => onCellClick(Number(button.dataset.cellX), Number(button.dataset.cellY))));
  $('[data-relay-action="claim"]')?.addEventListener('click', () => { if (state.selectedRelay) takeAction({ type: 'CLAIM', relayId: state.selectedRelay }); });
  $('[data-relay-action="jam"]')?.addEventListener('click', () => { if (state.selectedRelay) takeAction({ type: 'JAM', relayId: state.selectedRelay }); });
  $('[data-clear-relay]')?.addEventListener('click', () => { state.selectedRelay = null; render(); });
  $('[data-toggle-events]')?.addEventListener('click', () => { state.eventView = !state.eventView; render(); });
  $('[data-new-match]')?.addEventListener('click', () => { clearSession(); render(); });
}

function onCellClick(x, y) {
  if (!state.game?.isYourTurn || state.busy) return;
  const relay = state.game.relays.find((item) => item.x === x && item.y === y);
  if (relay) { state.selectedRelay = state.selectedRelay === relay.id ? null : relay.id; render(); return; }
  const move = state.legalActions.find((action) => action.type === 'MOVE' && action.to.x === x && action.to.y === y);
  if (move) takeAction(move);
}

async function busyAction(action) {
  state.error = ''; state.busy = true; render();
  try { await action(); }
  catch (error) { state.error = error.message; render(); }
  finally { state.busy = false; }
}

async function restoreSession() {
  try {
    const saved = JSON.parse(storageGet('sessionStorage', 'relay-session') || 'null');
    if (!saved?.code || !saved?.token) return;
    state.token = saved.token; state.hostToken = saved.hostToken || null; state.playerId = saved.playerId;
    state.match = await api(`/api/matches/${saved.code}`);
    await refresh(); startPolling();
  } catch { clearSession(); render(); }
}

render();
restoreSession();

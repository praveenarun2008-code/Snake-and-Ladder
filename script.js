const board = document.getElementById("board");
const boardWrap = board ? board.closest(".board-wrap") : null;
const overlay = document.getElementById("overlay");
const playerLayer = document.getElementById("player-layer");
const celebrationRain = document.getElementById("celebration-rain");
const winOverlay = document.getElementById("win-overlay");
const winMessage = document.getElementById("win-message");
const winContinue = document.getElementById("win-continue");
const winStop = document.getElementById("win-stop");
const confettiCorner = document.getElementById("confetti-corner");
const diceFace = document.getElementById("dice-face");
const diceText = document.getElementById("dice");
const diceOwner = document.getElementById("dice-owner");
const turnChip = document.getElementById("turn-chip");
const multiplayerStatus = document.getElementById("multiplayer-status");
const playerNameInput = document.getElementById("player-name");
const roomCodeInput = document.getElementById("room-code-input");
const roomCodeDisplay = document.getElementById("room-code-display");
const createRoomButton = document.getElementById("create-room-btn");
const joinRoomButton = document.getElementById("join-room-btn");
const leaveRoomButton = document.getElementById("leave-room-btn");
const localModeButton = document.getElementById("local-mode-btn");
const copyRoomLinkButton = document.getElementById("copy-room-link-btn");
const whatsappShareButton = document.getElementById("whatsapp-share-btn");
const chatMessagesEl = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSendButton = document.getElementById("chat-send-btn");
const reactionButtons = Array.from(document.querySelectorAll("[data-reaction]"));
const sharedRollButton = document.getElementById("roll-btn");
const localPlayerCountSelect = document.getElementById("local-player-count");
const PLAYER_IDS = [1, 2, 3, 4];
const MAX_ONLINE_PLAYERS = PLAYER_IDS.length;
const MIN_ONLINE_PLAYERS = 2;
const MIN_LOCAL_PLAYERS = 2;
const MAX_LOCAL_PLAYERS = PLAYER_IDS.length;
const CHAT_MAX_MESSAGES = 60;
const CHAT_MAX_LENGTH = 160;
const INVITE_AUTO_JOIN_DELAY = 220;
const INVITE_AUTO_JOIN_MAX_ATTEMPTS = 4;
const INVITE_AUTO_JOIN_RETRY_DELAY = 900;
const JOIN_RESPONSE_TIMEOUT = 7000;
const MANUAL_JOIN_MAX_ATTEMPTS = 2;
const GUEST_RECOVERY_MAX_ATTEMPTS = 3;
const GUEST_RECOVERY_RETRY_DELAY = 1200;
let localPlayerCount = MIN_LOCAL_PLAYERS;
const scoreCards = Object.fromEntries(PLAYER_IDS.map(playerId => [playerId, document.querySelector(`[data-score-card="${playerId}"]`)]));
const turnStates = Object.fromEntries(PLAYER_IDS.map(playerId => [playerId, document.getElementById(`turn-state-${playerId}`)]));
const lastRollLabels = Object.fromEntries(PLAYER_IDS.map(playerId => [playerId, document.getElementById(`p${playerId}-last-roll`)]));
const playerRollCards = Object.fromEntries(PLAYER_IDS.map(playerId => [playerId, document.getElementById(`player-roll-${playerId}`)]));
const playerNameLabels = Object.fromEntries(PLAYER_IDS.map(playerId => [playerId, document.getElementById(`p${playerId}-label`)]));
const playerRollNames = Object.fromEntries(PLAYER_IDS.map(playerId => [playerId, document.getElementById(`player-roll-name-${playerId}`)]));
let moveIndicator = null;
let moveIndicatorTimerId = null;

const audioState = {
  ctx: null,
  masterGain: null,
  lastStepAt: 0,
  noiseBuffer: null
}; 
const snakeHissAudio = typeof Audio !== "undefined"
  ? new Audio("assets/sounds/Blastwave_FX_SnakeHiss_SEU04.2.mp3")
  : null;
if(snakeHissAudio){
  snakeHissAudio.preload = "auto";
  snakeHissAudio.volume = 0.7;
}
const diceRollAudio = typeof Audio !== "undefined"
  ? new Audio("assets/sounds/zapsplat_leisure_game_dice_x2_in_small_plastic_shaker_shake_002_85270.mp3")
  : null;
if(diceRollAudio){
  diceRollAudio.preload = "auto";
  diceRollAudio.volume = 0.75;
}
const winAudio = typeof Audio !== "undefined"
  ? new Audio("assets/sounds/WhatsApp Audio 2026-03-17 at 4.05.08 PM.mpeg")
  : null;
if(winAudio){
  winAudio.preload = "auto";
  winAudio.volume = 0.85;
}

function ensureAudio(){
  if(audioState.ctx){
    if(audioState.ctx.state === "suspended"){
      audioState.ctx.resume();
    }
    return audioState.ctx;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if(!AudioCtx){
    return null;
  }
  const ctx = new AudioCtx();
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.2;
  masterGain.connect(ctx.destination);
  audioState.ctx = ctx;
  audioState.masterGain = masterGain;
  return ctx;
}

function playTone({freq = 440, duration = 0.1, type = "sine", gain = 0.2, attack = 0.005, decay = 0.06, detune = 0, startAt = null} = {}){
  const ctx = ensureAudio();
  if(!ctx || !audioState.masterGain){
    return;
  }
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  osc.connect(amp);
  amp.connect(audioState.masterGain);

  const now = startAt !== null ? startAt : ctx.currentTime;
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.linearRampToValueAtTime(gain, now + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration + decay);

  osc.start(now);
  osc.stop(now + duration + decay + 0.02);
}

function getNoiseBuffer(){
  const ctx = ensureAudio();
  if(!ctx){
    return null;
  }
  if(audioState.noiseBuffer){
    return audioState.noiseBuffer;
  }
  const duration = 1;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i = 0; i < data.length; i++){
    data[i] = Math.random() * 2 - 1;
  }
  audioState.noiseBuffer = buffer;
  return buffer;
}

function getAudioDurationMs(audioEl){
  if(!audioEl){
    return null;
  }
  const duration = audioEl.duration;
  if(typeof duration === "number" && Number.isFinite(duration) && duration > 0){
    return duration * 1000;
  }
  return null;
}

function playNoise({duration = 0.2, gain = 0.15, filterType = "bandpass", freq = 1000, q = 1, startAt = null, endFreq = null} = {}){
  const ctx = ensureAudio();
  if(!ctx || !audioState.masterGain){
    return;
  }
  const buffer = getNoiseBuffer();
  if(!buffer){
    return;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.Q.value = q;
  const amp = ctx.createGain();
  const now = startAt !== null ? startAt : ctx.currentTime;

  filter.frequency.setValueAtTime(freq, now);
  if(endFreq !== null){
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
  }
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.linearRampToValueAtTime(gain, now + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(filter);
  filter.connect(amp);
  amp.connect(audioState.masterGain);
  source.start(now);
  source.stop(now + duration + 0.02);
}

function playSound(type, durationMs = null){
  const ctx = ensureAudio();
  if(!ctx){
    return;
  }
  if(type === "roll"){
    if(diceRollAudio){
      diceRollAudio.currentTime = 0;
      diceRollAudio.play().catch(() => {});
      return;
    }
    const now = ctx.currentTime;
    // Dice roll: two deep thumps + rattling shake
    [120, 95].forEach((freq, index) => {
      playTone({
        freq,
        duration: 0.09,
        type: "sine",
        gain: 0.26,
        startAt: now + index * 0.12
      });
    });
    for(let i = 0; i < 7; i++){
      playNoise({
        duration: 0.05,
        gain: 0.08,
        filterType: "highpass",
        freq: 1200,
        q: 0.7,
        startAt: now + 0.2 + i * 0.06
      });
    }
    return;
  }
  if(type === "step"){
    playTone({freq: 680, duration: 0.03, type: "triangle", gain: 0.06});
    return;
  }
  if(type === "move"){
    // Player step: soft blip so each tile move feels alive
    playTone({freq: 520, duration: 0.04, type: "sine", gain: 0.08});
    playTone({freq: 760, duration: 0.03, type: "triangle", gain: 0.04, detune: -20});
    return;
  }
  if(type === "snake"){
    if(snakeHissAudio){
      snakeHissAudio.currentTime = 0;
      snakeHissAudio.play().catch(() => {});
      return;
    }
    const now = ctx.currentTime;
    // Snake hiss: filtered noise sweep for the slide duration
    const durationSec = Math.max(0.4, (durationMs || 700) / 1000);
    playNoise({
      duration: durationSec,
      gain: 0.18,
      filterType: "bandpass",
      freq: 1800,
      endFreq: 500,
      q: 1.4,
      startAt: now
    });
    playTone({
      freq: 260,
      duration: Math.min(0.3, durationSec * 0.6),
      type: "sawtooth",
      gain: 0.08,
      startAt: now + 0.05
    });
    return;
  }
  if(type === "ladder"){
    const now = ctx.currentTime;
    // Ladder climb: woody taps that keep going for the climb duration
    const freqs = [360, 420, 500, 620];
    const durationSec = Math.max(0.36, (durationMs || 360) / 1000);
    const interval = 0.12;
    const count = Math.max(1, Math.ceil(durationSec / interval));
    for(let i = 0; i < count; i++){
      const freq = freqs[i % freqs.length];
      playTone({
        freq,
        duration: 0.05,
        type: "square",
        gain: 0.16,
        startAt: now + i * interval
      });
      playNoise({
        duration: 0.03,
        gain: 0.05,
        filterType: "bandpass",
        freq: 700,
        q: 1.1,
        startAt: now + i * interval
      });
    }
    return;
  }
  if(type === "win"){
    if(winAudio){
      winAudio.currentTime = 0;
      winAudio.play().catch(() => {});
      return;
    }
    const now = ctx.currentTime;
    [523, 659, 784].forEach((freq, index) => {
      playTone({
        freq,
        duration: 0.22,
        type: "sine",
        gain: 0.22,
        startAt: now + index * 0.05
      });
    });
    playTone({freq: 1046, duration: 0.18, type: "sine", gain: 0.18, startAt: now + 0.18});
    return;
  }
  if(type === "land"){
    playTone({freq: 520, duration: 0.06, type: "square", gain: 0.12});
  }
}

function playStepSound(){
  const ctx = ensureAudio();
  if(!ctx){
    return;
  }
  const now = ctx.currentTime;
  if(now - audioState.lastStepAt < 0.08){
    return;
  }
  audioState.lastStepAt = now;
  playSound("move");
}

const multiplayerState = {
  mode: "local",
  peerSupported: typeof Peer !== "undefined",
  peer: null,
  connection: null,
  connections: {},
  roomCode: "",
  localPlayerSlot: null,
  clientId: getClientId(),
  lastActionId: null,
  isHost: false,
  reconnectingToServer: false,
  pendingAction: "",
  players: {},
  chatMessages: []
};

const warmHostState = {
  peer: null,
  roomCode: "",
  pending: null,
  retryTimerId: null,
  token: 0
};

const warmGuestState = {
  peer: null,
  pending: null,
  retryTimerId: null,
  token: 0
};

const pendingInviteRoomCode = getInviteRoomCode();
let inviteAutoJoinAttempted = false;

const joinRequestState = {
  timerId: null,
  roomCode: "",
  attempt: 1,
  isAutoJoin: false
};

const guestRecoveryState = {
  timerId: null,
  roomCode: "",
  attempts: 0,
  recovering: false
};

function getClientId(){
  const storageKey = "snakes-ladders-client-id";
  try{
    const existing = localStorage.getItem(storageKey);
    if(existing){
      return existing;
    }
    const nextId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `client-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    localStorage.setItem(storageKey, nextId);
    return nextId;
  }catch(error){
    return `client-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }
}

function getPlayerName(){
  const value = playerNameInput ? playerNameInput.value.trim() : "";
  return value ? value.slice(0, 18) : "Player";
}

function sanitizeRoomCode(value){
  return (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function generateRoomCode(length = 5){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for(let i = 0; i < length; i++){
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getInviteRoomCode(){
  if(typeof window === "undefined"){
    return "";
  }
  try{
    const url = new URL(window.location.href);
    return sanitizeRoomCode(url.searchParams.get("room") || "");
  }catch(error){
    return "";
  }
}

function getRoomInviteLink(roomCode = multiplayerState.roomCode){
  const nextRoomCode = sanitizeRoomCode(roomCode);
  if(!nextRoomCode || typeof window === "undefined"){
    return "";
  }
  try{
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("room", nextRoomCode);
    return url.toString();
  }catch(error){
    return "";
  }
}

function getEventId(prefix = "evt"){
  if(typeof crypto !== "undefined" && crypto.randomUUID){
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function hasJoinIntent(){
  return Boolean(pendingInviteRoomCode || sanitizeRoomCode(roomCodeInput ? roomCodeInput.value : ""));
}

function cloneChatMessages(chatMessages = []){
  return chatMessages.map(entry => ({...entry}));
}

function isChatAvailable(){
  return isOnlineMode() && Boolean(multiplayerState.roomCode);
}

function createChatEntry({
  kind = "message",
  text = "",
  playerId = null,
  name = "",
  id = getEventId(kind === "reaction" ? "reaction" : "chat"),
  createdAt = Date.now()
} = {}){
  const normalizedText = String(text || "").trim().slice(0, CHAT_MAX_LENGTH);
  return {
    id,
    kind,
    text: normalizedText,
    playerId: playerId ? Number(playerId) : null,
    name: name || (playerId ? getPlayerDisplayName(playerId) : "Room"),
    createdAt
  };
}

function setChatMessages(chatMessages = []){
  multiplayerState.chatMessages = cloneChatMessages(chatMessages).slice(-CHAT_MAX_MESSAGES);
  renderChatMessages();
}

function appendChatEntry(entry, {broadcast = false} = {}){
  if(!entry || !entry.id){
    return;
  }
  if(multiplayerState.chatMessages.some(message => message.id === entry.id)){
    return;
  }
  multiplayerState.chatMessages = [...multiplayerState.chatMessages, {...entry}].slice(-CHAT_MAX_MESSAGES);
  renderChatMessages();
  if(broadcast){
    sendPeerMessage({type: "chat-event", entry});
  }
}

function addRoomSystemMessage(text, {broadcast = false} = {}){
  const entry = createChatEntry({
    kind: "system",
    text,
    name: "Room"
  });
  appendChatEntry(entry, {broadcast});
}

function getChatEmptyState(){
  if(!isChatAvailable()){
    return "Join an online room to chat and react.";
  }
  return "Room chat is ready. Say hi before the next roll.";
}

function renderChatMessages(){
  if(!chatMessagesEl){
    return;
  }

  chatMessagesEl.innerHTML = "";
  if(!multiplayerState.chatMessages.length){
    const emptyState = document.createElement("p");
    emptyState.className = "chat-empty";
    emptyState.textContent = getChatEmptyState();
    chatMessagesEl.appendChild(emptyState);
    return;
  }

  const fragment = document.createDocumentFragment();
  multiplayerState.chatMessages.forEach(entry => {
    const item = document.createElement("article");
    const isSystem = entry.kind === "system";
    const isReaction = entry.kind === "reaction";
    const isSelf = !isSystem && Number(entry.playerId) === Number(multiplayerState.localPlayerSlot);
    item.className = [
      "chat-item",
      isSystem ? "system" : "player",
      isReaction ? "reaction" : "message",
      isSelf ? "self" : ""
    ].filter(Boolean).join(" ");

    if(isSystem){
      item.textContent = entry.text;
      fragment.appendChild(item);
      return;
    }

    const meta = document.createElement("div");
    meta.className = "chat-meta";
    meta.textContent = isSelf ? "You" : (entry.name || getPlayerDisplayName(entry.playerId));

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.textContent = entry.text;

    item.appendChild(meta);
    item.appendChild(bubble);
    fragment.appendChild(item);
  });

  chatMessagesEl.appendChild(fragment);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function getRoomPlayers(){
  return multiplayerState.players || {};
}

function isPeerActive(peer){
  return Boolean(peer && peer.open && !peer.destroyed && !peer.disconnected);
}

function createPlayerSlotMap(factory){
  const next = {};
  PLAYER_IDS.forEach(playerId => {
    next[playerId] = typeof factory === "function" ? factory(playerId) : factory;
  });
  return next;
}

function getConnectedPlayerIds(players = getOnlinePlayers()){
  return PLAYER_IDS.filter(playerId => players[playerId]);
}

function getOnlinePlayerCount(players = getOnlinePlayers()){
  return getConnectedPlayerIds(players).length;
}

function getConnectedPlayersLabel(players = getOnlinePlayers()){
  return `${getOnlinePlayerCount(players)}/${MAX_ONLINE_PLAYERS} players connected`;
}

function getLocalPlayerIds(){
  return PLAYER_IDS.slice(0, localPlayerCount);
}

function getVisiblePlayerIds(players = getOnlinePlayers()){
  if(isOnlineMode()){
    const connectedPlayerIds = getConnectedPlayerIds(players);
    return connectedPlayerIds.length ? connectedPlayerIds : [1];
  }
  return getLocalPlayerIds();
}

function setPanelVisibility(element, visible){
  if(!element){
    return;
  }
  element.hidden = !visible;
  element.style.display = visible ? "" : "none";
}

function getNextLocalPlayer(currentId){
  const localPlayerIds = getLocalPlayerIds();
  const currentIndex = localPlayerIds.indexOf(currentId);
  if(currentIndex === -1){
    return localPlayerIds[0] || 1;
  }
  return localPlayerIds[(currentIndex + 1) % localPlayerIds.length];
}

function getFirstActivePlayerId(players = getOnlinePlayers()){
  const activePlayerIds = getConnectedPlayerIds(players);
  return activePlayerIds[0] || 1;
}

function getNextActivePlayer(currentId, players = getOnlinePlayers()){
  const activePlayerIds = getConnectedPlayerIds(players);
  if(!activePlayerIds.length){
    return 1;
  }
  const currentIndex = activePlayerIds.indexOf(currentId);
  if(currentIndex === -1){
    return activePlayerIds[0];
  }
  return activePlayerIds[(currentIndex + 1) % activePlayerIds.length];
}

function getFirstOpenGuestSlot(players = getOnlinePlayers()){
  return PLAYER_IDS.slice(1).find(playerId => !players[playerId]) || null;
}

function isRoomFull(players = getOnlinePlayers()){
  return getConnectedPlayerIds(players).length >= MAX_ONLINE_PLAYERS;
}

function getOpenHostConnections(){
  return Object.values(multiplayerState.connections || {}).filter(connection => connection && connection.open);
}

function createBaseGameState(){
  return {
    positions: createPlayerSlotMap(() => 1),
    lastRolls: createPlayerSlotMap(() => null),
    currentPlayer: 1,
    gameOver: false,
    diceValue: 1,
    action: null,
    updatedAt: Date.now()
  };
}

function getOnlinePlayers(){
  return getRoomPlayers();
}

function isOnlineMode(){
  return multiplayerState.mode === "online";
}

function isRoomReady(){
  const players = getOnlinePlayers();
  const activeCount = getConnectedPlayerIds(players).length;
  if(activeCount < MIN_ONLINE_PLAYERS){
    return false;
  }
  if(multiplayerState.isHost){
    return Boolean(multiplayerState.peer && multiplayerState.peer.open);
  }
  return Boolean(multiplayerState.connection && multiplayerState.connection.open);
}

function getPlayerDisplayName(playerId){
  const players = getOnlinePlayers();
  const onlineName = players[playerId] && players[playerId].name;
  return onlineName || `Player ${playerId}`;
}

function updatePlayerNames(){
  PLAYER_IDS.forEach(playerId => {
    const name = getPlayerDisplayName(playerId);
    if(playerNameLabels[playerId]){
      playerNameLabels[playerId].innerText = name;
    }
    if(playerRollNames[playerId]){
      playerRollNames[playerId].innerText = name;
    }
  });
}

function setMultiplayerStatus(message){
  if(multiplayerStatus){
    multiplayerStatus.innerText = message;
  }
}

function clearGuestRecoveryTimer(){
  if(guestRecoveryState.timerId){
    clearTimeout(guestRecoveryState.timerId);
    guestRecoveryState.timerId = null;
  }
}

function clearGuestRecoveryState(){
  clearGuestRecoveryTimer();
  guestRecoveryState.roomCode = "";
  guestRecoveryState.attempts = 0;
  guestRecoveryState.recovering = false;
}

function clearJoinRequestTimer(){
  if(joinRequestState.timerId){
    clearTimeout(joinRequestState.timerId);
    joinRequestState.timerId = null;
  }
  joinRequestState.roomCode = "";
  joinRequestState.attempt = 1;
  joinRequestState.isAutoJoin = false;
}

function getJoinMaxAttempts(isAutoJoin = false){
  return isAutoJoin ? INVITE_AUTO_JOIN_MAX_ATTEMPTS : MANUAL_JOIN_MAX_ATTEMPTS;
}

function scheduleJoinRetry(roomCode, attempt, {isAutoJoin = false, isRecoveryJoin = false, delayMs = INVITE_AUTO_JOIN_RETRY_DELAY} = {}){
  window.setTimeout(() => {
    joinOnlineRoom({
      roomCodeOverride: roomCode,
      isAutoJoin,
      isRecoveryJoin,
      attempt
    });
  }, delayMs);
}

function scheduleJoinRequestTimeout(roomCode, {isAutoJoin = false, isRecoveryJoin = false, attempt = 1} = {}){
  clearJoinRequestTimer();
  joinRequestState.roomCode = roomCode;
  joinRequestState.attempt = attempt;
  joinRequestState.isAutoJoin = isAutoJoin;
  joinRequestState.timerId = window.setTimeout(() => {
    if(
      multiplayerState.pendingAction !== "join" ||
      sanitizeRoomCode(multiplayerState.roomCode) !== roomCode
    ){
      return;
    }

    clearJoinRequestTimer();
    const maxAttempts = isRecoveryJoin ? GUEST_RECOVERY_MAX_ATTEMPTS : getJoinMaxAttempts(isAutoJoin);
    if(attempt < maxAttempts){
      showToast(`Room ${roomCode} is slow to reply. Retrying...`, "info");
      if(isRecoveryJoin){
        multiplayerState.reconnectingToServer = true;
        multiplayerState.mode = "online";
        multiplayerState.roomCode = roomCode;
        updateMultiplayerUI();
      }else{
        setLocalMode(true);
      }
      setMultiplayerStatus(`Retrying room ${roomCode}... (${attempt + 1}/${maxAttempts})`);
      scheduleJoinRetry(roomCode, attempt + 1, {
        isAutoJoin,
        isRecoveryJoin,
        delayMs: isRecoveryJoin
          ? GUEST_RECOVERY_RETRY_DELAY
          : (isAutoJoin ? INVITE_AUTO_JOIN_RETRY_DELAY : 650)
      });
      return;
    }

    showToast(`Room ${roomCode} took too long to answer. Try again.`, "warn");
    if(isRecoveryJoin){
      clearGuestRecoveryState();
    }
    setLocalMode(true);
  }, JOIN_RESPONSE_TIMEOUT);
}

function scheduleGuestRoomRecovery(roomCode, attempt = 1){
  clearGuestRecoveryTimer();
  guestRecoveryState.roomCode = roomCode;
  guestRecoveryState.attempts = attempt;
  guestRecoveryState.recovering = true;
  guestRecoveryState.timerId = window.setTimeout(() => {
    joinOnlineRoom({
      roomCodeOverride: roomCode,
      isRecoveryJoin: true,
      attempt
    });
  }, GUEST_RECOVERY_RETRY_DELAY);
}

function attemptGuestRoomRecovery(showMessage = true){
  if(multiplayerState.isHost){
    handleGuestConnectionClose(showMessage);
    return;
  }

  const roomCode = sanitizeRoomCode(multiplayerState.roomCode);
  if(!roomCode){
    handleGuestConnectionClose(showMessage);
    return;
  }

  if(guestRecoveryState.recovering){
    return;
  }

  clearJoinRequestTimer();
  guestRecoveryState.recovering = true;
  guestRecoveryState.roomCode = roomCode;
  guestRecoveryState.attempts = 1;
  closePeerSession(false);
  multiplayerState.mode = "online";
  multiplayerState.isHost = false;
  multiplayerState.roomCode = roomCode;
  multiplayerState.reconnectingToServer = true;
  updateMultiplayerUI();
  if(showMessage){
    showToast(`Connection to room ${roomCode} dropped. Rejoining...`, "warn");
  }
  scheduleGuestRoomRecovery(roomCode, 1);
}

function updateMultiplayerUI(){
  const inRoom = Boolean(multiplayerState.roomCode);
  const online = isOnlineMode();
  const roomReady = isRoomReady();
  const busy = Boolean(multiplayerState.pendingAction);
  const canShareRoom = inRoom && !busy;
  const chatEnabled = inRoom && !busy;
  const activeCount = getOnlinePlayerCount();
  const roomText = inRoom ? `Room: ${multiplayerState.roomCode}` : "Room: -";

  if(roomCodeDisplay){
    roomCodeDisplay.innerText = roomText;
  }
  if(leaveRoomButton){
    leaveRoomButton.disabled = !inRoom || busy;
  }
  if(createRoomButton){
    createRoomButton.disabled = !multiplayerState.peerSupported || inRoom || busy;
  }
  if(joinRoomButton){
    joinRoomButton.disabled = !multiplayerState.peerSupported || inRoom || busy;
  }
  if(localModeButton){
    localModeButton.disabled = busy || (!online && !inRoom);
  }
  if(localPlayerCountSelect){
    localPlayerCountSelect.disabled = online || busy;
  }
  if(copyRoomLinkButton){
    copyRoomLinkButton.disabled = !canShareRoom;
  }
  if(whatsappShareButton){
    whatsappShareButton.disabled = !canShareRoom;
  }
  if(chatInput){
    chatInput.disabled = !chatEnabled;
  }
  if(chatSendButton){
    chatSendButton.disabled = !chatEnabled;
  }
  reactionButtons.forEach(button => {
    button.disabled = !chatEnabled;
  });

  if(multiplayerState.pendingAction === "create"){
    setMultiplayerStatus("Creating room...");
  }else if(multiplayerState.pendingAction === "join"){
    if(multiplayerState.roomCode){
      setMultiplayerStatus(`${guestRecoveryState.recovering ? "Rejoining" : "Joining"} room ${multiplayerState.roomCode}... waiting for host reply.`);
    }else{
      setMultiplayerStatus("Joining room...");
    }
  }else if(multiplayerState.reconnectingToServer && multiplayerState.roomCode){
    if(multiplayerState.isHost){
      setMultiplayerStatus(`Reconnecting room ${multiplayerState.roomCode}...`);
    }else{
      setMultiplayerStatus(`Reconnecting to room ${multiplayerState.roomCode}...`);
    }
  }else if(!multiplayerState.peerSupported){
    setMultiplayerStatus("Online mode needs the PeerJS script to load. Local mode still works.");
  }else if(!online){
    setMultiplayerStatus(`Local mode. Choose ${MIN_LOCAL_PLAYERS} to ${MAX_LOCAL_PLAYERS} players, or create a room for online play.`);
  }else if(!roomReady){
    const playersNeeded = Math.max(0, MIN_ONLINE_PLAYERS - activeCount);
    if(playersNeeded > 0){
      setMultiplayerStatus(`Room ${multiplayerState.roomCode} is open. ${getConnectedPlayersLabel()} and waiting for ${playersNeeded} more player${playersNeeded === 1 ? "" : "s"}.`);
    }else{
      setMultiplayerStatus(`Room ${multiplayerState.roomCode} is syncing. ${getConnectedPlayersLabel()}.`);
    }
  }else{
    const you = multiplayerState.localPlayerSlot ? getPlayerDisplayName(multiplayerState.localPlayerSlot) : "You";
    setMultiplayerStatus(`${you} are connected. ${getConnectedPlayersLabel()}.`);
  }

  updatePlayerNames();
  renderChatMessages();
}

function getPeerErrorMessage(error){
  if(!error || !error.type){
    return "Online connection failed.";
  }
  if(error.type === "peer-unavailable"){
    return "Room not found. Ask your friend to keep the host tab open.";
  }
  if(error.type === "unavailable-id"){
    return "That room code is already in use. Try creating the room again.";
  }
  if(error.type === "network"){
    return "Network problem while connecting online.";
  }
  return error.message || "Online connection failed.";
}

function clonePlayers(players = {}){
  return createPlayerSlotMap(playerId => players[playerId] ? {...players[playerId]} : null);
}

function getDefaultOnlinePlayers(){
  return createPlayerSlotMap(() => null);
}

function getCurrentGameState(){
  const latestRoll = PLAYER_IDS.reduce((value, playerId) => {
    const nextValue = lastRolls[playerId];
    return typeof nextValue === "number" ? nextValue : value;
  }, 1);

  return {
    positions: createPlayerSlotMap(playerId => positions[playerId]),
    lastRolls: createPlayerSlotMap(playerId => lastRolls[playerId]),
    currentPlayer,
    gameOver,
    diceValue: latestRoll || 1,
    action: null,
    updatedAt: Date.now()
  };
}

function sendPeerMessage(message, targetConnection = null){
  if(targetConnection){
    if(targetConnection.open){
      targetConnection.send(message);
    }
    return;
  }

  if(multiplayerState.isHost){
    getOpenHostConnections().forEach(connection => {
      connection.send(message);
    });
    return;
  }

  if(multiplayerState.connection && multiplayerState.connection.open){
    multiplayerState.connection.send(message);
  }
}

function broadcastGameState(game){
  sendPeerMessage({
    type: "sync-state",
    players: clonePlayers(multiplayerState.players),
    game
  });
}

function clearConnectionObject(connection){
  if(!connection){
    return;
  }
  connection.off("data");
  connection.off("open");
  connection.off("close");
  connection.off("error");
}

function clearPeerObjects(){
  if(multiplayerState.connection){
    clearConnectionObject(multiplayerState.connection);
    multiplayerState.connection = null;
  }
  Object.values(multiplayerState.connections || {}).forEach(connection => {
    clearConnectionObject(connection);
  });
  multiplayerState.connections = {};
  if(multiplayerState.peer){
    multiplayerState.peer.off("open");
    multiplayerState.peer.off("connection");
    multiplayerState.peer.off("error");
    multiplayerState.peer.off("close");
    multiplayerState.peer.off("disconnected");
    multiplayerState.peer = null;
  }
}

function clearWarmHostRetry(){
  if(warmHostState.retryTimerId){
    clearTimeout(warmHostState.retryTimerId);
    warmHostState.retryTimerId = null;
  }
}

function clearWarmGuestRetry(){
  if(warmGuestState.retryTimerId){
    clearTimeout(warmGuestState.retryTimerId);
    warmGuestState.retryTimerId = null;
  }
}

function detachWarmHostPeer(peer){
  if(!peer){
    return;
  }
  peer.off("open");
  peer.off("connection");
  peer.off("error");
  peer.off("close");
  peer.off("disconnected");
}

function resetWarmHostState({destroyPeer = false} = {}){
  clearWarmHostRetry();
  if(warmHostState.peer){
    detachWarmHostPeer(warmHostState.peer);
    if(destroyPeer){
      warmHostState.peer.destroy();
    }
  }
  warmHostState.peer = null;
  warmHostState.roomCode = "";
  warmHostState.pending = null;
}

function cancelWarmHostPeer(){
  warmHostState.token += 1;
  resetWarmHostState({destroyPeer: true});
}

function detachWarmGuestPeer(peer){
  if(!peer){
    return;
  }
  peer.off("open");
  peer.off("connection");
  peer.off("error");
  peer.off("close");
  peer.off("disconnected");
}

function resetWarmGuestState({destroyPeer = false} = {}){
  clearWarmGuestRetry();
  if(warmGuestState.peer){
    detachWarmGuestPeer(warmGuestState.peer);
    if(destroyPeer){
      warmGuestState.peer.destroy();
    }
  }
  warmGuestState.peer = null;
  warmGuestState.pending = null;
}

function cancelWarmGuestPeer(){
  warmGuestState.token += 1;
  resetWarmGuestState({destroyPeer: true});
}

function scheduleWarmHostPeer(delay = 0){
  if(
    !multiplayerState.peerSupported ||
    isOnlineMode() ||
    multiplayerState.roomCode ||
    multiplayerState.pendingAction ||
    warmHostState.peer ||
    warmHostState.pending
  ){
    return;
  }

  clearWarmHostRetry();
  const token = ++warmHostState.token;
  const startWarmup = () => {
    if(
      token !== warmHostState.token ||
      !multiplayerState.peerSupported ||
      isOnlineMode() ||
      multiplayerState.roomCode ||
      multiplayerState.pendingAction ||
      warmHostState.peer ||
      warmHostState.pending
    ){
      return;
    }

    const roomCode = generateRoomCode();
    warmHostState.pending = createHostPeer(roomCode)
      .then(({peer}) => {
        if(
          token !== warmHostState.token ||
          isOnlineMode() ||
          multiplayerState.roomCode ||
          multiplayerState.pendingAction === "join"
        ){
          peer.destroy();
          return null;
        }

        const recycleWarmPeer = () => {
          if(warmHostState.peer !== peer){
            return;
          }
          cancelWarmHostPeer();
          scheduleWarmHostPeer(400);
        };

        warmHostState.peer = peer;
        warmHostState.roomCode = roomCode;
        peer.on("error", recycleWarmPeer);
        peer.on("close", recycleWarmPeer);
        peer.on("disconnected", recycleWarmPeer);
        return {peer, roomCode};
      })
      .catch(() => null)
      .finally(() => {
        if(token !== warmHostState.token){
          return;
        }
        warmHostState.pending = null;
        if(!warmHostState.peer){
          scheduleWarmHostPeer(300);
        }
      });
  };

  if(delay > 0){
    warmHostState.retryTimerId = setTimeout(startWarmup, delay);
  }else{
    startWarmup();
  }
}

function claimWarmHostPeer(){
  if(!warmHostState.peer){
    return null;
  }

  const peer = warmHostState.peer;
  const roomCode = warmHostState.roomCode;
  if(!isPeerActive(peer)){
    cancelWarmHostPeer();
    scheduleWarmHostPeer(120);
    return null;
  }

  warmHostState.token += 1;
  resetWarmHostState();
  return {peer, roomCode};
}

function scheduleWarmGuestPeer(delay = 0){
  if(
    !multiplayerState.peerSupported ||
    isOnlineMode() ||
    multiplayerState.roomCode ||
    multiplayerState.pendingAction ||
    warmGuestState.peer ||
    warmGuestState.pending ||
    !hasJoinIntent()
  ){
    return;
  }

  clearWarmGuestRetry();
  const token = ++warmGuestState.token;
  const startWarmup = () => {
    if(
      token !== warmGuestState.token ||
      !multiplayerState.peerSupported ||
      isOnlineMode() ||
      multiplayerState.roomCode ||
      multiplayerState.pendingAction ||
      warmGuestState.peer ||
      warmGuestState.pending ||
      !hasJoinIntent()
    ){
      return;
    }

    warmGuestState.pending = createGuestPeer()
      .then(peer => {
        if(
          token !== warmGuestState.token ||
          isOnlineMode() ||
          multiplayerState.roomCode ||
          multiplayerState.pendingAction === "create" ||
          !hasJoinIntent()
        ){
          peer.destroy();
          return null;
        }

        const recycleWarmPeer = () => {
          if(warmGuestState.peer !== peer){
            return;
          }
          cancelWarmGuestPeer();
          scheduleWarmGuestPeer(400);
        };

        warmGuestState.peer = peer;
        peer.on("error", recycleWarmPeer);
        peer.on("close", recycleWarmPeer);
        peer.on("disconnected", recycleWarmPeer);
        return peer;
      })
      .catch(() => null)
      .finally(() => {
        if(token !== warmGuestState.token){
          return;
        }
        warmGuestState.pending = null;
        if(!warmGuestState.peer && hasJoinIntent()){
          scheduleWarmGuestPeer(300);
        }
      });
  };

  if(delay > 0){
    warmGuestState.retryTimerId = setTimeout(startWarmup, delay);
  }else{
    startWarmup();
  }
}

function claimWarmGuestPeer(){
  if(!warmGuestState.peer){
    return null;
  }

  const peer = warmGuestState.peer;
  if(!isPeerActive(peer)){
    cancelWarmGuestPeer();
    scheduleWarmGuestPeer(120);
    return null;
  }

  warmGuestState.token += 1;
  resetWarmGuestState();
  return peer;
}

async function createFreshHostPeer(maxAttempts = 4){
  let lastError = null;
  for(let attempt = 0; attempt < maxAttempts; attempt++){
    const roomCode = generateRoomCode();
    try{
      const {peer} = await createHostPeer(roomCode);
      return {peer, roomCode};
    }catch(error){
      lastError = error;
      if(!error || error.type !== "unavailable-id"){
        throw error;
      }
    }
  }
  throw lastError || new Error("Online connection failed.");
}

async function getPreparedHostPeer(){
  const warmPeer = claimWarmHostPeer();
  if(warmPeer){
    return warmPeer;
  }

  if(warmHostState.pending){
    await warmHostState.pending;
    const warmedAfterWait = claimWarmHostPeer();
    if(warmedAfterWait){
      return warmedAfterWait;
    }
  }

  return createFreshHostPeer();
}

async function getPreparedGuestPeer(){
  const warmPeer = claimWarmGuestPeer();
  if(warmPeer){
    return warmPeer;
  }

  if(warmGuestState.pending){
    await warmGuestState.pending;
    const warmedAfterWait = claimWarmGuestPeer();
    if(warmedAfterWait){
      return warmedAfterWait;
    }
  }

  return createGuestPeer();
}

function closePeerSession(notifyRemote = false){
  clearJoinRequestTimer();
  multiplayerState.reconnectingToServer = false;
  if(notifyRemote){
    if(multiplayerState.isHost){
      sendPeerMessage({type: "host-left"});
    }else if(multiplayerState.connection && multiplayerState.connection.open){
      sendPeerMessage({type: "guest-left", playerId: multiplayerState.localPlayerSlot});
    }
  }

  Object.values(multiplayerState.connections || {}).forEach(connection => {
    connection.close();
  });
  if(multiplayerState.connection){
    multiplayerState.connection.close();
  }
  if(multiplayerState.peer){
    multiplayerState.peer.destroy();
  }
  clearPeerObjects();
}

function resetOnlineState(){
  clearGuestRecoveryState();
  multiplayerState.roomCode = "";
  multiplayerState.localPlayerSlot = null;
  multiplayerState.lastActionId = null;
  multiplayerState.isHost = false;
  multiplayerState.reconnectingToServer = false;
  multiplayerState.pendingAction = "";
  multiplayerState.connection = null;
  multiplayerState.connections = {};
  multiplayerState.players = getDefaultOnlinePlayers();
  multiplayerState.chatMessages = [];
}

function applyOnlineGameState(game){
  if(!game){
    return;
  }
  positions = createPlayerSlotMap(playerId => Number(game.positions && game.positions[playerId]) || 1);
  lastRolls = createPlayerSlotMap(playerId => game.lastRolls && typeof game.lastRolls[playerId] === "number" ? game.lastRolls[playerId] : null);
  currentPlayer = Number(game.currentPlayer) || getFirstActivePlayerId();
  gameOver = Boolean(game.gameOver);
  isRolling = false;
  if(!gameOver){
    hideWinCelebration();
  }
  const diceValue = Number(game.diceValue) || 1;
  setDiceFace(diceValue);
  if(diceText){
    if(game.action && game.action.playerId){
      diceText.innerText = `${getPlayerDisplayName(game.action.playerId)}: ${diceValue}`;
    }else{
      diceText.innerText = "Dice: -";
    }
  }
  updatePlayers();
}

async function animateOnlineGameState(game){
  if(!game){
    return;
  }

  if(!game.action){
    hideMoveIndicator();
    applyOnlineGameState(game);
    updateMultiplayerUI();
    return;
  }

  const actorId = Number(game.action.playerId) || 1;
  const actorName = getPlayerDisplayName(actorId);
  const startPos = Number(game.action.start) || positions[actorId] || 1;
  const endPos = Number(game.action.end) || startPos;
  const finalPos = Number(game.action.finalPos) || endPos;
  const diceValue = Number(game.action.dice) || Number(game.diceValue) || 1;

  positions = {
    ...positions,
    [actorId]: startPos
  };
  currentPlayer = actorId;
  gameOver = false;
  isRolling = true;
  hideWinCelebration();
  playSound("roll");

  if(diceText){
    diceText.innerText = `${actorName}: rolling...`;
  }
  diceFace.classList.add("rolling");
  updatePlayers();
  updateMultiplayerUI();

  const previewCount = 3;
  const previewDelay = 220;
  for(let i = 0; i < previewCount; i++){
    setDiceFace(Math.floor(Math.random() * 6) + 1);
    await sleep(previewDelay);
  }

  diceFace.classList.remove("rolling");
  setDiceFace(diceValue);
  playSound("land");
  lastRolls = createPlayerSlotMap(playerId => game.lastRolls && typeof game.lastRolls[playerId] === "number" ? game.lastRolls[playerId] : lastRolls[playerId]);
  if(diceText){
    diceText.innerText = `${actorName}: ${diceValue}`;
  }
  updatePlayers();

  await animateMove(actorId, startPos, endPos, MOVE_DELAY);

  if(game.action.effect === "snake"){
    showMoveIndicator(`${actorName} hit a snake and slides to ${finalPos}.`);
    playSound("snake", SNAKE_SLIDE_DURATION);
    await sleep(240);
    const path = snakePaths.get(endPos);
    await animateAlongPath(actorId, path, SNAKE_SLIDE_DURATION, endPos, finalPos);
  }else if(game.action.effect === "ladder"){
    showMoveIndicator(`${actorName} found a ladder and climbs to ${finalPos}.`);
    playSound("ladder", LADDER_CLIMB_DURATION);
    await sleep(240);
    const path = ladderPaths.get(endPos);
    await animateAlongPath(actorId, path, LADDER_CLIMB_DURATION, endPos, finalPos);
  }

  applyOnlineGameState(game);
  maybeShowOnlineActionToast(game);
  hideMoveIndicator(game.gameOver ? 1800 : 900);
  updateMultiplayerUI();
}

function handleHostConnectionClose(connection = null, showMessage = true){
  const playerId = connection && connection.__playerSlot ? connection.__playerSlot : null;
  if(playerId && multiplayerState.connections[playerId] === connection){
    delete multiplayerState.connections[playerId];
  }

  if(playerId && multiplayerState.players[playerId]){
    const departingName = getPlayerDisplayName(playerId);
    multiplayerState.players[playerId] = null;
    multiplayerState.lastActionId = null;
    hideMoveIndicator();

    if(currentPlayer === playerId){
      currentPlayer = getNextActivePlayer(playerId);
    }

    applyOnlineGameState({
      ...getCurrentGameState(),
      currentPlayer: getFirstActivePlayerId()
    });

    if(getConnectedPlayerIds().length >= MIN_ONLINE_PLAYERS){
      const snapshot = getCurrentGameState();
      snapshot.currentPlayer = multiplayerState.players[currentPlayer] ? currentPlayer : getFirstActivePlayerId();
      broadcastGameState(snapshot);
    }

    addRoomSystemMessage(`${departingName} left the room.`, {broadcast: true});
    if(showMessage){
      showToast(`${departingName} disconnected. ${getConnectedPlayersLabel(multiplayerState.players)}.`, "warn");
    }
  }else if(showMessage){
    showToast("A player disconnected. Waiting for another player to join.", "warn");
  }

  updateMultiplayerUI();
}

function handleGuestConnectionClose(showMessage = true){
  const wasOnline = isOnlineMode();
  clearGuestRecoveryState();
  closePeerSession(false);
  multiplayerState.mode = "local";
  resetOnlineState();
  resetGame();
  updateMultiplayerUI();
  scheduleWarmHostPeer(150);
  if(showMessage && wasOnline){
    showToast("The host disconnected. Switched back to local mode.", "warn");
  }
}

function handlePeerMessage(message, connection = null){
  if(!message || typeof message !== "object"){
    return;
  }

  if(message.type === "join-request" && multiplayerState.isHost){
    const slot = getFirstOpenGuestSlot();
    if(!slot){
      sendPeerMessage({type: "room-full"}, connection);
      if(connection){
        connection.close();
      }
      return;
    }

    multiplayerState.connections[slot] = connection;
    if(connection){
      connection.__playerSlot = slot;
    }
    multiplayerState.players[slot] = {
      clientId: message.clientId,
      name: message.name || `Player ${slot}`
    };
    multiplayerState.mode = "online";

    const gameState = getCurrentGameState();
    gameState.positions[slot] = gameState.positions[slot] || 1;
    gameState.lastRolls[slot] = gameState.lastRolls[slot] || null;
    gameState.currentPlayer = multiplayerState.players[gameState.currentPlayer] ? gameState.currentPlayer : getFirstActivePlayerId();

    sendPeerMessage({
      type: "join-accepted",
      roomCode: multiplayerState.roomCode,
      playerId: slot,
      players: clonePlayers(multiplayerState.players),
      game: gameState,
      chatMessages: cloneChatMessages(multiplayerState.chatMessages)
    }, connection);

    broadcastGameState(gameState);
    applyOnlineGameState(gameState);
    addRoomSystemMessage(`${getPlayerDisplayName(slot)} joined the room.`, {broadcast: true});
    updateMultiplayerUI();
    const connectedLabel = getConnectedPlayersLabel(multiplayerState.players);
    showToast(`${getPlayerDisplayName(slot)} joined room ${multiplayerState.roomCode}. ${connectedLabel}.`, "success");
    if(getOnlinePlayerCount(multiplayerState.players) === MAX_ONLINE_PLAYERS){
      showToast(`Room full. ${connectedLabel}.`, "success");
    }
    return;
  }

  if(message.type === "join-accepted" && !multiplayerState.isHost){
    clearJoinRequestTimer();
    clearGuestRecoveryState();
    multiplayerState.mode = "online";
    multiplayerState.roomCode = message.roomCode;
    multiplayerState.localPlayerSlot = Number(message.playerId) || 2;
    multiplayerState.players = clonePlayers(message.players);
    multiplayerState.pendingAction = "";
    setChatMessages(message.chatMessages || []);
    animateOnlineGameState(message.game || createBaseGameState());
    showToast(`Joined room ${multiplayerState.roomCode} as ${getPlayerDisplayName(multiplayerState.localPlayerSlot)}. ${getConnectedPlayersLabel(multiplayerState.players)}.`, "success");
    return;
  }

  if(message.type === "sync-state"){
    if(message.players){
      multiplayerState.players = clonePlayers(message.players);
    }
    animateOnlineGameState(message.game || createBaseGameState());
    return;
  }

  if(message.type === "chat-event"){
    appendChatEntry(message.entry);
    return;
  }

  if(message.type === "chat-message" && multiplayerState.isHost){
    const playerId = connection && connection.__playerSlot ? connection.__playerSlot : null;
    const entry = createChatEntry({
      kind: "message",
      text: message.text,
      playerId,
      name: getPlayerDisplayName(playerId)
    });
    if(entry.text){
      appendChatEntry(entry, {broadcast: true});
    }
    return;
  }

  if(message.type === "reaction-message" && multiplayerState.isHost){
    const playerId = connection && connection.__playerSlot ? connection.__playerSlot : null;
    const entry = createChatEntry({
      kind: "reaction",
      text: message.reaction,
      playerId,
      name: getPlayerDisplayName(playerId)
    });
    if(entry.text){
      appendChatEntry(entry, {broadcast: true});
    }
    return;
  }

  if(message.type === "roll-request" && multiplayerState.isHost){
    const requestedPlayerId = Number(message.playerId);
    if(
      connection &&
      connection.__playerSlot === requestedPlayerId &&
      currentPlayer === requestedPlayerId &&
      !gameOver &&
      multiplayerState.players[requestedPlayerId]
    ){
      commitOnlineTurn(requestedPlayerId);
    }
    return;
  }

  if(message.type === "restart-request" && multiplayerState.isHost){
    restartOnlineGame();
    return;
  }

  if(message.type === "guest-left" && multiplayerState.isHost){
    handleHostConnectionClose(connection, false);
    return;
  }

  if(message.type === "host-left"){
    clearJoinRequestTimer();
    clearGuestRecoveryState();
    handleGuestConnectionClose(false);
    showToast("The host left the room.", "warn");
    return;
  }

  if(message.type === "room-full"){
    clearJoinRequestTimer();
    clearGuestRecoveryState();
    multiplayerState.pendingAction = "";
    handleGuestConnectionClose(false);
    showToast(`That room is already full (${MAX_ONLINE_PLAYERS}/${MAX_ONLINE_PLAYERS}).`, "warn");
  }
}

function attachConnectionHandlers(connection){
  if(!multiplayerState.isHost){
    multiplayerState.connection = connection;
  }

  connection.on("data", message => {
    handlePeerMessage(message, connection);
  });
  connection.on("close", () => {
    if(multiplayerState.isHost){
      handleHostConnectionClose(connection);
    }else{
      attemptGuestRoomRecovery();
    }
  });
  connection.on("error", () => {
    if(multiplayerState.isHost){
      handleHostConnectionClose(connection);
    }else{
      attemptGuestRoomRecovery();
    }
  });
}

function createHostPeer(roomCode){
  return new Promise((resolve, reject) => {
    const peer = new Peer(roomCode);
    const onError = error => {
      peer.destroy();
      reject(error);
    };
    peer.once("error", onError);
    peer.once("open", id => {
      peer.off("error", onError);
      resolve({peer, id});
    });
  });
}

function createGuestPeer(){
  return new Promise((resolve, reject) => {
    const peer = new Peer();
    const onError = error => {
      peer.destroy();
      reject(error);
    };
    peer.once("error", onError);
    peer.once("open", () => {
      peer.off("error", onError);
      resolve(peer);
    });
  });
}

function attachPeerHandlers(peer){
  peer.on("open", id => {
    if(multiplayerState.peer !== peer){
      return;
    }

    const reconnected = multiplayerState.reconnectingToServer;
    multiplayerState.reconnectingToServer = false;

    if(multiplayerState.isHost && !multiplayerState.roomCode){
      multiplayerState.roomCode = sanitizeRoomCode(id);
    }

    updateMultiplayerUI();

    if(reconnected){
      if(multiplayerState.isHost){
        showToast(`Room ${multiplayerState.roomCode} reconnected. Your friend can join now.`, "success");
      }else{
        showToast(`Reconnected to room ${multiplayerState.roomCode}.`, "success");
      }
    }
  });
  peer.on("disconnected", () => {
    if(
      multiplayerState.peer !== peer ||
      !multiplayerState.roomCode ||
      multiplayerState.reconnectingToServer
    ){
      return;
    }

    multiplayerState.reconnectingToServer = true;
    updateMultiplayerUI();
    showToast("Connection to the online room dropped. Trying to reconnect...", "warn");

    try{
      peer.reconnect();
    }catch(error){
      multiplayerState.reconnectingToServer = false;
      showToast("Could not reconnect the online room.", "warn");
      if(multiplayerState.isHost){
        setLocalMode(true);
      }else{
        handleGuestConnectionClose(false);
      }
    }
  });
  peer.on("error", error => {
    multiplayerState.reconnectingToServer = false;
    showToast(getPeerErrorMessage(error), "warn");
    if(multiplayerState.isHost){
      setLocalMode(true);
    }else if(multiplayerState.roomCode && !multiplayerState.pendingAction){
      attemptGuestRoomRecovery(false);
    }else{
      handleGuestConnectionClose(false);
    }
  });
}

async function createOnlineRoom(){
  if(!multiplayerState.peerSupported){
    showToast("Online mode could not load PeerJS.", "warn");
    return;
  }

  if(multiplayerState.pendingAction){
    return;
  }

  cancelWarmGuestPeer();
  closePeerSession(false);
  resetOnlineState();
  multiplayerState.pendingAction = "create";
  updateMultiplayerUI();

  try{
    const {peer, roomCode} = await getPreparedHostPeer();
    multiplayerState.peer = peer;
    multiplayerState.isHost = true;
    multiplayerState.mode = "online";
    multiplayerState.roomCode = roomCode;
    multiplayerState.localPlayerSlot = 1;
    multiplayerState.players = {
      ...getDefaultOnlinePlayers(),
      1: {
        clientId: multiplayerState.clientId,
        name: getPlayerName()
      }
    };
    setChatMessages([]);

    attachPeerHandlers(peer);
    peer.on("connection", connection => {
      attachConnectionHandlers(connection);
    });

    applyOnlineGameState(createBaseGameState());
    multiplayerState.pendingAction = "";
    updateMultiplayerUI();
    showToast(`Room ${roomCode} created. Share the code with up to 3 friends.`, "success");
  }catch(error){
    multiplayerState.pendingAction = "";
    showToast(getPeerErrorMessage(error), "warn");
    setLocalMode(true);
  }
}

function shouldRetryInviteJoin(error){
  return Boolean(error && (error.type === "peer-unavailable" || error.type === "network"));
}

async function joinOnlineRoom({roomCodeOverride = "", isAutoJoin = false, isRecoveryJoin = false, attempt = 1} = {}){
  if(!multiplayerState.peerSupported){
    showToast("Online mode could not load PeerJS.", "warn");
    return;
  }

  if(multiplayerState.pendingAction){
    return;
  }

  const roomCode = sanitizeRoomCode(roomCodeOverride || (roomCodeInput ? roomCodeInput.value : ""));
  if(!roomCode){
    showToast("Enter a valid room code.", "warn");
    return;
  }

  cancelWarmHostPeer();
  closePeerSession(false);
  resetOnlineState();
  if(isRecoveryJoin){
    guestRecoveryState.recovering = true;
    guestRecoveryState.roomCode = roomCode;
    guestRecoveryState.attempts = attempt;
  }
  multiplayerState.pendingAction = "join";
  multiplayerState.roomCode = roomCode;
  multiplayerState.reconnectingToServer = isRecoveryJoin;
  updateMultiplayerUI();

  try{
    const peer = await getPreparedGuestPeer();
    multiplayerState.peer = peer;
    multiplayerState.roomCode = roomCode;
    multiplayerState.mode = "online";
    multiplayerState.isHost = false;
    multiplayerState.players = getDefaultOnlinePlayers();
    setChatMessages([]);

    attachPeerHandlers(peer);
    const connection = peer.connect(roomCode, {reliable: true});
    attachConnectionHandlers(connection);

    connection.on("open", () => {
      sendPeerMessage({
        type: "join-request",
        clientId: multiplayerState.clientId,
        name: getPlayerName()
      });
      scheduleJoinRequestTimeout(roomCode, {isAutoJoin, isRecoveryJoin, attempt});
      updateMultiplayerUI();
    });
  }catch(error){
    multiplayerState.pendingAction = "";
    const maxAttempts = isRecoveryJoin ? GUEST_RECOVERY_MAX_ATTEMPTS : getJoinMaxAttempts(isAutoJoin);
    if(shouldRetryInviteJoin(error) && attempt < maxAttempts){
      if(isRecoveryJoin){
        multiplayerState.reconnectingToServer = true;
        updateMultiplayerUI();
      }else{
        setLocalMode(true);
      }
      setMultiplayerStatus(`Trying to join room ${roomCode}... (${attempt + 1}/${maxAttempts})`);
      scheduleJoinRetry(roomCode, attempt + 1, {
        isAutoJoin,
        isRecoveryJoin,
        delayMs: isRecoveryJoin
          ? GUEST_RECOVERY_RETRY_DELAY
          : (isAutoJoin ? INVITE_AUTO_JOIN_RETRY_DELAY : 650)
      });
      return;
    }
    clearGuestRecoveryState();
    showToast(getPeerErrorMessage(error), "warn");
    setLocalMode(true);
  }
}

function leaveOnlineRoom(){
  if(!multiplayerState.roomCode){
    setLocalMode(true);
    return;
  }
  setLocalMode();
}

function setLocalMode(skipToast = false){
  closePeerSession(Boolean(multiplayerState.roomCode));
  multiplayerState.mode = "local";
  resetOnlineState();
  resetGame();
  updateMultiplayerUI();
  scheduleWarmHostPeer(150);
  if(hasJoinIntent()){
    scheduleWarmGuestPeer(80);
  }
  if(!skipToast){
    showToast("Back to local multiplayer mode.", "info");
  }
}

async function copyRoomInviteLink(){
  const inviteLink = getRoomInviteLink();
  if(!inviteLink){
    showToast("Create or join a room first.", "info");
    return;
  }
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(inviteLink);
    }else{
      const tempInput = document.createElement("textarea");
      tempInput.value = inviteLink;
      tempInput.setAttribute("readonly", "true");
      tempInput.style.position = "absolute";
      tempInput.style.left = "-9999px";
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);
    }
    showToast("Room link copied. Share it with your friends.", "success");
  }catch(error){
    showToast("Could not copy the room link.", "warn");
  }
}

function shareRoomOnWhatsApp(){
  const roomCode = sanitizeRoomCode(multiplayerState.roomCode);
  const inviteLink = getRoomInviteLink(roomCode);
  if(!roomCode || !inviteLink){
    showToast("Create or join a room first.", "info");
    return;
  }
  const message = `Join my Snake & Ladder room ${roomCode}: ${inviteLink}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function sendChatMessage(){
  if(!isChatAvailable()){
    showToast("Join an online room to use chat.", "info");
    return;
  }
  const text = String(chatInput ? chatInput.value : "").trim().slice(0, CHAT_MAX_LENGTH);
  if(!text){
    return;
  }

  if(multiplayerState.isHost){
    const entry = createChatEntry({
      kind: "message",
      text,
      playerId: multiplayerState.localPlayerSlot || 1,
      name: getPlayerDisplayName(multiplayerState.localPlayerSlot || 1)
    });
    appendChatEntry(entry, {broadcast: true});
  }else{
    sendPeerMessage({type: "chat-message", text});
  }

  if(chatInput){
    chatInput.value = "";
    chatInput.focus();
  }
}

function sendReaction(reaction){
  const nextReaction = String(reaction || "").trim().slice(0, 24);
  if(!isChatAvailable() || !nextReaction){
    return;
  }

  if(multiplayerState.isHost){
    const entry = createChatEntry({
      kind: "reaction",
      text: nextReaction,
      playerId: multiplayerState.localPlayerSlot || 1,
      name: getPlayerDisplayName(multiplayerState.localPlayerSlot || 1)
    });
    appendChatEntry(entry, {broadcast: true});
  }else{
    sendPeerMessage({type: "reaction-message", reaction: nextReaction});
  }
}

function maybeAutoJoinInviteRoom(){
  if(inviteAutoJoinAttempted || !pendingInviteRoomCode){
    return;
  }
  inviteAutoJoinAttempted = true;
  if(roomCodeInput){
    roomCodeInput.value = pendingInviteRoomCode;
  }
  scheduleWarmGuestPeer(0);
  window.setTimeout(() => {
    if(!multiplayerState.roomCode && !multiplayerState.pendingAction){
      joinOnlineRoom({
        roomCodeOverride: pendingInviteRoomCode,
        isAutoJoin: true,
        attempt: 1
      });
    }
  }, INVITE_AUTO_JOIN_DELAY);
}

function updateLocalPlayerCountTheme(){
  if(!localPlayerCountSelect){
    return;
  }
  localPlayerCountSelect.dataset.playerCount = String(localPlayerCount);
}

function setLocalPlayerCount(value){
  const parsedValue = Number(value);
  const nextPlayerCount = Number.isFinite(parsedValue)
    ? Math.min(MAX_LOCAL_PLAYERS, Math.max(MIN_LOCAL_PLAYERS, parsedValue))
    : MIN_LOCAL_PLAYERS;

  localPlayerCount = nextPlayerCount;
  if(localPlayerCountSelect){
    localPlayerCountSelect.value = String(nextPlayerCount);
  }
  updateLocalPlayerCountTheme();

  if(!isOnlineMode()){
    resetGame();
  }
}

function canPlayerAct(playerId){
  if(gameOver){
    if(isOnlineMode()){
      return multiplayerState.localPlayerSlot === 1;
    }
    return true;
  }
  if(isRolling){
    return false;
  }
  if(!isOnlineMode()){
    return currentPlayer === playerId;
  }
  if(!isRoomReady()){
    return false;
  }
  return multiplayerState.localPlayerSlot === playerId && currentPlayer === playerId;
}

function buildResolvedTurn(playerId){
  if(!isRoomReady()){
    showToast("Wait for at least 2 players to join the room.", "info");
    return null;
  }
  const dice = Math.floor(Math.random() * 6) + 1;
  const start = positions[playerId];
  const end = getNextPosition(start, dice);
  let finalPos = end;
  let effect = "";
  if(snakeMap[end]){
    finalPos = snakeMap[end];
    effect = "snake";
  }else if(ladderMap[end]){
    finalPos = ladderMap[end];
    effect = "ladder";
  }
  const nextPlayer = finalPos === 100 ? playerId : getNextActivePlayer(playerId);
  const nextGameState = {
    positions: createPlayerSlotMap(slot => slot === playerId ? finalPos : positions[slot]),
    lastRolls: createPlayerSlotMap(slot => slot === playerId ? dice : lastRolls[slot]),
    currentPlayer: nextPlayer,
    gameOver: finalPos === 100,
    diceValue: dice,
    action: {
      playerId,
      dice,
      start,
      end,
      finalPos,
      effect,
      actionId: Date.now()
    },
    updatedAt: Date.now()
  };

  return nextGameState;
}

function commitOnlineGameState(nextGameState){
  broadcastGameState(nextGameState);
  animateOnlineGameState(nextGameState);
}

function commitOnlineTurn(playerId){
  const nextGameState = buildResolvedTurn(playerId);
  if(!nextGameState){
    return;
  }
  commitOnlineGameState(nextGameState);
}

function pushOnlineTurn(playerId){
  if(!isRoomReady()){
    showToast("Wait for your friend to join the room.", "info");
    return;
  }
  isRolling = true;
  updateTurnUI();
  if(multiplayerState.isHost){
    commitOnlineTurn(playerId);
    return;
  }
  sendPeerMessage({type: "roll-request", playerId});
}

function restartOnlineGame(){
  if(!multiplayerState.isHost){
    showToast("Only the host can restart the online game.", "info");
    return;
  }
  multiplayerState.lastActionId = null;
  hideWinCelebration();
  commitOnlineGameState(createBaseGameState());
}

function maybeShowOnlineActionToast(game){
  if(!game || !game.action || game.action.actionId === multiplayerState.lastActionId){
    return;
  }
  multiplayerState.lastActionId = game.action.actionId;
  if(game.action.finalPos === 100){
    showToast(`${getPlayerDisplayName(game.action.playerId)} wins!`, "win");
    playSound("win");
    showWinCelebration(game.action.playerId);
  }
}

function initMultiplayerControls(){
  if(playerNameInput){
    playerNameInput.value = "Player";
  }
  if(localPlayerCountSelect){
    localPlayerCountSelect.value = String(localPlayerCount);
    updateLocalPlayerCountTheme();
    localPlayerCountSelect.addEventListener("change", () => {
      setLocalPlayerCount(localPlayerCountSelect.value);
    });
  }
  if(roomCodeInput){
    roomCodeInput.addEventListener("input", () => {
      roomCodeInput.value = sanitizeRoomCode(roomCodeInput.value);
      if(hasJoinIntent()){
        scheduleWarmGuestPeer(0);
      }else{
        cancelWarmGuestPeer();
      }
    });
    roomCodeInput.addEventListener("keydown", event => {
      if(event.key === "Enter"){
        event.preventDefault();
        joinOnlineRoom();
      }
    });
  }
  if(createRoomButton){
    createRoomButton.addEventListener("click", () => {
      createOnlineRoom();
    });
  }
  if(joinRoomButton){
    joinRoomButton.addEventListener("click", () => {
      joinOnlineRoom();
    });
  }
  if(leaveRoomButton){
    leaveRoomButton.addEventListener("click", () => {
      leaveOnlineRoom();
    });
  }
  if(localModeButton){
    localModeButton.addEventListener("click", () => {
      setLocalMode();
    });
  }
  if(copyRoomLinkButton){
    copyRoomLinkButton.addEventListener("click", () => {
      copyRoomInviteLink();
    });
  }
  if(whatsappShareButton){
    whatsappShareButton.addEventListener("click", () => {
      shareRoomOnWhatsApp();
    });
  }
  if(chatSendButton){
    chatSendButton.addEventListener("click", () => {
      sendChatMessage();
    });
  }
  if(chatInput){
    chatInput.addEventListener("keydown", event => {
      if(event.key === "Enter"){
        event.preventDefault();
        sendChatMessage();
      }
    });
  }
  reactionButtons.forEach(button => {
    button.addEventListener("click", () => {
      sendReaction(button.dataset.reaction || button.textContent);
    });
  });
  if(pendingInviteRoomCode && roomCodeInput){
    roomCodeInput.value = pendingInviteRoomCode;
  }
  updateMultiplayerUI();
  maybeAutoJoinInviteRoom();
}

const snakes = [
  { start: 98, end: 78, color: "#f542b3", bend: -140 },
  { start: 95, end: 56, color: "#6a2cff", bend: 160 },
  { start: 88, end: 52, color: "#48d16a", bend: -110 },
  { start: 64, end: 23, color: "#0dc4a6", bend: 130 },
  { start: 36, end: 6, color: "#ff4b5c", bend: -150 }
];

const ladders = [
  { start: 3, end: 22 },
  { start: 8, end: 30 },
  { start: 28, end: 55 },
  { start: 41, end: 79 },
  { start: 62, end: 96 }
];

const snakeMap = Object.fromEntries(snakes.map(s => [s.start, s.end]));
const ladderMap = Object.fromEntries(ladders.map(l => [l.start, l.end]));
const snakePaths = new Map();
const ladderPaths = new Map();

let currentPlayer = 1;
let positions = createPlayerSlotMap(() => 1);
let lastRolls = createPlayerSlotMap(() => null);
let isRolling = false;
let gameOver = false;
const MOVE_DELAY = 420;
const SLIDE_DELAY = 180;
const SNAKE_SLIDE_DURATION = 1450;
const LADDER_CLIMB_DURATION = 1200;
let confettiTimeoutId = null;
let rainIntervalId = null;

function setDiceFace(value){
  for(let i = 1; i <= 6; i++){
    diceFace.classList.remove(`face-${i}`);
  }
  diceFace.classList.add(`face-${value}`);
}

function setDiceTheme(playerId){
  if(!diceFace){
    return;
  }
  diceFace.classList.remove("player-1-turn", "player-2-turn");
  diceFace.classList.add("shared-dice");
}

function ensureMoveIndicator(){
  return null;
}

function showMoveIndicator(){
}

function hideMoveIndicator(){
  if(moveIndicatorTimerId){
    clearTimeout(moveIndicatorTimerId);
    moveIndicatorTimerId = null;
  }
}

function updateTurnUI(){
  const visiblePlayerIds = getVisiblePlayerIds();
  const visiblePlayerSet = new Set(visiblePlayerIds);

  PLAYER_IDS.forEach(playerId => {
    const state = turnStates[playerId];
    const card = playerRollCards[playerId];
    const isVisible = visiblePlayerSet.has(playerId);
    const isActiveTurn = currentPlayer === playerId;
    const isWinner = gameOver && currentPlayer === playerId;
    const isLocalPlayer = multiplayerState.localPlayerSlot === playerId;

    if(card){
      card.hidden = !isVisible;
      card.classList.toggle("active", isVisible && (isActiveTurn || isWinner));
      card.classList.toggle("rolling-turn", isVisible && isActiveTurn && isRolling);
    }

    if(state){
      if(!isVisible){
        state.textContent = "";
      }else if(gameOver){
        state.textContent = isWinner ? "Winner" : "Ready";
      }else if(isRolling && isActiveTurn){
        state.textContent = "Rolling...";
      }else if(isOnlineMode() && multiplayerState.localPlayerSlot){
        if(isLocalPlayer){
          state.textContent = isActiveTurn ? "Your turn" : "You";
        }else{
          state.textContent = isActiveTurn ? "Turn" : "Waiting";
        }
      }else if(isActiveTurn){
        state.textContent = "Your turn";
      }else{
        state.textContent = "Waiting";
      }
    }
  });

  if(sharedRollButton){
    let buttonText = `Roll for ${getPlayerDisplayName(currentPlayer)}`;
    let buttonDisabled = false;

    if(gameOver && isOnlineMode()){
      buttonText = multiplayerState.localPlayerSlot === 1 ? "Start Online Game" : "Waiting for Host";
      buttonDisabled = multiplayerState.localPlayerSlot !== 1;
    }else if(gameOver){
      buttonText = "Start New Game";
    }else if(isRolling){
      buttonText = `Rolling for ${getPlayerDisplayName(currentPlayer)}...`;
      buttonDisabled = true;
    }else if(isOnlineMode() && !isRoomReady()){
      buttonText = "Waiting for Players";
      buttonDisabled = true;
    }else if(isOnlineMode() && multiplayerState.localPlayerSlot && currentPlayer !== multiplayerState.localPlayerSlot){
      buttonText = `Waiting for ${getPlayerDisplayName(currentPlayer)}`;
      buttonDisabled = true;
    }else{
      buttonDisabled = !canPlayerAct(currentPlayer);
    }

    sharedRollButton.textContent = buttonText;
    sharedRollButton.disabled = buttonDisabled;
  }

  if(diceOwner){
    if(gameOver){
      diceOwner.innerText = `Winner: ${getPlayerDisplayName(currentPlayer)}`;
    }else if(isRolling){
      diceOwner.innerText = `Rolling for ${getPlayerDisplayName(currentPlayer)}`;
    }else{
      diceOwner.innerText = `Active: ${getPlayerDisplayName(currentPlayer)}`;
    }
  }

  if(turnChip){
    if(isOnlineMode() && !isRoomReady()){
      turnChip.innerText = "Waiting for at least 2 players to join the online room.";
    }else if(
      isOnlineMode() &&
      !gameOver &&
      multiplayerState.localPlayerSlot &&
      currentPlayer !== multiplayerState.localPlayerSlot
    ){
      turnChip.innerText = `${getPlayerDisplayName(currentPlayer)}'s turn. Wait for your turn to roll.`;
    }else if(
      isOnlineMode() &&
      !gameOver &&
      multiplayerState.localPlayerSlot === currentPlayer
    ){
      turnChip.innerText = "Your turn. Roll the dice.";
    }else if(gameOver && isOnlineMode()){
      turnChip.innerText = `${getPlayerDisplayName(currentPlayer)} won. Player 1 can start the next online game.`;
    }else if(gameOver){
      turnChip.innerText = `${getPlayerDisplayName(currentPlayer)} reached 100. Tap Roll Dice to start again.`;
    }else if(isRolling){
      turnChip.innerText = `${getPlayerDisplayName(currentPlayer)} is rolling the dice.`;
    }else{
      turnChip.innerText = `${getPlayerDisplayName(currentPlayer)}'s turn. First to 100 wins.`;
    }
  }

  setDiceTheme(currentPlayer);
}

function updateLastRolls(){
  Object.keys(lastRollLabels).forEach(key => {
    const playerId = Number(key);
    const label = lastRollLabels[playerId];
    if(label){
      const value = lastRolls[playerId];
      label.innerText = value === null ? "-" : String(value);
    }
  });
}

function positionToCellCoords(pos){
  const rowFromBottom = Math.floor((pos - 1) / 10);
  const colInRow = (pos - 1) % 10;
  const leftToRight = rowFromBottom % 2 === 0;
  const col = leftToRight ? colInRow : 9 - colInRow;
  const rowTop = 9 - rowFromBottom;
  return { rowTop, col };
}

function positionToPoint(pos, cellSize){
  const coords = positionToCellCoords(pos);
  return {
    x: (coords.col + 0.5) * cellSize,
    y: (coords.rowTop + 0.5) * cellSize
  };
}

function getTokenOffset(playerId, stackedPlayerIds, cellSize){
  const index = stackedPlayerIds.indexOf(playerId);
  const offsets = [
    {x: -0.18, y: -0.18},
    {x: 0.18, y: -0.18},
    {x: -0.18, y: 0.18},
    {x: 0.18, y: 0.18}
  ];
  const offset = offsets[index] || {x: 0, y: 0};
  return {
    x: offset.x * cellSize,
    y: offset.y * cellSize
  };
}

function createBoard(){
  board.innerHTML = "";
  for(let rowTop = 0; rowTop < 10; rowTop++){
    const rowFromBottom = 9 - rowTop;
    const leftToRight = rowFromBottom % 2 === 0;
    for(let col = 0; col < 10; col++){
      const base = rowFromBottom * 10;
      const num = leftToRight ? base + col + 1 : base + 10 - col;
      const cell = document.createElement("div");
      cell.classList.add("cell", `c${(rowTop + col) % 4}`);
      cell.id = `cell-${num}`;
      const label = document.createElement("span");
      label.textContent = num;
      cell.appendChild(label);
      board.appendChild(cell);
    }
  }
}

function updatePlayers(){
  playerLayer.innerHTML = "";
  const cellSize = board.clientWidth / 10;
  const visiblePlayerIds = getVisiblePlayerIds();
  const visiblePlayerSet = new Set(visiblePlayerIds);
  const groupedPlayerIds = {};

  PLAYER_IDS.forEach(playerId => {
    setPanelVisibility(scoreCards[playerId], visiblePlayerSet.has(playerId));
    setPanelVisibility(playerRollCards[playerId], visiblePlayerSet.has(playerId));
  });

  visiblePlayerIds.forEach(playerId => {
    const position = positions[playerId];
    if(!groupedPlayerIds[position]){
      groupedPlayerIds[position] = [];
    }
    groupedPlayerIds[position].push(playerId);
  });

  visiblePlayerIds.forEach(playerId => {
    const pt = positionToPoint(positions[playerId], cellSize);
    const offset = getTokenOffset(playerId, groupedPlayerIds[positions[playerId]] || [playerId], cellSize);
    const token = document.createElement("div");
    token.classList.add("player-token", `player-${playerId}`);
    token.style.left = `${pt.x + offset.x}px`;
    token.style.top = `${pt.y + offset.y}px`;
    playerLayer.appendChild(token);
  });

  PLAYER_IDS.forEach(playerId => {
    const scoreEl = document.getElementById(`p${playerId}-score`);
    if(scoreEl){
      scoreEl.innerText = String(positions[playerId]).padStart(2, "0");
    }
  });

  updatePlayerNames();
  updateLastRolls();
  updateTurnUI();
}

function renderOverlay(){
  const size = board.clientWidth;
  const cellSize = size / 10;
  overlay.setAttribute("viewBox", `0 0 ${size} ${size}`);
  overlay.innerHTML = "";
  snakePaths.clear();
  ladderPaths.clear();

  ladders.forEach(ladder => drawLadder(ladder, cellSize));
  snakes.forEach(snake => drawSnake(snake, cellSize));
}

function drawLadder(ladder, cellSize){
  const start = positionToPoint(ladder.start, cellSize);
  const end = positionToPoint(ladder.end, cellSize);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  const railOffset = cellSize * 0.18;
  const railColor = "#f6d39a";

  const rail1 = createLine(
    start.x + px * railOffset,
    start.y + py * railOffset,
    end.x + px * railOffset,
    end.y + py * railOffset,
    10,
    railColor
  );
  const rail2 = createLine(
    start.x - px * railOffset,
    start.y - py * railOffset,
    end.x - px * railOffset,
    end.y - py * railOffset,
    10,
    railColor
  );
  overlay.appendChild(rail1);
  overlay.appendChild(rail2);

  const climbPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  climbPath.setAttribute("d", `M ${start.x} ${start.y} L ${end.x} ${end.y}`);
  climbPath.setAttribute("fill", "none");
  climbPath.setAttribute("stroke", "none");
  climbPath.dataset.start = ladder.start;
  climbPath.dataset.end = ladder.end;
  overlay.appendChild(climbPath);
  ladderPaths.set(ladder.start, climbPath);

  const rungCount = Math.max(4, Math.floor(length / (cellSize * 0.7)));
  for(let i = 1; i < rungCount; i++){
    const t = i / rungCount;
    const rx = start.x + ux * length * t;
    const ry = start.y + uy * length * t;
    const rung = createLine(
      rx + px * railOffset,
      ry + py * railOffset,
      rx - px * railOffset,
      ry - py * railOffset,
      7,
      railColor
    );
    overlay.appendChild(rung);
  }
}

function drawSnake(snake, cellSize){
  const start = positionToPoint(snake.start, cellSize);
  const end = positionToPoint(snake.end, cellSize);
  const midY = (start.y + end.y) / 2;
  const c1 = { x: start.x + snake.bend, y: midY };
  const c2 = { x: end.x - snake.bend, y: midY };

  const palette = {
    body: "#7cbc4f",
    outline: "#2e5b24",
    belly: "#f2e2b8",
    spot: "#2f6b2b",
    eyeWhite: "#f5f7fb",
    eyeBlue: "#4aa3ff",
    pupil: "#111",
    tongue: "#e0433b"
  };

  const pathData = `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`;

  const outline = document.createElementNS("http://www.w3.org/2000/svg", "path");
  outline.setAttribute("d", pathData);
  outline.setAttribute("fill", "none");
  outline.setAttribute("stroke", palette.outline);
  outline.setAttribute("stroke-width", cellSize * 0.52);
  outline.setAttribute("stroke-linecap", "round");
  outline.setAttribute("stroke-linejoin", "round");
  overlay.appendChild(outline);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", palette.body);
  path.setAttribute("stroke-width", cellSize * 0.42);
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.dataset.start = snake.start;
  path.dataset.end = snake.end;
  overlay.appendChild(path);
  snakePaths.set(snake.start, path);

  const belly = document.createElementNS("http://www.w3.org/2000/svg", "path");
  belly.setAttribute("d", pathData);
  belly.setAttribute("fill", "none");
  belly.setAttribute("stroke", palette.belly);
  belly.setAttribute("stroke-width", cellSize * 0.16);
  belly.setAttribute("stroke-linecap", "round");
  belly.setAttribute("stroke-linejoin", "round");
  belly.setAttribute("stroke-dasharray", `${cellSize * 0.22} ${cellSize * 0.12}`);
  belly.setAttribute("stroke-dashoffset", cellSize * 0.08);
  overlay.appendChild(belly);

  const spotPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  spotPath.setAttribute("d", pathData);
  const spotLength = spotPath.getTotalLength();
  const spotCount = Math.max(6, Math.floor(spotLength / (cellSize * 0.6)));
  for(let i = 1; i < spotCount; i++){
    const t = i / spotCount;
    const point = spotPath.getPointAtLength(spotLength * t);
    const nextPoint = spotPath.getPointAtLength(Math.min(spotLength, spotLength * t + 1));
    const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);
    const offset = cellSize * 0.13;
    const px = -Math.sin(angle) * offset;
    const py = Math.cos(angle) * offset;
    const spot = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    spot.setAttribute("cx", point.x + px);
    spot.setAttribute("cy", point.y + py);
    spot.setAttribute("rx", cellSize * (0.06 + (i % 3) * 0.015));
    spot.setAttribute("ry", cellSize * (0.045 + (i % 2) * 0.01));
    spot.setAttribute("fill", palette.spot);
    spot.setAttribute("opacity", "0.9");
    overlay.appendChild(spot);
  }

  const headGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const rowFromBottom = Math.floor((snake.start - 1) / 10);
  const leftToRight = rowFromBottom % 2 === 0;
  const faceScale = leftToRight ? 1 : -1;
  headGroup.setAttribute(
    "transform",
    `translate(${start.x} ${start.y}) scale(${faceScale} 1)`
  );

  const neck = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  neck.setAttribute("cx", -cellSize * 0.05);
  neck.setAttribute("cy", 0);
  neck.setAttribute("r", cellSize * 0.22);
  neck.setAttribute("fill", palette.body);
  neck.setAttribute("stroke", palette.outline);
  neck.setAttribute("stroke-width", cellSize * 0.02);
  headGroup.appendChild(neck);

  const headBase = document.createElementNS("http://www.w3.org/2000/svg", "path");
  headBase.setAttribute(
    "d",
    `M ${-cellSize * 0.22} ${-cellSize * 0.18} ` +
      `Q ${cellSize * 0.05} ${-cellSize * 0.26} ${cellSize * 0.26} ${-cellSize * 0.12} ` +
      `Q ${cellSize * 0.32} 0 ${cellSize * 0.18} ${cellSize * 0.2} ` +
      `Q ${-cellSize * 0.04} ${cellSize * 0.26} ${-cellSize * 0.22} ${cellSize * 0.14} Z`
  );
  headBase.setAttribute("fill", palette.body);
  headBase.setAttribute("stroke", palette.outline);
  headBase.setAttribute("stroke-width", cellSize * 0.02);
  headGroup.appendChild(headBase);

  const jaw = document.createElementNS("http://www.w3.org/2000/svg", "path");
  jaw.setAttribute(
    "d",
    `M ${-cellSize * 0.12} ${cellSize * 0.02} ` +
      `Q ${cellSize * 0.08} ${cellSize * 0.16} ${cellSize * 0.2} ${cellSize * 0.06}`
  );
  jaw.setAttribute("fill", "none");
  jaw.setAttribute("stroke", palette.belly);
  jaw.setAttribute("stroke-width", cellSize * 0.08);
  jaw.setAttribute("stroke-linecap", "round");
  headGroup.appendChild(jaw);

  const eye = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  eye.setAttribute("cx", cellSize * 0.02);
  eye.setAttribute("cy", -cellSize * 0.08);
  eye.setAttribute("r", cellSize * 0.05);
  eye.setAttribute("fill", palette.eyeWhite);
  headGroup.appendChild(eye);

  const iris = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  iris.setAttribute("cx", cellSize * 0.03);
  iris.setAttribute("cy", -cellSize * 0.08);
  iris.setAttribute("r", cellSize * 0.028);
  iris.setAttribute("fill", palette.eyeBlue);
  headGroup.appendChild(iris);

  const pupil = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  pupil.setAttribute("cx", cellSize * 0.035);
  pupil.setAttribute("cy", -cellSize * 0.08);
  pupil.setAttribute("r", cellSize * 0.014);
  pupil.setAttribute("fill", palette.pupil);
  headGroup.appendChild(pupil);

  const nostril = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  nostril.setAttribute("cx", cellSize * 0.18);
  nostril.setAttribute("cy", -cellSize * 0.02);
  nostril.setAttribute("r", cellSize * 0.015);
  nostril.setAttribute("fill", palette.pupil);
  headGroup.appendChild(nostril);

  const mouth = document.createElementNS("http://www.w3.org/2000/svg", "path");
  mouth.setAttribute(
    "d",
    `M ${-cellSize * 0.02} ${cellSize * 0.08} ` +
      `Q ${cellSize * 0.12} ${cellSize * 0.12} ${cellSize * 0.2} ${cellSize * 0.06}`
  );
  mouth.setAttribute("fill", "none");
  mouth.setAttribute("stroke", palette.pupil);
  mouth.setAttribute("stroke-width", cellSize * 0.015);
  mouth.setAttribute("stroke-linecap", "round");
  headGroup.appendChild(mouth);

  const tongue = document.createElementNS("http://www.w3.org/2000/svg", "path");
  tongue.setAttribute(
    "d",
    `M ${cellSize * 0.2} ${cellSize * 0.06} ` +
      `L ${cellSize * 0.42} ${cellSize * 0.0} ` +
      `L ${cellSize * 0.48} ${cellSize * 0.04} ` +
      `L ${cellSize * 0.42} ${cellSize * 0.08} Z`
  );
  tongue.setAttribute("fill", palette.tongue);
  headGroup.appendChild(tongue);

  overlay.appendChild(headGroup);
}

function createLine(x1, y1, x2, y2, width, color){
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("stroke", color);
  line.setAttribute("stroke-width", width);
  line.setAttribute("stroke-linecap", "round");
  return line;
}

function showToast(message, type = "info", duration = 5000){
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  const fadeOutStart = Math.max(0, duration - 250);
  setTimeout(() => {
    toast.classList.add("fade-out");
  }, fadeOutStart);

  setTimeout(() => {
    toast.remove();
  }, duration);
}

function resetGame(){
  positions = createPlayerSlotMap(() => 1);
  currentPlayer = getLocalPlayerIds()[0] || 1;
  lastRolls = createPlayerSlotMap(() => null);
  gameOver = false;
  isRolling = false;
  if(diceText){
    diceText.innerText = "Dice: -";
  }
  setDiceFace(1);
  hideMoveIndicator();
  updatePlayers();
  hideWinCelebration();
}

function spawnRainBatch(count){
  if(!celebrationRain){
    return;
  }
  const types = ["paper", "dice", "ladder", "snake", "star"];
  for(let i = 0; i < count; i++){
    const item = document.createElement("span");
    const type = types[Math.floor(Math.random() * types.length)];
    item.className = `rain-item ${type}`;
    const size = 10 + Math.random() * 18;
    const left = Math.random() * 100;
    const dur = 2400 + Math.random() * 1800;
    const delay = Math.random() * 400;
    const rot = (Math.random() * 360) * (Math.random() > 0.5 ? 1 : -1);
    const drift = (Math.random() * 120) - 60;
    item.style.left = `${left}vw`;
    item.style.setProperty("--size", `${size}px`);
    item.style.setProperty("--dur", `${dur}ms`);
    item.style.setProperty("--delay", `${delay}ms`);
    item.style.setProperty("--rot", `${rot}deg`);
    item.style.setProperty("--drift", `${drift}px`);
    celebrationRain.appendChild(item);

    item.addEventListener("animationend", () => {
      item.remove();
    });
  }
}

function startCelebrationRain(){
  if(!celebrationRain || rainIntervalId){
    return;
  }
  celebrationRain.setAttribute("aria-hidden", "false");
  spawnRainBatch(22);
  rainIntervalId = setInterval(() => {
    spawnRainBatch(12);
  }, 600);
}

function stopCelebrationRain(){
  if(rainIntervalId){
    clearInterval(rainIntervalId);
    rainIntervalId = null;
  }
  if(celebrationRain){
    celebrationRain.setAttribute("aria-hidden", "true");
    celebrationRain.innerHTML = "";
  }
}

function spawnConfettiCorner(){
  if(!confettiCorner){
    return;
  }
  const colors = ["#ff6b6b", "#ffd93d", "#6be4ff", "#7c8cff", "#7de1c3", "#ff9bf5", "#ffb86b"];
  confettiCorner.innerHTML = "";

  const addRing = (delay) => {
    const ring = document.createElement("span");
    ring.className = "burst-ring";
    ring.style.setProperty("--delay", `${delay}ms`);
    confettiCorner.appendChild(ring);
  };

  addRing(0);
  addRing(180);

  const createWave = (count, waveDelay) => {
    for(let i = 0; i < count; i++){
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      const roll = Math.random();
      if(roll > 0.78){
        piece.classList.add("is-circle");
      }else if(roll > 0.6){
        piece.classList.add("is-tri");
      }else if(roll > 0.4){
        piece.classList.add("is-ribbon");
      }
      const x = -(50 + Math.random() * 190);
      const y = 20 + Math.random() * 210;
      const rot = (Math.random() * 480) * (Math.random() > 0.5 ? 1 : -1);
      const dur = 1000 + Math.random() * 900;
      const delay = waveDelay + Math.random() * 220;
      const size = 6 + Math.random() * 12;
      piece.style.setProperty("--x", `${x}px`);
      piece.style.setProperty("--y", `${y}px`);
      piece.style.setProperty("--rot", `${rot}deg`);
      piece.style.setProperty("--dur", `${dur}ms`);
      piece.style.setProperty("--delay", `${delay}ms`);
      piece.style.setProperty("--size", `${size}px`);
      piece.style.setProperty("--color", colors[i % colors.length]);
      confettiCorner.appendChild(piece);
    }
  };

  createWave(44, 0);
  setTimeout(() => {
    createWave(36, 80);
  }, 200);

  if(confettiTimeoutId){
    clearTimeout(confettiTimeoutId);
  }
  confettiTimeoutId = setTimeout(() => {
    if(confettiCorner){
      confettiCorner.innerHTML = "";
    }
  }, 1800);
}

function hideWinCelebration(){
  if(!winOverlay){
    return;
  }
  winOverlay.classList.remove("active");
  winOverlay.setAttribute("aria-hidden", "true");
  if(confettiCorner){
    confettiCorner.innerHTML = "";
  }
  stopCelebrationRain();
}

function showWinCelebration(playerId){
  if(!winOverlay){
    return;
  }
  if(winMessage){
    winMessage.textContent = `${getPlayerDisplayName(playerId)} wins!`;
  }
  gameOver = true;
  updatePlayers();
  winOverlay.classList.add("active");
  winOverlay.setAttribute("aria-hidden", "false");
  spawnConfettiCorner();
  startCelebrationRain();
}

function sleep(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function animateMove(playerId, from, to, delay = MOVE_DELAY){
  const totalSteps = Math.abs(to - from);
  const actorName = getPlayerDisplayName(playerId);
  if(from === to){
    showMoveIndicator(`${actorName} stays on cell ${from}. Exact roll needed.`);
    await sleep(700);
    return;
  }
  const step = from < to ? 1 : -1;
  let pos = from;
  let movedSteps = 0;
  while(pos !== to){
    pos += step;
    movedSteps += 1;
    positions[playerId] = pos;
    showMoveIndicator(`${actorName} moves ${movedSteps}/${totalSteps} steps to cell ${pos}.`);
    updatePlayers();
    playStepSound();
    await sleep(delay);
  }
}

function buildLinePath(fromPos, toPos){
  const cellSize = board.clientWidth / 10;
  const fromPt = positionToPoint(fromPos, cellSize);
  const toPt = positionToPoint(toPos, cellSize);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", `M ${fromPt.x} ${fromPt.y} L ${toPt.x} ${toPt.y}`);
  return path;
}

function animateAlongPath(playerId, pathEl, duration = 900, fromPos = null, toPos = null){
  return new Promise(resolve => {
    const pathNode = pathEl || (fromPos !== null && toPos !== null ? buildLinePath(fromPos, toPos) : null);
    if(!pathNode){
      resolve();
      return;
    }
    const token = document.querySelector(`.player-token.player-${playerId}`);
    if(!token){
      resolve();
      return;
    }
    const length = pathNode.getTotalLength();
    const startTime = performance.now();

    function step(now){
      const t = Math.min(1, (now - startTime) / duration);
      const point = pathNode.getPointAtLength(length * t);
      token.style.left = `${point.x}px`;
      token.style.top = `${point.y}px`;
      if(t < 1){
        requestAnimationFrame(step);
      }else{
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
}

function getNextPosition(start, dice){
  const next = start + dice;
  if(next > 100){
    return start;
  }
  return next;
}

if(winContinue){
  winContinue.addEventListener("click", () => {
    if(isOnlineMode()){
      if(multiplayerState.localPlayerSlot !== 1){
        showToast("Only Player 1 can restart the online game.", "info");
        hideWinCelebration();
        return;
      }
      restartOnlineGame();
      return;
    }
    resetGame();
  });
}

if(winStop){
  winStop.addEventListener("click", () => {
    hideWinCelebration();
  });
}

if(winOverlay){
  winOverlay.addEventListener("click", (event) => {
    if(event.target === winOverlay){
      hideWinCelebration();
    }
  });
}

async function rollDice(){
  if(gameOver){
    resetGame();
    return;
  }
  if(isRolling){
    return;
  }
  isRolling = true;
  ensureAudio();
  playSound("roll");
  const previewCount = 3;
  const previewDelay = 200;
  const rollingMs = previewCount * previewDelay;
  let rollSoundStopTimer = null;
  if(diceRollAudio){
    rollSoundStopTimer = setTimeout(() => {
      if(!diceRollAudio.paused){
        diceRollAudio.pause();
        diceRollAudio.currentTime = 0;
      }
    }, rollingMs);
  }

  if(diceText){
    diceText.innerText = `${getPlayerDisplayName(currentPlayer)}: rolling...`;
  }
  diceFace.classList.add("rolling");
  updateTurnUI();

  for(let i = 0; i < previewCount; i++){
    const preview = Math.floor(Math.random()*6)+1;
    if(diceText){
      diceText.innerText = `${getPlayerDisplayName(currentPlayer)}: ${preview}`;
    }
    setDiceFace(preview);
    await sleep(previewDelay);
  }
  if(rollSoundStopTimer){
    clearTimeout(rollSoundStopTimer);
  }

  const dice = Math.floor(Math.random()*6)+1;
  lastRolls[currentPlayer] = dice;
  if(diceText){
    diceText.innerText = `${getPlayerDisplayName(currentPlayer)}: ${dice}`;
  }
  setDiceFace(dice);
  diceFace.classList.remove("rolling");
  playSound("land");
  updatePlayers();

  const start = positions[currentPlayer];
  const end = getNextPosition(start, dice);

  await animateMove(currentPlayer, start, end, MOVE_DELAY);

  let finalPos = end;
  if(snakeMap[end]){
    showToast("Snake bite! Go down.", "warn");
    showMoveIndicator(`${getPlayerDisplayName(currentPlayer)} hit a snake and slides to ${snakeMap[end]}.`);
    playSound("snake", SNAKE_SLIDE_DURATION);
    const snakeEnd = snakeMap[end];
    await sleep(200);
    const path = snakePaths.get(end);
    await animateAlongPath(currentPlayer, path, SNAKE_SLIDE_DURATION, end, snakeEnd);
    finalPos = snakeEnd;
  }else if(ladderMap[end]){
    showToast("Ladder! Climb up.", "success");
    showMoveIndicator(`${getPlayerDisplayName(currentPlayer)} found a ladder and climbs to ${ladderMap[end]}.`);
    playSound("ladder", LADDER_CLIMB_DURATION);
    const ladderEnd = ladderMap[end];
    await sleep(200);
    const path = ladderPaths.get(end);
    await animateAlongPath(currentPlayer, path, LADDER_CLIMB_DURATION, end, ladderEnd);
    finalPos = ladderEnd;
  }

  positions[currentPlayer] = finalPos;

  if(finalPos === 100){
    showToast(`${getPlayerDisplayName(currentPlayer)} wins!`, "win");
    gameOver = true;
    playSound("win");
    isRolling = false;
    hideMoveIndicator(1800);
    showWinCelebration(currentPlayer);
    return;
  }

  currentPlayer = getNextLocalPlayer(currentPlayer);
  isRolling = false;
  updatePlayers();
  hideMoveIndicator(900);
}

function handleRollAction(){
  if(gameOver){
    if(isOnlineMode()){
      if(multiplayerState.localPlayerSlot !== 1){
        showToast("Only Player 1 can restart the online game.", "info");
        return;
      }
      restartOnlineGame();
      return;
    }
    resetGame();
    return;
  }
  if(isRolling){
    return;
  }
  if(isOnlineMode()){
    if(!canPlayerAct(currentPlayer)){
      if(!isRoomReady()){
        showToast("Wait for your friend to join the room.", "info");
      }else if(multiplayerState.localPlayerSlot && currentPlayer !== multiplayerState.localPlayerSlot){
        showToast(`${getPlayerDisplayName(currentPlayer)} must roll first. Wait for your turn.`, "info");
      }else{
        showToast("It is not your online turn yet.", "info");
      }
      return;
    }
    pushOnlineTurn(currentPlayer);
    return;
  }
  rollDice();
}

if(!window.__snakesLadderReactBooted){
  window.__snakesLadderReactBooted = true;

  if(sharedRollButton){
    sharedRollButton.addEventListener("click", () => {
      handleRollAction();
    });
  }
  createBoard();
  renderOverlay();
  ensureMoveIndicator();
  initMultiplayerControls();
  updatePlayers();
  setDiceFace(1);
  setDiceTheme(1);
  scheduleWarmHostPeer();
  if(hasJoinIntent()){
    scheduleWarmGuestPeer(80);
  }
  window.addEventListener("resize", () => {
    renderOverlay();
    updatePlayers();
  });
}




import React, { useEffect } from "react";

function App() {
  const playerIds = [1, 2, 3, 4];
  const quickReactions = ["GG", "WOW", "LOL", "OOPS"];

  useEffect(() => {
    import("../script.js");
  }, []);

  return (
    <>
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <span className="brand-tag">Classic Board Game</span>
            <h1>Snake &amp; Ladder</h1>
            <p className="brand-sub">Race to 100, climb the ladders, dodge the snakes.</p>
          </div>
          <div className="score-strip">
            {playerIds.map(playerId => (
              <div key={playerId} className="score-card" data-score-card={playerId}>
                <span id={`p${playerId}-label`} className="label">{`Player ${playerId}`}</span>
                <span className="value" id={`p${playerId}-score`}>01</span>
              </div>
            ))}
          </div>
        </header>

        <div className="board-row">
          <aside className="side-panel side-panel-left">
            <div id="online-panel" className="online-panel">
              <div className="panel-title">Online Multiplayer</div>
              <p id="multiplayer-status" className="meta-line">Local mode. Play on one device or connect friends online.</p>
              <label className="field-label" htmlFor="local-player-count">Local players</label>
              <select id="local-player-count" className="control-input" defaultValue="2">
                <option value="2">2 Players</option>
                <option value="3">3 Players</option>
                <option value="4">4 Players</option>
              </select>
              <label className="field-label" htmlFor="player-name">Your name</label>
              <input id="player-name" className="control-input" type="text" maxLength="18" placeholder="Enter your name" />
              <div className="online-actions">
                <button id="local-mode-btn" className="secondary-btn" type="button">Local Mode</button>
                <button id="create-room-btn" className="primary-btn" type="button">Create Room</button>
              </div>
              <label className="field-label" htmlFor="room-code-input">Room code</label>
              <div className="online-join-row">
                <input id="room-code-input" className="control-input" type="text" maxLength="6" placeholder="Enter code" />
                <button id="join-room-btn" className="secondary-btn" type="button">Join</button>
              </div>
            </div>

            <div id="room-chat-panel" className="chat-panel">
              <div className="panel-title">Room Chat</div>
              <p id="room-code-display" className="meta-line meta-strong">Room: -</p>
              <div className="room-share-row room-share-row-chat">
                <button id="copy-room-link-btn" className="secondary-btn" type="button" disabled>Copy Link</button>
                <button id="whatsapp-share-btn" className="secondary-btn whatsapp-btn" type="button" disabled>WhatsApp</button>
              </div>
              <button id="leave-room-btn" className="ghost-btn" type="button" disabled>Leave Room</button>
              <div id="chat-messages" className="chat-messages" aria-live="polite">
                <p className="chat-empty">Join an online room to chat and react.</p>
              </div>
              <div className="reaction-row">
                {quickReactions.map(reaction => (
                  <button
                    key={reaction}
                    className="reaction-btn"
                    type="button"
                    data-reaction={reaction}
                    aria-label={`Send reaction ${reaction}`}
                  >
                    {reaction}
                  </button>
                ))}
              </div>
              <div className="chat-compose-row">
                <input id="chat-input" className="control-input chat-input" type="text" maxLength="160" placeholder="Send a message to the room" />
                <button id="chat-send-btn" className="primary-btn chat-send-btn" type="button">Send</button>
              </div>
            </div>
          </aside>

          <div className="board-wrap">
            <div className="board-glow"></div>
            <div id="board"></div>
            <svg id="overlay" viewBox="0 0 600 600" preserveAspectRatio="none"></svg>
            <div id="player-layer"></div>
          </div>

          <aside className="side-panel side-panel-right">
            <div className="dice-panel">
              <div className="panel-title">Dice</div>
              <div id="dice-face" className="dice face-1" aria-label="Dice">
                <span className="pip"></span><span className="pip"></span><span className="pip"></span>
                <span className="pip"></span><span className="pip"></span><span className="pip"></span>
                <span className="pip"></span><span className="pip"></span><span className="pip"></span>
              </div>
              <p id="dice" className="meta-line">Dice: -</p>
              <p id="dice-owner" className="meta-line meta-strong">Active: Player 1</p>
              <button id="roll-btn" className="primary-btn shared-roll-btn" type="button">Roll for Player 1</button>
            </div>

            <div className="controls">
              <div className="panel-title">Players</div>
              <div className="player-roll-list">
                {playerIds.map((playerId, index) => (
                  <div
                    key={playerId}
                    id={`player-roll-${playerId}`}
                    className={`player-roll-group player-roll-${playerId}${index === 0 ? " active" : ""}`}
                    data-player-card={playerId}
                  >
                    <span className="player-roll-arrow" aria-hidden="true"></span>
                    <span id={`player-roll-name-${playerId}`} className="player-roll-name">{`Player ${playerId}`}</span>
                    <span id={`turn-state-${playerId}`} className="turn-state visually-hidden">{index === 0 ? "Your turn" : "Waiting"}</span>
                    <span id={`p${playerId}-last-roll`} className="player-roll-value visually-hidden">-</span>
                  </div>
                ))}
                <div id="turn-chip" className="turn-chip">Player 1 starts. First to 100 wins.</div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div id="toast-container" className="toast-container" aria-live="polite" aria-atomic="true"></div>
      <div id="celebration-rain" className="celebration-rain" aria-hidden="true"></div>
      <div id="confetti-corner" className="confetti-corner" aria-hidden="true"></div>

      <div id="win-overlay" className="win-overlay" aria-hidden="true">
        <div className="win-card" role="dialog" aria-live="assertive" aria-modal="true">
          <div className="win-glow" aria-hidden="true"></div>
          <p className="win-kicker">Victory</p>
          <h2 id="win-message">You won!</h2>
          <p className="win-sub">Celebrate the climb and roll again.</p>
          <div className="win-actions">
            <button id="win-continue" className="win-btn" type="button">Continue</button>
            <button id="win-stop" className="win-btn secondary" type="button">Not now</button>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;


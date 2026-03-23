# Snake & Ladder Game

A browser-based Snake & Ladder game built with React, Vite, and custom JavaScript game logic. The project includes local multiplayer, room-based online play, chat and quick reactions, sound effects, and animated board interactions.

## Features

- Play locally with 2 to 4 players on the same device
- Create or join online rooms for multiplayer sessions
- Share room links and room codes with friends
- In-room chat with quick reactions
- Animated dice, player tokens, snakes, ladders, and win celebration effects
- Sound effects for rolling, climbing ladders, snake bites, and winning
- Responsive layout for desktop and mobile screens

## Tech Stack

- React 18
- Vite 5
- Vanilla JavaScript for core game logic
- CSS for custom UI and animations
- PeerJS loaded through CDN for browser-based multiplayer connections

## Getting Started

### Prerequisites

- Node.js
- npm

### Install

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal.

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## How to Play

1. Start the app.
2. Choose local mode for same-device play, or create/join a room for online play.
3. Roll the dice on your turn.
4. Climb ladders to move up faster.
5. Avoid snakes, which send you back down.
6. Reach tile 100 with an exact roll to win.

## Project Structure

```text
Snake-and-Ladder/
|-- assets/
|   `-- sounds/        # Sound effects used in the game
|-- dist/              # Production build output
|-- src/
|   |-- App.jsx        # React UI structure
|   `-- main.jsx       # React entry point
|-- index.html         # HTML shell and PeerJS CDN include
|-- script.js          # Main game logic and multiplayer behavior
|-- style.css          # Styling, layout, and animations
|-- package.json       # Project scripts and dependencies
`-- README.md
```

## Scripts

- `npm run dev` starts the Vite development server
- `npm run build` creates a production build in `dist/`
- `npm run preview` serves the production build locally

## Notes

- The main UI is rendered through React, while most gameplay behavior is implemented in `script.js`.
- Online multiplayer depends on PeerJS being available in the browser through the CDN script included in `index.html`.

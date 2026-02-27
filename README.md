# Monitor

Web frontend for the trash-sorting robot monitor.

Built with:
- `Svelte 5`
- `Vite`
- plain JavaScript

## Run

From `monitor`:

```powershell
npm install
npm run dev
```

Default dev URL:

```text
http://localhost:5173
```

Build for production:

```powershell
npm run build
```

Preview the production build:

```powershell
npm run preview
```

## Current Pages

- Main page: robot status, sort counts, controls, speed graph
- Analytics page: detailed analytics view

Navigation uses hash routes:

- `#main`
- `#analytics`

## Data Flow

The UI is driven by a single `snapshot` object.

Placeholder data and future websocket mapping live in `monitor/src/lib/backend.js`.

Key functions:

- `createPlaceholderSnapshot()`
- `fetchRobotSnapshot()`
- `normalizeMainframePayload(payload, currentSnapshot)`
- `connectMainframeSocket(onSnapshot)`

## Websocket Integration

The app is set up so values can later come from a websocket-based mainframe feed.

When backend message formats are finalized:

1. Update `monitor/src/lib/backend.js`
2. Implement the real websocket in `connectMainframeSocket(...)`
3. Map incoming payload fields in `normalizeMainframePayload(...)`

This keeps UI components unchanged while the backend contract evolves.

## Project Structure

- `monitor/src/App.svelte`: top-level page switching and snapshot state
- `monitor/src/pages/MainPage.svelte`: main operator view
- `monitor/src/pages/AnalyticsPage.svelte`: analytics view
- `monitor/src/lib/backend.js`: placeholder data and backend integration hooks
- `monitor/src/main.js`: app entry point
- `monitor/src/app.css`: shared styles

## Notes

- Control buttons are currently UI placeholders only.
- The speed graph uses placeholder `speedHistory` values.
- The server URL display is read-only.

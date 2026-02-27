const DEFAULT_ANALYTICS = [
  { label: "Accuracy", value: 92 },
  { label: "Speed", value: 78 },
  { label: "Quality", value: 85 },
];

const DEFAULT_SPEED_HISTORY = [52, 64, 58, 72, 69, 81, 78];

export function createPlaceholderSnapshot() {
  return {
    status: "IDLE",
    statusCode: "I2LF",
    uptime: "12:14:32",
    serverUrl: "",
    lastItem: "Plastic Bottle",
    counts: {
      trash: 42,
      recycle: 30,
    },
    analytics: DEFAULT_ANALYTICS.map((item) => ({ ...item })),
    speedHistory: [...DEFAULT_SPEED_HISTORY],
  };
}

export function normalizeMainframePayload(payload = {}, currentSnapshot = createPlaceholderSnapshot()) {
  // This is the single mapping point for future websocket messages.
  // Replace or extend these assignments when the mainframe payload shape is finalized.
  return {
    ...currentSnapshot,
    status: payload.status ?? currentSnapshot.status,
    statusCode: payload.statusCode ?? currentSnapshot.statusCode,
    uptime: payload.uptime ?? currentSnapshot.uptime,
    serverUrl: payload.serverUrl ?? currentSnapshot.serverUrl,
    lastItem: payload.lastItem ?? currentSnapshot.lastItem,
    counts: {
      trash: payload.counts?.trash ?? currentSnapshot.counts.trash,
      recycle: payload.counts?.recycle ?? currentSnapshot.counts.recycle,
    },
    analytics: Array.isArray(payload.analytics) && payload.analytics.length > 0
      ? payload.analytics
      : currentSnapshot.analytics,
    speedHistory: Array.isArray(payload.speedHistory) && payload.speedHistory.length > 0
      ? payload.speedHistory
      : currentSnapshot.speedHistory,
  };
}

export async function fetchRobotSnapshot() {
  // Placeholder source until websocket wiring is added.
  return Promise.resolve(createPlaceholderSnapshot());
}

export function connectMainframeSocket(onSnapshot) {
  // Placeholder hook for websocket integration.
  // Example later:
  // const socket = new WebSocket("ws://mainframe-host");
  // socket.onmessage = (event) => onSnapshot(normalizeMainframePayload(JSON.parse(event.data)));
  // return () => socket.close();
  return () => {};
}

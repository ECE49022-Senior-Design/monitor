const DEFAULT_ANALYTICS = [
  { label: "Accuracy", value: 92 },
  { label: "Speed", value: 78 },
  { label: "Quality", value: 85 },
];

const DEFAULT_SPEED_HISTORY = [52, 64, 58, 72, 69, 81, 78];
const MAINFRAME_WS_URL = import.meta.env.VITE_MAINFRAME_WS_URL || "ws://localhost:8080";
let mainframeSocket = null;

function statusToCode(status = "") {
  const normalized = String(status).trim().toUpperCase();
  if (!normalized) return "UNKN";
  return normalized.slice(0, 4).padEnd(4, "_");
}

function statusFromEnvelope(envelope, currentSnapshot) {
  const state = envelope?.state ?? envelope?.data?.state ?? envelope?.data?.status;
  if (!state) return currentSnapshot.status;
  return String(state).toUpperCase();
}

function withSpeedHistory(currentSnapshot, nextValue) {
  const history = Array.isArray(currentSnapshot.speedHistory) ? currentSnapshot.speedHistory : [];
  return [...history.slice(-6), nextValue];
}

function isCheckingStatus(status = "") {
  return String(status).toLowerCase().includes("check");
}

function isCompleteStatus(status = "") {
  const normalized = String(status).toLowerCase();
  return normalized.includes("complete") || normalized.includes("done");
}

function isSortingStatus(status = "") {
  const normalized = String(status).toLowerCase();
  return normalized.includes("sort") || normalized.includes("busy");
}

function isFailedStatus(status = "") {
  return String(status).toLowerCase().includes("fail");
}

function toBucket(label = "") {
  const normalized = String(label).trim().toLowerCase();
  if (normalized === "trash") return "trash";
  if (normalized === "recycle" || normalized === "recycling") return "recycle";
  return null;
}

export function createPlaceholderSnapshot() {
  return {
    status: "IDLE",
    statusCode: "I2LF",
    uptime: "00:00",
    serverUrl: "",
    currentItem: "None",
    lastItem: "None",
    counts: {
      trash: 0,
      recycle: 0,
    },
    analytics: DEFAULT_ANALYTICS.map((item) => ({ ...item })),
    speedHistory: [...DEFAULT_SPEED_HISTORY],
    cvStageDone: 0,
    cvStageTotal: 0,
    cvStageName: "",
    _cycleLabel: null,
    _cycleCounted: false,
  };
}

export function normalizeMainframePayload(payload = {}, currentSnapshot = createPlaceholderSnapshot()) {
  const type = payload?.type;

  // Direct simulator message: { type: "status", state: "checking" }
  if (type === "status") {
    const nextStatus = statusFromEnvelope(payload, currentSnapshot);
    const beginCycle = isCheckingStatus(nextStatus);
    const endCycle = isCompleteStatus(nextStatus);
    return {
      ...currentSnapshot,
      status: nextStatus,
      statusCode: statusToCode(nextStatus),
      serverUrl: currentSnapshot.serverUrl || MAINFRAME_WS_URL,
      speedHistory: withSpeedHistory(currentSnapshot, Math.max(50, Math.min(95, currentSnapshot.counts.trash + currentSnapshot.counts.recycle))),
      _cycleLabel: beginCycle ? null : currentSnapshot._cycleLabel,
      _cycleCounted: beginCycle ? false : endCycle ? true : currentSnapshot._cycleCounted,
    };
  }

  // Direct simulator message: { type: "detection", label: "recycle", result: "success" }
  if (type === "detection") {
    const label = String(payload?.label || "Unknown");
    const isSuccess = String(payload?.result || "").toLowerCase() === "success";
    const bucket = toBucket(label);
    const nextCounts = { ...currentSnapshot.counts };
    const lockedLabel = currentSnapshot._cycleLabel;
    const effectiveLabel = lockedLabel || label;
    const effectiveBucket = toBucket(effectiveLabel);
    const canCount = isSuccess && effectiveBucket && !currentSnapshot._cycleCounted;
    if (canCount) nextCounts[effectiveBucket] += 1;

    return {
      ...currentSnapshot,
      currentItem: effectiveLabel,
      counts: nextCounts,
      serverUrl: currentSnapshot.serverUrl || MAINFRAME_WS_URL,
      speedHistory: withSpeedHistory(currentSnapshot, Math.round(55 + Math.random() * 35)),
      _cycleLabel: lockedLabel || (bucket ? label : null),
      _cycleCounted: currentSnapshot._cycleCounted || canCount,
    };
  }

  // Mainframe envelope: { type, source, data, ... }
  if (type === "state_update") {
    const source = payload?.source;
    const data = payload?.data || {};
    if (source === "cv") {
      const fps = typeof data.fps === "number" ? data.fps : null;
      const speed = fps ? Math.max(0, Math.min(100, Math.round((fps / 32) * 100))) : currentSnapshot.speedHistory.at(-1) || 70;
      return {
        ...currentSnapshot,
        status: data.status ? String(data.status).toUpperCase() : currentSnapshot.status,
        statusCode: data.status ? statusToCode(data.status) : currentSnapshot.statusCode,
        serverUrl: currentSnapshot.serverUrl || MAINFRAME_WS_URL,
        speedHistory: withSpeedHistory(currentSnapshot, speed),
        cvStageDone: data.stageDone ?? currentSnapshot.cvStageDone,
        cvStageTotal: data.allStage ?? currentSnapshot.cvStageTotal,
        cvStageName: data.stageName ?? currentSnapshot.cvStageName,
        _cycleLabel: data.status && isCheckingStatus(data.status) ? null : currentSnapshot._cycleLabel,
        _cycleCounted: data.status && isCheckingStatus(data.status) ? false : currentSnapshot._cycleCounted,
      };
    }
    if (source === "arm" && data.status) {
      const armStatus = String(data.status).toUpperCase();
      const nextStatus = isFailedStatus(armStatus)
        ? "FAILED"
        : isSortingStatus(armStatus)
        ? "SORTING"
        : armStatus === "IDLE" && isSortingStatus(currentSnapshot.status)
          ? "COMPLETE"
          : currentSnapshot.status;

      return {
        ...currentSnapshot,
        status: nextStatus,
        statusCode: statusToCode(nextStatus),
        serverUrl: currentSnapshot.serverUrl || MAINFRAME_WS_URL,
        currentItem: nextStatus === "COMPLETE" || nextStatus === "FAILED"
          ? "None"
          : data.currentObject ?? currentSnapshot.currentItem,
        lastItem: nextStatus === "COMPLETE" || nextStatus === "FAILED"
          ? currentSnapshot.currentItem
          : currentSnapshot.lastItem,
        _cycleLabel: nextStatus === "COMPLETE" || nextStatus === "FAILED" ? null : currentSnapshot._cycleLabel,
        _cycleCounted: nextStatus === "COMPLETE" ? true : currentSnapshot._cycleCounted,
      };
    }
  }

  if (type === "object_detected") {
    const label = String(payload?.data?.object || "Unknown");
    const bucket = payload?.data?.recycleable ? "recycle" : "trash";
    const canCount = !currentSnapshot._cycleCounted;

    return {
      ...currentSnapshot,
      status: "CHECKING",
      statusCode: statusToCode("CHECKING"),
      currentItem: label,
      counts: {
        ...currentSnapshot.counts,
        [bucket]: currentSnapshot.counts[bucket] + (canCount ? 1 : 0),
      },
      serverUrl: currentSnapshot.serverUrl || MAINFRAME_WS_URL,
      speedHistory: withSpeedHistory(currentSnapshot, Math.round(55 + Math.random() * 35)),
      cvStageDone: currentSnapshot.cvStageDone,
      cvStageTotal: currentSnapshot.cvStageTotal,
      cvStageName: currentSnapshot.cvStageName,
      _cycleLabel: label,
      _cycleCounted: currentSnapshot._cycleCounted || canCount,
    };
  }

  if (type === "ack" && payload?.source === "arm") {
    return {
      ...currentSnapshot,
      status: "SORTING",
      statusCode: statusToCode("SORTING"),
      serverUrl: currentSnapshot.serverUrl || MAINFRAME_WS_URL,
      currentItem: payload?.data?.label ?? currentSnapshot.currentItem,
    };
  }

  if (type === "result" && payload?.source === "arm") {
    const armSucceeded = payload?.data?.success === true || payload?.data?.ok === true;

    return {
      ...currentSnapshot,
      status: armSucceeded ? "COMPLETE" : "FAILED",
      statusCode: statusToCode(armSucceeded ? "COMPLETE" : "FAILED"),
      serverUrl: currentSnapshot.serverUrl || MAINFRAME_WS_URL,
      currentItem: "None",
      lastItem: payload?.data?.label ?? currentSnapshot.currentItem,
      cvStageDone: 0,
      cvStageTotal: 0,
      cvStageName: "",
      _cycleLabel: null,
      _cycleCounted: armSucceeded,
    };
  }

  if (type === "pick_event" && payload?.source === "arm" && payload?.data?.success === false) {
    return {
      ...currentSnapshot,
      status: "FAILED",
      statusCode: statusToCode("FAILED"),
      serverUrl: currentSnapshot.serverUrl || MAINFRAME_WS_URL,
      currentItem: "None",
      lastItem: currentSnapshot.currentItem,
      cvStageDone: 0,
      cvStageTotal: 0,
      cvStageName: "",
      _cycleLabel: null,
    };
  }

  if (type === "event" && payload?.data?.kind === "detection") {
    const label = String(payload.data.label || "Unknown");
    const lockedLabel = currentSnapshot._cycleLabel;
    const effectiveLabel = lockedLabel || label;
    const bucket = toBucket(effectiveLabel);
    if (!bucket) {
      return {
        ...currentSnapshot,
        currentItem: effectiveLabel,
        serverUrl: currentSnapshot.serverUrl || MAINFRAME_WS_URL,
        _cycleLabel: lockedLabel || null,
      };
    }
    const canCount = !currentSnapshot._cycleCounted;
    return {
      ...currentSnapshot,
      currentItem: effectiveLabel,
      counts: {
        ...currentSnapshot.counts,
        [bucket]: currentSnapshot.counts[bucket] + (canCount ? 1 : 0),
      },
      serverUrl: currentSnapshot.serverUrl || MAINFRAME_WS_URL,
      _cycleLabel: lockedLabel || label,
      _cycleCounted: currentSnapshot._cycleCounted || canCount,
    };
  }

  // If caller already passes a normalized payload, keep backward compatibility.
  return {
    ...currentSnapshot,
    status: payload.status ?? currentSnapshot.status,
    statusCode: payload.statusCode ?? currentSnapshot.statusCode,
    uptime: payload.uptime ?? currentSnapshot.uptime,
    serverUrl: payload.serverUrl ?? currentSnapshot.serverUrl,
    currentItem: payload.currentItem ?? currentSnapshot.currentItem,
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
    cvStageDone: payload.cvStageDone ?? currentSnapshot.cvStageDone,
    cvStageTotal: payload.cvStageTotal ?? currentSnapshot.cvStageTotal,
    cvStageName: payload.cvStageName ?? currentSnapshot.cvStageName,
  };
}

export async function fetchRobotSnapshot() {
  return Promise.resolve({
    ...createPlaceholderSnapshot(),
    serverUrl: MAINFRAME_WS_URL,
  });
}

export function connectMainframeSocket(onMessage) {
  const socket = new WebSocket(MAINFRAME_WS_URL);
  mainframeSocket = socket;

  socket.onopen = () => {
    console.log("[monitor] connected to mainframe");

    socket.send(JSON.stringify({
      type: "hello",
      data: {
        role: "monitor",
        name: "dashboard-ui",
      },
    }));
  };

  socket.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    console.log("[monitor] received:", payload);
    onMessage(payload);
  };

  return {
    send: (msg) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(msg));
      }
    },
    disconnect: () => {
      if (mainframeSocket === socket) {
        mainframeSocket = null;
      }
      socket.close();
    },
  };
}

export function sendOperatorAction(action) {
  if (!mainframeSocket || mainframeSocket.readyState !== WebSocket.OPEN) return false;
  mainframeSocket.send(JSON.stringify({
    type: "event",
    data: {
      kind: "operator_action",
      action,
      at: Date.now(),
    },
  }));
  if (action === "begin_cv_detection" && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("monitor-run-started", {
      detail: { startedAt: Date.now() },
    }));
  }
  return true;
}

<script>
  import { sendOperatorAction } from "../lib/backend.js";

  export let snapshot;

  function getFlowStep(status = "") {
    const normalized = String(status).toLowerCase();
    if (normalized.includes("check")) return 0;
    if (normalized.includes("sort") || normalized.includes("busy")) return 1;
    if (normalized.includes("complete") || normalized.includes("done")) return 2;
    return -1;
  }

  $: currentFlowStep = getFlowStep(snapshot.status);

  $: speedPoints = (snapshot.speedHistory || []).map((value, index, history) => {
    const width = 240;
    const height = 100;
    const safeValue = Math.max(0, Math.min(100, value));
    const x = history.length > 1 ? (index / (history.length - 1)) * width : width / 2;
    const y = height - (safeValue / 100) * height;
    return `${x},${y}`;
  }).join(" ");
</script>

<main class="screen">
  <header class="topbar">
    <div class="brand">
      <div class="brand-dot"></div>
      <div>
        <div class="title">Main</div>
        <div class="subtitle">Trash Sorting Monitor</div>
      </div>
    </div>
    <div class="clock">
      <div class="server">
        <span class="pill">Server</span>
        <strong>{snapshot.serverUrl || "Not Set"}</strong>
      </div>
      <span class="pill">Uptime</span>
      <strong>{snapshot.uptime}</strong>
      <a class="nav-button" href="#analytics">Analytics</a>
    </div>
  </header>

  <section class="panel-grid">
    <article class="status-panel">
      <div class="panel-header">
        <h2>Status</h2>
        <span class="chip">{snapshot.statusCode}</span>
      </div>

      <div class="status-body">
        <div class="status-indicator">
          <div class="pulse"></div>
          <span>{snapshot.status}</span>
        </div>
        <div class="status-metadata">
          <div class="meta">
            <span>Last Item</span>
            <strong>{snapshot.lastItem}</strong>
          </div>
          <div class="meta">
            <span>Mode</span>
            <strong>Auto Sort</strong>
          </div>
        </div>

        <div class="flow">
          <div class="flow-step checking" class:active={currentFlowStep === 0} class:completed={currentFlowStep > 0}>
            <span class="dot"></span>
            <div>
              <strong>Checking</strong>
              <p>Scanning incoming item</p>
            </div>
          </div>
          <div class="flow-step sorting" class:active={currentFlowStep === 1} class:completed={currentFlowStep > 1}>
            <span class="dot"></span>
            <div>
              <strong>Sorting</strong>
              <p>Assigning to bin</p>
            </div>
          </div>
          <div class="flow-step complete" class:active={currentFlowStep === 2}>
            <span class="dot"></span>
            <div>
              <strong>Complete</strong>
              <p>Logged and cleared</p>
            </div>
          </div>
        </div>

        <div class="controls-section">
          <div class="section-label">Controls</div>
          <div class="inline-controls">
            <button class="control-button pause large" type="button" on:click={() => sendOperatorAction("pause_pressed")}>Pause</button>
            <button class="control-button stop large" type="button" on:click={() => sendOperatorAction("emergency_stop_pressed")}>Emergency Stop</button>
          </div>
        </div>
      </div>
    </article>

    <aside class="counter-panel">
      <div class="counter-card">
        <div>
          <h3>Trash</h3>
          <p class="counter">{snapshot.counts.trash}</p>
        </div>
        <div class="counter-sub">This shift</div>
      </div>

      <div class="counter-card">
        <div>
          <h3>Recycle</h3>
          <p class="counter">{snapshot.counts.recycle}</p>
        </div>
        <div class="counter-sub">This shift</div>
      </div>

      <div class="analytics-bar trend-panel">
        <div class="analytics-header">
          <h4>Speed Trend</h4>
          <span>Recent cycles</span>
        </div>
        <div class="line-graph" aria-label="Speed line graph">
          <div class="line-grid"></div>
          <svg viewBox="0 0 240 100" preserveAspectRatio="none" role="img" aria-label="Speed history">
            <polyline points={speedPoints} />
          </svg>
          <div class="line-labels">
            <span>Start</span>
            <span>Current</span>
          </div>
        </div>
      </div>
    </aside>
  </section>
</main>

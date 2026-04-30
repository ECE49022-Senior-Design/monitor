<script>
  import { onMount } from "svelte";
  import {
    connectMainframeSocket,
    createPlaceholderSnapshot,
    fetchRobotSnapshot,
    normalizeMainframePayload,
  } from "./lib/backend.js";
  import MainPage from "./pages/MainPage.svelte";
  import AnalyticsPage from "./pages/AnalyticsPage.svelte";

  let snapshot = createPlaceholderSnapshot();

  let page = "main";
  let uptimeInterval;
  let resetTimeout;

  const formatElapsedTime = (elapsedMs) => {
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const startUptimeClock = (startedAt) => {
    if (uptimeInterval) {
      clearInterval(uptimeInterval);
    }

    const updateUptime = () => {
      snapshot = {
        ...snapshot,
        uptime: formatElapsedTime(Date.now() - startedAt),
      };
    };

    updateUptime();
    uptimeInterval = window.setInterval(updateUptime, 1000);
  };

  const clearResetTimeout = () => {
    if (resetTimeout) {
      clearTimeout(resetTimeout);
      resetTimeout = null;
    }
  };

  const scheduleResetAfterComplete = () => {
    clearResetTimeout();
    resetTimeout = window.setTimeout(() => {
      snapshot = {
        ...createPlaceholderSnapshot(),
        serverUrl: snapshot.serverUrl,
        lastItem: snapshot.lastItem,
        counts: { ...snapshot.counts },
        analytics: [...snapshot.analytics],
        speedHistory: [...snapshot.speedHistory],
      };
      if (uptimeInterval) {
        clearInterval(uptimeInterval);
        uptimeInterval = null;
      }
      resetTimeout = null;
    }, 30000);
  };

  const syncPage = () => {
    const hash = window.location.hash.replace("#", "");
    page = hash === "analytics" ? "analytics" : "main";
  };

  onMount(async () => {
    snapshot = await fetchRobotSnapshot();

    const socketControls = connectMainframeSocket((payload) => {
      snapshot = normalizeMainframePayload(payload, snapshot);

      if (snapshot.status === "COMPLETE") {
        scheduleResetAfterComplete();
      } else if (snapshot.status !== "FAILED") {
        clearResetTimeout();
      }
    });

    const handleRunStarted = (event) => {
      clearResetTimeout();
      startUptimeClock(event.detail?.startedAt ?? Date.now());
    };

    syncPage();
    window.addEventListener("hashchange", syncPage);
    window.addEventListener("monitor-run-started", handleRunStarted);

    return () => {
      window.removeEventListener("hashchange", syncPage);
      window.removeEventListener("monitor-run-started", handleRunStarted);
      if (uptimeInterval) {
        clearInterval(uptimeInterval);
      }
      clearResetTimeout();
      socketControls.disconnect();
    };
  });
</script>

{#if page === "analytics"}
  <AnalyticsPage {snapshot} />
{:else}
  <MainPage {snapshot} />
{/if}

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

  const syncPage = () => {
    const hash = window.location.hash.replace("#", "");
    page = hash === "analytics" ? "analytics" : "main";
  };

  onMount(async () => {
    snapshot = await fetchRobotSnapshot();
    const disconnect = connectMainframeSocket((payload) => {
      snapshot = normalizeMainframePayload(payload, snapshot);
    });
    syncPage();
    window.addEventListener("hashchange", syncPage);
    return () => {
      window.removeEventListener("hashchange", syncPage);
      disconnect();
    };
  });
</script>

{#if page === "analytics"}
  <AnalyticsPage {snapshot} />
{:else}
  <MainPage {snapshot} />
{/if}

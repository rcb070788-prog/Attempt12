// auto_find_on_load.js
// Opens the Find bar and re-applies a search when #search= is present in the viewer hash.
// Designed to be small + easy to reapply after PDF.js upgrades.

(function () {
  function getHashParams() {
    const h = (window.location.hash || "").replace(/^#/, "");
    return new URLSearchParams(h);
  }

  const params = getHashParams();
  const query = params.get("search") || "";
  if (!query) return;

  const phrase = (params.get("phrase") || "").toLowerCase() === "true";

  function run() {
    try {
      const app = window.PDFViewerApplication;
      if (!app || !app.pdfFindController) return;

      // Best-effort: open the Find bar UI
      try {
        if (app.findBar && typeof app.findBar.open === "function") app.findBar.open();
      } catch (_) {}

      // Force a find with highlightAll enabled
      try {
        app.pdfFindController.executeCommand("find", {
          query,
          phraseSearch: phrase,
          highlightAll: true,
          caseSensitive: false,
          entireWord: false,
          findPrevious: false
        });
      } catch (_) {}
    } catch (_) {}
  }

  // Wait until the viewer is initialized
  function runWhenReady() {
    const app = window.PDFViewerApplication;
    if (app && app.initializedPromise && typeof app.initializedPromise.then === "function") {
      app.initializedPromise.then(() => setTimeout(run, 0));
    } else {
      setTimeout(run, 250);
    }
  }

  window.addEventListener("webviewerloaded", runWhenReady, { once: true });
  if (document.readyState === "complete" || document.readyState === "interactive") {
    runWhenReady();
  }
})();

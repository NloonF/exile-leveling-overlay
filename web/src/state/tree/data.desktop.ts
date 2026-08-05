// Installed WebView2 builds keep tree JSON embedded because lazy JavaScript
// chunks are not resolved reliably from an NSIS installation.
export default import.meta.glob<string>("/../common/data/tree/*.json", {
  eager: true,
  query: "?raw",
  import: "default",
});

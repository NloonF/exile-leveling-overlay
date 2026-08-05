// Web/PWA builds load only the requested tree version. Each JSON file becomes
// a separate precached chunk instead of inflating the application entry.
export default import.meta.glob<string>("/../common/data/tree/*.json", {
  query: "?raw",
  import: "default",
});

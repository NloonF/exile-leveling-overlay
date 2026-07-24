import { App } from "./containers";
import "./index.css";
import { OverlayView } from "./overlay/OverlayView";
import { TreeOverlayView } from "./overlay/TreeOverlayView";
import "@fontsource/source-sans-pro/latin-400.css";
import "@fontsource/source-sans-pro/latin-700.css";
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";

const overlayWindow = window.location.hash.startsWith("#/overlay");
const treeOverlayWindow = window.location.hash.startsWith("#/tree-overlay");
if (overlayWindow || treeOverlayWindow) {
  document.documentElement.dataset.window = "overlay";
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense>
      {treeOverlayWindow ? (
        <TreeOverlayView />
      ) : overlayWindow ? (
        <OverlayView />
      ) : (
        <HashRouter>
          <App />
        </HashRouter>
      )}
    </Suspense>
  </React.StrictMode>,
);

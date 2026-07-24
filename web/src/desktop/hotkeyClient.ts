import type { OverlayHotkeys } from "../overlay/overlayHotkeys";

export type HotkeyRegistrationStatus =
  | { state: "active"; message: string }
  | { state: "disabled"; message: string }
  | { state: "error"; message: string }
  | { state: "unsupported"; message: string }
  | { state: "superseded"; message: string };

let configurationGeneration = 0;
let activeShortcuts: string[] = [];
let configurationQueue = Promise.resolve<HotkeyRegistrationStatus>({
  state: "disabled",
  message: "Global shortcuts are not configured",
});

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function validateOverlayHotkeys(hotkeys: OverlayHotkeys): string | null {
  const shortcuts = [
    hotkeys.toggleOverlay,
    hotkeys.holdForDetails,
    hotkeys.toggleTree,
  ]
    .filter((shortcut) => shortcut.length > 0)
    .map((shortcut) => shortcut.toLowerCase());
  if (new Set(shortcuts).size !== shortcuts.length) {
    return "Choose different shortcuts for each action";
  }
  return null;
}

export function configureOverlayHotkeys(
  hotkeys: OverlayHotkeys,
): Promise<HotkeyRegistrationStatus> {
  const generation = ++configurationGeneration;

  configurationQueue = configurationQueue
    .catch(() => ({
      state: "error" as const,
      message: "The previous shortcut update failed",
    }))
    .then(async () => {
      if (!("__TAURI_INTERNALS__" in window)) {
        return {
          state: "unsupported" as const,
          message: "Global shortcuts are available in the desktop app",
        };
      }

      const [{ register, unregister }, { invoke }] = await Promise.all([
        import("@tauri-apps/plugin-global-shortcut"),
        import("@tauri-apps/api/core"),
      ]);

      if (activeShortcuts.length > 0) {
        await unregister(activeShortcuts).catch(() => undefined);
        activeShortcuts = [];
      }
      await invoke("set_overlay_detail_mode", { enabled: false }).catch(
        () => undefined,
      );

      if (generation !== configurationGeneration) {
        return {
          state: "superseded" as const,
          message: "A newer shortcut configuration is being applied",
        };
      }

      const validationError = validateOverlayHotkeys(hotkeys);
      if (validationError !== null) {
        return {
          state: "error" as const,
          message: validationError,
        };
      }

      try {
        if (hotkeys.toggleOverlay) {
          await register(hotkeys.toggleOverlay, (event) => {
            if (event.state === "Pressed") {
              void invoke("toggle_overlay");
            }
          });
          activeShortcuts.push(hotkeys.toggleOverlay);
        }

        if (hotkeys.holdForDetails) {
          await register(hotkeys.holdForDetails, (event) => {
            void invoke("set_overlay_detail_mode", {
              enabled: event.state === "Pressed",
            });
          });
          activeShortcuts.push(hotkeys.holdForDetails);
        }

        if (hotkeys.toggleTree) {
          await register(hotkeys.toggleTree, (event) => {
            if (event.state === "Pressed") {
              void invoke("toggle_overlay_tree_mode");
            }
          });
          activeShortcuts.push(hotkeys.toggleTree);
        }
      } catch (error) {
        if (activeShortcuts.length > 0) {
          await unregister(activeShortcuts).catch(() => undefined);
          activeShortcuts = [];
        }
        return {
          state: "error" as const,
          message: `Shortcut unavailable: ${errorMessage(error)}`,
        };
      }

      if (activeShortcuts.length === 0) {
        return {
          state: "disabled" as const,
          message: "Global shortcuts are disabled",
        };
      }

      return {
        state: "active" as const,
        message: `${activeShortcuts.length} global shortcut${
          activeShortcuts.length === 1 ? "" : "s"
        } active`,
      };
    });

  return configurationQueue;
}

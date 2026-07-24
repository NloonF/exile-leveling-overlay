use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    thread,
    time::Duration,
};

use serde::{Deserialize, Serialize};
use tauri::{Emitter, LogicalSize, Manager, PhysicalPosition, Position, Size};

use crate::poe_window::{PoeWindowState, PoeWindowStatus};

const POE_WINDOW_POLL_INTERVAL: Duration = Duration::from_millis(250);

pub struct OverlayRuntime {
    editing: AtomicBool,
    detail_mode: AtomicBool,
    desired_visible: AtomicBool,
    tree_mode: AtomicBool,
    tree_editing: AtomicBool,
    tree_visible_before_edit: AtomicBool,
    preferences: Mutex<NativeOverlayPreferences>,
    tree_preferences: Mutex<NativeTreeOverlayPreferences>,
    poe_status: Mutex<PoeWindowStatus>,
}

impl Default for OverlayRuntime {
    fn default() -> Self {
        Self {
            editing: AtomicBool::new(false),
            detail_mode: AtomicBool::new(false),
            desired_visible: AtomicBool::new(true),
            tree_mode: AtomicBool::new(false),
            tree_editing: AtomicBool::new(false),
            tree_visible_before_edit: AtomicBool::new(false),
            preferences: Mutex::new(NativeOverlayPreferences::default()),
            tree_preferences: Mutex::new(NativeTreeOverlayPreferences::default()),
            poe_status: Mutex::new(PoeWindowStatus::default()),
        }
    }
}

#[derive(Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
enum CoordinateMode {
    Screen,
    Game,
}

#[derive(Clone, Copy)]
struct NativeOverlayPreferences {
    position_x: i32,
    position_y: i32,
    width: f64,
    height: f64,
    coordinate_mode: CoordinateMode,
    auto_hide_when_game_inactive: bool,
}

impl Default for NativeOverlayPreferences {
    fn default() -> Self {
        Self {
            position_x: 24,
            position_y: 80,
            width: 420.0,
            height: 240.0,
            coordinate_mode: CoordinateMode::Game,
            auto_hide_when_game_inactive: true,
        }
    }
}

#[derive(Clone, Copy)]
struct NativeTreeOverlayPreferences {
    position_x: i32,
    position_y: i32,
    width: f64,
    height: f64,
    coordinate_mode: CoordinateMode,
    auto_hide_when_game_inactive: bool,
}

impl Default for NativeTreeOverlayPreferences {
    fn default() -> Self {
        Self {
            position_x: 500,
            position_y: 80,
            width: 680.0,
            height: 470.0,
            coordinate_mode: CoordinateMode::Game,
            auto_hide_when_game_inactive: true,
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayPreferences {
    position_x: i32,
    position_y: i32,
    width: f64,
    height: f64,
    coordinate_mode: Option<CoordinateMode>,
    auto_hide_when_game_inactive: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TreeOverlayPreferences {
    position_x: i32,
    position_y: i32,
    width: f64,
    height: f64,
    coordinate_mode: Option<CoordinateMode>,
    auto_hide_when_game_inactive: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OverlayPosition {
    position_x: i32,
    position_y: i32,
    coordinate_mode: CoordinateMode,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayRuntimeStatus {
    visible: bool,
    editing: bool,
    tree_mode: bool,
}

pub fn initialise(app: &tauri::AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("overlay") {
        window.set_ignore_cursor_events(true)?;
    }
    if let Some(window) = app.get_webview_window("tree-overlay") {
        window.set_ignore_cursor_events(true)?;
    }
    sync_overlay_window(app);
    start_poe_window_watcher(app.clone());
    Ok(())
}

pub fn toggle(app: &tauri::AppHandle) {
    let runtime = app.state::<OverlayRuntime>();
    let desired = !runtime.desired_visible.load(Ordering::SeqCst);
    set_overlay_visibility(app, desired);
}

#[tauri::command]
pub fn toggle_overlay(app: tauri::AppHandle) {
    toggle(&app);
}

#[tauri::command]
pub fn show_overlay(app: tauri::AppHandle) -> Result<(), String> {
    set_overlay_visibility(&app, true);
    Ok(())
}

#[tauri::command]
pub fn hide_overlay(app: tauri::AppHandle) -> Result<(), String> {
    set_overlay_visibility(&app, false);
    Ok(())
}

#[tauri::command]
pub fn get_overlay_runtime_status(app: tauri::AppHandle) -> OverlayRuntimeStatus {
    overlay_runtime_status(&app)
}

#[tauri::command]
pub fn get_poe_window_status(app: tauri::AppHandle) -> PoeWindowStatus {
    app.state::<OverlayRuntime>()
        .poe_status
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .clone()
}

#[tauri::command]
pub fn set_overlay_detail_mode(enabled: bool, app: tauri::AppHandle) -> Result<(), String> {
    let runtime = app.state::<OverlayRuntime>();
    runtime.detail_mode.store(enabled, Ordering::SeqCst);
    if let Some(window) = app.get_webview_window("overlay") {
        let ignore_cursor = !enabled && !runtime.editing.load(Ordering::SeqCst);
        window
            .set_ignore_cursor_events(ignore_cursor)
            .map_err(|error| error.to_string())?;
    }
    if let Some(window) = app.get_webview_window("tree-overlay") {
        let ignore_cursor = !enabled && !runtime.tree_editing.load(Ordering::SeqCst);
        window
            .set_ignore_cursor_events(ignore_cursor)
            .map_err(|error| error.to_string())?;
    }
    app.emit_to("overlay", "overlay-detail-mode", enabled)
        .map_err(|error| error.to_string())?;
    app.emit_to("tree-overlay", "overlay-detail-mode", enabled)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn toggle_overlay_tree_mode(app: tauri::AppHandle) -> Result<(), String> {
    let runtime = app.state::<OverlayRuntime>();
    let enabled = !runtime.tree_mode.load(Ordering::SeqCst);
    runtime.tree_mode.store(enabled, Ordering::SeqCst);
    sync_overlay_window(&app);
    emit_overlay_runtime_status(&app);
    Ok(())
}

#[tauri::command]
pub fn apply_tree_overlay_preferences(
    preferences: TreeOverlayPreferences,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let runtime = app.state::<OverlayRuntime>();
    {
        let mut native = runtime
            .tree_preferences
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        native.position_x = preferences.position_x;
        native.position_y = preferences.position_y;
        native.width = preferences.width.max(420.0);
        native.height = preferences.height.max(300.0);
        native.coordinate_mode = preferences
            .coordinate_mode
            .unwrap_or(CoordinateMode::Screen);
        native.auto_hide_when_game_inactive = preferences.auto_hide_when_game_inactive;
    }
    sync_overlay_window(&app);
    Ok(())
}

fn start_tree_edit_mode(app: &tauri::AppHandle) -> Result<(), String> {
    let runtime = app.state::<OverlayRuntime>();
    let window = app
        .get_webview_window("tree-overlay")
        .ok_or_else(|| "tree overlay window is unavailable".to_string())?;
    runtime.tree_mode.store(true, Ordering::SeqCst);
    runtime.tree_editing.store(true, Ordering::SeqCst);
    window
        .set_resizable(true)
        .map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())?;
    window
        .set_ignore_cursor_events(false)
        .map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    app.emit_to("tree-overlay", "tree-overlay-edit-mode", true)
        .map_err(|error| error.to_string())?;
    emit_overlay_runtime_status(app);
    Ok(())
}

fn finish_tree_edit_mode(app: &tauri::AppHandle) {
    let runtime = app.state::<OverlayRuntime>();
    if let Some(window) = app.get_webview_window("tree-overlay") {
        if let (Ok(position), Ok(size)) = (window.outer_position(), window.inner_size()) {
            let scale = window.scale_factor().unwrap_or(1.0);
            let status = runtime
                .poe_status
                .lock()
                .unwrap_or_else(|poisoned| poisoned.into_inner())
                .clone();
            let (position_x, position_y, coordinate_mode) = if let Some(client) = status.client_rect
            {
                (
                    position.x - client.x,
                    position.y - client.y,
                    CoordinateMode::Game,
                )
            } else {
                (position.x, position.y, CoordinateMode::Screen)
            };
            let layout = TreeOverlayLayout {
                position_x,
                position_y,
                width: size.width as f64 / scale,
                height: size.height as f64 / scale,
                coordinate_mode,
            };
            {
                let mut preferences = runtime
                    .tree_preferences
                    .lock()
                    .unwrap_or_else(|poisoned| poisoned.into_inner());
                preferences.position_x = layout.position_x;
                preferences.position_y = layout.position_y;
                preferences.width = layout.width;
                preferences.height = layout.height;
                preferences.coordinate_mode = layout.coordinate_mode;
            }
            let _ = app.emit_to("dashboard", "tree-overlay-layout-changed", layout);
        }
        runtime.tree_editing.store(false, Ordering::SeqCst);
        let _ = window.set_resizable(false);
        let ignore_cursor = !runtime.detail_mode.load(Ordering::SeqCst);
        let _ = window.set_ignore_cursor_events(ignore_cursor);
    }
    let _ = app.emit_to("tree-overlay", "tree-overlay-edit-mode", false);
    sync_overlay_window(app);
    emit_overlay_runtime_status(app);
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
struct TreeOverlayLayout {
    position_x: i32,
    position_y: i32,
    width: f64,
    height: f64,
    coordinate_mode: CoordinateMode,
}

#[tauri::command]
pub fn start_tree_overlay_dragging(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("tree-overlay")
        .ok_or_else(|| "tree overlay window is unavailable".to_string())?
        .start_dragging()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn apply_overlay_preferences(
    preferences: OverlayPreferences,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let runtime = app.state::<OverlayRuntime>();
    {
        let mut native = runtime
            .preferences
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        native.position_x = preferences.position_x;
        native.position_y = preferences.position_y;
        native.width = preferences.width.max(260.0);
        native.height = preferences.height.max(140.0);
        native.coordinate_mode = preferences
            .coordinate_mode
            .unwrap_or(CoordinateMode::Screen);
        native.auto_hide_when_game_inactive = preferences.auto_hide_when_game_inactive;
    }
    attach_screen_position_to_game(&app);
    sync_overlay_window(&app);
    Ok(())
}

#[tauri::command]
pub fn reset_overlay_position(app: tauri::AppHandle) -> Result<(), String> {
    let runtime = app.state::<OverlayRuntime>();
    let position = {
        let status = runtime
            .poe_status
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .clone();
        let mut preferences = runtime
            .preferences
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        preferences.position_x = 24;
        preferences.position_y = 80;
        preferences.coordinate_mode = if status.client_rect.is_some() {
            CoordinateMode::Game
        } else {
            CoordinateMode::Screen
        };
        OverlayPosition {
            position_x: preferences.position_x,
            position_y: preferences.position_y,
            coordinate_mode: preferences.coordinate_mode,
        }
    };
    app.emit_to("dashboard", "overlay-position-changed", position)
        .map_err(|error| error.to_string())?;
    sync_overlay_window(&app);
    Ok(())
}

#[tauri::command]
pub fn start_overlay_dragging(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("overlay")
        .ok_or_else(|| "overlay window is unavailable".to_string())?
        .start_dragging()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn begin_overlay_edit_mode(app: tauri::AppHandle) -> Result<(), String> {
    start_edit_mode(&app)
}

#[tauri::command]
pub fn toggle_overlay_edit_mode(include_tree: bool, app: tauri::AppHandle) -> Result<(), String> {
    let runtime = app.state::<OverlayRuntime>();
    if runtime.editing.load(Ordering::SeqCst) || runtime.tree_editing.load(Ordering::SeqCst) {
        finish_all_editing(&app);
        Ok(())
    } else {
        start_edit_mode(&app)?;
        if include_tree {
            runtime
                .tree_visible_before_edit
                .store(runtime.tree_mode.load(Ordering::SeqCst), Ordering::SeqCst);
            if let Err(error) = start_tree_edit_mode(&app) {
                finish_edit_mode(&app);
                return Err(error);
            }
        }
        Ok(())
    }
}

fn start_edit_mode(app: &tauri::AppHandle) -> Result<(), String> {
    let runtime = app.state::<OverlayRuntime>();
    let window = app
        .get_webview_window("overlay")
        .ok_or_else(|| "overlay window is unavailable".to_string())?;

    runtime.desired_visible.store(true, Ordering::SeqCst);
    runtime.editing.store(true, Ordering::SeqCst);
    window
        .set_resizable(true)
        .map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())?;
    window
        .set_ignore_cursor_events(false)
        .map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    app.emit_to("overlay", "overlay-edit-mode", true)
        .map_err(|error| error.to_string())?;
    emit_overlay_runtime_status(app);

    Ok(())
}

#[tauri::command]
pub fn end_overlay_edit_mode(app: tauri::AppHandle) -> Result<(), String> {
    finish_all_editing(&app);
    Ok(())
}

fn finish_all_editing(app: &tauri::AppHandle) {
    let runtime = app.state::<OverlayRuntime>();
    if runtime.tree_editing.load(Ordering::SeqCst) {
        runtime.tree_mode.store(
            runtime.tree_visible_before_edit.load(Ordering::SeqCst),
            Ordering::SeqCst,
        );
        finish_tree_edit_mode(app);
    }
    if runtime.editing.load(Ordering::SeqCst) {
        finish_edit_mode(app);
    }
}

fn finish_edit_mode(app: &tauri::AppHandle) {
    let runtime = app.state::<OverlayRuntime>();
    if let Some(position) = capture_position(app) {
        {
            let mut preferences = runtime
                .preferences
                .lock()
                .unwrap_or_else(|poisoned| poisoned.into_inner());
            preferences.position_x = position.position_x;
            preferences.position_y = position.position_y;
            preferences.coordinate_mode = position.coordinate_mode;
        }
        let _ = app.emit_to("dashboard", "overlay-position-changed", position);
    }
    if let Some(window) = app.get_webview_window("overlay") {
        if let Ok(size) = window.inner_size() {
            let scale = window.scale_factor().unwrap_or(1.0);
            let overlay_size = OverlaySize {
                width: size.width as f64 / scale,
                height: size.height as f64 / scale,
            };
            {
                let mut preferences = runtime
                    .preferences
                    .lock()
                    .unwrap_or_else(|poisoned| poisoned.into_inner());
                preferences.width = overlay_size.width;
                preferences.height = overlay_size.height;
            }
            let _ = app.emit_to("dashboard", "overlay-size-changed", overlay_size);
        }
    }
    runtime.editing.store(false, Ordering::SeqCst);
    if let Some(window) = app.get_webview_window("overlay") {
        let _ = window.set_resizable(false);
        let ignore_cursor = !runtime.detail_mode.load(Ordering::SeqCst);
        let _ = window.set_ignore_cursor_events(ignore_cursor);
    }
    let _ = app.emit_to("overlay", "overlay-edit-mode", false);
    sync_overlay_window(app);
    emit_overlay_runtime_status(app);
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
struct OverlaySize {
    width: f64,
    height: f64,
}

fn set_overlay_visibility(app: &tauri::AppHandle, visible: bool) {
    let runtime = app.state::<OverlayRuntime>();
    runtime.desired_visible.store(visible, Ordering::SeqCst);
    if !visible && runtime.editing.load(Ordering::SeqCst) {
        finish_edit_mode(app);
    } else {
        sync_overlay_window(app);
        emit_overlay_runtime_status(app);
    }
}

fn overlay_runtime_status(app: &tauri::AppHandle) -> OverlayRuntimeStatus {
    let runtime = app.state::<OverlayRuntime>();
    OverlayRuntimeStatus {
        visible: runtime.desired_visible.load(Ordering::SeqCst),
        editing: runtime.editing.load(Ordering::SeqCst),
        tree_mode: runtime.tree_mode.load(Ordering::SeqCst),
    }
}

fn emit_overlay_runtime_status(app: &tauri::AppHandle) {
    let _ = app.emit_to(
        "dashboard",
        "overlay-runtime-status",
        overlay_runtime_status(app),
    );
}

fn capture_position(app: &tauri::AppHandle) -> Option<OverlayPosition> {
    let window = app.get_webview_window("overlay")?;
    let position = window.outer_position().ok()?;
    let status = app
        .state::<OverlayRuntime>()
        .poe_status
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .clone();

    if let Some(client) = status.client_rect {
        return Some(OverlayPosition {
            position_x: position.x - client.x,
            position_y: position.y - client.y,
            coordinate_mode: CoordinateMode::Game,
        });
    }

    Some(OverlayPosition {
        position_x: position.x,
        position_y: position.y,
        coordinate_mode: CoordinateMode::Screen,
    })
}

fn start_poe_window_watcher(app: tauri::AppHandle) {
    thread::spawn(move || loop {
        let status = crate::poe_window::inspect();
        let changed = {
            let runtime = app.state::<OverlayRuntime>();
            let mut current = runtime
                .poe_status
                .lock()
                .unwrap_or_else(|poisoned| poisoned.into_inner());
            if *current == status {
                false
            } else {
                *current = status.clone();
                true
            }
        };

        if changed {
            attach_screen_position_to_game(&app);
            sync_overlay_window(&app);
            let _ = app.emit_to("dashboard", "poe-window-status", status);
        }
        thread::sleep(POE_WINDOW_POLL_INTERVAL);
    });
}

fn attach_screen_position_to_game(app: &tauri::AppHandle) {
    let runtime = app.state::<OverlayRuntime>();
    let client = runtime
        .poe_status
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .client_rect;
    let Some(client) = client else {
        return;
    };

    let migrated_position = {
        let mut preferences = runtime
            .preferences
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if preferences.coordinate_mode != CoordinateMode::Screen {
            return;
        }
        preferences.position_x -= client.x;
        preferences.position_y -= client.y;
        preferences.coordinate_mode = CoordinateMode::Game;
        OverlayPosition {
            position_x: preferences.position_x,
            position_y: preferences.position_y,
            coordinate_mode: preferences.coordinate_mode,
        }
    };
    let _ = app.emit_to("dashboard", "overlay-position-changed", migrated_position);
}

fn sync_overlay_window(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("overlay") else {
        return;
    };
    let runtime = app.state::<OverlayRuntime>();
    let editing = runtime.editing.load(Ordering::SeqCst);
    let desired_visible = runtime.desired_visible.load(Ordering::SeqCst);
    let status = runtime
        .poe_status
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .clone();
    let preferences = *runtime
        .preferences
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());

    if !editing {
        let (x, y) = resolved_overlay_position(&preferences, &status);
        let (visible_x, visible_y) = visible_overlay_position(&window, x, y);
        let _ = window.set_position(Position::Physical(PhysicalPosition::new(
            visible_x, visible_y,
        )));
        if (visible_x, visible_y) != (x, y) {
            let recovered = OverlayPosition {
                position_x: visible_x,
                position_y: visible_y,
                coordinate_mode: CoordinateMode::Screen,
            };
            {
                let mut stored = runtime
                    .preferences
                    .lock()
                    .unwrap_or_else(|poisoned| poisoned.into_inner());
                stored.position_x = recovered.position_x;
                stored.position_y = recovered.position_y;
                stored.coordinate_mode = recovered.coordinate_mode;
            }
            let _ = app.emit_to("dashboard", "overlay-position-changed", recovered);
        }
    }
    if !editing {
        let _ = window.set_size(Size::Logical(LogicalSize::new(
            preferences.width,
            preferences.height,
        )));
    }

    if should_display_overlay(
        desired_visible,
        editing,
        preferences.auto_hide_when_game_inactive,
        status.state,
    ) {
        let _ = window.show();
    } else {
        let _ = window.hide();
    }

    sync_tree_overlay_window(app, &status);
}

fn sync_tree_overlay_window(app: &tauri::AppHandle, status: &PoeWindowStatus) {
    let Some(window) = app.get_webview_window("tree-overlay") else {
        return;
    };
    let runtime = app.state::<OverlayRuntime>();
    let editing = runtime.tree_editing.load(Ordering::SeqCst);
    let visible = runtime.tree_mode.load(Ordering::SeqCst);
    let preferences = *runtime
        .tree_preferences
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    if !editing {
        let native = NativeOverlayPreferences {
            position_x: preferences.position_x,
            position_y: preferences.position_y,
            width: preferences.width,
            height: preferences.height,
            coordinate_mode: preferences.coordinate_mode,
            auto_hide_when_game_inactive: preferences.auto_hide_when_game_inactive,
        };
        let (x, y) = resolved_overlay_position(&native, status);
        let _ = window.set_position(Position::Physical(PhysicalPosition::new(x, y)));
    }
    if !editing {
        let _ = window.set_size(Size::Logical(LogicalSize::new(
            preferences.width,
            preferences.height,
        )));
    }
    if should_display_overlay(
        visible,
        editing,
        preferences.auto_hide_when_game_inactive,
        status.state,
    ) {
        let _ = window.show();
    } else {
        let _ = window.hide();
    }
}

fn visible_overlay_position(window: &tauri::WebviewWindow, x: i32, y: i32) -> (i32, i32) {
    let size = window.outer_size().ok();
    let width = size.map_or(80, |value| value.width.max(80)) as i32;
    let height = size.map_or(40, |value| value.height.max(40)) as i32;
    let monitors = window.available_monitors().unwrap_or_default();
    let intersects = monitors.iter().any(|monitor| {
        let position = monitor.position();
        let monitor_size = monitor.size();
        let visible_width =
            (x + width).min(position.x + monitor_size.width as i32) - x.max(position.x);
        let visible_height =
            (y + height).min(position.y + monitor_size.height as i32) - y.max(position.y);
        visible_width >= 80.min(width) && visible_height >= 40.min(height)
    });
    if intersects {
        return (x, y);
    }

    window
        .primary_monitor()
        .ok()
        .flatten()
        .or_else(|| monitors.into_iter().next())
        .map(|monitor| {
            let position = monitor.position();
            (position.x + 24, position.y + 80)
        })
        .unwrap_or((24, 80))
}

fn resolved_overlay_position(
    preferences: &NativeOverlayPreferences,
    status: &PoeWindowStatus,
) -> (i32, i32) {
    match (preferences.coordinate_mode, status.client_rect) {
        (CoordinateMode::Game, Some(client)) => (
            client.x + preferences.position_x,
            client.y + preferences.position_y,
        ),
        _ => (preferences.position_x, preferences.position_y),
    }
}

fn should_display_overlay(
    desired_visible: bool,
    editing: bool,
    auto_hide_when_game_inactive: bool,
    poe_state: PoeWindowState,
) -> bool {
    editing
        || (desired_visible
            && !(auto_hide_when_game_inactive && poe_state == PoeWindowState::Background))
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::Ordering;

    use super::{
        resolved_overlay_position, should_display_overlay, CoordinateMode,
        NativeOverlayPreferences, OverlayRuntime,
    };
    use crate::poe_window::{ClientRect, PoeWindowState, PoeWindowStatus};

    #[test]
    fn resolves_game_relative_and_manual_fallback_positions() {
        let preferences = NativeOverlayPreferences {
            position_x: 24,
            position_y: 80,
            width: 420.0,
            height: 240.0,
            coordinate_mode: CoordinateMode::Game,
            auto_hide_when_game_inactive: true,
        };
        let attached = PoeWindowStatus {
            state: PoeWindowState::Foreground,
            process_name: Some("PathOfExile_x64.exe".to_string()),
            client_rect: Some(ClientRect {
                x: 300,
                y: 200,
                width: 1920,
                height: 1080,
            }),
        };

        assert_eq!(
            resolved_overlay_position(&preferences, &attached),
            (324, 280)
        );
        assert_eq!(
            resolved_overlay_position(&preferences, &PoeWindowStatus::default()),
            (24, 80)
        );
    }

    #[test]
    fn auto_hides_only_for_a_detected_background_game() {
        assert!(!should_display_overlay(
            true,
            false,
            true,
            PoeWindowState::Background
        ));
        assert!(should_display_overlay(
            true,
            false,
            true,
            PoeWindowState::NotFound
        ));
        assert!(should_display_overlay(
            true,
            true,
            true,
            PoeWindowState::Background
        ));
    }

    #[test]
    fn overlay_is_enabled_by_default() {
        let runtime = OverlayRuntime::default();
        assert!(runtime.desired_visible.load(Ordering::SeqCst));
        assert!(!runtime.editing.load(Ordering::SeqCst));
        assert!(!runtime.detail_mode.load(Ordering::SeqCst));
        assert!(!runtime.tree_mode.load(Ordering::SeqCst));
        assert!(!runtime.tree_editing.load(Ordering::SeqCst));
        assert!(!runtime.tree_visible_before_edit.load(Ordering::SeqCst));
    }
}

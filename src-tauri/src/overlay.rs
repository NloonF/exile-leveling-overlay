use std::{
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};

use serde::{Deserialize, Serialize};
use tauri::{Emitter, LogicalSize, Manager, PhysicalPosition, Position, Size, State};

use crate::poe_window::{PoeWindowState, PoeWindowStatus};

const EDIT_MODE_DURATION: Duration = Duration::from_secs(30);
const POE_WINDOW_POLL_INTERVAL: Duration = Duration::from_millis(250);

pub struct OverlayRuntime {
    edit_generation: Arc<AtomicU64>,
    editing: AtomicBool,
    desired_visible: AtomicBool,
    preferences: Mutex<NativeOverlayPreferences>,
    poe_status: Mutex<PoeWindowStatus>,
}

impl Default for OverlayRuntime {
    fn default() -> Self {
        Self {
            edit_generation: Arc::new(AtomicU64::new(0)),
            editing: AtomicBool::new(false),
            desired_visible: AtomicBool::new(false),
            preferences: Mutex::new(NativeOverlayPreferences::default()),
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

struct NativeOverlayPreferences {
    position_x: i32,
    position_y: i32,
    coordinate_mode: CoordinateMode,
    auto_hide_when_game_inactive: bool,
}

impl Default for NativeOverlayPreferences {
    fn default() -> Self {
        Self {
            position_x: 24,
            position_y: 80,
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

pub fn initialise(app: &tauri::AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("overlay") {
        window.set_ignore_cursor_events(true)?;
    }
    start_poe_window_watcher(app.clone());
    Ok(())
}

pub fn toggle(app: &tauri::AppHandle) {
    let runtime = app.state::<OverlayRuntime>();
    let desired = !runtime.desired_visible.load(Ordering::SeqCst);
    runtime.desired_visible.store(desired, Ordering::SeqCst);
    sync_overlay_window(app);
}

#[tauri::command]
pub fn toggle_overlay(app: tauri::AppHandle) {
    toggle(&app);
}

#[tauri::command]
pub fn show_overlay(app: tauri::AppHandle) -> Result<(), String> {
    app.state::<OverlayRuntime>()
        .desired_visible
        .store(true, Ordering::SeqCst);
    sync_overlay_window(&app);
    Ok(())
}

#[tauri::command]
pub fn hide_overlay(app: tauri::AppHandle) -> Result<(), String> {
    app.state::<OverlayRuntime>()
        .desired_visible
        .store(false, Ordering::SeqCst);
    sync_overlay_window(&app);
    Ok(())
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
    app.emit_to("overlay", "overlay-detail-mode", enabled)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn resize_overlay_to_content(
    width: f64,
    height: f64,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let window = app
        .get_webview_window("overlay")
        .ok_or_else(|| "overlay window is unavailable".to_string())?;
    let scale_factor = window.scale_factor().unwrap_or(1.0);
    let maximum_size = window
        .current_monitor()
        .ok()
        .flatten()
        .map(|monitor| {
            (
                monitor.size().width as f64 / scale_factor * 0.95,
                monitor.size().height as f64 / scale_factor * 0.95,
            )
        })
        .unwrap_or((width, height));

    window
        .set_size(Size::Logical(LogicalSize::new(
            width.max(80.0).min(maximum_size.0),
            height.max(80.0).min(maximum_size.1),
        )))
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
pub fn start_overlay_dragging(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("overlay")
        .ok_or_else(|| "overlay window is unavailable".to_string())?
        .start_dragging()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn begin_overlay_edit_mode(
    runtime: State<'_, OverlayRuntime>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let window = app
        .get_webview_window("overlay")
        .ok_or_else(|| "overlay window is unavailable".to_string())?;
    let generation = runtime.edit_generation.fetch_add(1, Ordering::SeqCst) + 1;
    let generation_counter = Arc::clone(&runtime.edit_generation);
    let app_for_timeout = app.clone();

    runtime.desired_visible.store(true, Ordering::SeqCst);
    runtime.editing.store(true, Ordering::SeqCst);
    window.show().map_err(|error| error.to_string())?;
    window
        .set_ignore_cursor_events(false)
        .map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    app.emit_to("overlay", "overlay-edit-mode", true)
        .map_err(|error| error.to_string())?;

    thread::spawn(move || {
        thread::sleep(EDIT_MODE_DURATION);
        if generation_counter.load(Ordering::SeqCst) == generation {
            finish_edit_mode(&app_for_timeout);
        }
    });

    Ok(())
}

#[tauri::command]
pub fn end_overlay_edit_mode(
    runtime: State<'_, OverlayRuntime>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    runtime.edit_generation.fetch_add(1, Ordering::SeqCst);
    finish_edit_mode(&app);
    Ok(())
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
    runtime.editing.store(false, Ordering::SeqCst);
    if let Some(window) = app.get_webview_window("overlay") {
        let _ = window.set_ignore_cursor_events(true);
    }
    let _ = app.emit_to("overlay", "overlay-edit-mode", false);
    sync_overlay_window(app);
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
    let preferences = runtime
        .preferences
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());

    if !editing {
        let (x, y) = resolved_overlay_position(&preferences, &status);
        let _ = window.set_position(Position::Physical(PhysicalPosition::new(x, y)));
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
    use super::{
        resolved_overlay_position, should_display_overlay, CoordinateMode, NativeOverlayPreferences,
    };
    use crate::poe_window::{ClientRect, PoeWindowState, PoeWindowStatus};

    #[test]
    fn resolves_game_relative_and_manual_fallback_positions() {
        let preferences = NativeOverlayPreferences {
            position_x: 24,
            position_y: 80,
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
}

mod overlay;
#[cfg(windows)]
mod poe_window;
mod snapshot;
mod tray;

use tauri::{Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(overlay::OverlayRuntime::default())
        .manage(snapshot::SnapshotCache::default())
        .invoke_handler(tauri::generate_handler![
            snapshot::publish_overlay_snapshot,
            snapshot::get_overlay_snapshot,
            overlay::toggle_overlay,
            overlay::show_overlay,
            overlay::hide_overlay,
            overlay::set_overlay_detail_mode,
            overlay::resize_overlay_to_content,
            overlay::get_poe_window_status,
            overlay::apply_overlay_preferences,
            overlay::start_overlay_dragging,
            overlay::begin_overlay_edit_mode,
            overlay::end_overlay_edit_mode
        ])
        .setup(|app| {
            tray::create(app)?;
            overlay::initialise(app.handle())?;

            let dashboard = app
                .get_webview_window("dashboard")
                .expect("dashboard window must exist");
            let app_to_exit = app.handle().clone();
            dashboard.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { .. } = event {
                    app_to_exit.exit(0);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Exile Leveling Overlay");
}

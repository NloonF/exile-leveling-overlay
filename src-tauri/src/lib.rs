mod importer;
#[cfg(windows)]
mod log_api;
mod overlay;
#[cfg(windows)]
mod poe_window;
mod snapshot;
mod tray;

#[cfg(windows)]
use std::sync::Arc;
use tauri::{Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(windows)]
    let log_reader = Arc::new(log_api::LogReaderRuntime::default());

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(overlay::OverlayRuntime::default())
        .manage(snapshot::SnapshotCache::default())
        .manage(log_reader.clone())
        .invoke_handler(tauri::generate_handler![
            importer::fetch_import_url,
            snapshot::publish_overlay_snapshot,
            snapshot::get_overlay_snapshot,
            snapshot::request_overlay_step_completion,
            overlay::toggle_overlay,
            overlay::show_overlay,
            overlay::hide_overlay,
            overlay::get_overlay_runtime_status,
            overlay::set_overlay_detail_mode,
            overlay::toggle_overlay_tree_mode,
            overlay::apply_tree_overlay_preferences,
            overlay::start_tree_overlay_dragging,
            overlay::get_poe_window_status,
            overlay::apply_overlay_preferences,
            overlay::start_overlay_dragging,
            overlay::begin_overlay_edit_mode,
            overlay::toggle_overlay_edit_mode,
            overlay::end_overlay_edit_mode,
            overlay::reset_overlay_position,
            log_api::set_log_reader_enabled,
            log_api::set_manual_log_path,
            log_api::get_log_reader_status
        ])
        .setup(|app| {
            tray::create(app)?;
            overlay::initialise(app.handle())?;
            #[cfg(windows)]
            log_api::start(app.handle().clone(), log_reader);

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

use std::sync::Mutex;

use serde_json::{json, Value};
use tauri::{Emitter, State};

#[derive(Default)]
pub struct SnapshotCache(Mutex<Option<Value>>);

impl SnapshotCache {
    fn publish(&self, snapshot: Value) -> Result<(), String> {
        let mut cached = self
            .0
            .lock()
            .map_err(|_| "overlay snapshot cache is unavailable".to_string())?;
        *cached = Some(snapshot);
        Ok(())
    }

    fn latest(&self) -> Result<Option<Value>, String> {
        self.0
            .lock()
            .map_err(|_| "overlay snapshot cache is unavailable".to_string())
            .map(|cached| cached.clone())
    }
}

#[tauri::command]
pub fn publish_overlay_snapshot(
    snapshot: Value,
    cache: State<'_, SnapshotCache>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    cache.publish(snapshot.clone())?;
    app.emit_to("overlay", "overlay-snapshot", snapshot.clone())
        .map_err(|error| error.to_string())?;
    app.emit_to("tree-overlay", "overlay-snapshot", snapshot)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_overlay_snapshot(cache: State<'_, SnapshotCache>) -> Result<Option<Value>, String> {
    cache.latest()
}

#[tauri::command]
pub fn request_overlay_step_completion(
    edge_index: usize,
    app: tauri::AppHandle,
) -> Result<(), String> {
    app.emit_to(
        "dashboard",
        "overlay-step-completion-requested",
        json!({ "edgeIndex": edge_index }),
    )
    .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn returns_the_latest_published_snapshot() {
        let cache = SnapshotCache::default();
        assert_eq!(cache.latest().unwrap(), None);

        let first = json!({ "version": 1, "status": "active" });
        let second = json!({ "version": 1, "status": "paused" });
        cache.publish(first).unwrap();
        cache.publish(second.clone()).unwrap();

        assert_eq!(cache.latest().unwrap(), Some(second));
    }
}

// The log tailing implementation is adapted from exile-log-api:
// https://github.com/HeartofPhos/exile-log-api
// Its MIT license is bundled at licenses/exile-log-api-MIT.txt.

use std::{
    fs::File,
    io::{self, Read, Seek, SeekFrom},
    os::windows::fs::MetadataExt,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};

use serde::Serialize;
use tauri::Emitter;

use crate::poe_window;

const AREA_MARKER: &str = "Generating level ";
const POLL_INTERVAL: Duration = Duration::from_secs(1);

pub struct LogReaderRuntime {
    enabled: AtomicBool,
    manual_path: Mutex<Option<PathBuf>>,
    status: Mutex<LogReaderStatus>,
}

impl Default for LogReaderRuntime {
    fn default() -> Self {
        Self {
            enabled: AtomicBool::new(false),
            manual_path: Mutex::new(None),
            status: Mutex::new(LogReaderStatus::disabled()),
        }
    }
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AreaEnteredEvent {
    area_id: String,
    area_level: u32,
}

#[derive(Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LogReaderStatus {
    state: LogReaderState,
    message: Option<String>,
    log_path: Option<String>,
    using_manual_path: bool,
}

#[derive(Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
enum LogReaderState {
    Disabled,
    Searching,
    Following,
    Error,
}

impl LogReaderStatus {
    fn disabled() -> Self {
        Self {
            state: LogReaderState::Disabled,
            message: None,
            log_path: None,
            using_manual_path: false,
        }
    }
}

pub fn start(app: tauri::AppHandle, runtime: Arc<LogReaderRuntime>) {
    tauri::async_runtime::spawn(publish_area_events(app, runtime));
}

#[tauri::command]
pub fn set_log_reader_enabled(
    enabled: bool,
    runtime: tauri::State<'_, Arc<LogReaderRuntime>>,
    app: tauri::AppHandle,
) {
    runtime.enabled.store(enabled, Ordering::SeqCst);
    if !enabled {
        update_status(&app, &runtime, LogReaderStatus::disabled());
    }
}

#[tauri::command]
pub fn set_manual_log_path(
    path: Option<String>,
    runtime: tauri::State<'_, Arc<LogReaderRuntime>>,
) -> Result<(), String> {
    let path = path
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .map(PathBuf::from);

    if let Some(candidate) = path.as_ref() {
        if poe_window::looks_like_poe2_path(candidate) {
            return Err("Path of Exile 2 logs are not supported.".to_string());
        }
        if candidate.file_name().and_then(|name| name.to_str()) != Some("LatestClient.txt") {
            return Err("Select Path of Exile's LatestClient.txt file.".to_string());
        }
        File::open(candidate)
            .map_err(|error| format!("LatestClient.txt cannot be opened: {error}"))?;
    }

    *runtime
        .manual_path
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner()) = path;
    Ok(())
}

#[tauri::command]
pub fn get_log_reader_status(runtime: tauri::State<'_, Arc<LogReaderRuntime>>) -> LogReaderStatus {
    runtime
        .status
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .clone()
}

async fn publish_area_events(app: tauri::AppHandle, runtime: Arc<LogReaderRuntime>) {
    let mut reader: Option<LogTail> = None;

    loop {
        if !runtime.enabled.load(Ordering::SeqCst) {
            reader = None;
            tokio::time::sleep(POLL_INTERVAL).await;
            continue;
        }

        let manual_path = runtime
            .manual_path
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .clone();
        let using_manual_path = manual_path.is_some();
        let detected_path = manual_path.or_else(poe_window::find_client_log_path);

        if reader.as_ref().map(LogTail::path) != detected_path.as_deref() {
            reader = match detected_path {
                Some(path) => match LogTail::attach(path.clone()) {
                    Ok(tail) => {
                        update_status(
                            &app,
                            &runtime,
                            LogReaderStatus {
                                state: LogReaderState::Following,
                                message: None,
                                log_path: Some(path.to_string_lossy().into_owned()),
                                using_manual_path,
                            },
                        );
                        Some(tail)
                    }
                    Err(error) => {
                        update_status(
                            &app,
                            &runtime,
                            LogReaderStatus {
                                state: LogReaderState::Error,
                                message: Some(format!(
                                    "LatestClient.txt cannot be opened: {error}"
                                )),
                                log_path: Some(path.to_string_lossy().into_owned()),
                                using_manual_path,
                            },
                        );
                        None
                    }
                },
                None => {
                    update_status(
                        &app,
                        &runtime,
                        LogReaderStatus {
                            state: LogReaderState::Searching,
                            message: None,
                            log_path: None,
                            using_manual_path: false,
                        },
                    );
                    None
                }
            };
        } else if let Some(active_reader) = reader.as_mut() {
            match active_reader.read_new_lines() {
                Ok(lines) => {
                    for event in lines.iter().filter_map(|line| parse_area_event(line)) {
                        let _ = app.emit_to("dashboard", "poe-area-entered", event);
                    }
                }
                Err(error) => {
                    update_status(
                        &app,
                        &runtime,
                        LogReaderStatus {
                            state: LogReaderState::Error,
                            message: Some(format!(
                                "Reading LatestClient.txt failed; retrying: {error}"
                            )),
                            log_path: Some(active_reader.path().to_string_lossy().into_owned()),
                            using_manual_path,
                        },
                    );
                    reader = None;
                }
            }
        }

        tokio::time::sleep(POLL_INTERVAL).await;
    }
}

fn update_status(app: &tauri::AppHandle, runtime: &LogReaderRuntime, next: LogReaderStatus) {
    let changed = {
        let mut status = runtime
            .status
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if *status == next {
            false
        } else {
            *status = next.clone();
            true
        }
    };
    if changed {
        let _ = app.emit_to("dashboard", "log-reader-status", next);
    }
}

struct LogTail {
    path: PathBuf,
    byte_offset: u64,
    creation_time: u64,
    prefix: Vec<u8>,
}

impl LogTail {
    fn attach(path: PathBuf) -> io::Result<Self> {
        let mut file = File::open(&path)?;
        let metadata = file.metadata()?;
        let prefix = read_prefix(&mut file)?;
        Ok(Self {
            path,
            byte_offset: metadata.len(),
            creation_time: metadata.creation_time(),
            prefix,
        })
    }

    fn path(&self) -> &Path {
        &self.path
    }

    fn read_new_lines(&mut self) -> io::Result<Vec<String>> {
        let mut file = File::open(&self.path)?;
        let metadata = file.metadata()?;
        let prefix = read_prefix(&mut file)?;
        if metadata.creation_time() != self.creation_time || !prefix.starts_with(&self.prefix) {
            self.creation_time = metadata.creation_time();
            self.byte_offset = 0;
        } else if metadata.len() < self.byte_offset {
            self.byte_offset = 0;
        }
        self.prefix = prefix;

        file.seek(SeekFrom::Start(self.byte_offset))?;
        let mut bytes = Vec::new();
        file.read_to_end(&mut bytes)?;

        let complete_length = bytes
            .iter()
            .rposition(|byte| *byte == b'\n')
            .map_or(0, |position| position + 1);
        if complete_length == 0 {
            return Ok(Vec::new());
        }

        self.byte_offset += complete_length as u64;
        Ok(bytes[..complete_length]
            .split(|byte| *byte == b'\n')
            .filter(|line| !line.is_empty())
            .map(|line| {
                let line = line.strip_suffix(b"\r").unwrap_or(line);
                String::from_utf8_lossy(line).into_owned()
            })
            .collect())
    }
}

fn read_prefix(file: &mut File) -> io::Result<Vec<u8>> {
    const PREFIX_LENGTH: u64 = 256;
    let mut prefix = Vec::new();
    file.take(PREFIX_LENGTH).read_to_end(&mut prefix)?;
    Ok(prefix)
}

fn parse_area_event(line: &str) -> Option<AreaEnteredEvent> {
    let marker = line.find(AREA_MARKER)?;
    let suffix = &line[marker + AREA_MARKER.len()..];
    let (level, area) = suffix.split_once(" area ")?;
    let area_level = level.parse().ok()?;
    let start = area.find('"')? + 1;
    let end = area[start..].find('"')? + start;
    let area_id = &area[start..end];
    if area_id.is_empty() {
        return None;
    }
    Some(AreaEnteredEvent {
        area_id: area_id.to_string(),
        area_level,
    })
}

#[cfg(test)]
mod tests {
    use std::{
        fs::{self, OpenOptions},
        io::Write,
        time::{SystemTime, UNIX_EPOCH},
    };

    use super::{parse_area_event, AreaEnteredEvent, LogTail};

    #[test]
    fn parses_generated_area_lines_only() {
        let valid = "2026/07/24 [INFO Client] Generating level 2 area \"1_1_2\" with seed 42";
        assert_eq!(
            parse_area_event(valid),
            Some(AreaEnteredEvent {
                area_id: "1_1_2".to_string(),
                area_level: 2,
            })
        );
        assert!(parse_area_event("You have entered The Coast.").is_none());
        assert!(parse_area_event("Generating level two area \"1_1_2\"").is_none());
    }

    #[test]
    fn tails_complete_lines_and_recovers_after_fast_truncation() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should follow the Unix epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "exile-leveling-overlay-{}-{unique}.log",
            std::process::id()
        ));
        fs::write(&path, b"existing session\n").expect("test log should be created");
        let mut tail = LogTail::attach(path.clone()).expect("tail should attach");

        let mut append = OpenOptions::new()
            .append(true)
            .open(&path)
            .expect("test log should open for append");
        append
            .write_all(b"Generating level 2 area \"1_1_2\"")
            .expect("partial event should append");
        append.flush().expect("partial event should flush");
        assert!(tail
            .read_new_lines()
            .expect("partial read should succeed")
            .is_empty());
        append
            .write_all(b" with seed 42\n")
            .expect("event suffix should append");
        append.flush().expect("complete event should flush");
        assert_eq!(
            tail.read_new_lines()
                .expect("complete read should succeed")
                .len(),
            1
        );
        drop(append);

        fs::write(&path, b"Generating level 3 area \"1_1_3\" with seed 84\n")
            .expect("test log should truncate and regrow");
        assert_eq!(
            tail.read_new_lines()
                .expect("truncated read should succeed")
                .len(),
            1
        );

        fs::remove_file(path).expect("test log should be removed");
    }
}

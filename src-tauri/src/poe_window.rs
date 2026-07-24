use std::{
    ffi::OsString,
    os::windows::ffi::OsStringExt,
    path::{Path, PathBuf},
};

use serde::Serialize;
use windows_sys::Win32::{
    Foundation::{CloseHandle, BOOL, HWND, LPARAM, POINT, RECT},
    Graphics::Gdi::ClientToScreen,
    System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
    },
    UI::WindowsAndMessaging::{
        EnumWindows, GetClientRect, GetForegroundWindow, GetWindowThreadProcessId, IsWindowVisible,
    },
};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PoeWindowState {
    NotFound,
    Background,
    Foreground,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PoeWindowStatus {
    pub state: PoeWindowState,
    pub process_name: Option<String>,
    pub client_rect: Option<ClientRect>,
}

impl Default for PoeWindowStatus {
    fn default() -> Self {
        Self {
            state: PoeWindowState::NotFound,
            process_name: None,
            client_rect: None,
        }
    }
}

struct WindowSearch {
    foreground: HWND,
    result: Option<PoeWindowStatus>,
}

pub fn inspect() -> PoeWindowStatus {
    let mut search = WindowSearch {
        foreground: unsafe { GetForegroundWindow() },
        result: None,
    };
    unsafe {
        EnumWindows(
            Some(enum_window),
            (&mut search as *mut WindowSearch).cast::<core::ffi::c_void>() as LPARAM,
        );
    }
    search.result.unwrap_or_default()
}

pub fn find_client_log_path() -> Option<PathBuf> {
    let mut result = None;
    unsafe {
        EnumWindows(
            Some(find_client_log),
            (&mut result as *mut Option<PathBuf>).cast::<core::ffi::c_void>() as LPARAM,
        );
    }
    result
}

unsafe extern "system" fn enum_window(window: HWND, parameter: LPARAM) -> BOOL {
    let search = &mut *(parameter as *mut WindowSearch);
    if IsWindowVisible(window) == 0 {
        return 1;
    }

    let mut process_id = 0;
    GetWindowThreadProcessId(window, &mut process_id);
    let Some(process_path) = process_path(process_id) else {
        return 1;
    };
    if !is_supported_poe1_path(&process_path) {
        return 1;
    }
    let Some(process_name) = process_path
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
    else {
        return 1;
    };

    let mut rectangle = RECT {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };
    if GetClientRect(window, &mut rectangle) == 0 {
        return 1;
    }
    let mut origin = POINT { x: 0, y: 0 };
    if ClientToScreen(window, &mut origin) == 0 {
        return 1;
    }
    let width = rectangle.right - rectangle.left;
    let height = rectangle.bottom - rectangle.top;
    if width <= 0 || height <= 0 {
        return 1;
    }

    search.result = Some(PoeWindowStatus {
        state: if window == search.foreground {
            PoeWindowState::Foreground
        } else {
            PoeWindowState::Background
        },
        process_name: Some(process_name),
        client_rect: Some(ClientRect {
            x: origin.x,
            y: origin.y,
            width,
            height,
        }),
    });
    0
}

unsafe extern "system" fn find_client_log(window: HWND, parameter: LPARAM) -> BOOL {
    let result = &mut *(parameter as *mut Option<PathBuf>);
    let mut process_id = 0;
    GetWindowThreadProcessId(window, &mut process_id);
    let Some(process_path) = process_path(process_id) else {
        return 1;
    };
    if !is_supported_poe1_path(&process_path) {
        return 1;
    }

    *result = process_path
        .parent()
        .map(|directory| directory.join("logs").join("LatestClient.txt"));
    0
}

unsafe fn process_path(process_id: u32) -> Option<PathBuf> {
    let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, process_id);
    if process.is_null() {
        return None;
    }

    let mut buffer = vec![0_u16; 32_768];
    let mut length = buffer.len() as u32;
    let succeeded = QueryFullProcessImageNameW(process, 0, buffer.as_mut_ptr(), &mut length);
    CloseHandle(process);
    if succeeded == 0 {
        return None;
    }

    let path = OsString::from_wide(&buffer[..length as usize]);
    Some(Path::new(&path).to_path_buf())
}

fn is_poe_executable(process_name: &str) -> bool {
    matches!(
        process_name.to_ascii_lowercase().as_str(),
        "pathofexile.exe"
            | "pathofexile_x64.exe"
            | "pathofexilesteam.exe"
            | "pathofexile_x64steam.exe"
            | "pathofexileegs.exe"
            | "pathofexile_x64egs.exe"
    )
}

fn is_supported_poe1_path(process_path: &Path) -> bool {
    let Some(process_name) = process_path.file_name().and_then(|name| name.to_str()) else {
        return false;
    };
    is_poe_executable(process_name) && !looks_like_poe2_path(process_path)
}

pub fn looks_like_poe2_path(path: &Path) -> bool {
    path.components().any(|component| {
        let normalized = component
            .as_os_str()
            .to_string_lossy()
            .to_ascii_lowercase()
            .replace([' ', '-', '_'], "");
        normalized == "poe2" || normalized.contains("pathofexile2")
    })
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::{is_poe_executable, is_supported_poe1_path};

    #[test]
    fn recognises_known_poe_executable_variants() {
        assert!(is_poe_executable("PathOfExile.exe"));
        assert!(is_poe_executable("PathOfExile_x64.exe"));
        assert!(is_poe_executable("PathOfExileSteam.exe"));
        assert!(is_poe_executable("PathOfExile_x64Steam.exe"));
        assert!(is_poe_executable("PathOfExileEGS.exe"));
        assert!(!is_poe_executable("PathOfExile2.exe"));
        assert!(!is_poe_executable("PathOfExile2Steam.exe"));
        assert!(!is_poe_executable("PathOfExileTotallyReal.exe"));
        assert!(!is_poe_executable("Path of Building.exe"));
        assert!(!is_poe_executable("notepad.exe"));
    }

    #[test]
    fn rejects_poe2_installations_even_when_the_executable_name_is_shared() {
        assert!(is_supported_poe1_path(Path::new(
            r"C:\Games\Path of Exile\PathOfExileSteam.exe"
        )));
        assert!(!is_supported_poe1_path(Path::new(
            r"C:\Games\Path of Exile 2\PathOfExileSteam.exe"
        )));
        assert!(!is_supported_poe1_path(Path::new(
            r"D:\poe2\PathOfExile_x64Steam.exe"
        )));
    }
}

use std::{ffi::OsString, os::windows::ffi::OsStringExt, path::Path};

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

unsafe extern "system" fn enum_window(window: HWND, parameter: LPARAM) -> BOOL {
    let search = &mut *(parameter as *mut WindowSearch);
    if IsWindowVisible(window) == 0 {
        return 1;
    }

    let mut process_id = 0;
    GetWindowThreadProcessId(window, &mut process_id);
    let Some(process_name) = process_name(process_id) else {
        return 1;
    };
    if !is_poe_executable(&process_name) {
        return 1;
    }

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

unsafe fn process_name(process_id: u32) -> Option<String> {
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
    Path::new(&path)
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
}

fn is_poe_executable(process_name: &str) -> bool {
    let process_name = process_name.to_ascii_lowercase();
    process_name.starts_with("pathofexile") && process_name.ends_with(".exe")
}

#[cfg(test)]
mod tests {
    use super::is_poe_executable;

    #[test]
    fn recognises_known_poe_executable_variants() {
        assert!(is_poe_executable("PathOfExile.exe"));
        assert!(is_poe_executable("PathOfExile_x64.exe"));
        assert!(is_poe_executable("PathOfExileSteam.exe"));
        assert!(is_poe_executable("PathOfExile_x64Steam.exe"));
        assert!(!is_poe_executable("Path of Building.exe"));
        assert!(!is_poe_executable("notepad.exe"));
    }
}

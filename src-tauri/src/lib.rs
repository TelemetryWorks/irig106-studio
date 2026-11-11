//! IRIG106-Studio — Tauri Backend
//!
//! This file defines the `#[tauri::command]` functions that the frontend
//! calls via `invoke()`. Each command maps 1:1 to a method on the
//! `PlatformAdapter` interface in TypeScript.
//!
//! The commands now call real `irig106-studio-core` functions. A
//! `Mutex<Option<Ch10File>>` holds the currently open file in app state.
//!
//! Requirements traced:
//!   L2-PLAT-050  TauriAdapter SHALL map 1:1 to #[tauri::command] functions
//!   L2-FILE-030  Tauri backend SHALL use tauri-plugin-dialog for open dialog

use irig106_studio_core::file::Ch10File;
use irig106_studio_core::summary::Ch10Summary;
use irig106_studio_core::types::PacketHeader;
use serde::Serialize;
use std::path::Path;
use std::sync::Mutex;
use tauri::State;

// ─── App State ───

/// Holds the currently open Ch10 file, shared across commands.
struct AppState {
    file: Mutex<Option<Ch10File>>,
}

// ─── Serializable types for the frontend ───
// These wrap irig106-studio-core types with serde for JSON transport.

#[derive(Debug, Serialize)]
struct PacketHeaderDto {
    sync_pattern: u16,
    channel_id: u16,
    packet_length: u32,
    data_length: u32,
    data_type_version: u8,
    sequence_number: u8,
    data_type: u8,
    rtc: u64,
    checksum_valid: bool,
    file_offset: u64,
}

impl From<&PacketHeader> for PacketHeaderDto {
    fn from(h: &PacketHeader) -> Self {
        Self {
            sync_pattern: h.sync_pattern,
            channel_id: h.channel_id,
            packet_length: h.packet_length,
            data_length: h.data_length,
            data_type_version: h.data_type_version,
            sequence_number: h.sequence_number,
            data_type: h.data_type,
            rtc: h.rtc,
            checksum_valid: h.checksum_valid,
            file_offset: h.file_offset,
        }
    }
}

// ─── Tauri Commands ───

/// Open a Ch10 file from a filesystem path.
///
/// If `path` is None, a file dialog is shown (requires tauri-plugin-dialog).
/// Returns the Ch10Summary for the frontend to populate all panels.
#[tauri::command]
fn open_ch10_file(path: String, state: State<'_, AppState>) -> Result<Ch10Summary, String> {
    let file =
        Ch10File::open(Path::new(&path)).map_err(|e| format!("Failed to open file: {}", e))?;

    let summary = file
        .summary()
        .map_err(|e| format!("Failed to build summary: {}", e))?;

    // Store the file in app state
    let mut guard = state.file.lock().map_err(|e| e.to_string())?;
    *guard = Some(file);

    Ok(summary)
}

/// Read a batch of packet headers for virtual scrolling.
///
/// Returns up to `count` headers starting at `start_index`.
#[tauri::command]
fn read_packet_headers(
    start_index: u64,
    count: u32,
    state: State<'_, AppState>,
) -> Result<Vec<PacketHeaderDto>, String> {
    let guard = state.file.lock().map_err(|e| e.to_string())?;
    let file = guard.as_ref().ok_or("No file open")?;

    let total = file.index().len();
    let start = start_index as usize;
    let end = (start + count as usize).min(total);

    let mut headers = Vec::with_capacity(end - start);
    for i in start..end {
        let h = file
            .read_header(i)
            .map_err(|e| format!("Failed to read header {}: {}", i, e))?;
        headers.push(PacketHeaderDto::from(&h));
    }

    Ok(headers)
}

/// Read raw bytes from a packet's data payload.
///
/// Returns the raw bytes for the hex view.
#[tauri::command]
fn read_packet_data(
    file_offset: u64,
    length: u32,
    state: State<'_, AppState>,
) -> Result<Vec<u8>, String> {
    let guard = state.file.lock().map_err(|e| e.to_string())?;
    let file = guard.as_ref().ok_or("No file open")?;

    let data = file
        .read_data(file_offset, length as usize)
        .map_err(|e| format!("Failed to read data at {:#x}: {}", file_offset, e))?;

    Ok(data.to_vec())
}

/// Extract raw TMATS text from channel 0.
#[tauri::command]
fn get_tmats(state: State<'_, AppState>) -> Result<String, String> {
    let guard = state.file.lock().map_err(|e| e.to_string())?;
    let file = guard.as_ref().ok_or("No file open")?;

    file.extract_tmats()
        .map_err(|e| format!("Failed to extract TMATS: {}", e))
}

// ─── App setup ───

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            file: Mutex::new(None),
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            open_ch10_file,
            read_packet_headers,
            read_packet_data,
            get_tmats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running IRIG106-Studio");
}

#[cfg(test)]
mod pagination_tests {
    use super::*;
    use tauri::Manager;

    fn app(packet_count: u16) -> tauri::App<tauri::test::MockRuntime> {
        let mut bytes = Vec::new();
        for channel in 0..packet_count {
            let mut packet = [0u8; 24];
            packet[..2].copy_from_slice(&0xEB25u16.to_le_bytes());
            packet[2..4].copy_from_slice(&channel.to_le_bytes());
            packet[4..8].copy_from_slice(&24u32.to_le_bytes());
            bytes.extend_from_slice(&packet);
        }
        // A valid-sized buffer with no sync pattern gives an empty index.
        if bytes.is_empty() {
            bytes.resize(24, 0);
        }
        let file = Ch10File::from_bytes(bytes, "pagination.ch10").unwrap();
        tauri::test::mock_builder()
            .manage(AppState {
                file: Mutex::new(Some(file)),
            })
            .build(tauri::test::mock_context(tauri::test::noop_assets()))
            .unwrap()
    }

    fn page(packet_count: u16, start: u64, count: u32) -> Vec<u16> {
        let app = app(packet_count);
        read_packet_headers(start, count, app.state())
            .unwrap()
            .iter()
            .map(|header| {
                assert_eq!(header.file_offset, u64::from(header.channel_id) * 24);
                header.channel_id
            })
            .collect()
    }

    #[test]
    fn native_normal_and_boundary_pages() {
        assert_eq!(page(3, 0, 2), vec![0, 1]);
        assert_eq!(page(3, 1, 2), vec![1, 2]);
        assert_eq!(page(3, 2, 2), vec![2]);
        assert_eq!(page(3, 0, u32::MAX), vec![0, 1, 2]);
        assert_eq!(page(3, 2, u32::MAX), vec![2]);
    }

    #[test]
    fn native_empty_pages() {
        for (total, start, count) in [
            (3, 0, 0),
            (3, 3, 1),
            (3, 4, 1),
            (3, 4, 0),
            (0, 0, 1),
            (0, 1, 1),
        ] {
            assert!(
                page(total, start, count).is_empty(),
                "{total}/{start}/{count}"
            );
        }
    }

    #[test]
    fn native_extreme_start_and_count() {
        for start in [u32::MAX as u64, u32::MAX as u64 + 1, u64::MAX - 1, u64::MAX] {
            for count in [0, 1, u32::MAX] {
                assert!(page(3, start, count).is_empty(), "{start}/{count}");
            }
        }
    }

    #[test]
    fn native_end_addition_overflow() {
        assert!(page(3, u64::MAX, 1).is_empty());
    }

    #[test]
    fn native_no_file_still_errors() {
        let app = tauri::test::mock_builder()
            .manage(AppState {
                file: Mutex::new(None),
            })
            .build(tauri::test::mock_context(tauri::test::noop_assets()))
            .unwrap();
        assert_eq!(
            read_packet_headers(0, 0, app.state()).unwrap_err(),
            "No file open"
        );
    }
}

//! IRIG106-Studio — Tauri Backend
//!
//! This file defines the `#[tauri::command]` functions that the frontend
//! calls via `invoke()`. Each command maps 1:1 to a method on the
//! `PlatformAdapter` interface in TypeScript.
//!
//! Currently these return mock/stub data. Once the real crates are ready
//! (irig106-studio-core, irig106-time, irig106-tmats), swap in real
//! implementations — the frontend doesn't change at all.

use serde::{Deserialize, Serialize};

// ─── Domain types (mirrors src/types/domain.ts) ───

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ch10FileInfo {
    pub filename: String,
    pub filepath: String,
    pub file_size: u64,
    pub packet_count: u64,
    pub duration_sec: f64,
    pub standard_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Channel {
    pub channel_id: u16,
    pub data_type: u8,
    pub label: String,
    pub data_source_id: String,
    pub packet_count: u64,
    pub data_rate: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSource {
    pub id: String,
    pub label: String,
    pub channels: Vec<Channel>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ch10Summary {
    pub file: Ch10FileInfo,
    pub data_sources: Vec<DataSource>,
    pub tmats_raw: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PacketHeader {
    pub sync_pattern: u16,
    pub channel_id: u16,
    pub packet_length: u32,
    pub data_length: u32,
    pub data_type_version: u8,
    pub sequence_number: u8,
    pub data_type: u8,
    pub rtc: u64,
    pub checksum_valid: bool,
    pub file_offset: u64,
}

// ─── Tauri Commands ───

/// Open a Ch10 file via the native file dialog.
///
/// This is where irig106-studio-core will plug in:
///   1. Use tauri-plugin-dialog to get the file path
///   2. Open & mmap the file via irig106-studio-core
///   3. Parse the TMATS header (irig106-tmats)
///   4. Build the channel index
///   5. Return the summary to the frontend
#[tauri::command]
fn open_ch10_file(path: Option<String>) -> Result<Ch10Summary, String> {
    // TODO: Replace with real implementation
    // let file = irig106_studio_core::open(path)?;
    // let summary = file.summary()?;

    let _path = path.unwrap_or_else(|| "flight_test_042.ch10".into());

    Ok(Ch10Summary {
        file: Ch10FileInfo {
            filename: "flight_test_042.ch10".into(),
            filepath: _path,
            file_size: 2_400_000_000,
            packet_count: 1_247_832,
            duration_sec: 2535.0,
            standard_version: "106-17".into(),
        },
        data_sources: vec![
            DataSource {
                id: "DS-1".into(),
                label: "Recorder 1".into(),
                channels: vec![
                    Channel {
                        channel_id: 1,
                        data_type: 0x19,
                        label: "1553 Bus A".into(),
                        data_source_id: "DS-1".into(),
                        packet_count: 248_192,
                        data_rate: 1_200_000,
                    },
                    Channel {
                        channel_id: 2,
                        data_type: 0x19,
                        label: "1553 Bus B".into(),
                        data_source_id: "DS-1".into(),
                        packet_count: 241_017,
                        data_rate: 1_150_000,
                    },
                    Channel {
                        channel_id: 3,
                        data_type: 0x09,
                        label: "PCM Stream 1".into(),
                        data_source_id: "DS-1".into(),
                        packet_count: 312_445,
                        data_rate: 2_500_000,
                    },
                    Channel {
                        channel_id: 4,
                        data_type: 0x11,
                        label: "IRIG Time".into(),
                        data_source_id: "DS-1".into(),
                        packet_count: 2_535,
                        data_rate: 1_000,
                    },
                    Channel {
                        channel_id: 5,
                        data_type: 0x40,
                        label: "HUD Camera".into(),
                        data_source_id: "DS-1".into(),
                        packet_count: 76_140,
                        data_rate: 8_000_000,
                    },
                ],
            },
            DataSource {
                id: "DS-2".into(),
                label: "Recorder 2".into(),
                channels: vec![
                    Channel {
                        channel_id: 6,
                        data_type: 0x38,
                        label: "ARINC 429 Bus 1".into(),
                        data_source_id: "DS-2".into(),
                        packet_count: 185_300,
                        data_rate: 800_000,
                    },
                    Channel {
                        channel_id: 7,
                        data_type: 0x68,
                        label: "Ethernet Ch 1".into(),
                        data_source_id: "DS-2".into(),
                        packet_count: 182_203,
                        data_rate: 4_200_000,
                    },
                ],
            },
        ],
        tmats_raw: r#"R-1\ID:Flight Test 042;
R-1\NSS:2;
R-1\DSI-1:Recorder_1;
R-1\DSI-2:Recorder_2;"#
            .into(),
    })
}

/// Read a batch of packet headers for virtual scrolling.
///
/// Future: mmap'd read from irig106-studio-core packet index.
#[tauri::command]
fn read_packet_headers(start_index: u64, count: u32) -> Result<Vec<PacketHeader>, String> {
    let mut headers = Vec::with_capacity(count as usize);
    let data_types: [u8; 5] = [0x19, 0x19, 0x09, 0x11, 0x40];

    for i in 0..count as u64 {
        let idx = start_index + i;
        headers.push(PacketHeader {
            sync_pattern: 0xEB25,
            channel_id: (idx % 5 + 1) as u16,
            packet_length: (128 + idx % 256) as u32,
            data_length: (64 + idx % 192) as u32,
            data_type_version: 1,
            sequence_number: (idx % 256) as u8,
            data_type: data_types[(idx % 5) as usize],
            rtc: idx * 100_000,
            checksum_valid: idx % 47 != 0,
            file_offset: idx * 384,
        });
    }

    Ok(headers)
}

/// Read raw bytes from a packet's data payload (hex view).
///
/// Future: direct file read via irig106-studio-core.
#[tauri::command]
fn read_packet_data(file_offset: u64, length: u32) -> Result<Vec<u8>, String> {
    let _ = file_offset;
    // Return random-ish bytes for demo
    Ok((0..length).map(|i| ((i * 7 + 13) % 256) as u8).collect())
}

// ─── App setup ───

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            open_ch10_file,
            read_packet_headers,
            read_packet_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running IRIG106-Studio");
}

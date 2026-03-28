//! Builds the [`Ch10Summary`] that the frontend consumes.
//!
//! The summary aggregates file info, data sources, channels, and
//! TMATS metadata into a single serializable struct.
//!
//! Requirements traced:
//!   L2-LOAD-010  File load SHALL populate all panels

use crate::error::Result;
use crate::index::PacketIndex;
use crate::io::FileBuffer;
use crate::types::*;
use serde::{Deserialize, Serialize};

/// Complete file summary — sent to the frontend on file open.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ch10Summary {
    pub file: Ch10FileInfo,
    pub data_sources: Vec<DataSource>,
    pub tmats_raw: String,
}

impl Ch10Summary {
    /// Build a summary from the file info, packet index, and buffer.
    pub fn build(
        info: &Ch10FileInfo,
        index: &PacketIndex,
        buffer: &dyn FileBuffer,
    ) -> Result<Self> {
        // Enumerate channels from the packet index
        let channel_ids = index.channel_ids();

        // Extract TMATS text from channel 0 packets
        let tmats_raw = extract_tmats_from_index(index, buffer)?;

        // TODO: When irig106-tmats is available, parse tmats_raw to get
        // real channel labels and data source groupings. For now, group
        // all channels under a single synthetic data source.
        let channels: Vec<Channel> = channel_ids
            .iter()
            .map(|&cid| {
                let count = index.count_for_channel(cid);
                let data_type = index
                    .iter()
                    .find(|e| e.channel_id == cid)
                    .map(|e| e.data_type)
                    .unwrap_or(0x00);

                Channel {
                    channel_id: cid,
                    data_type,
                    label: format!("Ch {}", cid),
                    data_source_id: "DS-1".into(),
                    packet_count: count,
                    data_rate: 0, // TODO: compute from time span
                }
            })
            .collect();

        let data_sources = vec![DataSource {
            id: "DS-1".into(),
            label: "Data Source 1".into(),
            channels,
        }];

        Ok(Self {
            file: info.clone(),
            data_sources,
            tmats_raw,
        })
    }
}

/// Extract raw TMATS text from channel 0 packets via the index.
fn extract_tmats_from_index(index: &PacketIndex, buffer: &dyn FileBuffer) -> Result<String> {
    let mut tmats_bytes: Vec<u8> = Vec::new();

    for (i, entry) in index.iter().enumerate() {
        if entry.channel_id == 0 {
            let header = index.read_header(i, buffer)?;
            let payload_offset = entry.file_offset + PACKET_HEADER_SIZE as u64;
            let payload = buffer.read_at(payload_offset, header.data_length as usize)?;
            tmats_bytes.extend_from_slice(payload);
        }
    }

    Ok(String::from_utf8_lossy(&tmats_bytes).into_owned())
}

//! TMATS (Chapter 9) metadata extraction.
//!
//! TMATS data lives in Channel 0 packets. This module extracts the
//! raw TMATS text and, when `irig106-tmats` is available, parses it
//! into structured metadata (channel labels, data source groupings,
//! recording parameters).
//!
//! Requirements traced:
//!   L1-FILE-020  Parse and display TMATS metadata

use crate::error::Result;
use crate::types::DataSource;

/// Parsed TMATS metadata.
pub struct TmatsMetadata {
    /// Raw TMATS text (the full content of channel 0).
    pub raw_text: String,
    /// Parsed data source / channel groupings.
    pub data_sources: Vec<DataSource>,
    /// Detected IRIG 106 standard version.
    pub standard_version: Option<String>,
}

impl TmatsMetadata {
    /// Extract TMATS from the channel 0 packets.
    ///
    /// `channel_0_data` is the concatenated payload bytes from all
    /// channel 0 packets in the file.
    pub fn parse(channel_0_data: &[u8]) -> Result<Self> {
        // Convert to text (TMATS is ASCII/UTF-8)
        let raw_text = String::from_utf8_lossy(channel_0_data).into_owned();

        // TODO: When irig106-tmats is ready:
        //   let parsed = irig106_tmats::parse(&raw_text)?;
        //   let data_sources = map_to_data_sources(&parsed);
        //   let standard_version = parsed.version();

        Ok(Self {
            raw_text,
            data_sources: Vec::new(),
            standard_version: None,
        })
    }
}

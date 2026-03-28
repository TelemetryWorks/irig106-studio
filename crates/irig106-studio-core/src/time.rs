//! Time correlation — converts RTC values to absolute IRIG time.
//!
//! This module will wrap `irig106-time` when it's ready. The core
//! operation is:
//!
//! 1. Find Time channel packets (data type 0x11)
//! 2. Extract the time-to-RTC mapping from each time packet
//! 3. Interpolate absolute time for any RTC value
//!
//! Requirements traced:
//!   L1-STD-030   Parse all IRIG time formats
//!   L1-DIAG-030  Time correlation diagnostics

use crate::error::Result;
use crate::types::IrigTime;

/// Time correlation engine.
///
/// Built from the Time channel packets in a Ch10 file.
/// Used to convert any packet's RTC to an absolute IRIG time.
pub struct TimeCorrelator {
    // TODO: populate from Time channel packets
    // Will hold a sorted list of (rtc, irig_time) calibration points
}

impl TimeCorrelator {
    /// Build a time correlator from the Time channel packets.
    pub fn build(_time_packets: &[(u64, &[u8])]) -> Result<Self> {
        // TODO: Extract calibration points from time packets
        // For each time packet:
        //   1. Read the intra-packet time stamp header
        //   2. Extract the IRIG time value
        //   3. Pair with the packet's RTC
        Ok(Self {})
    }

    /// Convert an RTC value to absolute IRIG time.
    ///
    /// Uses linear interpolation between the nearest calibration points.
    pub fn rtc_to_time(&self, _rtc: u64) -> Result<IrigTime> {
        // TODO: interpolate between calibration points
        Ok(IrigTime {
            day_of_year: 1,
            hours: 0,
            minutes: 0,
            seconds: 0,
            microseconds: 0,
        })
    }
}

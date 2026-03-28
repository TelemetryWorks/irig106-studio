//! Unit tests for irig106-studio-core.
//!
//! These tests use synthetic Ch10 byte arrays — no real files needed.
//! Run with: `cargo test` from the crate root.

#[cfg(test)]
mod test_helpers {
    use crate::types::{PACKET_HEADER_SIZE, SYNC_PATTERN};

    /// Build a minimal valid Ch10 packet as raw bytes.
    ///
    /// The packet contains a 24-byte header followed by `data_len` bytes
    /// of payload (filled with `fill_byte`). `packet_length` is set to
    /// `PACKET_HEADER_SIZE + data_len`.
    pub fn make_packet(
        channel_id: u16,
        data_type: u8,
        sequence_number: u8,
        data_len: usize,
        fill_byte: u8,
    ) -> Vec<u8> {
        let packet_length = (PACKET_HEADER_SIZE + data_len) as u32;
        let mut buf = vec![0u8; packet_length as usize];

        // Sync pattern (bytes 0-1)
        let sync = SYNC_PATTERN.to_le_bytes();
        buf[0] = sync[0];
        buf[1] = sync[1];

        // Channel ID (bytes 2-3)
        let ch = channel_id.to_le_bytes();
        buf[2] = ch[0];
        buf[3] = ch[1];

        // Packet Length (bytes 4-7)
        let pl = packet_length.to_le_bytes();
        buf[4] = pl[0];
        buf[5] = pl[1];
        buf[6] = pl[2];
        buf[7] = pl[3];

        // Data Length (bytes 8-11)
        let dl = (data_len as u32).to_le_bytes();
        buf[8] = dl[0];
        buf[9] = dl[1];
        buf[10] = dl[2];
        buf[11] = dl[3];

        // Data Type Version (byte 12)
        buf[12] = 1;

        // Sequence Number (byte 13)
        buf[13] = sequence_number;

        // Packet Flags (bytes 14-15): 0 for now
        buf[14] = 0;
        buf[15] = 0;

        // Data Type (byte 16)
        buf[16] = data_type;

        // Reserved (byte 17)
        buf[17] = 0;

        // RTC (bytes 18-23): zero
        // Already zero from vec initialization

        // Payload
        for i in PACKET_HEADER_SIZE..buf.len() {
            buf[i] = fill_byte;
        }

        buf
    }

    /// Build a multi-packet Ch10 file in memory.
    pub fn make_file(packets: &[Vec<u8>]) -> Vec<u8> {
        let total: usize = packets.iter().map(|p| p.len()).sum();
        let mut buf = Vec::with_capacity(total);
        for pkt in packets {
            buf.extend_from_slice(pkt);
        }
        buf
    }
}

#[cfg(test)]
mod mem_buffer_tests {
    use crate::io::{FileBuffer, MemBuffer};

    #[test]
    fn len_returns_buffer_size() {
        let buf = MemBuffer::from_vec(vec![1, 2, 3, 4, 5]);
        assert_eq!(buf.len(), 5);
    }

    #[test]
    fn is_empty_on_empty_buffer() {
        let buf = MemBuffer::from_vec(vec![]);
        assert!(buf.is_empty());
    }

    #[test]
    fn is_empty_false_on_nonempty() {
        let buf = MemBuffer::from_vec(vec![0]);
        assert!(!buf.is_empty());
    }

    #[test]
    fn read_at_returns_correct_slice() {
        let buf = MemBuffer::from_vec(vec![10, 20, 30, 40, 50]);
        let slice = buf.read_at(1, 3).unwrap();
        assert_eq!(slice, &[20, 30, 40]);
    }

    #[test]
    fn read_at_zero_length() {
        let buf = MemBuffer::from_vec(vec![10, 20, 30]);
        let slice = buf.read_at(2, 0).unwrap();
        assert_eq!(slice.len(), 0);
    }

    #[test]
    fn read_at_exact_end() {
        let buf = MemBuffer::from_vec(vec![10, 20, 30]);
        let slice = buf.read_at(0, 3).unwrap();
        assert_eq!(slice, &[10, 20, 30]);
    }

    #[test]
    fn read_at_past_end_returns_error() {
        let buf = MemBuffer::from_vec(vec![10, 20, 30]);
        let result = buf.read_at(2, 5);
        assert!(result.is_err());
    }

    #[test]
    fn read_at_offset_past_end_returns_error() {
        let buf = MemBuffer::from_vec(vec![10, 20, 30]);
        let result = buf.read_at(10, 1);
        assert!(result.is_err());
    }

    #[test]
    fn as_slice_returns_full_buffer() {
        let data = vec![1, 2, 3, 4, 5];
        let buf = MemBuffer::from_vec(data.clone());
        assert_eq!(buf.as_slice(), &data[..]);
    }
}

#[cfg(test)]
mod packet_index_tests {
    use super::test_helpers::*;
    use crate::index::PacketIndex;
    use crate::io::MemBuffer;
    use crate::types::SYNC_PATTERN;

    #[test]
    fn single_packet_file() {
        let pkt = make_packet(1, 0x19, 0, 64, 0xAA);
        let buf = MemBuffer::from_vec(pkt);
        let index = PacketIndex::build(&buf).unwrap();

        assert_eq!(index.len(), 1);
        let entry = index.get(0).unwrap();
        assert_eq!(entry.file_offset, 0);
        assert_eq!(entry.channel_id, 1);
        assert_eq!(entry.data_type, 0x19);
        assert_eq!(entry.packet_length, 24 + 64);
    }

    #[test]
    fn multiple_packets() {
        let file = make_file(&[
            make_packet(1, 0x19, 0, 32, 0xAA),
            make_packet(2, 0x09, 1, 48, 0xBB),
            make_packet(3, 0x11, 2, 16, 0xCC),
        ]);
        let buf = MemBuffer::from_vec(file);
        let index = PacketIndex::build(&buf).unwrap();

        assert_eq!(index.len(), 3);

        // First packet
        assert_eq!(index.get(0).unwrap().channel_id, 1);
        assert_eq!(index.get(0).unwrap().data_type, 0x19);
        assert_eq!(index.get(0).unwrap().file_offset, 0);

        // Second packet — offset = size of first packet
        assert_eq!(index.get(1).unwrap().channel_id, 2);
        assert_eq!(index.get(1).unwrap().data_type, 0x09);
        assert_eq!(index.get(1).unwrap().file_offset, (24 + 32) as u64);

        // Third packet
        assert_eq!(index.get(2).unwrap().channel_id, 3);
        assert_eq!(index.get(2).unwrap().data_type, 0x11);
    }

    #[test]
    fn empty_file_yields_empty_index() {
        let buf = MemBuffer::from_vec(vec![]);
        let index = PacketIndex::build(&buf).unwrap();
        assert_eq!(index.len(), 0);
        assert!(index.is_empty());
    }

    #[test]
    fn file_smaller_than_header_yields_empty() {
        let buf = MemBuffer::from_vec(vec![0xEB, 0x25, 0, 0, 0]); // 5 bytes, < 24
        let index = PacketIndex::build(&buf).unwrap();
        assert_eq!(index.len(), 0);
    }

    #[test]
    fn no_sync_pattern_yields_empty() {
        // 24 bytes but no sync pattern
        let buf = MemBuffer::from_vec(vec![0x00; 48]);
        let index = PacketIndex::build(&buf).unwrap();
        assert_eq!(index.len(), 0);
    }

    #[test]
    fn garbage_before_first_sync_is_skipped() {
        let mut file = vec![0xFF; 10]; // 10 bytes of garbage
        file.extend_from_slice(&make_packet(5, 0x40, 0, 32, 0x00));
        let buf = MemBuffer::from_vec(file);
        let index = PacketIndex::build(&buf).unwrap();

        assert_eq!(index.len(), 1);
        assert_eq!(index.get(0).unwrap().file_offset, 10);
        assert_eq!(index.get(0).unwrap().channel_id, 5);
    }

    #[test]
    fn truncated_final_packet_is_ignored() {
        let mut file = make_file(&[make_packet(1, 0x19, 0, 32, 0xAA)]);
        // Add a partial second packet (sync + partial header)
        file.extend_from_slice(&SYNC_PATTERN.to_le_bytes());
        file.extend_from_slice(&[0x02, 0x00]); // channel_id = 2
        file.extend_from_slice(&[0xFF, 0x00, 0x00, 0x00]); // packet_length = 255 (exceeds file)
        // Fill up to at least 24 bytes for the header
        while file.len() < (24 + 32) + 24 {
            file.push(0x00);
        }

        let buf = MemBuffer::from_vec(file);
        let index = PacketIndex::build(&buf).unwrap();

        // Only the first complete packet should be indexed
        assert_eq!(index.len(), 1);
        assert_eq!(index.get(0).unwrap().channel_id, 1);
    }

    #[test]
    fn channel_ids_returns_unique_sorted() {
        let file = make_file(&[
            make_packet(3, 0x19, 0, 16, 0x00),
            make_packet(1, 0x09, 0, 16, 0x00),
            make_packet(3, 0x19, 1, 16, 0x00),
            make_packet(7, 0x40, 0, 16, 0x00),
            make_packet(1, 0x09, 1, 16, 0x00),
        ]);
        let buf = MemBuffer::from_vec(file);
        let index = PacketIndex::build(&buf).unwrap();

        assert_eq!(index.channel_ids(), vec![1, 3, 7]);
    }

    #[test]
    fn count_for_channel() {
        let file = make_file(&[
            make_packet(1, 0x19, 0, 16, 0x00),
            make_packet(2, 0x09, 0, 16, 0x00),
            make_packet(1, 0x19, 1, 16, 0x00),
            make_packet(1, 0x19, 2, 16, 0x00),
            make_packet(2, 0x09, 1, 16, 0x00),
        ]);
        let buf = MemBuffer::from_vec(file);
        let index = PacketIndex::build(&buf).unwrap();

        assert_eq!(index.count_for_channel(1), 3);
        assert_eq!(index.count_for_channel(2), 2);
        assert_eq!(index.count_for_channel(99), 0);
    }

    #[test]
    fn read_header_returns_correct_fields() {
        let file = make_file(&[
            make_packet(4, 0x38, 42, 100, 0xDD),
        ]);
        let buf = MemBuffer::from_vec(file);
        let index = PacketIndex::build(&buf).unwrap();
        let header = index.read_header(0, &buf).unwrap();

        assert_eq!(header.sync_pattern, SYNC_PATTERN);
        assert_eq!(header.channel_id, 4);
        assert_eq!(header.data_type, 0x38);
        assert_eq!(header.sequence_number, 42);
        assert_eq!(header.packet_length, 24 + 100);
        assert_eq!(header.data_length, 100);
        assert_eq!(header.file_offset, 0);
    }

    #[test]
    fn read_header_out_of_range_returns_error() {
        let file = make_file(&[make_packet(1, 0x19, 0, 16, 0x00)]);
        let buf = MemBuffer::from_vec(file);
        let index = PacketIndex::build(&buf).unwrap();

        assert!(index.read_header(1, &buf).is_err());
        assert!(index.read_header(999, &buf).is_err());
    }

    #[test]
    fn get_out_of_range_returns_none() {
        let file = make_file(&[make_packet(1, 0x19, 0, 16, 0x00)]);
        let buf = MemBuffer::from_vec(file);
        let index = PacketIndex::build(&buf).unwrap();

        assert!(index.get(0).is_some());
        assert!(index.get(1).is_none());
    }

    #[test]
    fn iter_yields_all_entries() {
        let file = make_file(&[
            make_packet(1, 0x19, 0, 16, 0x00),
            make_packet(2, 0x09, 0, 16, 0x00),
            make_packet(3, 0x11, 0, 16, 0x00),
        ]);
        let buf = MemBuffer::from_vec(file);
        let index = PacketIndex::build(&buf).unwrap();

        let channels: Vec<u16> = index.iter().map(|e| e.channel_id).collect();
        assert_eq!(channels, vec![1, 2, 3]);
    }

    #[test]
    fn large_packet_count() {
        // Build 1000 packets
        let packets: Vec<Vec<u8>> = (0..1000u16)
            .map(|i| make_packet(i % 8 + 1, 0x19, (i % 256) as u8, 32, 0x00))
            .collect();
        let file = make_file(&packets);
        let buf = MemBuffer::from_vec(file);
        let index = PacketIndex::build(&buf).unwrap();

        assert_eq!(index.len(), 1000);
        assert_eq!(index.channel_ids(), vec![1, 2, 3, 4, 5, 6, 7, 8]);
    }
}

#[cfg(test)]
mod data_type_tests {
    use crate::types::DataType;

    #[test]
    fn from_u8_known_values() {
        assert_eq!(DataType::from_u8(0x00), Some(DataType::Computer0));
        assert_eq!(DataType::from_u8(0x01), Some(DataType::Computer1));
        assert_eq!(DataType::from_u8(0x09), Some(DataType::PcmFmtA));
        assert_eq!(DataType::from_u8(0x0A), Some(DataType::PcmFmtB));
        assert_eq!(DataType::from_u8(0x11), Some(DataType::Time));
        assert_eq!(DataType::from_u8(0x19), Some(DataType::Mil1553FmtA));
        assert_eq!(DataType::from_u8(0x1A), Some(DataType::Mil1553FmtB));
        assert_eq!(DataType::from_u8(0x21), Some(DataType::Analog));
        assert_eq!(DataType::from_u8(0x29), Some(DataType::Discrete));
        assert_eq!(DataType::from_u8(0x30), Some(DataType::Message));
        assert_eq!(DataType::from_u8(0x38), Some(DataType::Arinc429));
        assert_eq!(DataType::from_u8(0x40), Some(DataType::VideoFmtA));
        assert_eq!(DataType::from_u8(0x41), Some(DataType::VideoFmtB));
        assert_eq!(DataType::from_u8(0x48), Some(DataType::ImageFmtA));
        assert_eq!(DataType::from_u8(0x50), Some(DataType::Uart));
        assert_eq!(DataType::from_u8(0x58), Some(DataType::Ieee1394));
        assert_eq!(DataType::from_u8(0x60), Some(DataType::ParallelDC));
        assert_eq!(DataType::from_u8(0x68), Some(DataType::EthernetFmtA));
        assert_eq!(DataType::from_u8(0x69), Some(DataType::EthernetFmtB));
        assert_eq!(DataType::from_u8(0x70), Some(DataType::Tspi));
        assert_eq!(DataType::from_u8(0x78), Some(DataType::Can));
        assert_eq!(DataType::from_u8(0x79), Some(DataType::FibreCh));
    }

    #[test]
    fn from_u8_unknown_values() {
        assert_eq!(DataType::from_u8(0x02), None);
        assert_eq!(DataType::from_u8(0x03), None);
        assert_eq!(DataType::from_u8(0xFF), None);
        assert_eq!(DataType::from_u8(0x10), None);
        assert_eq!(DataType::from_u8(0x20), None);
        assert_eq!(DataType::from_u8(0x7A), None);
        assert_eq!(DataType::from_u8(0x80), None);
    }

    #[test]
    fn from_u8_boundary_around_known_values() {
        // One below and above 1553 FmtA (0x19)
        assert_eq!(DataType::from_u8(0x18), None);
        assert_eq!(DataType::from_u8(0x19), Some(DataType::Mil1553FmtA));
        assert_eq!(DataType::from_u8(0x1A), Some(DataType::Mil1553FmtB));
        assert_eq!(DataType::from_u8(0x1B), None);
    }

    #[test]
    fn repr_u8_round_trip() {
        // Verify the enum discriminant matches the from_u8 mapping
        let variants = [
            (DataType::Computer0, 0x00u8),
            (DataType::Mil1553FmtA, 0x19),
            (DataType::Time, 0x11),
            (DataType::PcmFmtA, 0x09),
            (DataType::Arinc429, 0x38),
            (DataType::EthernetFmtA, 0x68),
        ];

        for (variant, expected_byte) in variants {
            assert_eq!(variant as u8, expected_byte);
            assert_eq!(DataType::from_u8(expected_byte), Some(variant));
        }
    }
}

#[cfg(test)]
mod irig_time_tests {
    use crate::types::IrigTime;

    #[test]
    fn format_typical_time() {
        let t = IrigTime {
            day_of_year: 74,
            hours: 14,
            minutes: 23,
            seconds: 45,
            microseconds: 123456,
        };
        assert_eq!(t.format(), "074:14:23:45.123456");
    }

    #[test]
    fn format_zero_padded() {
        let t = IrigTime {
            day_of_year: 1,
            hours: 0,
            minutes: 0,
            seconds: 0,
            microseconds: 42,
        };
        assert_eq!(t.format(), "001:00:00:00.000042");
    }

    #[test]
    fn format_max_values() {
        let t = IrigTime {
            day_of_year: 366,
            hours: 23,
            minutes: 59,
            seconds: 59,
            microseconds: 999999,
        };
        assert_eq!(t.format(), "366:23:59:59.999999");
    }
}

#[cfg(test)]
mod error_tests {
    use crate::error::StudioError;

    #[test]
    fn error_display_messages() {
        let e = StudioError::InvalidSync {
            offset: 0x100,
            actual: 0xDEAD,
        };
        let msg = format!("{}", e);
        assert!(msg.contains("0x100"));
        assert!(msg.contains("0xdead"));

        let e = StudioError::FileTooSmall { size: 10 };
        let msg = format!("{}", e);
        assert!(msg.contains("10 bytes"));

        let e = StudioError::IndexOutOfRange {
            index: 5,
            count: 3,
        };
        let msg = format!("{}", e);
        assert!(msg.contains("5"));
        assert!(msg.contains("3"));
    }
}

#[cfg(test)]
mod file_tests {
    use super::test_helpers::*;
    use crate::file::Ch10File;

    #[test]
    fn from_bytes_with_valid_packets() {
        let file_bytes = make_file(&[
            make_packet(0, 0x00, 0, 64, 0x00),  // TMATS (ch 0)
            make_packet(1, 0x19, 0, 32, 0xAA),  // 1553
            make_packet(4, 0x11, 0, 16, 0x00),  // Time
        ]);
        let file = Ch10File::from_bytes(file_bytes, "test.ch10").unwrap();

        assert_eq!(file.file_info().filename, "test.ch10");
        assert_eq!(file.file_info().packet_count, 3);
        assert_eq!(file.index().len(), 3);
        assert_eq!(file.index().channel_ids(), vec![0, 1, 4]);
    }

    #[test]
    fn from_bytes_too_small() {
        let result = Ch10File::from_bytes(vec![0; 10], "tiny.ch10");
        assert!(result.is_err());
    }

    #[test]
    fn read_header_matches_packet_data() {
        let file_bytes = make_file(&[
            make_packet(7, 0x68, 99, 128, 0xEE),
        ]);
        let file = Ch10File::from_bytes(file_bytes, "test.ch10").unwrap();
        let header = file.read_header(0).unwrap();

        assert_eq!(header.channel_id, 7);
        assert_eq!(header.data_type, 0x68);
        assert_eq!(header.sequence_number, 99);
        assert_eq!(header.data_length, 128);
    }

    #[test]
    fn read_data_returns_payload() {
        let file_bytes = make_file(&[
            make_packet(1, 0x19, 0, 8, 0x42),
        ]);
        let file = Ch10File::from_bytes(file_bytes, "test.ch10").unwrap();
        // Payload starts at offset 24 (after header)
        let data = file.read_data(24, 8).unwrap();
        assert_eq!(data, &[0x42; 8]);
    }

    #[test]
    fn summary_contains_channels() {
        let file_bytes = make_file(&[
            make_packet(1, 0x19, 0, 16, 0x00),
            make_packet(2, 0x09, 0, 16, 0x00),
            make_packet(1, 0x19, 1, 16, 0x00),
        ]);
        let file = Ch10File::from_bytes(file_bytes, "test.ch10").unwrap();
        let summary = file.summary().unwrap();

        assert_eq!(summary.file.packet_count, 3);
        let all_channels: Vec<u16> = summary
            .data_sources
            .iter()
            .flat_map(|ds| &ds.channels)
            .map(|ch| ch.channel_id)
            .collect();
        assert!(all_channels.contains(&1));
        assert!(all_channels.contains(&2));
    }
}

/// Golden file test — a complete minimal Ch10 file with TMATS, 1553, and Time packets.
#[cfg(test)]
mod golden_file_tests {
    use super::test_helpers::*;
    use crate::file::Ch10File;

    /// Build a realistic minimal Ch10 file:
    ///   - Channel 0: TMATS (Computer Generated, Format 1)
    ///   - Channel 1: MIL-STD-1553 Format A
    ///   - Channel 4: IRIG Time
    fn build_golden_file() -> Vec<u8> {
        // TMATS payload: minimal valid TMATS text
        let tmats_text = b"R-1\\ID:Golden Test;\nR-1\\NSS:1;\nR-1\\DSI-1:Recorder_1;\n";
        let tmats_pkt = make_packet(0, 0x01, 0, tmats_text.len(), 0x00);
        // Overwrite payload with actual TMATS text
        let mut tmats = tmats_pkt;
        tmats[24..24 + tmats_text.len()].copy_from_slice(tmats_text);

        // 1553 packets
        let pkt_1553_a = make_packet(1, 0x19, 0, 64, 0xAA);
        let pkt_1553_b = make_packet(1, 0x19, 1, 64, 0xBB);
        let pkt_1553_c = make_packet(1, 0x19, 2, 64, 0xCC);

        // Time packet
        let time_pkt = make_packet(4, 0x11, 0, 16, 0x00);

        // Second batch of 1553
        let pkt_1553_d = make_packet(1, 0x19, 3, 64, 0xDD);

        make_file(&[tmats, pkt_1553_a, pkt_1553_b, time_pkt, pkt_1553_c, pkt_1553_d])
    }

    #[test]
    fn golden_file_opens_successfully() {
        let data = build_golden_file();
        let file = Ch10File::from_bytes(data, "golden.ch10").unwrap();
        assert_eq!(file.file_info().filename, "golden.ch10");
    }

    #[test]
    fn golden_file_packet_count() {
        let data = build_golden_file();
        let file = Ch10File::from_bytes(data, "golden.ch10").unwrap();
        assert_eq!(file.file_info().packet_count, 6);
    }

    #[test]
    fn golden_file_channels() {
        let data = build_golden_file();
        let file = Ch10File::from_bytes(data, "golden.ch10").unwrap();
        let ids = file.index().channel_ids();
        assert_eq!(ids, vec![0, 1, 4]);
    }

    #[test]
    fn golden_file_channel_counts() {
        let data = build_golden_file();
        let file = Ch10File::from_bytes(data, "golden.ch10").unwrap();
        assert_eq!(file.index().count_for_channel(0), 1);  // TMATS
        assert_eq!(file.index().count_for_channel(1), 4);  // 1553
        assert_eq!(file.index().count_for_channel(4), 1);  // Time
    }

    #[test]
    fn golden_file_tmats_extraction() {
        let data = build_golden_file();
        let file = Ch10File::from_bytes(data, "golden.ch10").unwrap();

        // Read the TMATS packet payload (channel 0, first packet)
        let entry = file.index().iter().find(|e| e.channel_id == 0).unwrap();
        let header = file.read_header(0).unwrap();
        let payload = file
            .read_data(entry.file_offset + 24, header.data_length as usize)
            .unwrap();

        let text = std::str::from_utf8(payload).unwrap();
        assert!(text.contains("R-1\\ID:Golden Test;"));
        assert!(text.contains("R-1\\NSS:1;"));
    }

    #[test]
    fn golden_file_summary() {
        let data = build_golden_file();
        let file = Ch10File::from_bytes(data, "golden.ch10").unwrap();
        let summary = file.summary().unwrap();

        assert_eq!(summary.file.packet_count, 6);
        assert!(!summary.data_sources.is_empty());

        // All channels should be present in summary
        let all_ch_ids: Vec<u16> = summary
            .data_sources
            .iter()
            .flat_map(|ds| &ds.channels)
            .map(|ch| ch.channel_id)
            .collect();
        assert!(all_ch_ids.contains(&0));
        assert!(all_ch_ids.contains(&1));
        assert!(all_ch_ids.contains(&4));
    }

    #[test]
    fn golden_file_1553_sequence_numbers() {
        let data = build_golden_file();
        let file = Ch10File::from_bytes(data, "golden.ch10").unwrap();

        // Read all 1553 headers and check sequence numbers
        let mut seq_nums: Vec<u8> = Vec::new();
        for (i, entry) in file.index().iter().enumerate() {
            if entry.channel_id == 1 {
                let header = file.read_header(i).unwrap();
                seq_nums.push(header.sequence_number);
            }
        }
        assert_eq!(seq_nums, vec![0, 1, 2, 3]);
    }
}

/// Channel enumeration helper tests.
#[cfg(test)]
mod channel_enumeration_tests {
    use super::test_helpers::*;
    use crate::index::PacketIndex;
    use crate::io::MemBuffer;

    #[test]
    fn data_type_for_channel() {
        let file = make_file(&[
            make_packet(1, 0x19, 0, 16, 0x00),
            make_packet(2, 0x09, 0, 16, 0x00),
            make_packet(3, 0x38, 0, 16, 0x00),
        ]);
        let buf = MemBuffer::from_vec(file);
        let index = PacketIndex::build(&buf).unwrap();

        // Verify data types via iter
        let ch1_type = index.iter().find(|e| e.channel_id == 1).unwrap().data_type;
        let ch2_type = index.iter().find(|e| e.channel_id == 2).unwrap().data_type;
        let ch3_type = index.iter().find(|e| e.channel_id == 3).unwrap().data_type;

        assert_eq!(ch1_type, 0x19); // 1553
        assert_eq!(ch2_type, 0x09); // PCM
        assert_eq!(ch3_type, 0x38); // ARINC 429
    }

    #[test]
    fn byte_count_for_channel() {
        let file = make_file(&[
            make_packet(1, 0x19, 0, 32, 0x00),  // 56 bytes total
            make_packet(1, 0x19, 1, 64, 0x00),  // 88 bytes total
            make_packet(2, 0x09, 0, 128, 0x00), // 152 bytes total
        ]);
        let buf = MemBuffer::from_vec(file);
        let index = PacketIndex::build(&buf).unwrap();

        // Sum packet lengths for channel 1
        let ch1_bytes: u64 = index
            .iter()
            .filter(|e| e.channel_id == 1)
            .map(|e| e.packet_length as u64)
            .sum();
        assert_eq!(ch1_bytes, 56 + 88);

        let ch2_bytes: u64 = index
            .iter()
            .filter(|e| e.channel_id == 2)
            .map(|e| e.packet_length as u64)
            .sum();
        assert_eq!(ch2_bytes, 152);
    }
}

/// Checksum integration tests — verify checksum validation flows through parse_header.
#[cfg(test)]
mod checksum_integration_tests {
    use super::test_helpers::*;
    use crate::index::PacketIndex;
    use crate::io::MemBuffer;

    #[test]
    fn packets_without_checksum_flag_are_valid() {
        // Default make_packet sets flags to 0x00 (no checksum)
        let file = make_file(&[make_packet(1, 0x19, 0, 32, 0xAA)]);
        let buf = MemBuffer::from_vec(file);
        let index = PacketIndex::build(&buf).unwrap();
        let header = index.read_header(0, &buf).unwrap();
        assert!(header.checksum_valid);
    }

    #[test]
    fn packet_with_valid_16bit_checksum() {
        let mut pkt = make_packet(1, 0x19, 0, 32, 0xAA);
        // Set flags to 16-bit checksum (0x02)
        pkt[14] = 0x02;
        pkt[15] = 0x00;
        // Compute and store checksum of first 22 bytes into bytes 22-23
        let sum = crate::checksum::checksum_16(&pkt[..22]);
        let sum_bytes = sum.to_le_bytes();
        pkt[22] = sum_bytes[0];
        pkt[23] = sum_bytes[1];

        let buf = MemBuffer::from_vec(pkt);
        let index = PacketIndex::build(&buf).unwrap();
        let header = index.read_header(0, &buf).unwrap();
        assert!(header.checksum_valid);
    }

    #[test]
    fn packet_with_invalid_16bit_checksum() {
        let mut pkt = make_packet(1, 0x19, 0, 32, 0xAA);
        // Set flags to 16-bit checksum
        pkt[14] = 0x02;
        pkt[15] = 0x00;
        // Set wrong checksum
        pkt[22] = 0xFF;
        pkt[23] = 0xFF;

        let buf = MemBuffer::from_vec(pkt);
        let index = PacketIndex::build(&buf).unwrap();
        let header = index.read_header(0, &buf).unwrap();
        assert!(!header.checksum_valid);
    }
}

# IRIG106-Studio — Crate Integration Guide

This document describes how the TelemetryWorks crate ecosystem plugs
into irig106-studio. When you're ready to wire in a crate, follow
the steps here.

## Architecture

```
TelemetryWorks Crate Ecosystem          IRIG106-Studio
─────────────────────────────          ───────────────

irig106-time    ──────────────┐
  RTC → IRIG time correlation │
                              │
irig106-tmats   ──────────────┼───→  irig106-studio-core
  TMATS text → structured     │        file.rs, summary.rs, decode.rs
  channel/group metadata      │              │
                              │              ├──→ src-tauri/lib.rs (desktop)
irig106-decode  ──────────────┘              │
  Raw payload → decoded data                 └──→ irig106-studio-wasm (browser)
  (1553, PCM, ARINC, etc.)                            │
                                                      ↓
                                              TypeScript frontend
                                              (viewport, properties, waveform)
```

The studio is a **consumer** of the ecosystem crates. It never
reimplements spec-level decoding — it calls the crates and maps
their output to UI types.

---

## Crate 1: `irig106-time`

**Repo:** https://github.com/TelemetryWorks/irig106-time
**Current:** v0.2.0 (API still evolving)
**Unblocks:** Task 2.12 (time correlation), Task 4.4 (time decoder)

### What the studio needs

```rust
// A function that converts a raw 48-bit RTC value to an absolute
// IRIG time, given calibration points extracted from Time packets.
fn rtc_to_irig_time(
    rtc: u64,
    calibration: &[TimeCalibrationPoint],
) -> Option<IrigTime>;

struct TimeCalibrationPoint {
    rtc: u64,
    absolute_time: IrigTime,
}
```

### Integration steps

1. **Add dependency:**
   ```toml
   # crates/irig106-studio-core/Cargo.toml
   [dependencies]
   irig106-time = { path = "../../irig106-time" }
   # or from crates.io when published:
   # irig106-time = "0.3"
   ```

2. **Implement `time.rs`** (currently a stub):
   ```rust
   use irig106_time::{...};  // whatever the public API exposes

   pub struct TimeCorrelator {
       calibration_points: Vec<TimeCalibrationPoint>,
   }

   impl TimeCorrelator {
       /// Build from the Time channel packets in a Ch10 file.
       pub fn build(file: &Ch10File) -> Result<Self> {
           let rtcs = file.extract_time_rtcs()?;
           // Convert raw RTC + Time packet payloads into calibration points
           // using irig106-time's decoder
           todo!()
       }

       /// Convert any packet's RTC to absolute IRIG time.
       pub fn rtc_to_time(&self, rtc: u64) -> Option<IrigTime> {
           // Call irig106-time's interpolation
           todo!()
       }
   }
   ```

3. **Wire into `Ch10File`:**
   ```rust
   impl Ch10File {
       pub fn build_time_correlator(&self) -> Result<TimeCorrelator> {
           TimeCorrelator::build(self)
       }
   }
   ```

4. **Wire into Tauri backend** (`src-tauri/src/lib.rs`):
   - Store `TimeCorrelator` alongside `Ch10File` in `AppState`
   - Add absolute time to `PacketHeaderDto`

5. **Wire into WASM** (`crates/irig106-studio-wasm/src/lib.rs`):
   - Same: store correlator in `StudioSession`
   - Expose via `read_headers()` response

6. **Update frontend:**
   - Add `absoluteTime?: string` to `PacketHeader` in `domain.ts`
   - Display in packet table and waveform timescale
   - Update `IrigTime` display in status bar

### Files to modify

| File | Change |
|------|--------|
| `crates/irig106-studio-core/Cargo.toml` | Add `irig106-time` dep |
| `crates/irig106-studio-core/src/time.rs` | Replace stub with real impl |
| `crates/irig106-studio-core/src/file.rs` | Add `build_time_correlator()` |
| `src-tauri/src/lib.rs` | Store correlator, add time to DTO |
| `crates/irig106-studio-wasm/src/lib.rs` | Store correlator in session |
| `src/types/domain.ts` | Add `absoluteTime` field |
| `src/components/viewport.ts` | Update packet table + timescale |

---

## Crate 2: `irig106-tmats`

**Repo:** https://github.com/TelemetryWorks/irig106-tmats
**Current:** Not yet started / early development
**Unblocks:** Task 2.11 (channel labels), Tasks 4.2/4.5/4.9 (TMATS-dependent decoders), Task 6.1 (version detection)

### What the studio needs

```rust
/// Parse raw TMATS text into structured metadata.
fn parse_tmats(text: &str) -> Result<TmatsMetadata>;

struct TmatsMetadata {
    /// R-group: recording info
    recording: RecordingInfo,
    /// Channel definitions with labels from TMATS
    channels: Vec<TmatsChannel>,
    /// Standard version (from R-1\ID or R-1\RI1)
    standard_version: Option<String>,
}

struct RecordingInfo {
    id: String,               // R-1\ID
    num_data_sources: u32,    // R-1\NSS
}

struct TmatsChannel {
    channel_id: u16,
    label: String,            // e.g., "1553_BUS_A" from D-group
    data_source_id: String,   // Which data source this belongs to
    data_type_name: String,   // Human-readable type from TMATS
}
```

### Integration steps

1. **Add dependency** to `crates/irig106-studio-core/Cargo.toml`

2. **Update `summary.rs`:**
   ```rust
   // In Ch10Summary::build():
   let tmats_raw = extract_tmats_from_index(index, buffer)?;
   let tmats_parsed = irig106_tmats::parse(&tmats_raw).ok();

   // Use parsed TMATS for real channel labels:
   let label = tmats_parsed
       .as_ref()
       .and_then(|t| t.channels.iter().find(|c| c.channel_id == cid))
       .map(|c| c.label.clone())
       .unwrap_or_else(|| format!("Ch {}", cid));
   ```

3. **Group channels into real data sources** instead of the
   current single synthetic "Data Source 1".

4. **No frontend changes needed** — the `Ch10Summary` already has
   `dataSources[].channels[].label`. The frontend renders whatever
   labels the backend provides.

### Files to modify

| File | Change |
|------|--------|
| `crates/irig106-studio-core/Cargo.toml` | Add `irig106-tmats` dep |
| `crates/irig106-studio-core/src/summary.rs` | Parse TMATS, real labels |
| `crates/irig106-studio-core/src/tmats.rs` | Replace stub with wrapper |

---

## Crate 3: `irig106-decode`

**Repo:** https://github.com/TelemetryWorks/irig106-decode
**Current:** Not yet started
**Unblocks:** Phase 4 entirely, which unblocks Phase 5 and 6

### What the studio needs

```rust
/// Decode a packet payload based on its data type.
fn decode_payload(
    data_type: DataType,
    payload: &[u8],
    // Optional TMATS context for types that need it (PCM, Analog, Discrete)
    tmats: Option<&TmatsMetadata>,
) -> Result<DecodedData>;

enum DecodedData {
    Mil1553(Vec<Mil1553Message>),
    Pcm(PcmFrame),
    Arinc429(Vec<Arinc429Word>),
    Time(TimeData),
    Analog(Vec<f64>),
    Ethernet(Vec<EthernetFrame>),
    Uart(Vec<UartData>),
    Video(Vec<u8>),      // raw MPEG-TS bytes
    Discrete(Vec<bool>),
    Message(Vec<u8>),    // generic
    Unknown(Vec<u8>),
}

struct Mil1553Message {
    command_word: u16,
    status_word: u16,
    data_words: Vec<u16>,
    rt_address: u8,
    sub_address: u8,
    word_count: u8,
    transmit_receive: bool,
    bus: Bus,  // A or B
    gap_time: u64,
}

struct Arinc429Word {
    label: u8,
    sdi: u8,
    data: u32,
    ssm: u8,
    parity: bool,
}
```

### Integration steps

1. **Add dependency** to `crates/irig106-studio-core/Cargo.toml`

2. **Implement `decode.rs`** (currently a stub):
   ```rust
   use irig106_decode::{decode_payload, DecodedData};

   impl Ch10File {
       pub fn decode_packet(&self, packet_index: usize) -> Result<DecodedData> {
           let entry = self.index().get(packet_index)
               .ok_or(StudioError::IndexOutOfRange { ... })?;
           let header = self.read_header(packet_index)?;
           let payload_offset = entry.file_offset + PACKET_HEADER_SIZE as u64;
           let payload = self.read_data(payload_offset, header.data_length as usize)?;
           let data_type = DataType::from_u8(entry.data_type)
               .unwrap_or(DataType::Computer0);
           decode_payload(data_type, payload, None)
       }
   }
   ```

3. **Add Tauri command:**
   ```rust
   #[tauri::command]
   fn decode_packet(
       packet_index: u64,
       state: State<'_, AppState>,
   ) -> Result<serde_json::Value, String> { ... }
   ```

4. **Add WASM method:**
   ```rust
   #[wasm_bindgen]
   pub fn decode_packet(&self, index: u32) -> Result<JsValue, JsError> { ... }
   ```

5. **Update frontend:**
   - Add `DecodedData` union type to `domain.ts`
   - New properties panel tab or expandable section for decoded data
   - 1553 bus monitor view (Phase 5.2)
   - Real waveform samples from decoded PCM/Analog data (Phase 5.1)

### Files to modify

| File | Change |
|------|--------|
| `crates/irig106-studio-core/Cargo.toml` | Add `irig106-decode` dep |
| `crates/irig106-studio-core/src/decode.rs` | Replace stub |
| `crates/irig106-studio-core/src/file.rs` | Add `decode_packet()` |
| `src-tauri/src/lib.rs` | Add `decode_packet` command |
| `crates/irig106-studio-wasm/src/lib.rs` | Add `decode_packet` method |
| `src/types/domain.ts` | Add decoded data types |
| `src/platform/adapter.ts` | Add `decodePacket()` to interface |
| `src/components/properties-panel.ts` | Decoded data display |
| `src/components/viewport.ts` | Real waveform data |

---

## Integration order

The recommended order when coming back:

1. **`irig106-time`** (when API stabilizes)
   - Smallest surface area, biggest UX impact (real timestamps everywhere)
   - ~100 lines of integration code

2. **`irig106-tmats`** (when available)
   - Medium surface area, nice UX improvement (real channel names)
   - ~50 lines in `summary.rs`, no frontend changes needed

3. **`irig106-decode`** (when available)
   - Largest surface area, unlocks everything else
   - ~200 lines in core crate + new frontend components
   - Should be done last because it triggers the most downstream work

---

## Version compatibility

The studio's `Cargo.toml` dependencies should use path references
during development and switch to version ranges for releases:

```toml
# Development (monorepo / adjacent checkouts):
irig106-time   = { path = "../../irig106-time" }
irig106-tmats  = { path = "../../irig106-tmats" }
irig106-decode = { path = "../../irig106-decode" }

# Release (from crates.io):
irig106-time   = "0.3"    # pin to minor version
irig106-tmats  = "0.1"
irig106-decode = "0.1"
```

The path-based approach lets you iterate on crate APIs without
publishing, which is ideal while the APIs are still evolving.

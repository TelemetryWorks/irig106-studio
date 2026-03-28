# ADR-006: Domain Type System as UI–Backend Contract

| Field         | Value                                   |
|---------------|-----------------------------------------|
| Status        | **Accepted**                            |
| Date          | 2026-03-28                              |
| Decision by   | Joey                                    |
| Traces to     | L1-APP-040, L1-FILE-010, L1-FILE-020    |

## Context

IRIG106-Studio has three layers that must agree on data shapes:

1. **TypeScript UI** — consumes domain objects to render panels
2. **Rust Tauri backend** — produces domain objects from Ch10 files
3. **Rust WASM module** — produces domain objects via wasm-bindgen

The Ch10 domain includes file metadata, channel descriptions, packet
headers, IRIG time values, and TMATS attributes. Changes to these
structures must propagate across all three layers without silent
breakage.

## Decision

Define a canonical set of domain types in `src/types/domain.ts` that
serves as the contract. The Rust backend mirrors these types with
`#[derive(Serialize, Deserialize)]` structs in `src-tauri/src/lib.rs`.
Tauri IPC serializes Rust structs to JSON; the TypeScript types define
the expected shape of that JSON.

### Core types

| TypeScript type   | Rust type           | Purpose                                      |
|-------------------|---------------------|----------------------------------------------|
| `Ch10FileInfo`    | `Ch10FileInfo`      | File-level metadata (name, size, duration)    |
| `Channel`         | `Channel`           | Single data channel (ID, type, label, rate)   |
| `DataSource`      | `DataSource`        | Group of channels from one recorder           |
| `Ch10Summary`     | `Ch10Summary`       | Composite: file info + data sources + TMATS   |
| `PacketHeader`    | `PacketHeader`      | Single packet header (sync, RTC, checksum)    |
| `IrigTime`        | *(in irig106-time)* | Parsed IRIG time (DOY, HMS, microseconds)     |
| `LogEntry`        | *(event payload)*   | Backend log message (timestamp, level, text)  |
| `DataType` (enum) | `u8` constants      | IRIG 106 Chapter 10 data type identifiers     |

### The `DataType` enum

The TypeScript `DataType` enum uses the actual hex values from the
IRIG 106 standard (e.g. `Mil1553_FmtA = 0x19`, `Pcm_FmtA = 0x09`).
The Rust side sends the raw `u8` value; the TypeScript side maps it
to a badge label and CSS class via `dataTypeBadge()`. This avoids
string-based data type identification and ensures the values match
the standard exactly.

## Rationale

1. **Single source of truth for the UI.** Every component that
   displays a channel, packet, or file property imports from
   `types/domain.ts`. There is no ad-hoc `{ id: number, name: string }`
   scattered across components.

2. **Serialization boundary is explicit.** The Rust types in `lib.rs`
   derive `Serialize`; the TypeScript types define the expected JSON
   shape. When a field is added to the Rust struct, the TypeScript
   type must be updated — and the compiler catches any component that
   doesn't handle the new field.

3. **Standard-aligned constants.** The `DataType` enum values are the
   actual IRIG 106 hex codes. This makes debugging trivial — a packet
   with `data_type: 0x19` is `Mil1553_FmtA` in both the spec and the
   code. No translation table needed.

4. **Helper functions live with the types.** `formatIrigTime()` and
   `dataTypeBadge()` are pure functions in `domain.ts` that format
   domain values for display. Components call these instead of
   implementing their own formatting. One change to time format
   propagates everywhere.

## Consequences

- **Manual sync between TS and Rust.** There is no code generation
  step. When the Rust types change, the TypeScript types must be
  updated manually. This is acceptable at the current scale (~6 types)
  and will be revisited if the type count grows significantly.

- **BigInt for RTC.** The 48-bit Relative Time Counter exceeds
  JavaScript's safe integer range (2^53). The TypeScript type uses
  `bigint`; the Rust type uses `u64`. Tauri serializes `u64` as a
  JSON number, which loses precision above 2^53. For production, this
  will need a string-based serialization strategy. Filed as a known
  issue.

- **No runtime validation.** The TypeScript types are compile-time
  only. If the Rust backend sends malformed JSON, the UI will not
  catch it gracefully. Adding `zod` or similar runtime validation is
  a future consideration for robustness.

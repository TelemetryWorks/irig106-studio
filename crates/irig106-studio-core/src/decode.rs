//! Data type decoders — decode raw packet payloads into structured data.
//!
//! Each IRIG 106 data type gets its own sub-module. Decoders consume
//! raw `&[u8]` payloads and produce typed structs.
//!
//! ## Status
//!
//! | Data Type       | Module          | Status      |
//! |-----------------|-----------------|-------------|
//! | MIL-STD-1553    | `mil1553`       | Not started |
//! | PCM             | `pcm`           | Not started |
//! | Time            | `time_data`     | Not started |
//! | ARINC 429       | `arinc429`      | Not started |
//! | Analog          | `analog`        | Not started |
//! | Discrete        | `discrete`      | Not started |
//! | Video           | `video`         | Not started |
//! | Ethernet        | `ethernet`      | Not started |
//! | UART            | `uart`          | Not started |
//! | Message         | `message`       | Not started |
//!
//! Requirements traced:
//!   L1-STD-020  Support all Ch10 data types

// Sub-modules will be added as decoders are implemented:
// pub mod mil1553;
// pub mod pcm;
// pub mod time_data;
// pub mod arinc429;
// pub mod analog;
// pub mod discrete;
// pub mod video;
// pub mod ethernet;
// pub mod uart;
// pub mod message;

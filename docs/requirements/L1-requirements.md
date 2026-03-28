# IRIG106-Studio — L1 Requirements

| Document    | IRIG106-Studio L1 Requirements Specification  |
|-------------|------------------------------------------------|
| Version     | 0.1.0                                          |
| Status      | Draft                                          |
| Date        | 2026-03-28                                     |
| Author      | Joey                                           |

## 1. Purpose

This document defines the top-level (L1) requirements for IRIG106-Studio,
an IRIG 106 Chapter 10/11 file visualization and analysis tool. L1
requirements express what the system SHALL do at the highest level of
abstraction. Each L1 requirement decomposes into one or more L2
requirements in `L2-requirements.md`.

## 2. Scope

IRIG106-Studio provides a desktop and browser-based application for
opening, inspecting, navigating, and visualizing Chapter 10 recordings.
The tool targets flight test engineers, instrumentation engineers, and
data analysts who need to examine telemetry data in Ch10 format.

## 3. Definitions

| Term           | Definition                                                                |
|----------------|---------------------------------------------------------------------------|
| Ch10           | IRIG 106 Chapter 10 recording file format                                |
| TMATS          | Telemetry Attributes Transfer Standard (IRIG 106 Chapter 9)              |
| RTC            | Relative Time Counter (48-bit packet timestamp)                           |
| Platform       | The runtime environment: browser (WASM) or desktop (Tauri)               |
| Viewport       | The main content area displaying waveform, hex, packets, or TMATS views  |

## 4. L1 Requirements

### 4.1 Application Shell

| ID          | Requirement                                                                                         | Rationale                             |
|-------------|-----------------------------------------------------------------------------------------------------|---------------------------------------|
| L1-APP-010  | The application SHALL display a docked panel layout with resizable sidebar, viewport, properties, and bottom panels. | Isaac Sim / Omniverse parity; industry-standard IDE-style layout for professional data tools. |
| L1-APP-020  | The application SHALL support keyboard-driven navigation for all primary actions.                    | Flight test engineers need hands-on-keyboard efficiency; mouse-only is unacceptable for production use. |
| L1-APP-030  | The application SHALL accept Chapter 10 files via drag-and-drop onto the application window.        | Reduces friction for the most common workflow (open file, inspect data). |
| L1-APP-040  | The application SHALL separate the user interface from all backend processing logic via a platform abstraction layer. | Enables dual deployment (browser + desktop) from a single codebase. |
| L1-APP-050  | The application SHALL run as both a browser application (via WASM) and a native desktop application (via Tauri). | Browser mode enables zero-install sharing; desktop mode enables native file I/O and mmap performance. |

### 4.2 File Operations

| ID          | Requirement                                                                                         | Rationale                             |
|-------------|-----------------------------------------------------------------------------------------------------|---------------------------------------|
| L1-FILE-010 | The system SHALL open IRIG 106 Chapter 10 files (.ch10, .c10) and parse their structure.            | Core capability — the tool exists to read Ch10 files. |
| L1-FILE-020 | The system SHALL parse and display TMATS metadata (Channel 0) from opened files.                    | TMATS provides channel configuration, data source labels, and recording metadata essential for interpretation. |
| L1-FILE-030 | The system SHALL build a channel index enumerating all data sources and channels in the file.        | Channel-oriented navigation is the primary interaction model. |
| L1-FILE-040 | The system SHALL validate packet checksums and report integrity errors.                              | Data integrity is non-negotiable in flight test. |

### 4.3 Navigation

| ID          | Requirement                                                                                         | Rationale                             |
|-------------|-----------------------------------------------------------------------------------------------------|---------------------------------------|
| L1-NAV-010  | The system SHALL display a hierarchical channel tree showing file → data sources → channels.        | Mirrors the IRIG 106 recording structure; provides spatial orientation. |
| L1-NAV-020  | The system SHALL allow the user to select a channel and display its properties.                      | Channel selection drives the viewport content and properties panel. |
| L1-NAV-030  | The system SHALL provide transport controls (play, pause, step forward, step backward, jump to start/end). | Time-based navigation is fundamental to telemetry analysis. |
| L1-NAV-040  | The system SHALL display the current IRIG time position in the toolbar.                             | The user must always know their temporal position in the recording. |

### 4.4 Visualization

| ID          | Requirement                                                                                         | Rationale                             |
|-------------|-----------------------------------------------------------------------------------------------------|---------------------------------------|
| L1-VIS-010  | The system SHALL display signal waveforms for selected channels.                                    | Waveform is the primary visualization for analog and digital data. |
| L1-VIS-020  | The system SHALL display a hex dump of raw packet data.                                             | Hex view is essential for protocol debugging and byte-level inspection. |
| L1-VIS-030  | The system SHALL display a tabular packet list with sortable columns.                               | Packet-level navigation for locating specific events. |
| L1-VIS-040  | The system SHALL display raw TMATS text with syntax awareness.                                      | Engineers need to read and verify TMATS configuration directly. |

### 4.5 Properties & Diagnostics

| ID          | Requirement                                                                                         | Rationale                             |
|-------------|-----------------------------------------------------------------------------------------------------|---------------------------------------|
| L1-PROP-010 | The system SHALL display properties for the selected channel including data type, packet count, and data rate. | Context for the channel under inspection. |
| L1-PROP-020 | The system SHALL display properties for the packet at the current cursor position.                   | Packet-level detail for the current playback position. |
| L1-DIAG-010 | The system SHALL provide a console log showing file operations, warnings, and errors.               | Operational visibility into what the tool is doing. |
| L1-DIAG-020 | The system SHALL provide file-level statistics (packet count, duration, file size, error count).     | Summary metrics for quick assessment. |
| L1-DIAG-030 | The system SHALL provide time correlation diagnostics (time source, format, RTC gaps).               | Time correlation is a known pain point in Ch10 analysis. |

### 4.6 Standards Compliance

| ID          | Requirement                                                                                         | Rationale                             |
|-------------|-----------------------------------------------------------------------------------------------------|---------------------------------------|
| L1-STD-010  | The system SHALL support IRIG 106 standard versions 106-04 through 106-23.                          | Covers the full range of Ch10 files in active use across DoD and industry. |
| L1-STD-020  | The system SHALL support all Chapter 10 data types defined in the applicable IRIG 106 standard.     | No data type should be unrepresentable. |
| L1-STD-030  | The system SHALL correctly parse all IRIG 106 time formats (IRIG-B, GPS, RTC, NTP).                | Time is the axis; getting it wrong invalidates everything. |

## 5. Verification Strategy

Each L1 requirement is verified through one or more of the following methods:

| Method        | Code | Description                                                |
|---------------|------|------------------------------------------------------------|
| Test          | T    | Automated unit/integration test                            |
| Demonstration | D    | Manual or automated demonstration of the feature           |
| Inspection    | I    | Code review or architectural review                        |
| Analysis      | A    | Design analysis or traceability review                     |

Verification assignments are recorded in the traceability matrix.

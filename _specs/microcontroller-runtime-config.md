# Feature Spec: Microcontroller Runtime Configuration

## Overview

ESP32 devices currently require recompilation and reflashing to change operational parameters such as relay thresholds and poll intervals. This feature adds a runtime configuration system: devices fetch their config from the Nuxt backend over HTTP, and operators manage config through a dedicated UI. Values are persisted on the device using ESP32 NVS flash so they survive reboots.

## Goals

- Allow relay thresholds and timing parameters to be changed without recompiling or reflashing firmware
- Provide a UI in the Nuxt dashboard for editing per-device config
- Persist config on the device across reboots using NVS
- Devices fall back to hardcoded defaults when no backend config exists

## Non-Goals

- Changing WiFi credentials or the backend URL at runtime (bootstrap dependency — device must be able to connect before it can fetch config)
- Changing MQTT broker credentials at runtime (same bootstrap concern)
- Camera firmware configuration (camera has no configurable operational parameters)
- OTA firmware updates

## User Stories

- As an operator, I want to adjust temperature thresholds from the dashboard without touching the device, so that I can tune the climate control without physical access
- As an operator, I want config changes to take effect within a minute of saving, so that I can see the result quickly
- As an operator, I want the device to remember its config after a power cycle, so that I don't need to reconnect it to the backend before it operates correctly

## Functional Requirements

### Backend API

- `GET /api/sensors/config/[id]` — returns the current config for a device; if no config exists, returns hardcoded defaults
- `PUT /api/sensors/config/[id]` — saves config values for a device

### Config Values (Sensor Firmware)

- Target temperature (`refTemp`) — already fetched; migrate to the new config endpoint
- Heater ON threshold offset (degrees below target)
- Heater OFF threshold offset (degrees above target)
- Fan ON threshold (absolute temperature)
- Sensor poll interval (seconds)
- Backend config fetch interval (seconds)

### Device Behaviour

- On boot, read config from NVS; use as operating values immediately (no network required)
- Poll `GET /api/sensors/config/{deviceId}` at the configured fetch interval
- On receiving new config, compare to stored NVS values; update NVS only when changed
- If the backend is unreachable, continue using NVS values
- If NVS is empty (first boot), use hardcoded defaults until first successful fetch

### Dashboard UI

- Config editor accessible from the sensor detail page (or a dedicated settings panel)
- Form fields for each configurable value with labels and units
- Save button calls `PUT /api/sensors/config/[id]`
- Display the last time the device fetched its config (via a `lastConfigFetch` timestamp the device sends)

## UI / UX

A "Configuration" section on the existing sensor detail page. Shows current stored values with editable inputs. Saving is explicit (button), not auto-save. No confirmation dialog needed — values are non-destructive and can be changed again at any time.

## Data Model

New SQLite table `sensor_config`:

| Column | Type | Description |
|---|---|---|
| sensor_id | TEXT (FK) | References the sensor |
| ref_temp | REAL | Target temperature |
| heater_on_offset | REAL | Degrees below target to turn heater on |
| heater_off_offset | REAL | Degrees above target to turn heater off |
| fan_threshold | REAL | Absolute temp to turn fan on |
| poll_interval | INTEGER | Sensor read interval in seconds |
| config_fetch_interval | INTEGER | How often device fetches config, in seconds |
| updated_at | TEXT | ISO timestamp of last UI save |

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/sensors/config/[id]` | Return config for device; defaults if none saved |
| PUT | `/api/sensors/config/[id]` | Save config for device |

The existing `GET /api/sensors/target/[id]` endpoint can be retired once the device firmware is updated to use the new config endpoint.

## Acceptance Criteria

- [ ] `GET /api/sensors/config/[id]` returns sensible defaults for an unconfigured device
- [ ] Saving values in the UI and waiting one poll cycle results in the device applying the new thresholds
- [ ] Restarting the device without network access still uses the last fetched config
- [ ] On first boot with no NVS data and no network, the device operates on hardcoded defaults
- [ ] The old `/api/sensors/target/[id]` endpoint is removed and the firmware no longer calls it

## Open Questions

- Should config fetch interval itself be configurable remotely? (If set too high, the device may take a long time to pick up the corrected value.)
- Should there be per-device defaults or one global default config used as fallback for all unconfigured devices?
- Should the UI show whether the device has acknowledged the latest config (i.e. fetched after the last `updated_at`)?

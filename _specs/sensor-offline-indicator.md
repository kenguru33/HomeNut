# Feature Spec: Sensor Offline Indicator

## Overview

Sensor devices publish readings periodically. If a sensor stops publishing — due to power loss, network failure, or firmware crash — the dashboard currently shows stale data with no indication that the device is offline. This feature adds an offline detection mechanism that marks a sensor as offline when its last reading is older than a configurable threshold, and visually indicates this state on all sensor components in the UI.

## Goals

- Detect when a sensor has not published a reading within the expected interval
- Show a clear offline indicator on the sensor card (Sensors page) and the sensor tile (room card)
- Ensure the indicator clears automatically when the sensor comes back online

## Non-Goals

- Push notifications or alerts when a sensor goes offline
- Storing offline history or downtime logs
- Distinguishing between different causes of offline state (network, power, firmware)
- Offline detection for camera sensors (they use a separate announcement mechanism)

## User Stories

- As an operator, I want to see at a glance which sensors are offline, so that I can investigate and restore them
- As an operator, I want the offline indicator to disappear automatically when the sensor starts reporting again, without any manual action

## Functional Requirements

### Offline Detection

- A sensor is considered offline if its `lastRecordedAt` timestamp is older than a threshold (suggested default: 5 minutes for temperature/humidity/motion sensors)
- The offline state is computed at render time from the existing `lastRecordedAt` field — no new backend job or database column required

### Sensor Card (Sensors Page)

- Offline sensors display a visible "Offline" badge or indicator overlaid on or near the sensor card
- The latest value is still shown but visually de-emphasised (dimmed) when offline
- The indicator disappears when the sensor reports a new reading within the threshold window

### Room Tile (Room Card)

- The temperature tile in a room card shows an offline indicator when the sensor is offline
- Same de-emphasis of the value when offline

## UI / UX

- Offline badge: small pill or label with text "Offline" in a muted red/amber colour
- Value text dims to indicate staleness (reduced opacity or grey colour)
- No modal, dialog, or tooltip required — the badge is self-explanatory
- The `lastRecordedAt` age already shown ("Xs ago", "Xm ago") provides context alongside the badge

## Data Model

No data model changes required. Offline state is derived from the existing `lastRecordedAt` timestamp.

## API

No API changes required.

## Acceptance Criteria

- [ ] A temperature or humidity sensor that has not reported for more than 5 minutes shows an "Offline" indicator on the Sensors page
- [ ] The same sensor shows an "Offline" indicator on its room tile
- [ ] The indicator disappears within one refresh cycle after the sensor resumes reporting
- [ ] A sensor with no readings ever recorded (`lastRecordedAt` is null) also shows as offline
- [ ] Camera and undetectable sensor types are unaffected

## Open Questions

- What is the right offline threshold? 5 minutes works for the default 5-second poll interval, but should it be configurable or tied to `config.pollInterval`?
- Should the value be hidden entirely when offline, or just dimmed?

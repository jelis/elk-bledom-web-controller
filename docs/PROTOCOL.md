# Bluetooth protocol

The "MELK-OA21 C8" controller belongs to the **ELK-BLEDOM** family. The app writes commands as 9-byte packets
(`7E … EF`) over BLE:

- Service `0000fff0-0000-1000-8000-00805f9b34fb`
- Characteristic `0000fff3-0000-1000-8000-00805f9b34fb` (Write Without Response)

The packets are built in `js/protocol.js` and verified in `test/protocol.test.js`.
The controller does not report its state back, so the app shows what it last sent.

## Commands

| Action               | Bytes                           | Source               | Verified on a real chain |
| -------------------- | ------------------------------- | -------------------- | ------------------------ |
| Color                | `7E 00 05 03 RR GG BB 00 EF`    | MELK-OA21 profile    | yes                      |
| On                   | `7E 04 04 F0 00 01 FF 00 EF`    | MELK-OA21 profile    | no                       |
| Off                  | `7E 04 04 00 00 00 FF 00 EF`    | MELK-OA21 profile    | no                       |
| Brightness 0–100     | `7E 04 01 XX 01 FF FF 00 EF`    | MELK-OA21 profile    | no                       |
| Effect speed 0–100   | `7E 04 02 XX FF FF FF 00 EF`    | MELK-OA21 profile    | no                       |
| Effect `0x87`–`0x9C` | `7E 05 03 MM 06 FF FF 00 EF`    | MELK-OA21 profile    | no                       |
| Set clock            | `7E 07 83 HH MM SS WT FF EF`    | Original app capture | no                       |
| Set alarm            | `7E 08 82 HH MM 00 TYP MASK EF` | Original app capture | no                       |
| Delete alarm         | `7E 08 82 FF FF FF TYP 00 EF`   | Original app capture | no                       |

The MELK-OA21 profile comes from the Home Assistant project
[dave-code-ruiz/elkbledom](https://github.com/dave-code-ruiz/elkbledom). More notes on the protocol family:
[8none1/elk-bledob](https://github.com/8none1/elk-bledob).

### Clock and alarms

- `TYP`: `0` = light on, `1` = light off. There is one slot per type.
- `MASK`: `0x80` plus one bit per weekday.
- `WT`: weekday of the clock. Saturday = `6` is confirmed by the capture.

**Still unverified** (not clearly readable from the capture):

1. Which bit belongs to which weekday. Assumed: bit 0 = Monday … bit 6 = Sunday.
2. Which value the clock uses for Sunday. Assumed: `7`.

If an alarm fires on the wrong day, item 1 is the cause. The order is defined in one place:
`ALL_DAYS`/`DAYS_SHORT` in `js/schedule.js` and the description in `alarm()` in `js/protocol.js`.

## Capture of the original app (Android HCI log)

The alarm and clock packets were read from a `btsnoop_hci` log (ATT writes `0x52` to handle `0x000c`).
Key packets from it, which also serve as test cases:

| Packet                                      | Meaning                            |
| ------------------------------------------- | ---------------------------------- |
| `7e078312240006ffef`                        | Clock: 18:36:00, Saturday (6)      |
| `7e088212250000ffef`                        | Light on at 18:37, all days        |
| `7e088207000001ffef`                        | Light off at 07:00, all days       |
| `7e0882ffffff0000ef` / `7e0882ffffff0100ef` | Light-on / light-off alarm deleted |

When the weekdays were tapped in the original app, the mask grew step by step: light on `81, 83, 87, 8f, 9f, bf, ff`,
light off `c0, e0, f0, f8, fc, fe, ff`. This shows one bit per day, but not in which order the days were tapped.

Note: this capture left a "light on 18:37" and a "light off 07:00" alarm in the chain. On first connect the app
overwrites both with the sun times.

## If on/off does not work

Some controllers in this family want two initialization packets before they accept on/off
(according to dave-code-ruiz/elkbledom): `7E 07 83 …` and `7E 04 04 …`. This is not implemented yet, because only the
color commands have been tested on this chain so far.

import { expect, it, vi } from "vitest";
import {
  connectG30,
  decodeG30Report,
  type G30HidDevice,
} from "../../../game/adapters/browser/G30WebHid";

const BASELINE = [
  200, 129, 0, 128, 0, 0, 200, 127, 0, 200, 127, 12, 0, 0, 255, 255,
  0, 0, 0, 0, 255, 255, 0, 0, 0, 0, 255, 255, 0, 0, 0, 0,
  255, 255, 0, 0, 0, 0, 255, 255, 0, 0, 0, 0, 255, 255, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

class FakeG30 extends EventTarget implements G30HidDevice {
  readonly vendorId = 0x057e;
  readonly productId = 0x2009;
  readonly productName = "THUNDEROBOT G30";
  opened = false;
  readonly open = vi.fn(async () => {
    this.opened = true;
  });
  readonly sendReport = vi.fn(async () => undefined);

  emit(bytes: Uint8Array): void {
    const event = new Event("inputreport");
    Object.defineProperties(event, {
      reportId: { value: 0x30 },
      data: {
        value: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
      },
    });
    this.dispatchEvent(event);
  }
}

it("validates the recorded report shape and decodes G30 buttons and packed sticks", () => {
  expect(decodeG30Report(0x20, new Uint8Array(BASELINE))).toBeNull();
  expect(decodeG30Report(0x30, new Uint8Array(62))).toBeNull();

  const report = new Uint8Array(BASELINE);
  report[2] |= 0x04;
  report[4] |= 0x02;
  report[5] = 0xff;
  report[6] = (report[6] & 0xf0) | 0x0f;

  expect(decodeG30Report(0x30, report)).toMatchObject({
    buttons: { a: true, dpadUp: true, b: false, dpadDown: false },
    leftStick: { x: 1, y: 0 },
    rightStick: { x: 0, y: 0 },
  });
});

it("opens an injected G30, publishes input, and detaches cleanly", async () => {
  const device = new FakeG30();
  const listener = vi.fn();
  const controller = await connectG30({ device, onInput: listener });

  expect(device.open).toHaveBeenCalledOnce();
  const pressed = new Uint8Array(BASELINE);
  pressed[2] |= 0x04;
  device.emit(pressed);

  expect(listener).toHaveBeenCalledOnce();
  expect(controller.state?.buttons.a).toBe(true);

  controller.disconnect();
  const released = new Uint8Array(BASELINE);
  device.emit(released);

  expect(listener).toHaveBeenCalledOnce();
  expect(controller.state?.buttons.a).toBe(true);
});

it("selects a second authorized G30 when the first device is already occupied", async () => {
  const first = new FakeG30();
  const second = new FakeG30();
  const getDevices = vi.fn(async () => [first, second]);
  const requestDevice = vi.fn(async () => [first, second]);
  vi.stubGlobal("navigator", { hid: { getDevices, requestDevice } });

  try {
    const controller = await connectG30({
      request: false,
      excludeDevices: [first],
    });
    expect(controller.device).toBe(second);
    expect(first.open).not.toHaveBeenCalled();
    expect(second.open).toHaveBeenCalledOnce();
    controller.disconnect();
  } finally {
    vi.unstubAllGlobals();
  }
});

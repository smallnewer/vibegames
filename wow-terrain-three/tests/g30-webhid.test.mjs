import assert from "node:assert/strict";
import test from "node:test";
import { connectG30, decodeG30Report } from "../app/g30-webhid.js";

const baseline = [
  200, 129, 0, 128, 0, 0, 200, 127, 0, 200, 127, 12, 0, 0, 255, 255,
  ...Array(47).fill(0),
];

function setPackedStick(bytes, offset, x, y) {
  bytes[offset] = x & 0xff;
  bytes[offset + 1] = ((x >> 8) & 0x0f) | ((y & 0x0f) << 4);
  bytes[offset + 2] = y >> 4;
}

test("decodes the recorded G30 buttons and physical stick directions", () => {
  const bytes = [...baseline];
  bytes[2] |= 0x04;
  bytes[4] |= 0x02;
  setPackedStick(bytes, 5, 3000, 3000);

  const state = decodeG30Report(0x30, bytes);
  assert.equal(state.buttons.a, true);
  assert.equal(state.buttons.dpadUp, true);
  assert.ok(state.leftStick.x > 0);
  assert.ok(state.leftStick.y > 0);
  assert.equal(decodeG30Report(0x21, bytes), null);
});

test("connects a supplied WebHID device, publishes input, and sends a rumble pulse", async () => {
  const device = new FakeHidDevice();
  const input = [];
  const controller = await connectG30({ device, onInput: (state) => input.push(state) });
  const bytes = [...baseline];
  bytes[2] |= 0x04;
  device.input(0x30, bytes);

  assert.equal(device.opened, true);
  assert.equal(input.length, 1);
  assert.equal(input[0].buttons.a, true);

  await controller.rumble(0);
  assert.deepEqual(device.reports.map(({ reportId }) => reportId), [0x01, 0x10, 0x10]);
  assert.equal(device.reports[1].data[1], 0x68);
  controller.disconnect();
});

class FakeHidDevice extends EventTarget {
  constructor() {
    super();
    this.vendorId = 0x057e;
    this.productId = 0x2009;
    this.productName = "THUNDEROBOT G30";
    this.opened = false;
    this.reports = [];
  }

  async open() {
    this.opened = true;
  }

  async sendReport(reportId, data) {
    this.reports.push({ reportId, data: [...data] });
  }

  input(reportId, bytes) {
    const event = new Event("inputreport");
    Object.assign(event, { reportId, data: new DataView(Uint8Array.from(bytes).buffer) });
    this.dispatchEvent(event);
  }
}

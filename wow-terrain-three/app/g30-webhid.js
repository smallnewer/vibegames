/**
 * THUNDEROBOT G30 WebHID ES Module（基于本机录制的映射）。
 *
 * connectG30() 首先复用已授权的 G30；需要首次授权时，必须从按钮点击事件中调用。
 */

export const G30_VENDOR_ID = 0x057e;
export const G30_PRODUCT_ID = 0x2009;

const INPUT_REPORT_ID = 0x30;
const INPUT_LENGTH = 63;
const BASELINE = [
  200, 129, 0, 128, 0, 0, 200, 127, 0, 200, 127, 12, 0, 0, 255, 255,
  0, 0, 0, 0, 255, 255, 0, 0, 0, 0, 255, 255, 0, 0, 0, 0,
  255, 255, 0, 0, 0, 0, 255, 255, 0, 0, 0, 0, 255, 255, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

const BUTTONS = {
  dpadUp: { byte: 4, mask: 0x02 },
  dpadDown: { byte: 4, mask: 0x01 },
  dpadLeft: { byte: 4, mask: 0x08 },
  dpadRight: { byte: 4, mask: 0x04 },
  a: { byte: 2, mask: 0x04 },
  b: { byte: 2, mask: 0x08 },
  x: { byte: 2, mask: 0x01 },
  y: { byte: 2, mask: 0x02 },
  lb: { byte: 4, mask: 0x40 },
  lt: { byte: 4, mask: 0x80 },
  rb: { byte: 2, mask: 0x40 },
  rt: { byte: 2, mask: 0x80 },
};

const asBytes = (data) => {
  if (data instanceof Uint8Array) return data;
  if (data instanceof DataView) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return new Uint8Array(data);
};

const readPacked12Low = (bytes, offset) => bytes[offset] | ((bytes[offset + 1] & 0x0f) << 8);
const readPacked12High = (bytes, offset) => (bytes[offset + 1] >> 4) | (bytes[offset + 2] << 4);

function normalize(raw, center) {
  const delta = raw - center;
  const range = delta >= 0 ? 4095 - center : center;
  const value = Math.max(-1, Math.min(1, delta / range));
  return Math.abs(value) < 0.08 ? 0 : value;
}

/** Decode one raw G30 WebHID input report. Stick y is positive for physical “up”. */
export function decodeG30Report(reportId, reportData) {
  if (reportId !== INPUT_REPORT_ID) return null;
  const bytes = asBytes(reportData);
  if (bytes.length !== INPUT_LENGTH) return null;

  return {
    buttons: Object.fromEntries(Object.entries(BUTTONS).map(([name, bit]) => [
      name,
      (bytes[bit.byte] & bit.mask) !== (BASELINE[bit.byte] & bit.mask),
    ])),
    leftStick: {
      x: normalize(readPacked12Low(bytes, 5), 2048),
      y: normalize(readPacked12High(bytes, 5), 2044),
    },
    rightStick: {
      x: normalize(readPacked12Low(bytes, 8), 2048),
      y: normalize(readPacked12High(bytes, 8), 2044),
    },
  };
}

function assertG30(device) {
  if (!device || device.vendorId !== G30_VENDOR_ID || device.productId !== G30_PRODUCT_ID) {
    throw new Error("请选择 THUNDEROBOT G30（USB VID 057e / PID 2009）。");
  }
}

async function findDevice(request) {
  const hid = globalThis.navigator?.hid;
  if (!hid) throw new Error("当前浏览器不支持 WebHID。请使用 macOS Edge 或 Chrome。");

  const granted = await hid.getDevices();
  const saved = granted.find(
    (device) => device.vendorId === G30_VENDOR_ID && device.productId === G30_PRODUCT_ID,
  );
  if (saved) return saved;
  if (!request) throw new Error("G30 尚未获得 WebHID 授权。");

  const selected = await hid.requestDevice({
    filters: [{ vendorId: G30_VENDOR_ID, productId: G30_PRODUCT_ID }],
  });
  if (!selected[0]) throw new Error("未选择 THUNDEROBOT G30。");
  return selected[0];
}

function rumblePacket(reportId, counter, payload) {
  const data = new Uint8Array(63);
  data[0] = counter;
  data.set(payload, 1);
  return { reportId, data };
}

async function sendRumble(device, durationMs) {
  const enable = rumblePacket(
    0x01,
    0,
    [0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40, 0x48, 0x01],
  );
  const active = rumblePacket(0x10, 1, [0x68, 0x48, 0x3a, 0x52, 0x98, 0x48, 0x46, 0x52]);
  const stop = rumblePacket(
    0x10,
    2,
    [0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40],
  );
  await device.sendReport(enable.reportId, enable.data);
  await device.sendReport(active.reportId, active.data);
  await new Promise((resolve) => setTimeout(resolve, Math.max(20, durationMs)));
  await device.sendReport(stop.reportId, stop.data);
}

/**
 * Open G30, listen for input reports, and return the controller handle.
 * Set request:false on page load to attempt only an already granted device.
 */
export async function connectG30({ device = null, onInput = null, request = true } = {}) {
  const selected = device ?? await findDevice(request);
  assertG30(selected);
  if (!selected.opened) await selected.open();

  const listeners = new Set();
  if (typeof onInput === "function") listeners.add(onInput);
  let state = null;
  const handleInput = (event) => {
    const next = decodeG30Report(event.reportId, event.data);
    if (!next) return;
    state = next;
    for (const listener of listeners) listener(next);
  };
  selected.addEventListener("inputreport", handleInput);

  return {
    device: selected,
    get state() {
      return state;
    },
    onInput(listener) {
      if (typeof listener !== "function") throw new TypeError("onInput listener must be a function.");
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    rumble(durationMs = 160) {
      return sendRumble(selected, durationMs);
    },
    disconnect() {
      selected.removeEventListener("inputreport", handleInput);
      listeners.clear();
    },
  };
}

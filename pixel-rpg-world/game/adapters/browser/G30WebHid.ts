/**
 * THUNDEROBOT G30 WebHID adapter based on the reports recorded for the
 * physical controller. Stick Y is positive when pushed physically upward.
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
] as const;

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
} as const;

export type G30Button = keyof typeof BUTTONS;

export interface G30State {
  readonly buttons: Readonly<Record<G30Button, boolean>>;
  readonly leftStick: Readonly<{ x: number; y: number }>;
  readonly rightStick: Readonly<{ x: number; y: number }>;
}

export interface G30HidDevice extends EventTarget {
  readonly vendorId: number;
  readonly productId: number;
  readonly productName?: string;
  opened: boolean;
  open(): Promise<void>;
  sendReport(reportId: number, data: Uint8Array): Promise<void>;
}

interface G30HidApi {
  getDevices(): Promise<readonly G30HidDevice[]>;
  requestDevice(options: {
    filters: readonly { vendorId: number; productId: number }[];
  }): Promise<readonly G30HidDevice[]>;
}

interface G30InputReportEvent extends Event {
  readonly reportId: number;
  readonly data: DataView;
}

export interface G30Controller {
  readonly device: G30HidDevice;
  readonly state: G30State | null;
  onInput(listener: (state: G30State) => void): () => void;
  rumble(durationMs?: number): Promise<void>;
  disconnect(): void;
}

export interface G30ConnectOptions {
  readonly device?: G30HidDevice | null;
  readonly excludeDevices?: readonly G30HidDevice[];
  readonly onInput?: ((state: G30State) => void) | null;
  readonly request?: boolean;
}

export type G30ReportData = ArrayBufferLike | ArrayBufferView | ArrayLike<number>;

function asBytes(data: G30ReportData): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (typeof SharedArrayBuffer !== "undefined" && data instanceof SharedArrayBuffer) {
    return new Uint8Array(data);
  }
  return Uint8Array.from(data);
}

const readPacked12Low = (bytes: Uint8Array, offset: number) => (
  bytes[offset] | ((bytes[offset + 1] & 0x0f) << 8)
);

const readPacked12High = (bytes: Uint8Array, offset: number) => (
  (bytes[offset + 1] >> 4) | (bytes[offset + 2] << 4)
);

function normalize(raw: number, center: number): number {
  const delta = raw - center;
  const range = delta >= 0 ? 4095 - center : center;
  const value = Math.max(-1, Math.min(1, delta / range));
  return Math.abs(value) < 0.08 ? 0 : value;
}

export function decodeG30Report(
  reportId: number,
  reportData: G30ReportData,
): G30State | null {
  if (reportId !== INPUT_REPORT_ID) return null;
  const bytes = asBytes(reportData);
  if (bytes.length !== INPUT_LENGTH) return null;

  const buttons = Object.fromEntries(
    Object.entries(BUTTONS).map(([name, bit]) => [
      name,
      (bytes[bit.byte] & bit.mask) !== (BASELINE[bit.byte] & bit.mask),
    ]),
  ) as Record<G30Button, boolean>;

  return {
    buttons,
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

function getHid(): G30HidApi | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { hid?: G30HidApi }).hid;
}

function assertG30(device: G30HidDevice | null | undefined): asserts device is G30HidDevice {
  if (
    !device
    || device.vendorId !== G30_VENDOR_ID
    || device.productId !== G30_PRODUCT_ID
  ) {
    throw new Error("请选择 THUNDEROBOT G30（USB VID 057e / PID 2009）。");
  }
}

async function findDevice(
  request: boolean,
  excludeDevices: readonly G30HidDevice[],
): Promise<G30HidDevice> {
  const hid = getHid();
  if (!hid) throw new Error("当前浏览器不支持 WebHID。请使用 macOS Edge 或 Chrome。");
  const excluded = new Set(excludeDevices);

  const granted = await hid.getDevices();
  const saved = granted.find((device) => (
    device.vendorId === G30_VENDOR_ID && device.productId === G30_PRODUCT_ID
    && !excluded.has(device)
  ));
  if (saved) return saved;
  if (!request) {
    throw new Error(granted.some((device) => (
      device.vendorId === G30_VENDOR_ID && device.productId === G30_PRODUCT_ID
    ))
      ? "没有空闲的 G30；另一只手柄尚未获得 WebHID 授权。"
      : "G30 尚未获得 WebHID 授权。");
  }

  const selected = await hid.requestDevice({
    filters: [{ vendorId: G30_VENDOR_ID, productId: G30_PRODUCT_ID }],
  });
  const available = selected.find((device) => !excluded.has(device));
  if (!available) {
    throw new Error(selected.length > 0
      ? "这只 G30 已分配给另一位玩家，请选择另一只手柄。"
      : "未选择 THUNDEROBOT G30。");
  }
  return available;
}

function rumblePacket(
  reportId: number,
  counter: number,
  payload: readonly number[],
): { reportId: number; data: Uint8Array } {
  const data = new Uint8Array(63);
  data[0] = counter;
  data.set(payload, 1);
  return { reportId, data };
}

async function sendRumble(device: G30HidDevice, durationMs: number): Promise<void> {
  const enable = rumblePacket(
    0x01,
    0,
    [0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40, 0x48, 0x01],
  );
  const active = rumblePacket(
    0x10,
    1,
    [0x68, 0x48, 0x3a, 0x52, 0x98, 0x48, 0x46, 0x52],
  );
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

export async function connectG30({
  device = null,
  excludeDevices = [],
  onInput = null,
  request = true,
}: G30ConnectOptions = {}): Promise<G30Controller> {
  const selected = device ?? await findDevice(request, excludeDevices);
  assertG30(selected);
  if (!selected.opened) await selected.open();

  const listeners = new Set<(state: G30State) => void>();
  if (onInput) listeners.add(onInput);
  let state: G30State | null = null;
  const handleInput = (source: Event) => {
    const event = source as G30InputReportEvent;
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
      if (typeof listener !== "function") {
        throw new TypeError("onInput listener must be a function.");
      }
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

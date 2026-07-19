export type G30Buttons = {
  dpadUp: boolean;
  dpadDown: boolean;
  dpadLeft: boolean;
  dpadRight: boolean;
  a: boolean;
  b: boolean;
  x: boolean;
  y: boolean;
  lb: boolean;
  lt: boolean;
  rb: boolean;
  rt: boolean;
};

export type G30State = {
  buttons: G30Buttons;
  leftStick: { x: number; y: number };
  rightStick: { x: number; y: number };
};

export type G30HidDevice = EventTarget & {
  vendorId: number;
  productId: number;
  productName?: string;
  opened: boolean;
  open(): Promise<void>;
  sendReport(reportId: number, data: Uint8Array): Promise<void>;
};

export type G30Controller = {
  device: G30HidDevice;
  readonly state: G30State | null;
  onInput(listener: (state: G30State) => void): () => void;
  rumble(durationMs?: number): Promise<void>;
  disconnect(): void;
};

export const G30_VENDOR_ID: number;
export const G30_PRODUCT_ID: number;

export function decodeG30Report(
  reportId: number,
  reportData: ArrayBufferLike | ArrayBufferView | ArrayLike<number>,
): G30State | null;

export function connectG30(options?: {
  device?: G30HidDevice | null;
  onInput?: ((state: G30State) => void) | null;
  request?: boolean;
}): Promise<G30Controller>;

import type { UiPage } from "./UiState";

export type UiInput =
  | { readonly type: "open" }
  | { readonly type: "close" }
  | { readonly type: "back" }
  | { readonly type: "move_focus"; readonly x: -1 | 0 | 1; readonly y: -1 | 0 | 1 }
  | { readonly type: "confirm" }
  | { readonly type: "secondary" }
  | { readonly type: "favorite" }
  | { readonly type: "next_page" }
  | { readonly type: "previous_page" }
  | { readonly type: "next_hero" }
  | { readonly type: "previous_hero" }
  | { readonly type: "select_focus"; readonly id: string }
  | { readonly type: "select_page"; readonly page: UiPage };

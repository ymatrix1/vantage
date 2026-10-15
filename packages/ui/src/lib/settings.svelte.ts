// Page settings kept on this machine only. Today: the dot style (D183). Colour is the default; the
// colour-blind friendly style is the shape-first one (ring, half, dash) with a colour-blind-safe palette.
const KEY = "vantage.cb";

function read(): boolean {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("cb");
    if (fromUrl === "1" || fromUrl === "0") {
      localStorage.setItem(KEY, fromUrl);
      return fromUrl === "1";
    }
    return localStorage.getItem(KEY) === "1";
  } catch {
    // Storage blocked: the default (colour) applies and the choice lasts until reload.
    return false;
  }
}

export const settings = $state({ cb: false });

function apply(): void {
  if (settings.cb) document.documentElement.dataset["cb"] = "1";
  else delete document.documentElement.dataset["cb"];
}

/** Reads the saved choice (and `?cb=1`) once, at start. */
export function loadSettings(): void {
  settings.cb = read();
  apply();
}

export function setColourBlind(on: boolean): void {
  settings.cb = on;
  apply();
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    // Not saved; fine.
  }
}

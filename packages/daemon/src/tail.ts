import { closeSync, fstatSync, openSync, readSync } from "node:fs";

export interface TailResult {
  lines: string[];
  /** Offset just past the last complete line; store it as the new cursor. */
  nextOffset: number;
}

/** Reads complete lines from `offset`. A trailing partial line is left for the next pass. */
export function tailLines(path: string, offset: number): TailResult {
  const fd = openSync(path, "r");
  try {
    const size = fstatSync(fd).size;
    // A shorter file than the cursor means it was replaced; start over (events dedupe anyway).
    const start = offset > size ? 0 : offset;
    const buf = Buffer.alloc(size - start);
    let read = 0;
    while (read < buf.length) {
      const n = readSync(fd, buf, read, buf.length - read, start + read);
      if (n === 0) break;
      read += n;
    }
    const end = buf.subarray(0, read).lastIndexOf(0x0a);
    if (end < 0) return { lines: [], nextOffset: start };
    const lines = buf
      .subarray(0, end)
      .toString("utf8")
      .split("\n")
      .filter((l) => l.trim() !== "");
    return { lines, nextOffset: start + end + 1 };
  } finally {
    closeSync(fd);
  }
}

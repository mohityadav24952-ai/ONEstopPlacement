import { describe, expect, it } from "vitest";
import { createZip } from "@/features/site-builder/lib/zip";

const enc = new TextEncoder();

/** Reads the archive back the way an unzip tool does: end-of-central-directory -> central directory -> local headers. */
function readZip(bytes: Uint8Array): { name: string; data: string; crc: number }[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = bytes.length - 22;
  expect(view.getUint32(eocd, true)).toBe(0x06054b50);
  const count = view.getUint16(eocd + 10, true);
  let at = view.getUint32(eocd + 16, true);
  const out = [];
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 24, true);
    const nameLen = view.getUint16(at + 28, true);
    const extra = view.getUint16(at + 30, true);
    const comment = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLen));
    expect(view.getUint32(local, true)).toBe(0x04034b50);
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    out.push({ name, crc, data: new TextDecoder().decode(bytes.subarray(start, start + size)) });
    at += 46 + nameLen + extra + comment;
  }
  return out;
}

describe("createZip", () => {
  it("writes entries an unzip tool can read back, with correct CRC-32", () => {
    const zip = createZip([
      { name: "index.html", data: enc.encode("hello") },
      { name: "assets/style-1.css", data: enc.encode("body{}") },
    ], new Date(2026, 0, 2, 3, 4, 6));
    const entries = readZip(zip);
    expect(entries.map((e) => [e.name, e.data])).toEqual([["index.html", "hello"], ["assets/style-1.css", "body{}"]]);
    expect(entries[0].crc).toBe(0x3610a686); // CRC-32 of "hello"
  });

  it("handles an empty file and UTF-8 names", () => {
    const entries = readZip(createZip([{ name: "fonts/ñ.txt", data: new Uint8Array() }]));
    expect(entries).toEqual([{ name: "fonts/ñ.txt", data: "", crc: 0 }]);
  });
});

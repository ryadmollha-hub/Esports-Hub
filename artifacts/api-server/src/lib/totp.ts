import { createHmac, randomBytes } from "crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let result = "";
  let bits = 0;
  let value = 0;
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) result += ALPHABET[(value << (5 - bits)) & 31];
  return result;
}

function base32Decode(input: string): Buffer {
  const lookup: Record<string, number> = {};
  ALPHABET.split("").forEach((c, i) => { lookup[c] = i; });
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of input.toUpperCase().replace(/=+$/, "")) {
    if (lookup[char] === undefined) continue;
    value = (value << 5) | lookup[char];
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) { buf[i] = c & 0xff; c >>>= 8; }
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, "0");
}

export function generateTOTPSecret(): string {
  return base32Encode(randomBytes(20));
}

export function verifyTOTP(secret: string, token: string, window = 1): boolean {
  const buf = base32Decode(secret);
  const counter = Math.floor(Date.now() / 30_000);
  for (let i = -window; i <= window; i++) {
    if (hotp(buf, counter + i) === token.trim()) return true;
  }
  return false;
}

export function getTOTPUri(secret: string, label: string): string {
  return `otpauth://totp/${encodeURIComponent("FFArena:" + label)}?secret=${secret}&issuer=FFArena&algorithm=SHA1&digits=6&period=30`;
}

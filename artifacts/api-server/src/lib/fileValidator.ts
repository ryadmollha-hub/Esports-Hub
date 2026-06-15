const ALLOWED_PREFIXES = [
  "data:image/jpeg;base64,",
  "data:image/jpg;base64,",
  "data:image/png;base64,",
  "data:image/webp;base64,",
  "data:image/gif;base64,",
];

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateBase64Image(value: string | null | undefined): { valid: boolean; error?: string } {
  if (!value) return { valid: true };
  const prefix = ALLOWED_PREFIXES.find((p) => value.startsWith(p));
  if (!prefix) {
    return { valid: false, error: "Only JPEG, PNG, WebP, or GIF images are allowed." };
  }
  const b64 = value.slice(prefix.length);
  const approxBytes = Math.ceil((b64.length * 3) / 4);
  if (approxBytes > MAX_BYTES) {
    return { valid: false, error: "Image must be smaller than 5 MB." };
  }
  if (!/^[A-Za-z0-9+/]+=*$/.test(b64)) {
    return { valid: false, error: "Invalid image data." };
  }
  return { valid: true };
}

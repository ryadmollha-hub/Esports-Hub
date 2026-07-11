import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET ?? "ff-arena-jwt-secret-2026";

const POOL = [
  { q: "What is 3 + 7?", a: "10" },
  { q: "What is 12 - 5?", a: "7" },
  { q: "What is 4 × 3?", a: "12" },
  { q: "What is 20 ÷ 4?", a: "5" },
  { q: "What is 8 + 6?", a: "14" },
  { q: "What is 15 - 8?", a: "7" },
  { q: "What is 9 + 4?", a: "13" },
  { q: "What is 25 - 9?", a: "16" },
  { q: "What is 6 × 2?", a: "12" },
  { q: "What is 18 ÷ 3?", a: "6" },
  { q: "What is 5 + 9?", a: "14" },
  { q: "What is 11 - 4?", a: "7" },
];

export function generateCaptcha(): { token: string; question: string } {
  const item = POOL[Math.floor(Math.random() * POOL.length)];
  const token = jwt.sign({ answer: item.a }, SECRET, { expiresIn: "5m" });
  return { token, question: item.q };
}

export function verifyCaptcha(token: string, answer: string): boolean {
  try {
    const payload = jwt.verify(token, SECRET) as { answer: string };
    return payload.answer === answer.trim();
  } catch {
    return false;
  }
}

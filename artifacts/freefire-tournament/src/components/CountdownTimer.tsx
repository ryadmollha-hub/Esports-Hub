import { useState, useEffect } from "react";
import { parseBDDate } from "@/lib/bdTime";

interface CountdownTimerProps {
  targetDate: string | Date;
  className?: string;
  onExpire?: () => void;
}

/**
 * Timezone-safe countdown timer anchored to Bangladesh Standard Time (UTC+6).
 *
 * The diff is computed as:
 *   target (UTC ms, interpreted as BD time if naive) − Date.now() (always UTC ms)
 *
 * This is mathematically timezone-independent: both sides are UTC epoch milliseconds.
 * The only source of error would be if `new Date(naiveString)` misread the timezone —
 * which parseBDDate prevents by explicitly stamping +06:00 on naive strings.
 *
 * Works identically on every server, container, account, or browser locale.
 */
export default function CountdownTimer({ targetDate, className = "", onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    // parseBDDate: treats timezone-naive strings as UTC+6 (Bangladesh).
    // Date.now(): always UTC epoch ms — never reads system timezone.
    const targetMs = parseBDDate(targetDate).getTime();

    const calc = () => {
      const diff = targetMs - Date.now();
      if (diff <= 0) {
        setExpired(true);
        return;
      }
      setTimeLeft({
        days:    Math.floor(diff / 86_400_000),
        hours:   Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1_000),
      });
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  // Notify parent exactly once when the countdown crosses zero
  useEffect(() => {
    if (expired && onExpire) onExpire();
  }, [expired, onExpire]);

  if (expired) {
    return (
      <div className={`flex gap-1 items-center ${className}`} data-testid="countdown-timer">
        <span className="font-mono font-black text-[#00ff88]">MATCH IS LIVE</span>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className={`flex gap-1 items-center ${className}`} data-testid="countdown-timer">
      {[
        { v: timeLeft.days,    l: "D" },
        { v: timeLeft.hours,   l: "H" },
        { v: timeLeft.minutes, l: "M" },
        { v: timeLeft.seconds, l: "S" },
      ].map(({ v, l }, i) => (
        <span key={l}>
          <span className="font-mono font-bold text-[#ff6b00]">{pad(v)}</span>
          <span className="text-[#a0a0b0] text-xs ml-0.5">{l}</span>
          {i < 3 && <span className="text-[#ff6b00] mx-1">:</span>}
        </span>
      ))}
    </div>
  );
}

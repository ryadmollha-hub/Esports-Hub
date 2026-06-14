import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: string | Date;
  className?: string;
}

export default function CountdownTimer({ targetDate, className = "" }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const calc = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) { setExpired(true); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (expired) {
    return <span className={`text-[#ff2244] font-bold ${className}`}>Started</span>;
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className={`flex gap-1 items-center ${className}`} data-testid="countdown-timer">
      {[
        { v: timeLeft.days, l: "D" },
        { v: timeLeft.hours, l: "H" },
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

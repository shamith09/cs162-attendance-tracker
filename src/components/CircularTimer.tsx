import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import { useEffect, useState } from "react";

interface CircularTimerProps {
  expiryDate: Date;
  totalDurationMs: number;
  isFlashing?: boolean;
  size?: "sm" | "lg";
}

export function CircularTimer({
  expiryDate,
  totalDurationMs,
  isFlashing = false,
  size = "sm",
}: CircularTimerProps) {
  const [percentage, setPercentage] = useState(100);
  const [timeText, setTimeText] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(0, expiryDate.getTime() - now.getTime());
      setPercentage((remaining / totalDurationMs) * 100);

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.ceil((remaining % 60000) / 1000);
      setTimeText(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 50);

    return () => clearInterval(interval);
  }, [expiryDate, totalDurationMs]);

  return (
    <div className={size === "sm" ? "w-32 h-32" : "w-40 h-40"}>
      <CircularProgressbar
        value={percentage}
        text={timeText}
        styles={buildStyles({
          textSize: "20px",
          pathColor: isFlashing ? "rgb(239, 68, 68)" : "hsl(var(--primary))",
          textColor: isFlashing ? "rgb(239, 68, 68)" : "currentColor",
          trailColor: "hsl(var(--muted))",
          strokeLinecap: "round",
          pathTransitionDuration: 0.1,
        })}
      />
    </div>
  );
}

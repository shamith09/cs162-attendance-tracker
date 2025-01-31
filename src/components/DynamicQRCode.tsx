import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";

interface DynamicQRCodeProps {
  code: string;
  codeExpiry: Date | null;
  isFlashing: boolean;
  expirationSeconds: number;
}

export function DynamicQRCode({
  code,
  codeExpiry,
  isFlashing,
  expirationSeconds,
}: DynamicQRCodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<"row" | "column">("column");
  const [qrSize, setQrSize] = useState(200);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      
      // If width is greater than height and we have enough space for side-by-side
      if (width > height && width > 700) {
        setLayout("row");
        setQrSize(Math.min(height * 0.8, width * 0.6));
      } else {
        setLayout("column");
        setQrSize(Math.min(width * 0.8, height * 0.6));
      }
    };

    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  function getRemainingTimePercentage(expiryDate: Date, totalDurationMs: number): number {
    const now = new Date();
    const remaining = expiryDate.getTime() - now.getTime();
    if (remaining <= 0) return 0;
    return Math.min(100, (remaining / totalDurationMs) * 100);
  }

  function formatRemainingTime(expiryDate: Date): string {
    const now = new Date();
    const remaining = Math.max(0, expiryDate.getTime() - now.getTime());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.ceil((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <div className={`flex ${layout === "row" ? "flex-row" : "flex-col"} items-center gap-8`}>
        <div className="flex flex-col items-center gap-4">
          <p className="text-4xl font-mono font-bold text-foreground">
            {code.split("/").pop()?.slice(-6).toUpperCase()}
          </p>
          <QRCodeSVG
            value={code}
            size={qrSize}
            className="bg-white dark:bg-black p-4 rounded-lg"
          />
        </div>
        {codeExpiry && (
          <div className={`${layout === "row" ? "w-40" : "w-32"} aspect-square`}>
            <CircularProgressbar
              value={getRemainingTimePercentage(
                codeExpiry,
                expirationSeconds * 1000
              )}
              text={formatRemainingTime(codeExpiry)}
              styles={buildStyles({
                textSize: "20px",
                pathColor: isFlashing
                  ? "rgb(239, 68, 68)"
                  : "hsl(var(--primary))",
                textColor: isFlashing
                  ? "rgb(239, 68, 68)"
                  : "currentColor",
                trailColor: "hsl(var(--muted))",
                strokeLinecap: "round",
                pathTransitionDuration: 0.5,
              })}
            />
          </div>
        )}
      </div>
    </div>
  );
} 
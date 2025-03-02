import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CircularTimer } from "./CircularTimer";

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

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center"
    >
      <div
        className={`flex ${layout === "row" ? "flex-row" : "flex-col"} items-center gap-8`}
      >
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
          <CircularTimer
            expiryDate={codeExpiry}
            totalDurationMs={expirationSeconds * 1000}
            isFlashing={isFlashing}
            size={layout === "row" ? "lg" : "sm"}
          />
        )}
      </div>
    </div>
  );
}

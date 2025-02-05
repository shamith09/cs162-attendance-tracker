"use client";

import { PulseLoader } from "react-spinners";

interface LoadingSpinnerProps {
  text?: string;
}

export function LoadingSpinner({ text = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center gap-2">
      <PulseLoader
        color="currentColor"
        size={6}
        margin={2}
        speedMultiplier={0.75}
      />
      <span className="text-sm">{text}</span>
    </div>
  );
}

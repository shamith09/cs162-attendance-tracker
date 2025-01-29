'use client';

import { PulseLoader } from "react-spinners";

interface LoadingSpinnerProps {
  text?: string;
}

export function LoadingSpinner({ text = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <PulseLoader
        color="currentColor"
        size={10}
        margin={4}
        speedMultiplier={0.75}
      />
      <p className="text-sm">{text}</p>
    </div>
  );
} 
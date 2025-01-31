import { ThemeToggle } from "@/components/ThemeToggle";
import Image from "next/image";
import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="grid min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="absolute top-6 left-6 flex gap-2 justify-center z-40">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 font-medium text-foreground"
        >
          <Image
            src="/logo.png"
            alt="CS 162 Logo"
            width={24}
            height={24}
            className="h-6 w-auto"
          />
          CS 162 Attendance
        </Link>
      </div>
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-green-600 dark:text-green-500">
                Attendance Marked
              </h1>
              <p className="text-sm text-muted-foreground">
                Your attendance has been successfully recorded.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

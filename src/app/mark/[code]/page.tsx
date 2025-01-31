"use client";

import { useEffect, useState, use } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { TestLogin } from "@/components/TestLogin";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function MarkAttendance({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isMarking, setIsMarking] = useState(true);
  const [isValidCode, setIsValidCode] = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  // Validate code on initial load
  useEffect(() => {
    const validateCode = async () => {
      try {
        const res = await fetch("/api/attendance/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          const data = await res.json();
          if (data.error === "Code expired") {
            setError("This attendance code has expired.");
          } else {
            setError("Invalid attendance code. Please try again.");
          }
        } else {
          setIsValidCode(true);
        }
      } catch (error) {
        console.error(error);
        setError("An error occurred. Please try again.");
      } finally {
        setIsValidating(false);
      }
    };

    validateCode();
  }, [code]);

  // Mark attendance after login
  useEffect(() => {
    if (status === "loading" || isValidating) return;
    if (!session || !isValidCode) return;

    const markAttendance = async () => {
      try {
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(
            data.error || "Failed to mark attendance. Please try again."
          );
        } else if (data.success) {
          router.push("/success");
        } else {
          setError("Failed to mark attendance. Please try again.");
        }
      } catch (error) {
        console.error(error);
        setError("An error occurred. Please try again.");
      } finally {
        setIsMarking(false);
      }
    };

    markAttendance();
  }, [session, status, router, code, isValidCode, isValidating]);

  if (status === "loading" || isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <LoadingSpinner />
      </div>
    );
  }

  if (!session) {
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
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Sign in to mark attendance
                </h1>
                <p className="text-sm text-muted-foreground">
                  Choose a sign-in method to continue
                </p>
              </div>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 dark:bg-background dark:hover:bg-background/80"
                    onClick={() =>
                      signIn("google", { callbackUrl: `/mark/${code}` })
                    }
                  >
                    <Image
                      src="https://authjs.dev/img/providers/google.svg"
                      alt="Google"
                      width={20}
                      height={20}
                    />
                    <span className="text-black">Sign in with Google</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 dark:bg-background dark:hover:bg-background/80"
                    onClick={() =>
                      signIn("github", { callbackUrl: `/mark/${code}` })
                    }
                  >
                    <Image
                      src="https://authjs.dev/img/providers/github.svg"
                      alt="GitHub"
                      width={20}
                      height={20}
                      className="dark:invert"
                    />
                    <span className="text-black">Sign in with GitHub</span>
                  </Button>
                  {process.env.NODE_ENV === "development" && (
                    <>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">
                            Development Only
                          </span>
                        </div>
                      </div>
                      <TestLogin />
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              {isMarking ? (
                <>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    Marking Attendance...
                  </h1>
                  <LoadingSpinner />
                </>
              ) : error ? (
                <>
                  <h1 className="text-2xl font-semibold tracking-tight text-destructive">
                    Unable to Mark Attendance
                  </h1>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

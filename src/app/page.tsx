"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { TestLogin } from "@/components/TestLogin";
import { LogoutButton } from "@/components/LogoutButton";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (value: string) => {
    if (value.length !== 6) return;

    setIsValidating(true);
    setError(null);

    try {
      const res = await fetch(`/api/attendance/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Invalid code");
        setIsValidating(false);
        const input = containerRef.current?.querySelector(
          "input:not([disabled])",
        ) as HTMLInputElement | null;
        if (input) {
          input.focus();
        }
        return;
      }

      router.push("/success");
    } catch (error) {
      console.error(error);
      setError("Something went wrong. Please try again.");
      setIsValidating(false);
      const input = containerRef.current?.querySelector(
        "input:not([disabled])",
      ) as HTMLInputElement | null;
      if (input) {
        input.focus();
      }
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    if (value.length === 6) {
      handleSubmit(value);
    } else {
      setIsValidating(false);
      setError(null);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user?.isAdmin) {
      router.push("/admin");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (error) {
      const input = containerRef.current?.querySelector(
        "input:not([disabled])",
      ) as HTMLInputElement | null;
      if (input) {
        input.focus();
      }
    }
  }, [error]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <LoadingSpinner />
      </div>
    );
  }

  if (session && !session.user?.isAdmin) {
    return (
      <div className="grid min-h-screen bg-background">
        <div className="absolute top-4 right-4 flex gap-2 w-[120px] justify-center z-40">
          <LogoutButton />
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
            CS 162 Attendance Tracker
          </Link>
        </div>
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-sm space-y-6">
              <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Mark Your Attendance
                </h1>
                <p className="text-sm text-muted-foreground">
                  Scan the QR code shown in class or enter the code below.
                </p>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div
                      className="flex items-center justify-center"
                      ref={containerRef}
                    >
                      <InputOTP
                        maxLength={6}
                        value={code}
                        onChange={handleCodeChange}
                        onPaste={(e) => e.preventDefault()}
                        disabled={isValidating && !error}
                        autoFocus
                        spellCheck={false}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {error && (
                      <p className="text-sm text-center text-destructive">
                        {error}
                      </p>
                    )}
                    <p className="text-xs text-center text-muted-foreground">
                      Enter the 6-character code shown above the QR code
                    </p>
                    <div className="flex justify-center">
                      {isValidating && <LoadingSpinner text="Validating..." />}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCode("")}
                        disabled={isValidating}
                        className="flex-1"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const loginMethods = [
    process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "true" && (
      <Button
        key="google"
        variant="outline"
        className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 dark:bg-background dark:hover:bg-background/80"
        onClick={() => signIn("google")}
      >
        <Image
          src="https://authjs.dev/img/providers/google.svg"
          alt="Google"
          width={20}
          height={20}
        />
        <span className="text-black dark:text-foreground">
          Sign in with Google
        </span>
      </Button>
    ),
    process.env.NEXT_PUBLIC_GITHUB_LOGIN === "true" && (
      <Button
        key="github"
        variant="outline"
        className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 dark:bg-background dark:hover:bg-background/80"
        onClick={() => signIn("github")}
      >
        <Image
          src="https://authjs.dev/img/providers/github.svg"
          alt="GitHub"
          width={20}
          height={20}
          className="dark:invert"
        />
        <span className="text-black dark:text-foreground">
          Sign in with GitHub
        </span>
      </Button>
    ),
    process.env.NEXT_PUBLIC_TEST_LOGINS === "true" && (
      <div key="test">
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
      </div>
    ),
  ].filter(Boolean);

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
          CS 162 Attendance Tracker
        </Link>
      </div>
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Welcome back :)
              </h1>
              <p className="text-sm text-muted-foreground">
                Sign in to mark your attendance or manage sessions.
              </p>
            </div>
            {process.env.NEXT_PUBLIC_TEST_LOGINS === "true" ||
            loginMethods.length > 1 ? (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {loginMethods}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">{loginMethods}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

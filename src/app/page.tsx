"use client";

import { useEffect } from "react";
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
import { useState } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setIsValidating(true);
    setError(null);

    try {
      const res = await fetch(`/api/attendance/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Invalid code");
        return;
      }

      router.push("/success");
    } catch (error) {
      console.error(error);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user?.isAdmin) {
      router.push("/admin");
    }
  }, [session, status, router]);

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
        <div className="absolute top-6 left-6 flex gap-2 w-[120px] justify-center z-40">
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
                  Mark Your Attendance
                </h1>
                <p className="text-sm text-muted-foreground">
                  Scan the QR code shown in class or enter the code below.
                </p>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-center">
                        <InputOTP
                          maxLength={6}
                          value={code}
                          onChange={setCode}
                          disabled={isValidating}
                          onPaste={(e) => e.preventDefault()}
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
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={code.length !== 6 || isValidating}
                      >
                        {isValidating ? (
                          <LoadingSpinner text="Validating..." />
                        ) : (
                          "Submit Code"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCode("")}
                        disabled={isValidating}
                      >
                        Clear
                      </Button>
                    </div>
                  </form>
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
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Welcome back :)
              </h1>
              <p className="text-sm text-muted-foreground">
                Sign in to mark your attendance or manage sessions.
              </p>
            </div>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Button
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
                <Button
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
                {process.env.TEST_LOGIN === "true" && (
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

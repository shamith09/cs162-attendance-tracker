"use client";

import { useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { TestLogin } from "@/components/TestLogin";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Image src="/logo.png" alt="CS162 Logo" width={24} height={24} className="h-6 w-auto" />
            CS162 Attendance
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-sm space-y-6">
              <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Unauthorized Access
                </h1>
                <p className="text-sm text-muted-foreground">
                  Please scan a valid QR code to mark your attendance.
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => signOut()}>
                Sign Out
              </Button>
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
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Image src="/logo.png" alt="CS162 Logo" width={24} height={24} className="h-6 w-auto" />
          CS162 Attendance
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Welcome back
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
                  <span className="text-black dark:text-foreground">Sign in with Google</span>
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
                  <span className="text-black dark:text-foreground">Sign in with GitHub</span>
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

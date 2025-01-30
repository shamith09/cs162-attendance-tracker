"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function TestLogin() {
  if (process.env.NEXT_PUBLIC_TEST_LOGINS !== "true") return null;

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">
        Development: Test Users
      </div>
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="w-full justify-between bg-background"
          onClick={() => signIn("credentials", { 
            email: "admin@test.com",
            callbackUrl: "/"
          })}
        >
          <span className="text-foreground">Test Admin</span>
          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
            Admin
          </span>
        </Button>
        <Button
          variant="outline"
          className="w-full justify-between bg-background"
          onClick={() => signIn("credentials", { 
            email: "student@test.com",
            callbackUrl: "/"
          })}
        >
          <span className="text-foreground">Test Student</span>
          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
            Student
          </span>
        </Button>
      </div>
    </div>
  );
}

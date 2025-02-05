"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface TestQrCodeProps {
  url: string;
}

export function TestQrCode({ url }: TestQrCodeProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (process.env.NODE_ENV !== "development") return null;

  const copyUrl = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      description: "URL copied to clipboard",
    });
  };

  return (
    <div className="space-y-4">
      <Separator />
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Development: Test URL</p>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={url}
            readOnly
            className="font-mono text-sm"
          />
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              onClick={copyUrl}
              className="relative"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            {copied && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
                Copied!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

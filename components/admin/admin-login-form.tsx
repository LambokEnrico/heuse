"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { TurnstileCaptcha } from "@/components/admin/turnstile-captcha";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    error === "CredentialsSignin" ? "Invalid email or password" : ""
  );

  // Captcha is enabled only when site key is configured
  const captchaRequired = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // If captcha is enabled, require token
    if (captchaRequired && !captchaToken) {
      setErrorMessage("Please complete the captcha");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        captchaToken: captchaToken || undefined,
        redirect: false,
      });

      if (result?.error) {
        setErrorMessage("Invalid email or password");
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-heuse-black px-4">
      <Card className="w-full max-w-md bg-heuse-dark border-heuse-border">
        <CardHeader className="space-y-4 text-center">
          <CardTitle className="text-3xl font-heading text-heuse-gold">
            HEUSE
          </CardTitle>
          <CardDescription className="text-heuse-muted">
            Admin Portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-heuse-crimson/10 border border-heuse-crimson/20 rounded-sm text-sm text-heuse-crimson">
                <AlertCircle className="h-4 w-4" />
                {errorMessage}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@heuse.local"
                required
                className="bg-heuse-black border-heuse-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-heuse-black border-heuse-border"
              />
            </div>

            {/* Cloudflare Turnstile (only renders if site key configured) */}
            <TurnstileCaptcha onToken={setCaptchaToken} />

            <Button
              type="submit"
              className="w-full bg-heuse-gold text-heuse-dark hover:bg-heuse-gold/90"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

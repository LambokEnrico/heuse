"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "@/app/actions";
import { Lock } from "lucide-react";

export default function AdminSettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [whatsapp, setWhatsapp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role !== "OWNER") {
      return;
    }
    fetchSettings();
  }, [session]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setWhatsapp(data.whatsapp || "");
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await updateSettings({
        key: "whatsapp",
        value: whatsapp,
      });

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (session?.user?.role !== "OWNER") {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Lock className="h-12 w-12 text-heuse-muted" />
        <h2 className="text-xl font-heading font-semibold text-heuse-cream">
          Access Denied
        </h2>
        <p className="text-heuse-muted">
          Only the owner can access the settings page.
        </p>
        <Button variant="secondary" onClick={() => router.push("/admin")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-heuse-cream">
          Settings
        </h1>
        <p className="text-heuse-muted mt-1">Manage your store settings</p>
      </div>

      <Card className="bg-heuse-dark border-heuse-border max-w-xl">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp Number</Label>
              <Input
                id="whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="6281234567890"
                disabled={loading}
              />
              <p className="text-xs text-heuse-muted">
                Enter the WhatsApp number without + symbol (e.g., 6281234567890)
              </p>
            </div>

            <Button type="submit" disabled={isSubmitting || loading}>
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

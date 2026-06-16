"use client";

import { Loader2 } from "lucide-react";

export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-heuse-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-heuse-gold mx-auto mb-4" />
        <p className="text-heuse-muted">Loading checkout...</p>
      </div>
    </div>
  );
}

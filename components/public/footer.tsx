"use client";

import Link from "next/link";
import { useState } from "react";
import { Camera, ArrowRight } from "lucide-react";
import { subscribeNewsletter } from "@/app/actions/newsletter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const newsletterSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type NewsletterForm = z.infer<typeof newsletterSchema>;

export function Footer() {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewsletterForm>({
    resolver: zodResolver(newsletterSchema),
  });

  const onSubmit = async (data: NewsletterForm) => {
    setLoading(true);
    try {
      const result = await subscribeNewsletter({ email: data.email, source: "FOOTER" });
      if (result.success) {
        toast.success("Welcome to the HEUSE circle");
        reset();
      } else {
        toast.error(result.error.message);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-heuse-dark border-t border-heuse-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <h3 className="font-heading text-3xl font-semibold tracking-wider mb-4">HEUSE</h3>
            <p className="text-heuse-muted text-sm leading-relaxed max-w-md mb-6">
              True Self, Tailored. Luxury menswear for those who seek identity, not trends.
              Handmade limited-edition pieces crafted with precision and passion.
            </p>
            <a
              href={`https://instagram.com/${process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "heuseofficials"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-heuse-muted hover:text-heuse-gold transition-colors"
            >
              <Camera className="w-5 h-5 mr-2" />
              <span className="text-sm uppercase tracking-wider">@{process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "heuseofficials"}</span>
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm uppercase tracking-widest text-heuse-text mb-6">Explore</h4>
            <nav className="space-y-3">
              {[
                { href: "/products", label: "Collection" },
                { href: "/drops", label: "Drops" },
                { href: "/about", label: "About" },
                { href: "/contact", label: "Contact" },
                { href: "/faq", label: "FAQ" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-heuse-muted hover:text-heuse-gold transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-sm uppercase tracking-widest text-heuse-text mb-6">Stay Informed</h4>
            <p className="text-heuse-muted text-sm mb-4">
              Join the circle. Be the first to know about new drops.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="Your email"
                  className={cn(
                    "w-full bg-heuse-black border border-heuse-border px-4 py-3 text-sm text-heuse-text placeholder:text-heuse-muted focus:outline-none focus:border-heuse-gold transition-colors",
                    errors.email && "border-red-500"
                  )}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-heuse-gold text-heuse-black px-4 py-3 text-sm uppercase tracking-widest font-medium hover:bg-[#e8c97a] transition-colors disabled:opacity-50"
              >
                {loading ? "Joining..." : "Join"}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-heuse-border">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-heuse-muted text-xs">
              © {new Date().getFullYear()} HEUSE. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link href="/terms" className="text-heuse-muted text-xs hover:text-heuse-text transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-heuse-muted text-xs hover:text-heuse-text transition-colors">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
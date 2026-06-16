"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingBag, Menu, X } from "lucide-react";
import { useCartCount } from "./cart-store";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/products", label: "Products" },
  { href: "/drops", label: "Drops" },
  { href: "/articles", label: "Journal" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header({ cartItemCount = 0 }: { cartItemCount?: number }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const count = useCartCount();

  return (
    <header className="sticky top-0 z-50 bg-heuse-black/95 backdrop-blur-md border-b border-heuse-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="font-heading text-2xl md:text-3xl font-semibold tracking-wider text-heuse-text hover:text-heuse-gold transition-colors"
          >
            HEUSE
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm uppercase tracking-widest text-heuse-muted hover:text-heuse-gold transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <Link
              href="/cart"
              className="relative p-2 text-heuse-muted hover:text-heuse-gold transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              {(count > 0 || cartItemCount > 0) && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-heuse-gold text-heuse-black text-xs font-bold rounded-full flex items-center justify-center">
                  {count + cartItemCount}
                </span>
              )}
            </Link>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-heuse-muted hover:text-heuse-text transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-heuse-border bg-heuse-black">
          <nav className="px-4 py-6 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-sm uppercase tracking-widest text-heuse-muted hover:text-heuse-gold transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
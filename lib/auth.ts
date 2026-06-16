import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Rate limit config for login attempts.
 * 5 failed attempts per 15 minutes per email (in-memory).
 * For production multi-instance: replace with Upstash Ratelimit (see lib/rate-limit.ts).
 */
const LOGIN_MAX = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;
        const creds = credentials as Record<string, unknown>; 
        const captchaToken = (creds.captchaToken as string | undefined) ?? undefined;

        // Verify captcha if Turnstile secret is configured (production)
        const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
        if (turnstileSecret) {
          if (!captchaToken) {
            throw new Error("Captcha required");
          }
          const verifyRes = await fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                secret: turnstileSecret,
                response: captchaToken,
              }),
            }
          );
          const verifyData = (await verifyRes.json()) as { success: boolean };
          if (!verifyData.success) {
            throw new Error("Captcha verification failed");
          }
        }

        // Rate limit BEFORE password check (prevents user enumeration timing attacks
        // and brute force). Email-keyed so attackers can't lock out other users.
        const rl = rateLimit(`login:${email.toLowerCase()}`, LOGIN_MAX, LOGIN_WINDOW_MS);
        if (!rl.ok) {
          const minutes = Math.ceil((rl.retryAfter || 60) / 60);
          throw new Error(
            `Too many login attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
          );
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await compare(password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  session: {
    strategy: "jwt",
    // 8 hours — typical workday. Adjust based on security/UX tradeoff.
    maxAge: 8 * 60 * 60,
    // Refresh JWT every hour (rolling session) if user is active
    updateAge: 60 * 60,
  },
});

// Type augmentation for NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
    };
  }
}
import { z } from "zod";

export const submitContactSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(32).optional(),
  subject: z.string().min(3).max(120),
  message: z.string().min(10).max(2000),
});

export const subscribeNewsletterSchema = z.object({
  email: z.string().email(),
  source: z.enum(["FOOTER", "WAITLIST", "CHECKOUT", "POPUP"]).optional(),
});

export const joinWaitlistSchema = z.object({
  productId: z.string().cuid().optional(),
  dropId: z.string().cuid().optional(),
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(32).optional(),
  sizeInterest: z.string().max(20).optional(),
});

export type SubmitContactInput = z.infer<typeof submitContactSchema>;
export type SubscribeNewsletterInput = z.infer<typeof subscribeNewsletterSchema>;
export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;
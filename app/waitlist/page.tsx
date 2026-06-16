"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Clock, CheckCircle } from "lucide-react";
import { joinWaitlist } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

const waitlistSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(8, "Please enter a valid phone number").optional().or(z.literal("")),
  productId: z.string().optional(),
  dropId: z.string().optional(),
  sizeInterest: z.string().optional(),
  message: z.string().optional(),
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

export default function WaitlistPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-heuse-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-heuse-gold" />
      </div>
    }>
      <WaitlistForm />
    </Suspense>
  );
}

function WaitlistForm() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId");
  const dropId = searchParams.get("dropId");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      productId: productId || "",
      dropId: dropId || "",
    },
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  async function onSubmit(data: WaitlistFormData) {
    setIsLoading(true);
    try {
      const result = await joinWaitlist({
        ...data,
        productId: data.productId || undefined,
        dropId: data.dropId || undefined,
      });

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error.message || "Failed to join waitlist. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitted(true);
      toast({
        title: "You're on the list!",
        description: "We'll notify you as soon as the next drop is available.",
      });
      reset();
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-heuse-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-heuse-gold/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-heuse-gold" />
          </div>
          <h1 className="font-heading text-3xl mb-4">You&apos;re on the List</h1>
          <p className="text-heuse-muted mb-8">
            Thank you for joining the HEUSE waitlist. We&apos;ll send you an email as soon as the next drop is available.
          </p>
          <Button
            onClick={() => setIsSubmitted(false)}
            variant="outline"
            className="btn-ghost"
          >
            Join Another Drop
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-heuse-black">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-heuse-gold text-sm uppercase tracking-widest mb-4">
          <Clock className="w-4 h-4 inline mr-2" />
          Waitlist
        </p>
        <h1 className="font-heading text-4xl md:text-5xl mb-4">Join the Waitlist</h1>
        <p className="text-heuse-muted max-w-xl">
          Be the first to know when a new collection drops. Limited pieces, numbered editions.
        </p>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-xl">
          <div className="bg-heuse-dark p-6 md:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  {...register("fullName")}
                  className="bg-transparent border-heuse-border mt-1"
                  placeholder="Your full name"
                />
                {errors.fullName && (
                  <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  className="bg-transparent border-heuse-border mt-1"
                  placeholder="your@email.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  className="bg-transparent border-heuse-border mt-1"
                  placeholder="+62 812 3456 7890"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="sizeInterest">Size Interest (Optional)</Label>
                <Input
                  id="sizeInterest"
                  {...register("sizeInterest")}
                  className="bg-transparent border-heuse-border mt-1"
                  placeholder="M, L, XL, etc."
                />
              </div>

              <div>
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea
                  id="message"
                  {...register("message")}
                  className="bg-transparent border-heuse-border mt-1 min-h-[100px]"
                  placeholder="Any special requests or questions..."
                />
              </div>

              <input type="hidden" {...register("productId")} />
              <input type="hidden" {...register("dropId")} />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-heuse-gold text-heuse-black hover:bg-[#c9a862] py-6 text-sm uppercase tracking-widest"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join the Waitlist"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

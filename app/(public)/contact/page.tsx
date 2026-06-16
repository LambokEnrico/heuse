"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MessageCircle, Mail, Camera } from "lucide-react";
import { submitContactForm } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

const contactSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(8, "Please enter a valid phone number").optional(),
  subject: z.string().min(3, "Please enter a subject"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  async function onSubmit(data: ContactFormData) {
    const result = await submitContactForm({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      subject: data.subject,
      message: data.message,
    });

    if (!result.success) {
      toast({
        title: "Error",
        description: result.error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Message Sent!",
      description: "Thank you for reaching out. We'll get back to you soon.",
    });
    reset();
  }

  return (
    <div className="min-h-screen bg-heuse-black">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-heuse-gold text-sm uppercase tracking-widest mb-4">Get in Touch</p>
        <h1 className="font-heading text-4xl md:text-5xl mb-4">Contact Us</h1>
        <p className="text-heuse-muted max-w-xl">
          Have a question, feedback, or just want to say hi? We&apos;d love to hear from you.
        </p>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-heuse-dark p-6 md:p-8">
            <h2 className="font-heading text-2xl mb-6">Send us a Message</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="phone">Phone</Label>
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
              </div>

              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  {...register("subject")}
                  className="bg-transparent border-heuse-border mt-1"
                  placeholder="What is this about?"
                />
                {errors.subject && (
                  <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  {...register("message")}
                  className="bg-transparent border-heuse-border mt-1 min-h-[150px]"
                  placeholder="Tell us what's on your mind..."
                />
                {errors.message && (
                  <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-heuse-gold text-heuse-black hover:bg-[#c9a862] py-6 text-sm uppercase tracking-widest"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Message"
                )}
              </Button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            {/* WhatsApp CTA */}
            <div className="bg-heuse-dark p-6 md:p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-green-900/30 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-green-500" />
                </div>
                <h2 className="font-heading text-2xl">Chat with Us</h2>
              </div>
              <p className="text-heuse-muted mb-6">
                For the fastest response, reach out to us directly on WhatsApp.
              </p>
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6281234567890"}?text=Hi HEUSE, I'd like to ask about...`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full bg-green-600 hover:bg-green-700 text-white py-4 text-sm uppercase tracking-widest transition-colors"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Open WhatsApp
              </a>
            </div>

            {/* Email */}
            <div className="bg-heuse-dark p-6 md:p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-heuse-gold/20 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-heuse-gold" />
                </div>
                <h2 className="font-heading text-2xl">Email Us</h2>
              </div>
              <p className="text-heuse-muted mb-4">
                Prefer email? You can reach us at:
              </p>
              <a
                href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@heuse.com"}`}
                className="text-heuse-gold hover:underline text-lg"
              >
                hello@heuse.com
              </a>
            </div>

            {/* Social */}
            <div className="bg-heuse-dark p-6 md:p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-pink-900/30 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-pink-400" />
                </div>
                <h2 className="font-heading text-2xl">Follow Us</h2>
              </div>
              <p className="text-heuse-muted mb-4">
                Stay updated with our latest drops and behind-the-scenes content.
              </p>
              <a
                href={`https://instagram.com/${process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "heuse"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-heuse-gold hover:underline"
              >
                @{process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "heuse"}
              </a>
            </div>

            {/* Business Hours */}
            <div className="bg-heuse-dark p-6 md:p-8">
              <h2 className="font-heading text-2xl mb-4">Business Hours</h2>
              <div className="space-y-2 text-heuse-muted">
                <p><span className="text-heuse-text">Monday - Friday:</span> 9:00 AM - 6:00 PM WIB</p>
                <p><span className="text-heuse-text">Saturday:</span> 10:00 AM - 4:00 PM WIB</p>
                <p><span className="text-heuse-text">Sunday:</span> Closed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
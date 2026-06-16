import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ | HEUSE",
  description: "Frequently Asked Questions about HEUSE products, shipping, payment, and more.",
};

const faqs = [
  {
    question: "How does HEUSE limited edition work?",
    answer: "Each HEUSE piece is produced in a limited run of maximum 20 units. Once a piece sells out, it will not be restocked. This ensures exclusivity and allows us to maintain high quality standards for every single piece.",
  },
  {
    question: "How do I find my correct size?",
    answer: "We recommend measuring yourself and comparing against our size guide. Each product page includes detailed measurements. When in doubt, size up — our pieces are designed to have a relaxed, oversized fit. If you need further guidance, contact us via WhatsApp.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We currently accept bank transfers (BCA, Mandiri, BNI, BRI) and e-wallet payments (GoPay, OVO, Dana). Payment instructions will be provided after you place your order via WhatsApp confirmation.",
  },
  {
    question: "How long does shipping take?",
    answer: "Orders are typically shipped within 2-3 business days after payment confirmation. For Jakarta, expect delivery within 1-2 days. For other islands, delivery takes 3-5 days. Remote areas may take longer. You will receive a tracking number once your order ships.",
  },
  {
    question: "Do you ship internationally?",
    answer: "Yes! We ship worldwide. International shipping rates and delivery times vary by destination. Please contact us for a shipping estimate before placing your order.",
  },
  {
    question: "What is your return policy?",
    answer: "Due to the limited nature of our products, all sales are final. We do not accept returns or exchanges unless the item arrives damaged or defective. In such cases, please contact us within 48 hours with photo evidence.",
  },
  {
    question: "Can I track my order?",
    answer: "Yes! Once your order ships, you will receive a tracking number via WhatsApp and email. You can track your package through our shipping partner's website or app.",
  },
  {
    question: "How do I care for my HEUSE pieces?",
    answer: "We recommend hand washing in cold water with mild detergent. Air dry flat, away from direct sunlight. Do not tumble dry or iron. For leather pieces, use a leather conditioner periodically. Each product includes specific care instructions.",
  },
  {
    question: "What if my size is sold out?",
    answer: "Since our pieces are limited editions, we cannot restock sold-out sizes. However, you can join our waitlist for future releases. Follow our Instagram or subscribe to our newsletter to be notified of upcoming drops.",
  },
  {
    question: "Do you offer custom sizing or alterations?",
    answer: "We do not offer custom sizing or alterations for limited edition pieces. Our pieces are designed with a specific fit in mind. If you are between sizes, we recommend sizing up for a relaxed fit.",
  },
  {
    question: "How can I be notified of new drops?",
    answer: "The best way to stay updated is to follow us on Instagram (@heuse) and subscribe to our newsletter. We announce new drops 24-48 hours in advance to subscribers.",
  },
  {
    question: "Can I visit your showroom?",
    answer: "Our showroom is located in Jakarta. For viewing appointments, please book via WhatsApp at least 1 day in advance. Walk-ins are not guaranteed availability.",
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-heuse-black">
      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-heuse-gold text-sm uppercase tracking-widest mb-4">Help Center</p>
        <h1 className="font-heading text-4xl md:text-5xl mb-4">Frequently Asked Questions</h1>
        <p className="text-heuse-muted">
          Find answers to common questions about HEUSE products, orders, and policies.
        </p>
      </div>

      {/* FAQ Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left font-heading text-lg py-6 hover:text-heuse-gold transition-colors">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-heuse-muted pb-6 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Still Have Questions */}
        <div className="mt-12 p-8 bg-heuse-dark text-center">
          <h2 className="font-heading text-2xl mb-4">Still have questions?</h2>
          <p className="text-heuse-muted mb-6">
            Can&apos;t find what you&apos;re looking for? We&apos;re here to help.
          </p>
          <a
            href="/contact"
            className="inline-block bg-heuse-gold text-heuse-black px-6 py-3 text-sm uppercase tracking-widest hover:bg-[#c9a862] transition-colors"
          >
            Contact Us
          </a>
        </div>
      </div>
    </div>
  );
}
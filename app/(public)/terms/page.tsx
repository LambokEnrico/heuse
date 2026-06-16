import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | HEUSE",
  description: "HEUSE Terms of Service and conditions.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-heuse-black">
      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-heuse-gold text-sm uppercase tracking-widest mb-4">Legal</p>
        <h1 className="font-heading text-4xl md:text-5xl mb-4">Terms of Service</h1>
        <p className="text-heuse-muted">Last updated: January 2025</p>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="prose prose-invert prose-sm max-w-none space-y-8">
          <section>
            <h2 className="font-heading text-2xl mb-4">1. Agreement to Terms</h2>
            <p className="text-heuse-muted leading-relaxed">
              By accessing or using the HEUSE website and services, you agree to be bound by these Terms of Service
              and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited
              from using or accessing this site.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">2. Use License</h2>
            <p className="text-heuse-muted leading-relaxed">
              Permission is granted to temporarily access the materials on HEUSE&apos;s website for personal,
              non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and
              under this license you may not:
            </p>
            <ul className="list-disc list-inside text-heuse-muted space-y-2 mt-4">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or public display</li>
              <li>Attempt to reverse engineer any software contained on the website</li>
              <li>Remove any copyright or proprietary notations from the materials</li>
              <li>Transfer the materials to another person or &quot;mirror&quot; the materials on any other server</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">3. Product Information</h2>
            <p className="text-heuse-muted leading-relaxed">
              HEUSE specializes in limited edition fashion pieces. All products are produced in limited quantities
              (maximum 20 units per design). We strive to display accurate product information including pricing,
              descriptions, and availability. However, we do not guarantee that all information is completely accurate,
              current, or error-free.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">4. Limited Edition Policy</h2>
            <p className="text-heuse-muted leading-relaxed">
              Due to the limited nature of our products:
            </p>
            <ul className="list-disc list-inside text-heuse-muted space-y-2 mt-4">
              <li>All sales are final unless the item is damaged or defective</li>
              <li>Products will not be restocked once sold out</li>
              <li>Edition numbers cannot be selected</li>
              <li>Waitlist placements do not guarantee availability</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">5. Pricing and Payment</h2>
            <p className="text-heuse-muted leading-relaxed">
              All prices are listed in Indonesian Rupiah (IDR) and are subject to change without notice. Payment must
              be received in full before order processing. We accept bank transfers and selected e-wallets. Payment
              instructions are provided after order confirmation via WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">6. Shipping and Delivery</h2>
            <p className="text-heuse-muted leading-relaxed">
              Orders are processed within 2-3 business days after payment confirmation. Shipping times vary by
              destination. Risk of loss and title for items pass to you upon delivery to the carrier. We are not
              responsible for delays caused by customs or shipping carriers.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">7. Returns and Refunds</h2>
            <p className="text-heuse-muted leading-relaxed">
              Given the limited edition nature of our products, all sales are final. We only accept returns or exchanges
              for items that arrive damaged or defective. In such cases, please contact us within 48 hours of delivery
              with photographic evidence. Refunds will be processed within 14 business days after verification.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">8. Intellectual Property</h2>
            <p className="text-heuse-muted leading-relaxed">
              All content on this website, including designs, images, text, and logos, are the property of HEUSE and
              protected by intellectual property laws. You may not use our content for commercial purposes without
              express written consent.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">9. Limitation of Liability</h2>
            <p className="text-heuse-muted leading-relaxed">
              In no event shall HEUSE or its suppliers be liable for any damages arising out of the use or inability
              to use the materials on HEUSE&apos;s website, even if we have been notified of the possibility of such
              damage.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">10. Governing Law</h2>
            <p className="text-heuse-muted leading-relaxed">
              These terms and conditions are governed by and construed in accordance with the laws of Indonesia, and
              you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">11. Contact</h2>
            <p className="text-heuse-muted leading-relaxed">
              For any questions regarding these Terms of Service, please contact us at{" "}
              <a href="mailto:hello@heuse.com" className="text-heuse-gold hover:underline">
                hello@heuse.com
              </a>{" "}
              or via WhatsApp.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
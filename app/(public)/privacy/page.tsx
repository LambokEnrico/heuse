import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | HEUSE",
  description: "HEUSE Privacy Policy and how we handle your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-heuse-black">
      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-heuse-gold text-sm uppercase tracking-widest mb-4">Legal</p>
        <h1 className="font-heading text-4xl md:text-5xl mb-4">Privacy Policy</h1>
        <p className="text-heuse-muted">Last updated: January 2025</p>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="prose prose-invert prose-sm max-w-none space-y-8">
          <section>
            <h2 className="font-heading text-2xl mb-4">1. Introduction</h2>
            <p className="text-heuse-muted leading-relaxed">
              HEUSE (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you visit our website
              or make a purchase.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">2. Information We Collect</h2>
            <p className="text-heuse-muted leading-relaxed">
              We collect information you provide directly, including:
            </p>
            <ul className="list-disc list-inside text-heuse-muted space-y-2 mt-4">
              <li>Name, email address, phone number, and shipping address when you place an order</li>
              <li>Payment information (processed securely through payment providers)</li>
              <li>Communication preferences and any messages you send us</li>
              <li>Product preferences and waitlist information</li>
            </ul>
            <p className="text-heuse-muted leading-relaxed mt-4">
              We also automatically collect certain information when you visit our site, including browser type,
              pages visited, and device information.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">3. How We Use Your Information</h2>
            <p className="text-heuse-muted leading-relaxed">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-heuse-muted space-y-2 mt-4">
              <li>Process and fulfill your orders</li>
              <li>Communicate with you about orders, products, and promotions</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Improve our website and services</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">4. Information Sharing</h2>
            <p className="text-heuse-muted leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share your
              information with:
            </p>
            <ul className="list-disc list-inside text-heuse-muted space-y-2 mt-4">
              <li>Service providers who assist in order fulfillment and shipping</li>
              <li>Payment processors for secure payment handling</li>
              <li>Legal authorities when required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">5. Data Security</h2>
            <p className="text-heuse-muted leading-relaxed">
              We implement appropriate security measures to protect your personal information. However, no method
              of transmission over the Internet is 100% secure. While we strive to protect your data, we cannot
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">6. Cookies and Tracking</h2>
            <p className="text-heuse-muted leading-relaxed">
              Our website uses cookies to enhance your browsing experience. You can choose to disable cookies
              through your browser settings, but this may affect site functionality.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">7. Your Rights</h2>
            <p className="text-heuse-muted leading-relaxed">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-heuse-muted space-y-2 mt-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data (subject to legal requirements)</li>
              <li>Opt out of marketing communications</li>
            </ul>
            <p className="text-heuse-muted leading-relaxed mt-4">
              To exercise these rights, contact us at{" "}
              <a href="mailto:hello@heuse.com" className="text-heuse-gold hover:underline">
                hello@heuse.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">8. Data Retention</h2>
            <p className="text-heuse-muted leading-relaxed">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in
              this policy, unless a longer retention period is required by law.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">9. Children&apos;s Privacy</h2>
            <p className="text-heuse-muted leading-relaxed">
              Our website is not intended for individuals under 18 years of age. We do not knowingly collect
              personal information from children.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">10. Changes to This Policy</h2>
            <p className="text-heuse-muted leading-relaxed">
              We may update this Privacy Policy from time to time. Any changes will be posted on this page
              with an updated &quot;Last updated&quot; date. Your continued use of our services after changes constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-4">11. Contact Us</h2>
            <p className="text-heuse-muted leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at{" "}
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
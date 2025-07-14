import React from 'react';
import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Scale className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">LexInnova</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              Log In
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-foreground">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: December 14, 2024</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              LexInnova ("we," "our," or "us") is committed to protecting your privacy and ensuring the security of your personal information. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered legal 
              research platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mb-3 text-foreground">2.1 Information You Provide to Us</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li><strong>Account Information:</strong> Name, email address, and password when you create an account</li>
              <li><strong>Payment Information:</strong> Billing details processed securely through our payment processor (Stripe)</li>
              <li><strong>Profile Information:</strong> Professional details, law firm information, and preferences</li>
              <li><strong>Support Communications:</strong> Information provided when you contact our support team</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-foreground">2.2 Legal Documents You Upload</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you upload legal documents to our platform for processing and analysis, we collect and store these documents 
              to provide our AI-powered research services. These documents may contain sensitive legal information.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-foreground">2.3 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Usage Data:</strong> Search queries, features used, time spent on the platform, and interaction patterns</li>
              <li><strong>Technical Information:</strong> IP address, browser type, device information, and operating system</li>
              <li><strong>Log Data:</strong> Server logs, error reports, and performance analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Service Provision:</strong> To provide, maintain, and improve our AI-powered legal research platform</li>
              <li><strong>Document Processing:</strong> To analyze and process uploaded legal documents using AI technologies</li>
              <li><strong>User Support:</strong> To respond to your inquiries, provide technical support, and resolve issues</li>
              <li><strong>Payment Processing:</strong> To process subscription payments and manage billing</li>
              <li><strong>Platform Improvement:</strong> To analyze usage patterns and improve our services and user experience</li>
              <li><strong>Communication:</strong> To send important service updates, security alerts, and administrative messages</li>
              <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">4. How We Share Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:
            </p>

            <h3 className="text-xl font-semibold mb-3 text-foreground">4.1 Essential Service Providers</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We share data with trusted third-party service providers who assist us in operating our platform:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li><strong>Supabase:</strong> Database hosting, authentication, and file storage</li>
              <li><strong>Stripe:</strong> Payment processing and subscription management</li>
              <li><strong>OpenAI:</strong> AI model processing for embeddings and text generation</li>
              <li><strong>LlamaParse:</strong> Document parsing and text extraction services</li>
              <li><strong>OCR.Space:</strong> Optical character recognition for scanned documents</li>
            </ul>

            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 mb-4">
              <p className="text-destructive font-semibold mb-2">IMPORTANT NOTICE</p>
              <p className="text-destructive leading-relaxed">
                Your uploaded legal documents are sent to our AI service providers (OpenAI, LlamaParse) for processing. 
                While these providers have strict data protection policies, please be aware that sensitive legal information 
                may be processed by third-party AI systems.
              </p>
            </div>

            <h3 className="text-xl font-semibold mb-3 text-foreground">4.2 Legal Requirements</h3>
            <p className="text-muted-foreground leading-relaxed">
              We may disclose your information if required by law, court order, or government request, or if we believe 
              in good faith that such disclosure is necessary to protect our rights, your safety, or the safety of others.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We implement comprehensive security measures to protect your personal information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Encryption:</strong> All data is encrypted in transit using TLS and at rest using industry-standard encryption</li>
              <li><strong>Access Controls:</strong> We use Supabase Row Level Security (RLS) to ensure users can only access their own data</li>
              <li><strong>Authentication:</strong> Secure user authentication and session management</li>
              <li><strong>Regular Security Audits:</strong> We regularly review and update our security practices</li>
              <li><strong>Limited Access:</strong> Only authorized personnel have access to user data, and only when necessary</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We retain your information for as long as necessary to provide our services and comply with legal obligations:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Account Data:</strong> Retained while your account is active and for a reasonable period after account closure</li>
              <li><strong>Uploaded Documents:</strong> Retained for as long as you maintain your account, but can be deleted upon request</li>
              <li><strong>Usage Data:</strong> Retained for up to 24 months for service improvement and analytics purposes</li>
              <li><strong>Payment Records:</strong> Retained as required by law and for tax and accounting purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Your Data Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information, subject to legal requirements</li>
              <li><strong>Portability:</strong> Request transfer of your data to another service provider</li>
              <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, please contact us at privacy@lexinnova.com. We will respond to your request within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">8. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. 
              We ensure that such transfers are conducted in accordance with applicable data protection laws and with 
              appropriate safeguards in place.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our service is not intended for individuals under the age of 18. We do not knowingly collect personal 
              information from children under 18. If we become aware that we have collected such information, we will 
              take steps to delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">10. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting 
              the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this 
              Privacy Policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">11. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, 
              please contact us:
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-foreground">
                <strong>Privacy Officer</strong><br />
                Email: privacy@lexinnova.com<br />
                Subject Line: "Privacy Policy Inquiry"<br />
                Response Time: Within 72 hours
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-4 bg-background border-t">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Scale className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-foreground">LexInnova</span>
            </div>
            <nav className="flex items-center space-x-8">
              <Link to="/terms-of-service" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <a href="mailto:support@lexinnova.com" className="text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </a>
            </nav>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2024 LexInnova. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
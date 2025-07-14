import React from 'react';
import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';

export default function TermsOfServicePage() {
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
        <h1 className="text-4xl font-bold mb-8 text-foreground">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: December 14, 2024</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using LexInnova ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. 
              If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Disclaimer of Legal Advice</h2>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 mb-4">
              <p className="text-destructive font-semibold mb-2">IMPORTANT LEGAL DISCLAIMER</p>
              <p className="text-destructive leading-relaxed">
                LexInnova is a research tool designed to assist legal professionals in their research activities. 
                The outputs, answers, and information provided by LexInnova are for informational purposes only and 
                DO NOT constitute legal advice. Users should always consult with a qualified attorney before making 
                any legal decisions or taking any legal action based on information obtained through LexInnova.
              </p>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              LexInnova makes no warranties or representations about the accuracy, completeness, or reliability of 
              the information provided. Legal research requires professional judgment, and AI-generated content may 
              contain errors, omissions, or "hallucinations" that could be misleading.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Intellectual Property Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              LexInnova and its original content, features, and functionality are and will remain the exclusive property 
              of LexInnova and its licensors. The service is protected by copyright, trademark, and other laws.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              User-uploaded documents remain the property of the user. By uploading documents to LexInnova, you grant 
              us a limited license to process, analyze, and store these documents for the purpose of providing the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Acceptable Use Policy</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Use the service for any unlawful purposes or activities</li>
              <li>Attempt to scrape, crawl, or systematically extract data from the service</li>
              <li>Reverse engineer, decompile, or attempt to discover the source code of our AI models</li>
              <li>Upload content that infringes on intellectual property rights of others</li>
              <li>Use the service to generate content that violates applicable laws or regulations</li>
              <li>Attempt to circumvent any security measures or access controls</li>
              <li>Share your account credentials with unauthorized users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, LEXINNOVA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, 
              GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE SERVICE.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              LexInnova disclaims all liability for any inaccuracies, errors, omissions, or "hallucinations" in 
              AI-generated content. Users are solely responsible for verifying all information obtained through 
              the service before making any decisions or taking any actions based on such information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">6. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities 
              that occur under your account. You agree to notify us immediately of any unauthorized use of your account 
              or any other breach of security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Subscription and Payment Terms</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Subscription fees are billed in advance on a monthly basis and are non-refundable except as required by law. 
              We reserve the right to change our pricing structure at any time, with advance notice to users.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Failure to pay subscription fees may result in suspension or termination of your account and access to the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">8. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to terminate or suspend your account and access to the service immediately, without prior 
              notice or liability, for any reason whatsoever, including but not limited to a breach of these Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">9. Data and Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service, 
              to understand our practices regarding the collection, use, and disclosure of your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">10. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms of Service and any disputes arising out of or related to them shall be governed by and construed 
              in accordance with the laws of the Commonwealth of Massachusetts, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">11. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify or replace these Terms of Service at any time. If a revision is material, 
              we will try to provide at least 30 days' notice prior to any new terms taking effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">12. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              Email: legal@lexinnova.com<br />
              Address: [Legal Department Address]
            </p>
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
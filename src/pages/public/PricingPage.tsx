import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Check, Star } from 'lucide-react';

export default function PricingPage() {
  const tiers = [
    {
      name: 'Solo Practitioner',
      price: '$99',
      description: 'Perfect for individual lawyers and solo practitioners',
      features: [
        '1 User Seat',
        '100 Searches/Month',
        '20 Document Uploads/Month',
        'Standard Support',
        'Email Support',
        'Basic Analytics'
      ],
      cta: 'Choose Solo',
      popular: false
    },
    {
      name: 'Small Firm',
      price: '$249',
      description: 'Ideal for small law firms with 2-5 attorneys',
      features: [
        'Up to 5 User Seats',
        'Unlimited Searches',
        '100 Document Uploads/Month',
        'Priority Support',
        'Phone & Email Support',
        'Advanced Analytics',
        'Team Collaboration',
        'Custom Integrations'
      ],
      cta: 'Choose Firm',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Contact Us',
      description: 'Custom solutions for larger organizations',
      features: [
        'Custom User Seats',
        'Unlimited Searches & Uploads',
        'Dedicated Account Manager',
        'Custom Onboarding',
        '24/7 Priority Support',
        'Custom Integrations',
        'Advanced Security',
        'SLA Guarantees'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ];

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
            <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              Log In
            </Link>
            <Button>
              <Link to="/signup">Start Free Trial</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-muted-foreground">
            Choose the plan that fits your practice. All plans include our advanced AI research capabilities.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            {tiers.map((tier, index) => (
              <Card key={index} className={`relative ${tier.popular ? 'border-primary shadow-lg scale-105' : ''}`}>
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold flex items-center space-x-1">
                      <Star className="h-4 w-4" />
                      <span>Most Popular</span>
                    </div>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-primary">{tier.price}</span>
                    {tier.price !== 'Contact Us' && <span className="text-muted-foreground">/month</span>}
                  </div>
                  <CardDescription className="mt-2">{tier.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center space-x-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full ${tier.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
                    variant={tier.popular ? 'default' : 'outline'}
                  >
                    {tier.name === 'Enterprise' ? (
                      <a href="mailto:sales@lexinnova.com">{tier.cta}</a>
                    ) : (
                      <Link to="/signup">{tier.cta}</Link>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-secondary">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I change my plan at any time?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes, you can upgrade or downgrade your plan at any time. Changes will be prorated and reflected in your next billing cycle.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What happens if I exceed my search limit?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  For Solo Practitioner plans, you'll be notified when approaching your limit. You can upgrade to unlock unlimited searches or purchase additional search credits.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is there a free trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes, we offer a 14-day free trial for all plans. No credit card required to start your trial.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What support is included?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  All plans include access to our knowledge base and documentation. Small Firm and Enterprise plans include priority email and phone support.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-muted-foreground">
            Join legal professionals who are transforming their research process with LexInnova.
          </p>
          <Button size="lg" className="px-8 py-4 text-lg">
            <Link to="/signup">Start Free Trial</Link>
          </Button>
        </div>
      </section>

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
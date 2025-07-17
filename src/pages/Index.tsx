import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Scale, Gavel, BookOpen, TrendingUp, Shield, Users, Clock, ArrowRight, CheckCircle, Star, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

// Hero section for the Massachusetts Criminal Law Research Platform
const Index = () => {
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scale className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-primary">LexInnova</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
            <Link to="/signup">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-4" style={{ background: 'var(--gradient-hero)' }}>
        <div className="container mx-auto max-w-6xl text-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="outline" className="px-3 py-1 text-sm">
                🚀 Revolutionary Legal Research Platform
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
                AI-Powered{' '}
                <span className="text-primary">Massachusetts</span>{' '}
                Criminal Law Research
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                Instant, accurate answers from verified MA legal sources. 
                Empowering law enforcement with AI-driven insights for faster, fairer justice.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <Link to="/signup" className="flex-1">
                <Button size="lg" className="w-full">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/app" className="flex-1">
                <Button variant="outline" size="lg" className="w-full">
                  <Search className="mr-2 h-4 w-4" />
                  Try Demo
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Free 14-day trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>24/7 support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Revolutionary Features for Modern Law Enforcement
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Disrupting outdated training methods with instant access to verified Massachusetts criminal law
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Instant AI Search</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Ask questions in natural language and get immediate answers with verifiable citations from MA legal sources
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Scale className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Verified Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Every answer backed by official Massachusetts General Laws, case precedents, and court decisions
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Gavel className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Mobile-First Design</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Access critical legal information on any device, optimized for in-field use by law enforcement officers
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-primary/5 to-accent-blue/5">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">10K+</div>
              <div className="text-sm text-muted-foreground">Legal Documents</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">500+</div>
              <div className="text-sm text-muted-foreground">Officers Served</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">0.3s</div>
              <div className="text-sm text-muted-foreground">Avg Response Time</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Ready to Transform Your Legal Research?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join hundreds of Massachusetts law enforcement officers already using LexInnova for faster, more accurate legal research.
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <Link to="/signup">
                <Button size="lg" className="w-full">
                  Start Your Free Trial Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground mt-4">
                14-day free trial • No credit card required • Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Legal Disclaimer */}
      <section className="py-8 px-4 bg-muted/50">
        <div className="container mx-auto max-w-4xl">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Legal Disclaimer:</strong> LexInnova provides research tools based on Massachusetts criminal law documents. 
              This platform is not a substitute for professional legal advice. Always consult official sources and qualified attorneys for specific legal matters.
            </AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Scale className="h-6 w-6 text-primary" />
                <span className="font-bold text-primary">LexInnova</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Revolutionizing legal research for Massachusetts law enforcement
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link to="/app" className="hover:text-foreground transition-colors">Demo</Link></li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/terms-of-service" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="mailto:support@lexinnova.com" className="hover:text-foreground transition-colors">Contact Support</a></li>
                <li><Link to="/login" className="hover:text-foreground transition-colors">Help Center</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 LexInnova. All rights reserved. Empowering Massachusetts law enforcement with AI-driven legal research.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

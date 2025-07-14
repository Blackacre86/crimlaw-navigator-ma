import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Search, FileText, BarChart3, CheckCircle, Star } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-accent-blue text-primary-foreground">
      {/* Header */}
      <header className="border-b border-primary-foreground/10 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scale className="h-8 w-8" />
            <span className="text-2xl font-bold">LexInnova</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/pricing" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
              Pricing
            </Link>
            <Link to="/login" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
              Log In
            </Link>
            <Button variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              <Link to="/signup">Start Free Trial</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            The AI-Powered Legal Co-Pilot for Massachusetts Criminal Law
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90 leading-relaxed">
            Get faster, more accurate answers with verifiable citations. Transform your legal research from hours into minutes.
          </p>
          <Button size="lg" className="bg-accent-blue hover:bg-accent-blue/90 text-accent-blue-foreground px-8 py-4 text-lg">
            <Link to="/signup">Start Free Trial</Link>
          </Button>
          
          {/* Trust Bar */}
          <div className="mt-16 pt-8 border-t border-primary-foreground/10">
            <p className="text-sm text-primary-foreground/70 mb-4">Trusted by legal professionals across Massachusetts</p>
            <div className="flex justify-center items-center space-x-8 opacity-60">
              <div className="h-8 w-24 bg-primary-foreground/20 rounded"></div>
              <div className="h-8 w-24 bg-primary-foreground/20 rounded"></div>
              <div className="h-8 w-24 bg-primary-foreground/20 rounded"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-background text-foreground">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose LexInnova?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the future of legal research with our advanced AI technology designed specifically for Massachusetts criminal law.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Search className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Intelligent Search</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Our advanced RAG pipeline with hybrid search delivers precise answers to natural language queries, surfacing critical information others miss.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Automated Document Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Sophisticated document processing with LlamaParse and OCR fallbacks ensures maximum fidelity from any legal document format.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Real-time Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Track document processing jobs in real-time with comprehensive admin dashboards and live status updates.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-secondary">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">What Legal Professionals Say</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <CardTitle className="text-lg">Sarah Chen, Esq.</CardTitle>
                <CardDescription>Criminal Defense Attorney</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  "LexInnova has transformed my research process. What used to take hours now takes minutes, and the verifiable citations give me complete confidence in the results."
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <CardTitle className="text-lg">Michael Rodriguez</CardTitle>
                <CardDescription>Solo Practitioner</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  "The AI co-pilot feature is incredible. It finds relevant cases and precedents I would have missed with traditional search methods."
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <CardTitle className="text-lg">Thompson & Associates</CardTitle>
                <CardDescription>Small Law Firm</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  "LexInnova gives our small firm capabilities that rival much larger practices. The efficiency gains are remarkable."
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Legal Research?</h2>
          <p className="text-xl mb-8 text-primary-foreground/90">
            Join hundreds of legal professionals who are already using LexInnova to work smarter, not harder.
          </p>
          <Button size="lg" className="bg-accent-blue hover:bg-accent-blue/90 text-accent-blue-foreground px-8 py-4 text-lg">
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
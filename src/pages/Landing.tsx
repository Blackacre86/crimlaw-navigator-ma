import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Scale, Search, Shield, Zap, CheckCircle, Gavel } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary-light/5"></div>
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Your Essential AI-Powered
              <span className="block text-primary">Massachusetts Criminal Law</span>
              <span className="block">Field Guide</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Streamline your legal research with instant access to Massachusetts criminal law documents, 
              model jury instructions, and procedural rules. Built specifically for attorneys, paralegals, 
              and law enforcement professionals.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button variant="professional" size="lg" className="text-lg px-8 py-6">
                Get Started Free
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                View Demo
              </Button>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>Used by 500+ Legal Professionals</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>Secure & Confidential</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span>Instant Search Results</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Everything You Need for Criminal Law Research
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Access comprehensive legal resources with powerful search capabilities designed for legal professionals.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 text-center border-2 hover:border-primary/30 transition-colors">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center mx-auto mb-6">
                <Gavel className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Model Jury Instructions</h3>
              <p className="text-muted-foreground">
                Access standardized jury instructions for all types of criminal cases in Massachusetts.
              </p>
            </Card>
            
            <Card className="p-8 text-center border-2 hover:border-primary/30 transition-colors">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Smart Search</h3>
              <p className="text-muted-foreground">
                Find relevant statutes, procedures, and case law with AI-powered search functionality.
              </p>
            </Card>
            
            <Card className="p-8 text-center border-2 hover:border-primary/30 transition-colors">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center mx-auto mb-6">
                <Scale className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Criminal Procedure Rules</h3>
              <p className="text-muted-foreground">
                Complete collection of Massachusetts Rules of Criminal Procedure with cross-references.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Card className="p-12 bg-gradient-to-br from-primary/5 to-primary-light/5 border-2 border-primary/20">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Streamline Your Legal Research?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join hundreds of legal professionals who trust MA Crim Law Navigator for their research needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="professional" size="lg" className="text-lg px-8 py-6">
                Start Your Free Trial
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Contact Sales
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
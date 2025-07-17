import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Scale, Shield, AlertCircle, CheckCircle, BookOpen, Gavel } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [agreed, setAgreed] = useState(false);
  const [step, setStep] = useState(1);

  const handleComplete = () => {
    localStorage.setItem('shift-onboarding-complete', 'true');
    onClose();
  };

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Scale className="h-8 w-8 text-primary" />
            <div>
              <DialogTitle className="text-2xl font-bold">Welcome to SHIFT</DialogTitle>
              <DialogDescription className="text-base">
                AI-Powered Massachusetts Criminal Law Research Platform
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Gavel className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Our Mission</h3>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  SHIFT transforms law enforcement research with voice-enabled Massachusetts criminal law access. 
                  Our platform provides instant, hands-free legal information for officers, detectives, and prosecutors. 
                  Get verified legal answers through voice commands and traditional search.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <BookOpen className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="font-medium text-sm">Instant Research</div>
                  <div className="text-xs text-muted-foreground">Get answers in seconds</div>
                </div>
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="font-medium text-sm">Verified Sources</div>
                  <div className="text-xs text-muted-foreground">Official MA legal documents</div>
                </div>
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="font-medium text-sm">Mobile-First</div>
                  <div className="text-xs text-muted-foreground">Optimized for field use</div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl font-semibold">How It Works</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <h4 className="font-medium">Ask Your Question</h4>
                    <p className="text-sm text-muted-foreground">Type your legal question in natural language</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <h4 className="font-medium">AI Analysis</h4>
                    <p className="text-sm text-muted-foreground">Our AI searches verified MA legal documents and case law</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <h4 className="font-medium">Instant Results</h4>
                    <p className="text-sm text-muted-foreground">Get answers with citations and source verification</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <Alert className="border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                        Important Legal Disclaimer
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                        SHIFT provides voice-enabled research tools based on Massachusetts criminal law documents. 
                        This platform is not a substitute for professional legal advice. The AI-generated 
                        summaries and search results should be verified against official sources.
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                        <strong>Always consult official sources and qualified attorneys for specific legal matters.</strong>
                      </p>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="legal-agreement" 
                        checked={agreed}
                        onCheckedChange={(checked) => setAgreed(checked as boolean)}
                      />
                      <label 
                        htmlFor="legal-agreement" 
                        className="text-sm font-medium text-amber-800 dark:text-amber-200 cursor-pointer"
                      >
                        I understand and agree to these terms. I will verify all information with official sources 
                        and consult qualified legal counsel when necessary.
                      </label>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="flex justify-between items-center pt-4">
            <div className="flex space-x-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i <= step ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            
            <div className="flex gap-3">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              
              <Button 
                onClick={nextStep}
                disabled={step === 3 && !agreed}
              >
                {step === 3 ? 'Get Started' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
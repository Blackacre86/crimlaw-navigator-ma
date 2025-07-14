import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Search, Upload, User, X, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  action?: string;
  link?: string;
}

export function OnboardingWelcome() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const [tasks, setTasks] = useState<OnboardingTask[]>([
    {
      id: 'search',
      title: 'Run your first search',
      description: 'Try searching for a Massachusetts criminal law topic',
      icon: <Search className="h-5 w-5" />,
      completed: false,
      action: 'Try Search',
      link: '/app'
    },
    {
      id: 'profile',
      title: 'Complete your profile',
      description: 'Add your professional information',
      icon: <User className="h-5 w-5" />,
      completed: false,
      action: 'Update Profile',
      link: '/app/profile'
    },
    ...(profile?.role === 'admin' ? [{
      id: 'upload',
      title: 'Upload your first document',
      description: 'Add legal documents to enhance the AI knowledge base',
      icon: <Upload className="h-5 w-5" />,
      completed: false,
      action: 'Upload Document',
      link: '/admin'
    }] : [])
  ]);

  // Check if user is new (created account recently)
  useEffect(() => {
    if (user && profile) {
      const accountCreated = new Date(user.created_at);
      const now = new Date();
      const hoursSinceCreation = (now.getTime() - accountCreated.getTime()) / (1000 * 60 * 60);
      
      // Show onboarding for users with accounts less than 24 hours old
      if (hoursSinceCreation < 24) {
        const hasSeenOnboarding = localStorage.getItem(`onboarding_seen_${user.id}`);
        if (!hasSeenOnboarding) {
          setIsOpen(true);
        }
      }
    }
  }, [user, profile]);

  // Calculate progress
  const completedTasks = tasks.filter(task => task.completed).length;
  const progress = (completedTasks / tasks.length) * 100;

  const markTaskCompleted = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: true } : task
    ));
  };

  const handleClose = () => {
    if (user) {
      localStorage.setItem(`onboarding_seen_${user.id}`, 'true');
    }
    setIsOpen(false);
  };

  const handleTaskAction = (task: OnboardingTask) => {
    if (task.link) {
      window.location.href = task.link;
    }
    markTaskCompleted(task.id);
  };

  const nextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const steps = [
    {
      title: "Welcome to LexInnova!",
      content: (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Search className="h-8 w-8 text-primary" />
          </div>
          <p className="text-muted-foreground">
            Your AI-powered legal research platform for Massachusetts criminal law is ready. 
            Let's get you started with the essentials.
          </p>
        </div>
      )
    },
    {
      title: "Quick Setup Checklist",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Setup Progress</span>
            <Badge variant="secondary">{completedTasks}/{tasks.length} completed</Badge>
          </div>
          <Progress value={progress} className="mb-6" />
          
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {task.completed ? (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  ) : (
                    <div className="w-5 h-5 border border-muted-foreground rounded-full" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.description}</p>
                  </div>
                </div>
                {!task.completed && task.action && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleTaskAction(task)}
                  >
                    {task.action}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "You're All Set!",
      content: (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <p className="text-muted-foreground">
            LexInnova is ready to transform your legal research experience. 
            Start by searching for any Massachusetts criminal law topic using natural language.
          </p>
          <div className="bg-muted/30 p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">💡 Pro Tip</p>
            <p className="text-xs text-muted-foreground">
              Try asking: "What are the penalties for first-time DUI in Massachusetts?" 
              or "Recent SJC decisions on search and seizure"
            </p>
          </div>
        </div>
      )
    }
  ];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              {steps[currentStep].title}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-left">
            Step {currentStep + 1} of {steps.length}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {steps[currentStep].content}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          
          <Button onClick={nextStep} className="flex items-center space-x-2">
            <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
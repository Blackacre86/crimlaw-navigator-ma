import { Alert, AlertDescription } from '@/components/ui/alert';

export const VisionBanner = () => (
  <Alert className="mb-4 bg-primary/90 text-primary-foreground border-primary/50">
    <AlertDescription className="text-sm font-medium">
      SHIFT: Disrupting MA law enforcement training with AI-powered, public-domain tools. Not legal advice—verify with officials.
    </AlertDescription>
  </Alert>
);
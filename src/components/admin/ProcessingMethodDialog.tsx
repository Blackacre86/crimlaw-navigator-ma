import { Button } from '@/components/ui/button';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Zap, Clock } from 'lucide-react';

interface ProcessingMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName?: string;
  onSelectMethod: (useLlamaCloud: boolean) => void;
}

export function ProcessingMethodDialog({ 
  open, 
  onOpenChange, 
  fileName, 
  onSelectMethod 
}: ProcessingMethodDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Choose Processing Method</AlertDialogTitle>
          <AlertDialogDescription>
            How would you like to process "{fileName}"?
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-3 my-4">
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => onSelectMethod(true)}
          >
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-left">
                <div className="font-semibold">Advanced (LlamaCloud)</div>
                <div className="text-sm text-muted-foreground">
                  Best for complex legal documents with tables and precise formatting
                </div>
              </div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => onSelectMethod(false)}
          >
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-left">
                <div className="font-semibold">Standard (Fast)</div>
                <div className="text-sm text-muted-foreground">
                  Quick processing for text-heavy documents
                </div>
              </div>
            </div>
          </Button>
        </div>
        
        <AlertDialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
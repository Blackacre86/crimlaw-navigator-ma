import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, Volume2, MicOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FieldEchoModeProps {
  onSearch: (query: string, isLoading: boolean, answer: string | null, sources: any[], error: string | null) => void;
  responseText: string;
  isEnabled?: boolean;
}

type VoiceOption = {
  id: string;
  name: string;
  description: string;
};

const voiceOptions: VoiceOption[] = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral, professional' },
  { id: 'echo', name: 'Echo', description: 'Authoritative male' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear female' },
];

export const FieldEchoMode: React.FC<FieldEchoModeProps> = ({ 
  onSearch, 
  responseText, 
  isEnabled = true 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const { toast } = useToast();

  const addHapticFeedback = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
  }, []);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Voice not supported",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive",
      });
      return;
    }

    setIsListening(true);
    addHapticFeedback();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      toast({
        title: "FieldEcho Mode Active",
        description: "Listening for your query...",
      });
    };

    recognition.onresult = (event) => {
      const query = event.results[0][0].transcript;
      console.log('Voice query captured:', query);
      onSearch(query, false, null, [], null);
      setIsListening(false);
      addHapticFeedback();
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      toast({
        title: "Voice recognition failed",
        description: "Please try again or use text input",
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [onSearch, addHapticFeedback, toast]);

  const playResponse = useCallback(async () => {
    if (!responseText) return;

    setIsProcessing(true);
    addHapticFeedback();

    try {
      const disclaimerText = "Disclaimer: This is AI-generated information, not legal advice. Consult official sources or a qualified attorney. ";
      const fullText = disclaimerText + responseText;

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: fullText,
          voice: selectedVoice,
        },
      });

      if (error) throw error;

      if (data?.audioContent) {
        // Convert base64 to blob and play
        const binaryString = atob(data.audioContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          addHapticFeedback();
        };
        
        await audio.play();
        
        toast({
          title: "FieldEcho Response",
          description: "Audio response completed",
        });
      }
    } catch (error) {
      console.error('TTS error:', error);
      toast({
        title: "Audio playback failed",
        description: "Unable to generate audio response",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [responseText, selectedVoice, addHapticFeedback, toast]);

  if (!isEnabled) return null;

  return (
    <div className="flex flex-col gap-3 p-4 border border-border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">FieldEcho Mode</h3>
        <Select value={selectedVoice} onValueChange={setSelectedVoice}>
          <SelectTrigger className="w-40 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {voiceOptions.map((voice) => (
              <SelectItem key={voice.id} value={voice.id}>
                <div className="flex flex-col">
                  <span className="text-sm">{voice.name}</span>
                  <span className="text-xs text-muted-foreground">{voice.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={startListening}
          disabled={isListening || isProcessing}
          variant={isListening ? "secondary" : "default"}
          size="sm"
          className="flex-1"
          aria-label="Voice Query for Field Use"
        >
          {isListening ? (
            <>
              <MicOff className="w-4 h-4 mr-2" />
              Listening...
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 mr-2" />
              Voice Query
            </>
          )}
        </Button>

        {responseText && (
          <Button
            onClick={playResponse}
            disabled={isProcessing || isListening}
            variant="outline"
            size="sm"
            className="flex-1"
            aria-label="Play Response Audio"
          >
            <Volume2 className="w-4 h-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Hear Response'}
          </Button>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Hands-free operation for field scenarios. Audio includes compliance disclaimers.
      </p>
    </div>
  );
};
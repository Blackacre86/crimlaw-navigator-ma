import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AudioRecorder, encodeAudioForAPI, AudioPlayer } from '@/utils/VoiceInterface';
import { supabase } from '@/integrations/supabase/client';

interface VoiceSearchButtonProps {
  onSearch: (query: string, isLoading: boolean, answer: string | null, sources: any[], error: string | null) => void;
}

export const VoiceSearchButton: React.FC<VoiceSearchButtonProps> = ({ onSearch }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer>(new AudioPlayer());
  const audioChunksRef = useRef<Float32Array[]>([]);

  const startListening = async () => {
    try {
      audioChunksRef.current = [];
      recorderRef.current = new AudioRecorder((audioData) => {
        audioChunksRef.current.push(audioData);
      });
      
      await recorderRef.current.start();
      setIsListening(true);
      
      toast({
        title: "Listening",
        description: "Speak your legal question now...",
      });
    } catch (error) {
      console.error('Error starting voice recording:', error);
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopListening = async () => {
    if (!recorderRef.current) return;

    setIsListening(false);
    setIsProcessing(true);
    recorderRef.current.stop();

    try {
      // Combine all audio chunks
      const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
      const combinedAudio = new Float32Array(totalLength);
      let offset = 0;
      
      for (const chunk of audioChunksRef.current) {
        combinedAudio.set(chunk, offset);
        offset += chunk.length;
      }

      // Convert to base64 for API
      const audioBase64 = encodeAudioForAPI(combinedAudio);

      // Send to voice-to-text function
      const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: audioBase64 }
      });

      if (transcriptionError) {
        throw new Error(transcriptionError.message);
      }

      const transcribedText = transcriptionData.text;
      
      if (!transcribedText || transcribedText.trim().length === 0) {
        throw new Error("No speech detected. Please try again.");
      }

      toast({
        title: "Processing",
        description: `Searching for: "${transcribedText}"`,
      });

      // Perform the search
      onSearch(transcribedText, true, null, [], null);

      // Search using existing search logic
      try {
        const { data: searchData, error: searchError } = await supabase.functions.invoke('process-legal-query', {
          body: { query: transcribedText }
        });

        if (searchError) {
          throw new Error(searchError.message);
        }

        // Convert response to speech
        const responseText = searchData.answer || "I found some relevant information for your query.";
        
        const { data: speechData, error: speechError } = await supabase.functions.invoke('text-to-speech', {
          body: { 
            text: responseText,
            voice: 'eric' // Professional male voice for law enforcement
          }
        });

        if (speechError) {
          console.error('Text-to-speech error:', speechError);
        } else {
          // Play the audio response
          await audioPlayerRef.current.playAudioData(speechData.audioContent);
        }

        onSearch(transcribedText, false, searchData.answer, searchData.sources || [], null);

      } catch (searchError) {
        console.error('Search error:', searchError);
        onSearch(transcribedText, false, null, [], searchError instanceof Error ? searchError.message : 'Search failed');
      }

    } catch (error) {
      console.error('Voice processing error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Voice processing failed",
        variant: "destructive",
      });
      onSearch("", false, null, [], error instanceof Error ? error.message : "Voice processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={toggleListening}
        disabled={isProcessing}
        variant={isListening ? "destructive" : "secondary"}
        size="lg"
        className="relative"
      >
        {isListening ? (
          <>
            <MicOff className="w-5 h-5 mr-2" />
            Stop Recording
          </>
        ) : isProcessing ? (
          <>
            <Volume2 className="w-5 h-5 mr-2 animate-pulse" />
            Processing...
          </>
        ) : (
          <>
            <Mic className="w-5 h-5 mr-2" />
            Voice Search
          </>
        )}
        
        {isListening && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </Button>
      
      {isListening && (
        <div className="text-sm text-muted-foreground animate-pulse">
          Listening... Click stop when done
        </div>
      )}
    </div>
  );
};
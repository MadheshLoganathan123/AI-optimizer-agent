import React, { useEffect } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

export default function VoiceAssistant({ onCommand, onTranscriptChange, onListeningChange }) {
  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    onTranscriptChange?.(transcript);
  }, [transcript, onTranscriptChange]);

  useEffect(() => {
    onListeningChange?.(listening);
  }, [listening, onListeningChange]);

  const handleMicToggle = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      if (transcript.trim()) {
        onCommand?.(transcript);
      }
      return;
    }

    resetTranscript();
    SpeechRecognition.startListening({ continuous: true, language: "en-IN" });
  };

  return (
    <button
      className={`voice-button ${listening ? "listening" : ""}`}
      onClick={handleMicToggle}
      aria-label={listening ? "Stop voice command" : "Start voice command"}
    >
      <span aria-hidden="true">🎤</span>
    </button>
  );
}

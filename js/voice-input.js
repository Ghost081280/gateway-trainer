// Gateway Trainer - Voice Input (Speech Recognition)
// ==================================================
// Uses browser's built-in SpeechRecognition API
// Continuous listening mode - user can just speak naturally

class VoiceInput {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      this.supported = false;
      return;
    }
    
    this.supported = true;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;        // Keep listening
    this.recognition.interimResults = true;    // Show words as they speak
    this.recognition.lang = CONFIG.SPEECH.language;
    
    this.isListening = false;
    this.isPaused = false;
    this.onInterimResult = null;   // Callback for real-time display
    this.onFinalResult = null;     // Callback when user finishes a phrase
    this.onListeningChange = null; // Callback for UI state
    this.onError = null;           // Callback for errors
    
    this.silenceTimeout = null;
    this.finalTranscript = '';
    
    this._setupRecognition();
  }
  
  _setupRecognition() {
    if (!this.supported) return;
    
    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          this.finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Show interim results in real-time (grayed out, updating)
      if (this.onInterimResult && interimTranscript) {
        this.onInterimResult(interimTranscript);
      }
      
      // When user finishes a phrase, send it after silence delay
      if (this.finalTranscript) {
        this._clearSilenceTimeout();
        
        // Wait for potential additional words
        this.silenceTimeout = setTimeout(() => {
          if (this.onFinalResult && this.finalTranscript.trim()) {
            this.onFinalResult(this.finalTranscript.trim());
          }
          this.finalTranscript = '';
          
          // Clear interim display
          if (this.onInterimResult) {
            this.onInterimResult('');
          }
        }, CONFIG.SPEECH.silenceDelay);
      }
    };
    
    this.recognition.onend = () => {
      // Auto-restart if we're supposed to be listening
      if (this.isListening && !this.isPaused) {
        try {
          this.recognition.start();
        } catch (e) {
          // Already started, ignore
        }
      }
    };
    
    this.recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      
      // Handle specific errors
      if (event.error === 'not-allowed') {
        // Microphone permission denied
        if (this.onError) {
          this.onError('microphone-denied');
        }
        this.isListening = false;
        this.isPaused = false;
        return;
      }
      
      // Restart on recoverable errors
      if (event.error === 'no-speech' || event.error === 'aborted' || event.error === 'network') {
        if (this.isListening && !this.isPaused) {
          setTimeout(() => {
            try {
              this.recognition.start();
            } catch (e) {
              // Already started, ignore
            }
          }, 100);
        }
      }
    };
  }
  
  _clearSilenceTimeout() {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }
  
  // Request microphone permission
  async requestPermission() {
    if (!this.supported) {
      return { granted: false, error: 'not-supported' };
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      return { granted: true };
    } catch (error) {
      console.warn('Microphone permission denied:', error);
      return { granted: false, error: 'denied' };
    }
  }
  
  // Start continuous listening for the session
  startSession() {
    if (!this.supported) {
      console.warn('Speech recognition not supported');
      return false;
    }
    
    if (!CONFIG.PREMIUM.voiceInput) {
      console.log('Voice input disabled (not premium)');
      return false;
    }
    
    try {
      this.isListening = true;
      this.isPaused = false;
      this.finalTranscript = '';
      this.recognition.start();
      
      if (this.onListeningChange) {
        this.onListeningChange(true);
      }
      
      console.log('Voice input session started');
      return true;
    } catch (error) {
      console.error('Failed to start voice input:', error);
      return false;
    }
  }
  
  // Pause listening (while AI is speaking)
  pause() {
    if (!this.supported || !this.isListening) return;
    
    this.isPaused = true;
    this._clearSilenceTimeout();
    
    try {
      this.recognition.stop();
    } catch (e) {
      // Already stopped, ignore
    }
    
    if (this.onListeningChange) {
      this.onListeningChange(false);
    }
    
    console.log('Voice input paused');
  }
  
  // Resume listening (after AI finishes speaking)
  resume() {
    if (!this.supported || !this.isListening) return;
    
    this.isPaused = false;
    this.finalTranscript = '';
    
    try {
      this.recognition.start();
    } catch (e) {
      // Already started, ignore
    }
    
    if (this.onListeningChange) {
      this.onListeningChange(true);
    }
    
    console.log('Voice input resumed');
  }
  
  // End listening for the session
  stopSession() {
    if (!this.supported) return;
    
    this.isListening = false;
    this.isPaused = false;
    this._clearSilenceTimeout();
    
    try {
      this.recognition.stop();
    } catch (e) {
      // Already stopped, ignore
    }
    
    if (this.onListeningChange) {
      this.onListeningChange(false);
    }
    
    console.log('Voice input session ended');
  }
  
  // Check if voice input is supported
  isSupported() {
    return this.supported;
  }
  
  // Check if currently listening
  getIsListening() {
    return this.isListening && !this.isPaused;
  }
}

// Create global instance
const voiceInput = new VoiceInput();

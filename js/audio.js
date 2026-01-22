// Gateway Trainer - Binaural Beat Generator
// ==========================================
// Uses Web Audio API to generate binaural beats in real-time
// No audio files needed - pure synthesis

class BinauralBeatGenerator {
  constructor() {
    this.audioContext = null;
    this.leftOscillator = null;
    this.rightOscillator = null;
    this.leftGain = null;
    this.rightGain = null;
    this.masterGain = null;
    this.isPlaying = false;
    this.currentFocusLevel = null;
    
    // Pink noise for comfort layer (optional)
    this.noiseNode = null;
    this.noiseGain = null;
    this.noiseEnabled = false;
  }
  
  // Initialize audio context (must be called after user interaction)
  async init() {
    if (this.audioContext) return;
    
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create master gain for overall volume control
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = CONFIG.AUDIO.defaultVolume;
    this.masterGain.connect(this.audioContext.destination);
    
    // Create stereo panner nodes for left/right separation
    this.leftPanner = this.audioContext.createStereoPanner();
    this.leftPanner.pan.value = -1; // Full left
    
    this.rightPanner = this.audioContext.createStereoPanner();
    this.rightPanner.pan.value = 1; // Full right
    
    // Create gain nodes for each channel
    this.leftGain = this.audioContext.createGain();
    this.rightGain = this.audioContext.createGain();
    
    // Connect the chain: oscillator -> gain -> panner -> master
    this.leftGain.connect(this.leftPanner);
    this.leftPanner.connect(this.masterGain);
    
    this.rightGain.connect(this.rightPanner);
    this.rightPanner.connect(this.masterGain);
    
    console.log('Audio context initialized');
  }
  
  // Start binaural beats at specified focus level
  async start(focusLevel = 10) {
    await this.init();
    
    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Stop any existing playback
    if (this.isPlaying) {
      this.stop(false); // Stop without fade
    }
    
    const focusConfig = CONFIG.FOCUS_LEVELS[focusLevel];
    if (!focusConfig) {
      console.error('Invalid focus level:', focusLevel);
      return;
    }
    
    this.currentFocusLevel = focusLevel;
    
    const carrierFreq = CONFIG.AUDIO.carrierFrequency;
    const beatFreq = focusConfig.beatFreq;
    
    // Calculate frequencies for each ear
    // Left ear gets carrier, right ear gets carrier + beat
    const leftFreq = carrierFreq;
    const rightFreq = carrierFreq + beatFreq;
    
    // Create oscillators
    this.leftOscillator = this.audioContext.createOscillator();
    this.leftOscillator.type = 'sine';
    this.leftOscillator.frequency.value = leftFreq;
    
    this.rightOscillator = this.audioContext.createOscillator();
    this.rightOscillator.type = 'sine';
    this.rightOscillator.frequency.value = rightFreq;
    
    // Connect oscillators to their respective gain nodes
    this.leftOscillator.connect(this.leftGain);
    this.rightOscillator.connect(this.rightGain);
    
    // Start with zero volume for fade-in
    this.leftGain.gain.value = 0;
    this.rightGain.gain.value = 0;
    
    // Start oscillators
    this.leftOscillator.start();
    this.rightOscillator.start();
    
    // Fade in
    const fadeTime = CONFIG.AUDIO.fadeInTime;
    const targetVolume = 0.5; // Each channel at 50% for comfortable stereo
    
    this.leftGain.gain.linearRampToValueAtTime(
      targetVolume,
      this.audioContext.currentTime + fadeTime
    );
    this.rightGain.gain.linearRampToValueAtTime(
      targetVolume,
      this.audioContext.currentTime + fadeTime
    );
    
    this.isPlaying = true;
    
    console.log(`Binaural beats started: Focus ${focusLevel} (${beatFreq} Hz beat)`);
  }
  
  // Stop binaural beats
  stop(fade = true) {
    if (!this.isPlaying || !this.audioContext) return;
    
    const fadeTime = fade ? CONFIG.AUDIO.fadeOutTime : 0;
    const currentTime = this.audioContext.currentTime;
    
    // Fade out
    if (this.leftGain && this.rightGain) {
      this.leftGain.gain.linearRampToValueAtTime(0, currentTime + fadeTime);
      this.rightGain.gain.linearRampToValueAtTime(0, currentTime + fadeTime);
    }
    
    // Stop oscillators after fade
    setTimeout(() => {
      if (this.leftOscillator) {
        this.leftOscillator.stop();
        this.leftOscillator.disconnect();
        this.leftOscillator = null;
      }
      if (this.rightOscillator) {
        this.rightOscillator.stop();
        this.rightOscillator.disconnect();
        this.rightOscillator = null;
      }
    }, fadeTime * 1000);
    
    this.isPlaying = false;
    this.currentFocusLevel = null;
    
    console.log('Binaural beats stopped');
  }
  
  // Pause playback
  pause() {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
      console.log('Audio paused');
    }
  }
  
  // Resume playback
  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
      console.log('Audio resumed');
    }
  }
  
  // Change to different focus level smoothly
  async changeFocusLevel(newFocusLevel) {
    if (!this.isPlaying) {
      await this.start(newFocusLevel);
      return;
    }
    
    const focusConfig = CONFIG.FOCUS_LEVELS[newFocusLevel];
    if (!focusConfig) {
      console.error('Invalid focus level:', newFocusLevel);
      return;
    }
    
    const carrierFreq = CONFIG.AUDIO.carrierFrequency;
    const newBeatFreq = focusConfig.beatFreq;
    const transitionTime = 2; // seconds
    
    // Smoothly transition frequencies
    const newRightFreq = carrierFreq + newBeatFreq;
    
    this.rightOscillator.frequency.linearRampToValueAtTime(
      newRightFreq,
      this.audioContext.currentTime + transitionTime
    );
    
    this.currentFocusLevel = newFocusLevel;
    
    console.log(`Transitioning to Focus ${newFocusLevel} (${newBeatFreq} Hz beat)`);
  }
  
  // Set master volume (0-1)
  setVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.linearRampToValueAtTime(
        Math.max(0, Math.min(1, volume)),
        this.audioContext.currentTime + 0.1
      );
    }
  }
  
  // Get current volume
  getVolume() {
    return this.masterGain ? this.masterGain.gain.value : CONFIG.AUDIO.defaultVolume;
  }
  
  // Set carrier frequency
  setCarrierFrequency(frequency) {
    if (!this.isPlaying) {
      CONFIG.AUDIO.carrierFrequency = frequency;
      return;
    }
    
    const focusConfig = CONFIG.FOCUS_LEVELS[this.currentFocusLevel];
    const beatFreq = focusConfig ? focusConfig.beatFreq : 10;
    
    this.leftOscillator.frequency.linearRampToValueAtTime(
      frequency,
      this.audioContext.currentTime + 0.5
    );
    this.rightOscillator.frequency.linearRampToValueAtTime(
      frequency + beatFreq,
      this.audioContext.currentTime + 0.5
    );
  }
  
  // Check if currently playing
  getIsPlaying() {
    return this.isPlaying;
  }
  
  // Get current focus level
  getCurrentFocusLevel() {
    return this.currentFocusLevel;
  }
  
  // Play a simple chime/bell sound (for session end)
  playChime() {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 528; // "Love frequency" / healing frequency
    
    gainNode.gain.value = 0.3;
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + 2
    );
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 2);
  }
  
  // Clean up
  destroy() {
    this.stop(false);
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Create global instance
const binauralBeats = new BinauralBeatGenerator();

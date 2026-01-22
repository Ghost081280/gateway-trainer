// Gateway Trainer - Session Manager
// ==================================
// Handles session state, timing, progress tracking, and localStorage

const DEFAULT_USER_DATA = {
  // Lifetime stats
  totalSessions: 0,
  totalTargets: 0,
  lifetimeAccuracy: 0,
  
  // Training progression
  accuracyHistory: [],
  
  // Usage patterns
  focusLevelUsage: { 10: 0, 12: 0, 15: 0, 21: 0 },
  totalTrainingTime: 0,
  
  // Streaks
  currentStreak: 0,
  longestStreak: 0,
  lastSessionDate: null,
  
  // Exploration journals
  journals: [],
  
  // Preferences
  preferredDuration: 10,
  preferredTargetCount: 5,
  binauralVolume: 0.7,
  voiceOutputEnabled: true,
  voiceInputEnabled: true,
  carrierFrequency: 200
};

class SessionManager {
  constructor() {
    this.userData = this.loadUserData();
    this.currentSession = null;
    this.timer = null;
    this.timerCallback = null;
    this.timerEndCallback = null;
  }
  
  // Load user data from localStorage
  loadUserData() {
    try {
      const saved = localStorage.getItem('gatewayTrainer');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults in case new fields were added
        return { ...DEFAULT_USER_DATA, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
    return { ...DEFAULT_USER_DATA };
  }
  
  // Save user data to localStorage
  saveUserData() {
    try {
      localStorage.setItem('gatewayTrainer', JSON.stringify(this.userData));
    } catch (error) {
      console.error('Failed to save user data:', error);
    }
  }
  
  // Clear all user data
  clearUserData() {
    this.userData = { ...DEFAULT_USER_DATA };
    localStorage.removeItem('gatewayTrainer');
    console.log('User data cleared');
  }
  
  // Check if user is returning
  isReturningUser() {
    return this.userData.totalSessions > 0;
  }
  
  // Get user stats for display
  getUserStats() {
    return {
      sessions: this.userData.totalSessions,
      accuracy: this.userData.lifetimeAccuracy,
      streak: this.userData.currentStreak
    };
  }
  
  // Start a new training session
  startTrainingSession(focusLevel, targetCount, durationMinutes) {
    const targets = getRandomTargets(targetCount);
    
    this.currentSession = {
      type: 'training',
      startTime: Date.now(),
      focusLevel: focusLevel,
      durationMinutes: durationMinutes,
      targets: targets,
      currentTargetIndex: 0,
      scores: [],
      impressions: [],
      isComplete: false
    };
    
    console.log('Training session started:', {
      focusLevel,
      targetCount,
      durationMinutes
    });
    
    return this.currentSession;
  }
  
  // Start an exploration session
  startExplorationSession(focusLevel, durationMinutes) {
    this.currentSession = {
      type: 'exploration',
      startTime: Date.now(),
      focusLevel: focusLevel,
      durationMinutes: durationMinutes,
      isComplete: false
    };
    
    console.log('Exploration session started:', {
      focusLevel,
      durationMinutes
    });
    
    return this.currentSession;
  }
  
  // Start a quick session
  startQuickSession(focusLevel, durationMinutes) {
    this.currentSession = {
      type: 'quick',
      startTime: Date.now(),
      focusLevel: focusLevel,
      durationMinutes: durationMinutes,
      isComplete: false
    };
    
    console.log('Quick session started:', {
      focusLevel,
      durationMinutes
    });
    
    return this.currentSession;
  }
  
  // Get current target
  getCurrentTarget() {
    if (!this.currentSession || this.currentSession.type !== 'training') {
      return null;
    }
    return this.currentSession.targets[this.currentSession.currentTargetIndex];
  }
  
  // Check if there are more targets
  hasMoreTargets() {
    if (!this.currentSession || this.currentSession.type !== 'training') {
      return false;
    }
    return this.currentSession.currentTargetIndex < this.currentSession.targets.length;
  }
  
  // Get session progress
  getProgress() {
    if (!this.currentSession || this.currentSession.type !== 'training') {
      return { current: 0, total: 0 };
    }
    return {
      current: this.currentSession.currentTargetIndex + 1,
      total: this.currentSession.targets.length
    };
  }
  
  // Record result for current target
  recordTargetResult(score, impressions) {
    if (!this.currentSession || this.currentSession.type !== 'training') {
      return;
    }
    
    this.currentSession.scores.push(score);
    this.currentSession.impressions.push(impressions);
    this.currentSession.currentTargetIndex++;
    
    console.log('Target result recorded:', { score, impressions });
  }
  
  // End training session and calculate stats
  endTrainingSession() {
    if (!this.currentSession || this.currentSession.type !== 'training') {
      return null;
    }
    
    this.stopTimer();
    
    const session = this.currentSession;
    session.isComplete = true;
    session.endTime = Date.now();
    
    // Calculate session stats
    const scores = session.scores;
    const averageScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const duration = Math.round((session.endTime - session.startTime) / 1000 / 60);
    
    // Update user data
    this.userData.totalSessions++;
    this.userData.totalTargets += scores.length;
    
    if (scores.length > 0) {
      this.userData.accuracyHistory.push(averageScore);
      
      // Recalculate lifetime accuracy
      const allScores = this.userData.accuracyHistory;
      this.userData.lifetimeAccuracy = Math.round(
        allScores.reduce((a, b) => a + b, 0) / allScores.length
      );
    }
    
    // Update focus level usage
    this.userData.focusLevelUsage[session.focusLevel]++;
    this.userData.totalTrainingTime += duration;
    
    // Update streak
    this._updateStreak();
    
    // Save
    this.saveUserData();
    
    const result = {
      targetCount: scores.length,
      averageScore: averageScore,
      bestScore: bestScore,
      duration: duration,
      streak: this.userData.currentStreak,
      focusLevel: session.focusLevel
    };
    
    console.log('Training session ended:', result);
    
    this.currentSession = null;
    return result;
  }
  
  // End exploration session
  endExplorationSession() {
    if (!this.currentSession || this.currentSession.type !== 'exploration') {
      return null;
    }
    
    this.stopTimer();
    
    const session = this.currentSession;
    session.isComplete = true;
    session.endTime = Date.now();
    
    const duration = Math.round((session.endTime - session.startTime) / 1000 / 60);
    
    // Update stats
    this.userData.totalSessions++;
    this.userData.focusLevelUsage[session.focusLevel]++;
    this.userData.totalTrainingTime += duration;
    this._updateStreak();
    this.saveUserData();
    
    const result = {
      duration: duration,
      focusLevel: session.focusLevel
    };
    
    console.log('Exploration session ended:', result);
    
    this.currentSession = null;
    return result;
  }
  
  // End quick session
  endQuickSession() {
    if (!this.currentSession || this.currentSession.type !== 'quick') {
      return null;
    }
    
    this.stopTimer();
    
    const session = this.currentSession;
    session.endTime = Date.now();
    
    const duration = Math.round((session.endTime - session.startTime) / 1000 / 60);
    
    // Update minimal stats
    this.userData.focusLevelUsage[session.focusLevel]++;
    this.userData.totalTrainingTime += duration;
    this.saveUserData();
    
    console.log('Quick session ended');
    
    this.currentSession = null;
    return { duration };
  }
  
  // Save journal entry
  saveJournalEntry(entry) {
    if (!entry || entry.trim() === '') return;
    
    this.userData.journals.push({
      date: new Date().toISOString(),
      focusLevel: this.currentSession?.focusLevel || 10,
      entry: entry.trim()
    });
    
    // Keep only last 50 journals
    if (this.userData.journals.length > 50) {
      this.userData.journals = this.userData.journals.slice(-50);
    }
    
    this.saveUserData();
    console.log('Journal entry saved');
  }
  
  // Update streak logic
  _updateStreak() {
    const today = new Date().toDateString();
    const lastSession = this.userData.lastSessionDate;
    
    if (lastSession) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      
      if (lastSession === today) {
        // Same day, streak continues (no change)
      } else if (lastSession === yesterdayStr) {
        // Consecutive day, increment streak
        this.userData.currentStreak++;
      } else {
        // Streak broken, reset to 1
        this.userData.currentStreak = 1;
      }
    } else {
      // First session
      this.userData.currentStreak = 1;
    }
    
    // Update longest streak
    this.userData.longestStreak = Math.max(
      this.userData.longestStreak,
      this.userData.currentStreak
    );
    
    this.userData.lastSessionDate = today;
  }
  
  // Timer functions
  startTimer(durationMinutes, onTick, onEnd) {
    this.timerCallback = onTick;
    this.timerEndCallback = onEnd;
    
    const endTime = Date.now() + (durationMinutes * 60 * 1000);
    
    this.timer = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      
      if (this.timerCallback) {
        this.timerCallback(minutes, seconds, remaining);
      }
      
      if (remaining <= 0) {
        this.stopTimer();
        if (this.timerEndCallback) {
          this.timerEndCallback();
        }
      }
    }, 1000);
  }
  
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  
  pauseTimer() {
    // For pause functionality, we'd need to track remaining time
    // Simplified: just stop the timer
    this.stopTimer();
  }
  
  // Preferences
  getPreferences() {
    return {
      duration: this.userData.preferredDuration,
      targetCount: this.userData.preferredTargetCount,
      volume: this.userData.binauralVolume,
      voiceOutput: this.userData.voiceOutputEnabled,
      voiceInput: this.userData.voiceInputEnabled,
      carrier: this.userData.carrierFrequency
    };
  }
  
  setPreference(key, value) {
    const keyMap = {
      duration: 'preferredDuration',
      targetCount: 'preferredTargetCount',
      volume: 'binauralVolume',
      voiceOutput: 'voiceOutputEnabled',
      voiceInput: 'voiceInputEnabled',
      carrier: 'carrierFrequency'
    };
    
    if (keyMap[key]) {
      this.userData[keyMap[key]] = value;
      this.saveUserData();
    }
  }
}

// Create global instance
const sessionManager = new SessionManager();

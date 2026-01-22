// Gateway Trainer - Share to X/Twitter
// =====================================

function shareToX(sessionResult) {
  const focusConfig = CONFIG.FOCUS_LEVELS[sessionResult.focusLevel];
  
  const text = `Gateway Trainer - Session Complete

${focusConfig.name}
Accuracy: ${sessionResult.averageScore}%
Targets: ${sessionResult.targetCount}

Day #${sessionManager.userData.totalSessions} | Streak: ${sessionResult.streak} days

AI-guided remote viewing trainer
Based on declassified CIA research

https://github.com/yourusername/gateway-trainer`;

  const encodedText = encodeURIComponent(text);
  const url = `https://twitter.com/intent/tweet?text=${encodedText}`;
  
  window.open(url, '_blank', 'width=550,height=420');
}

// Generate share text without opening window
function getShareText(sessionResult) {
  const focusConfig = CONFIG.FOCUS_LEVELS[sessionResult.focusLevel];
  
  return `Gateway Trainer - Session Complete

${focusConfig.name}
Accuracy: ${sessionResult.averageScore}%
Targets: ${sessionResult.targetCount}

Day #${sessionManager.userData.totalSessions} | Streak: ${sessionResult.streak} days

AI-guided remote viewing trainer based on declassified CIA research`;
}

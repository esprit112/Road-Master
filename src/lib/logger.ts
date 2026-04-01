export const Logger = {
  error: (message: string, error?: any, context?: string) => {
    const timestamp = new Date().toISOString();
    let stack = error?.stack || new Error().stack || '';
    
    // Attempt to extract function name and line number from stack trace
    let functionName = 'unknown';
    let lineNumber = 'unknown';
    
    const stackLines = stack.split('\n');
    if (stackLines.length > 1) {
      // The first line is usually the error message, the second is the immediate caller
      const callerLine = stackLines[1] || stackLines[0];
      const match = callerLine.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/) || callerLine.match(/at\s+(.*):(\d+):(\d+)/);
      
      if (match) {
        if (match.length === 5) {
          functionName = match[1];
          lineNumber = `${match[2]}:${match[3]}`;
        } else if (match.length === 4) {
          functionName = 'anonymous';
          lineNumber = `${match[1]}:${match[2]}`;
        }
      }
    }

    const logEntry = {
      timestamp,
      level: 'ERROR',
      message,
      context: context || functionName,
      line: lineNumber,
      details: error?.message || error
    };

    console.error(`[${logEntry.timestamp}] ERROR in ${logEntry.context} (Line ${logEntry.line}): ${logEntry.message}`, error);
    
    // In a real app, you might send this to a service like Sentry or LogRocket
    // For now, we'll store it in sessionStorage for debugging
    try {
      const logs = JSON.parse(sessionStorage.getItem('app_error_logs') || '[]');
      logs.push(logEntry);
      // Keep only last 50 logs to prevent memory issues
      if (logs.length > 50) logs.shift();
      sessionStorage.setItem('app_error_logs', JSON.stringify(logs));
    } catch (e) {
      // Ignore storage errors
    }
  },
  
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data ? data : '');
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data ? data : '');
  }
};

// Set up global error handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    Logger.error('Unhandled Global Error', event.error, 'window.onerror');
  });

  window.addEventListener('unhandledrejection', (event) => {
    Logger.error('Unhandled Promise Rejection', event.reason, 'window.onunhandledrejection');
  });
}

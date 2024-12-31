// src/utils/errorReporting.ts
import * as Sentry from '@sentry/react-native';

export class ErrorReporting {
  static initialize() {
    Sentry.init({
      dsn: 'YOUR_SENTRY_DSN', // You'll get this from Sentry dashboard
      debug: __DEV__, // Enable debug in development
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
      // Add app version for release tracking
      release: 'wise-connections@1.0.0',
      // Add environment
      environment: __DEV__ ? 'development' : 'production',
      // Capture uncaught exceptions
      enableNative: true,
      // Set trace sample rate for performance monitoring
      tracesSampleRate: __DEV__ ? 1.0 : 0.2,
      // Capture user interactions
      integrations: [
        new Sentry.ReactNativeTracing({
          routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
          tracingOrigins: ['localhost', 'your-api-url.com'],
        }),
      ],
      beforeSend(event) {
        // Don't send events in development
        if (__DEV__) {
          return null;
        }
        return event;
      },
    });
  }

  static setUser(user: { id: string; email?: string }) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
    });
  }

  static clearUser() {
    Sentry.setUser(null);
  }

  static captureError(error: Error, context?: Record<string, any>) {
    if (__DEV__) {
      console.error('Error:', error);
      console.log('Context:', context);
      return;
    }

    Sentry.withScope(scope => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      Sentry.captureException(error);
    });
  }

  static captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    if (__DEV__) {
      console.log(`[${level}] ${message}`);
      return;
    }

    Sentry.captureMessage(message, level);
  }

  static addBreadcrumb(breadcrumb: {
    category: string;
    message: string;
    level?: Sentry.SeverityLevel;
    data?: Record<string, any>;
  }) {
    Sentry.addBreadcrumb({
      ...breadcrumb,
      timestamp: Date.now(),
    });
  }
}

// src/App.tsx
// Update your App.tsx to initialize Sentry
import { ErrorReporting } from './utils/errorReporting';

export default function App() {
  useEffect(() => {
    ErrorReporting.initialize();
  }, []);

  // ... rest of your App component
}

// src/hooks/useAuth.ts
// Update your auth hook to set user info
export const useAuth = () => {
  const login = async (credentials) => {
    try {
      const { data, error } = await supabase.auth.signIn(credentials);
      if (error) throw error;
      
      // Set user in Sentry
      ErrorReporting.setUser({
        id: data.user.id,
        email: data.user.email,
      });
      
      return { data, error: null };
    } catch (error) {
      ErrorReporting.captureError(error, { 
        context: 'auth/login',
        credentials: { email: credentials.email }, // Don't include sensitive data
      });
      return { data: null, error };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear user from Sentry
      ErrorReporting.clearUser();
    } catch (error) {
      ErrorReporting.captureError(error, { context: 'auth/logout' });
    }
  };
};

// Example usage in components/screens:
try {
  // Some risky operation
} catch (error) {
  ErrorReporting.captureError(error, {
    screen: 'HomeScreen',
    action: 'fetchPosts',
    userId: currentUser.id,
  });
}

// Add breadcrumbs for better error context
ErrorReporting.addBreadcrumb({
  category: 'navigation',
  message: 'User navigated to EventDetails',
  data: { eventId: '123' },
});

// Log important events
ErrorReporting.captureMessage('User completed onboarding', 'info');

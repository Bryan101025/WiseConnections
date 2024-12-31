// src/utils/analytics.ts
import { supabase } from '../config/supabase';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

export class Analytics {
  private static sessionStartTime: number;

  static async trackSession(type: 'start' | 'end') {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      if (type === 'start') {
        this.sessionStartTime = Date.now();
        await supabase
          .from('app_analytics')
          .insert({
            user_id: userData.user.id,
            event_type: 'session_start',
            platform: Platform.OS,
            os_version: Platform.Version,
            timestamp: new Date().toISOString(),
          });

        // Add session start breadcrumb in Sentry
        Sentry.addBreadcrumb({
          category: 'session',
          message: 'Session started',
          level: 'info',
          data: {
            platform: Platform.OS,
            os_version: Platform.Version,
          },
        });
      } else {
        const sessionDuration = Date.now() - this.sessionStartTime;
        await supabase
          .from('app_analytics')
          .insert({
            user_id: userData.user.id,
            event_type: 'session_end',
            platform: Platform.OS,
            os_version: Platform.Version,
            session_duration: sessionDuration,
            timestamp: new Date().toISOString(),
          });

        // Add session end breadcrumb in Sentry
        Sentry.addBreadcrumb({
          category: 'session',
          message: 'Session ended',
          level: 'info',
          data: {
            duration: sessionDuration,
          },
        });
      }
    } catch (error) {
      console.error('Error tracking session:', error);
      Sentry.captureException(error);
    }
  }

  static async trackPageView(pageName: string) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      await supabase
        .from('app_analytics')
        .insert({
          user_id: userData.user.id,
          event_type: 'page_view',
          page_name: pageName,
          platform: Platform.OS,
          timestamp: new Date().toISOString(),
        });

      // Track page view in Sentry
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: `Viewed ${pageName}`,
        level: 'info',
      });
    } catch (error) {
      console.error('Error tracking page view:', error);
      Sentry.captureException(error);
    }
  }

  static trackError(error: Error, context?: Record<string, any>) {
    // Track in Supabase
    supabase
      .from('app_analytics')
      .insert({
        event_type: 'error',
        error_message: error.message,
        error_context: context,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      })
      .then(() => {
        // Track in Sentry
        Sentry.withScope(scope => {
          if (context) {
            Object.entries(context).forEach(([key, value]) => {
              scope.setExtra(key, value);
            });
          }
          scope.setLevel(Sentry.Severity.Error);
          Sentry.captureException(error);
        });
      })
      .catch(err => console.error('Error tracking error:', err));
  }
}

// Then update App.tsx:
import * as Sentry from '@sentry/react-native';
import { Analytics } from './src/utils/analytics';

// Initialize Sentry
Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  debug: __DEV__,
  enabled: !__DEV__,
  tracesSampleRate: 1.0,
  enableAutoSessionTracking: true,
  attachStacktrace: true,
  environment: __DEV__ ? 'development' : 'production',
});

export default function App() {
  const [session, setSession] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session?.user) {
          // Set user context in Sentry
          Sentry.setUser({
            id: session.user.id,
            email: session.user.email,
          });
          await NotificationManager.registerForNotifications(session.user.id);
        }

        await CacheManager.cleanupExpiredCache();
        await CacheManager.cleanupOldCache(7);
        await OfflineSyncManager.initialize();
        await Analytics.trackSession('start');

        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing app:', error);
        Analytics.trackError(error, {
          location: 'App initialization',
          phase: 'startup',
        });
        setIsInitialized(true);
      }
    };

    initializeApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (session?.user) {
        Sentry.setUser({
          id: session.user.id,
          email: session.user.email,
        });
        await NotificationManager.registerForNotifications(session.user.id);
      } else {
        Sentry.setUser(null);
      }
    });

    const cleanupInterval = setInterval(async () => {
      try {
        await CacheManager.cleanupExpiredCache();
        await OfflineSyncManager.syncQueuedActions();
      } catch (error) {
        Analytics.trackError(error, {
          location: 'Periodic cleanup',
        });
      }
    }, 1000 * 60 * 60);

    return () => {
      Analytics.trackSession('end');
      subscription?.unsubscribe();
      clearInterval(cleanupInterval);
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer
        onStateChange={(state) => {
          const currentScreen = state?.routes[state.routes.length - 1];
          if (currentScreen) {
            Analytics.trackPageView(currentScreen.name);
          }
        }}
      >
        {/* ... rest of your app ... */}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

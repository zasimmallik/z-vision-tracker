import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './providers/AuthContext';
import { VisionDataProvider, useVisionData } from './providers/VisionDataContext';
import LoginScreen from '../features/auth/LoginScreen';
import OnboardingFlow from '../features/onboarding/OnboardingFlow';
import DashboardShell from '../features/dashboard/DashboardShell';

interface AuthGateProps {
  isDarkMode: boolean;
  onToggleTheme: (dark: boolean) => void;
  onExitDemo?: () => void;
}

const WorkspaceView: React.FC<AuthGateProps> = ({
  isDarkMode,
  onToggleTheme,
  onExitDemo,
}) => {
  const { loading, needsOnboarding } = useVisionData();

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-sm text-[var(--text-muted)] font-mono">
        Loading workspace…
      </div>
    );
  }

  if (needsOnboarding) {
    return <OnboardingFlow isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} />;
  }

  return (
    <DashboardShell
      isDarkMode={isDarkMode}
      onToggleTheme={onToggleTheme}
      onExitDemo={onExitDemo}
    />
  );
};

const AuthGate: React.FC<Omit<AuthGateProps, 'onExitDemo'>> = ({
  isDarkMode,
  onToggleTheme,
}) => {
  const { user, loading } = useAuth();
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    if (user) {
      setIsDemoMode(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-sm text-[var(--text-muted)] font-mono">
        Loading Z Vision…
      </div>
    );
  }

  if (!user && isDemoMode) {
    return (
      <VisionDataProvider demoMode={true}>
        <WorkspaceView
          isDarkMode={isDarkMode}
          onToggleTheme={onToggleTheme}
          onExitDemo={() => setIsDemoMode(false)}
        />
      </VisionDataProvider>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        isDark={isDarkMode}
        onToggleTheme={onToggleTheme}
        onTryDemo={() => setIsDemoMode(true)}
      />
    );
  }

  return (
    <VisionDataProvider>
      <WorkspaceView isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} />
    </VisionDataProvider>
  );
};

function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedTheme =
          localStorage.getItem('z_vision_app_theme') ||
          sessionStorage.getItem('z_vision_app_theme');
        if (savedTheme === 'light') return false;
        if (savedTheme === 'dark') return true;
      } catch (e) {
        console.error(e);
      }
    }
    return true;
  });

  useEffect(() => {
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('z_vision_app_theme', 'dark');
      } catch {
        // ignore storage errors
      }
      themeMeta?.setAttribute('content', '#050507');
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('z_vision_app_theme', 'light');
      } catch {
        // ignore storage errors
      }
      themeMeta?.setAttribute('content', '#deddd7');
    }
  }, [isDarkMode]);

  return (
    <AuthProvider>
      <AuthGate isDarkMode={isDarkMode} onToggleTheme={setIsDarkMode} />
    </AuthProvider>
  );
}

export default App;

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { RouterProvider, useRouter } from '@/context/RouterContext';
import { AppShell } from '@/components/AppShell';
import { LoadingScreen } from '@/components/ui/Spinner';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PlansPage } from '@/pages/PlansPage';
import { DayDetailPage } from '@/pages/DayDetailPage';
import { DrillsPage } from '@/pages/DrillsPage';
import { PedometerPage } from '@/pages/PedometerPage';
import { TrackingPage } from '@/pages/TrackingPage';
import { GoalsPage } from '@/pages/GoalsPage';
import { DietPage } from '@/pages/DietPage';
import { ChallengesPage } from '@/pages/ChallengesPage';
import { CoachPage } from '@/pages/CoachPage';
import { AnalysisPage } from '@/pages/AnalysisPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { ProfilePage } from '@/pages/ProfilePage';

function AppRoutes() {
  const { user, profile, loading } = useAuth();
  const { path } = useRouter();

  if (loading) return <LoadingScreen label="Loading TrainX..." />;

  if (path === '/' || path === '') return <LandingPage />;
  if (path === '/auth') {
    if (user) return <OnboardingOrApp user={!!user} hasProfile={!!profile} />;
    return <AuthPage />;
  }

  if (!user) return <AuthPage />;
  if (!profile && path !== '/onboarding') return <OnboardingPage />;
  if (path === '/onboarding') return <OnboardingPage />;

  // Day detail route: /plans/:planId/:dayIndex
  const planMatch = path.match(/^\/plans\/([a-f0-9-]+)\/(\d+)$/);
  if (planMatch) {
    return <AppShell><DayDetailPage planId={planMatch[1]} dayIndex={Number(planMatch[2])} /></AppShell>;
  }

  const route = path.split('/')[1];

  const pages: Record<string, React.ReactNode> = {
    dashboard: <DashboardPage />,
    plans: <PlansPage />,
    drills: <DrillsPage />,
    pedometer: <PedometerPage />,
    tracking: <TrackingPage />,
    goals: <GoalsPage />,
    diet: <DietPage />,
    challenges: <ChallengesPage />,
    coach: <CoachPage />,
    analysis: <AnalysisPage />,
    reports: <ReportsPage />,
    profile: <ProfilePage />,
  };

  const content = pages[route] ?? <DashboardPage />;
  return <AppShell>{content}</AppShell>;
}

function OnboardingOrApp({ user, hasProfile }: { user: boolean; hasProfile: boolean }) {
  if (!user) return <AuthPage />;
  return hasProfile ? <AppShell><DashboardPage /></AppShell> : <OnboardingPage />;
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </RouterProvider>
  );
}

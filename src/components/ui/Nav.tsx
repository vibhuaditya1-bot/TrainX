import { type LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

import {
  LayoutDashboard,
  CalendarRange,
  Library,
  Activity,
  Trophy,
  MessageSquare,
  Video,
  BarChart3,
  Utensils,
  Target,
  Footprints,
} from 'lucide-react';

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'plans', label: 'Training Plans', icon: CalendarRange },
  { id: 'drills', label: 'Drill Library', icon: Library },
  { id: 'pedometer', label: 'Step Tracker', icon: Footprints },
  { id: 'tracking', label: 'Fitness Tracking', icon: Activity },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'diet', label: 'Diet Plans', icon: Utensils },
  { id: 'challenges', label: 'Challenges', icon: Trophy },
  { id: 'coach', label: 'AI Coach', icon: MessageSquare },
  { id: 'analysis', label: 'Video Analysis', icon: Video },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getActiveGroup, getCurrentUser, getMyGroups } from '@/lib/data/session';
import { isSupabaseConfigured } from '@/lib/env';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) redirect('/login');
  }

  const [groups, activeGroup] = await Promise.all([getMyGroups(), getActiveGroup()]);

  return (
    <AppShell groups={groups} activeGroupId={activeGroup?.id ?? null}>
      {children}
    </AppShell>
  );
}

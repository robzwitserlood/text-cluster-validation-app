import { redirect } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import type { Phase, SessionState } from '../../../shared/types';
import { debriefQueryOptions, sessionQueryOptions } from '@/lib/queries';

export type FlowPath =
  | '/'
  | '/word/instructions'
  | '/word/practice'
  | '/word/task'
  | '/cluster/instructions'
  | '/cluster/practice'
  | '/cluster/task'
  | '/complete';

export interface RouterContext {
  queryClient: QueryClient;
}

const PHASE_ROUTES: Record<Phase, FlowPath> = {
  welcome: '/',
  'word-instructions': '/word/instructions',
  'word-practice': '/word/practice',
  'word-items': '/word/task',
  'cluster-instructions': '/cluster/instructions',
  'cluster-practice': '/cluster/practice',
  'cluster-items': '/cluster/task',
  debrief: '/complete',
  complete: '/complete',
};

export function routeForPhase(phase: Phase): FlowPath {
  return PHASE_ROUTES[phase];
}

export async function loadCurrentSession(context: RouterContext): Promise<SessionState> {
  const session = await context.queryClient.ensureQueryData(sessionQueryOptions());
  if (isTerminalPhase(session.phase)) {
    await context.queryClient.prefetchQuery(debriefQueryOptions());
  }
  return session;
}

export async function redirectToCurrentPhase(context: RouterContext): Promise<never> {
  const session = await loadCurrentSession(context);
  redirectToPhase(session);
}

export async function loadSessionForPhases(context: RouterContext, allowedPhases: Phase[]): Promise<SessionState> {
  const session = await loadCurrentSession(context);
  if (!allowedPhases.includes(session.phase)) {
    redirectToPhase(session);
  }
  return session;
}

export function isItemPhase(phase: Phase): boolean {
  return phase === 'word-items' || phase === 'cluster-items';
}

export function isTerminalPhase(phase: Phase): boolean {
  return phase === 'debrief' || phase === 'complete';
}

function redirectToPhase(session: SessionState): never {
  redirect({ to: routeForPhase(session.phase), replace: true, throw: true });
  throw new Error('TanStack Router redirect did not throw');
}

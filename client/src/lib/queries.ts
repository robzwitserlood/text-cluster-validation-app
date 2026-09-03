import { queryOptions } from '@tanstack/react-query';
import { getCurrentUser, getDebrief, getSession } from '@/lib/api';

export const sessionQueryKey = ['session'] as const;
export const debriefQueryKey = ['debrief'] as const;
export const currentUserQueryKey = ['current-user'] as const;

export function sessionQueryOptions() {
  return queryOptions({
    queryKey: sessionQueryKey,
    queryFn: ({ signal }) => getSession({ signal }),
    // Submit responses already return the advanced state; avoid a duplicate GET on navigation.
    staleTime: Infinity,
  });
}

export function debriefQueryOptions() {
  return queryOptions({
    queryKey: debriefQueryKey,
    queryFn: ({ signal }) => getDebrief({ signal }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function currentUserQueryOptions() {
  return queryOptions({
    queryKey: currentUserQueryKey,
    queryFn: ({ signal }) => getCurrentUser({ signal }),
    staleTime: 5 * 60 * 1000,
  });
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { SessionState, SubmitRequest, SubmitResult } from '../../../shared/types';
import { submitResponse } from '@/lib/api';
import { isTerminalPhase, routeForPhase } from '@/lib/flow-router';
import { debriefQueryOptions, sessionQueryKey, sessionQueryOptions } from '@/lib/queries';

export const SUBMIT_ERROR = 'Something went wrong. Please try again.';

export function useFlowSession() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const sessionQuery = useQuery({
    ...sessionQueryOptions(),
  });

  const advanceToSession = async (next: SessionState) => {
    queryClient.setQueryData(sessionQueryKey, next);
    if (isTerminalPhase(next.phase)) {
      void queryClient.prefetchQuery(debriefQueryOptions());
    }
    await navigate({ to: routeForPhase(next.phase), replace: true });
  };

  const refreshAndNavigate = async () => {
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    const next = await queryClient.fetchQuery(sessionQueryOptions());
    await advanceToSession(next);
    return next;
  };

  return {
    ...sessionQuery,
    advanceToSession,
    refreshAndNavigate,
  };
}

export function useFlowResponseMutation() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const responseMutation = useMutation<SubmitResult, Error, SubmitRequest>({
    mutationFn: (body) => submitResponse(body),
    onMutate: () => {
      setSubmitError(null);
    },
    onError: () => {
      setSubmitError(SUBMIT_ERROR);
    },
  });

  return {
    responseMutation,
    submitError,
  };
}

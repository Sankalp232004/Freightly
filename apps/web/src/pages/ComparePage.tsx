import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import type { CompareInput, CompareResponse } from '../types';
import { ConsignmentForm } from '../components/ConsignmentForm';
import { ResultsView } from '../components/ResultsView';
import { EmptyState, LoadingSkeleton, ErrorState } from '../components/StateViews';

export const ComparePage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [currentInput, setCurrentInput] = useState<CompareInput | null>(null);
  const [currentResult, setCurrentResult] = useState<CompareResponse | null>(null);

  // If URL has an ID, query existing comparison
  const {
    data: savedData,
    isLoading: isFetchingSaved,
    error: fetchSavedError,
    refetch: refetchSaved,
  } = useQuery({
    queryKey: ['comparison', id],
    queryFn: () => (id ? api.getComparison(id) : null),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (savedData) {
      setCurrentInput(savedData.input);
      setCurrentResult(savedData.result);
    }
  }, [savedData]);

  // Mutation for creating new comparison
  const compareMutation = useMutation({
    mutationFn: (input: CompareInput) => api.compare(input),
    onSuccess: (data, variables) => {
      setCurrentInput(variables);
      setCurrentResult(data);
      // Update URL without full page reload
      window.history.pushState(null, '', `/compare/${data.comparisonId}`);
    },
  });

  const handleFormSubmit = (input: CompareInput) => {
    compareMutation.mutate(input);
  };

  const errorMessage =
    compareMutation.error instanceof ApiError
      ? compareMutation.error.message
      : compareMutation.error
      ? 'Network error: could not connect to rate engine API'
      : fetchSavedError instanceof ApiError
      ? fetchSavedError.message
      : fetchSavedError
      ? 'Comparison record could not be retrieved'
      : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Rail: Consignment Form (Desktop: 4-5 cols, Mobile: full width) */}
        <aside className="lg:col-span-4 lg:sticky lg:top-20">
          <ConsignmentForm
            initialValues={currentInput || undefined}
            onSubmit={handleFormSubmit}
            isLoading={compareMutation.isPending || isFetchingSaved}
          />
        </aside>

        {/* Main Column: Results / Ledger (Desktop: 7-8 cols, Mobile: full width) */}
        <main className="lg:col-span-8">
          {compareMutation.isPending || isFetchingSaved ? (
            <LoadingSkeleton />
          ) : errorMessage ? (
            <ErrorState
              message={errorMessage}
              onRetry={() => {
                if (id) refetchSaved();
                else if (currentInput) compareMutation.mutate(currentInput);
              }}
            />
          ) : currentResult && currentInput ? (
            <ResultsView result={currentResult} input={currentInput} />
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
    </div>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import { LoadingSkeleton, ErrorState } from '../components/StateViews';

export const SavedPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: savedList, isLoading, error, refetch } = useQuery({
    queryKey: ['savedComparisons'],
    queryFn: () => api.getSaved(),
    enabled: Boolean(user),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteSaved(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedComparisons'] });
    },
  });

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex p-3 border border-rule bg-paper mb-4 text-ink-muted">
          <Icon name="lock" size={20} />
        </div>
        <h2 className="font-serif font-bold text-xl text-ink">
          Authentication Required for Saved Lanes
        </h2>
        <p className="text-xs font-mono text-ink-muted mt-2 max-w-md mx-auto leading-relaxed">
          Comparing rates is open and anonymous. An account is only needed to bookmark, revisit, and audit your freight lanes.
        </p>
        <div className="mt-6 flex justify-center space-x-3">
          <Link
            to="/auth"
            className="px-4 py-2 bg-ink text-paper font-mono text-xs uppercase tracking-wider hover:bg-ink/90 transition-colors"
          >
            Sign In to Account
          </Link>
          <Link
            to="/"
            className="px-4 py-2 border border-rule text-ink font-mono text-xs uppercase tracking-wider hover:border-ink transition-colors"
          >
            Return to Compare
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border-b border-rule pb-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif font-bold text-2xl text-ink">
            Saved Consignment Lanes
          </h1>
          <p className="text-xs font-mono text-ink-muted mt-1">
            Bookmarked rate comparisons for {user.email}
          </p>
        </div>
        <Link
          to="/"
          className="px-3 py-1.5 border border-rule hover:border-ink font-mono text-xs text-ink uppercase tracking-wider"
        >
          + New Comparison
        </Link>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState
          message={error instanceof ApiError ? error.message : 'Could not fetch saved comparisons'}
          onRetry={() => refetch()}
        />
      ) : !savedList || savedList.length === 0 ? (
        <div className="border border-dashed border-rule bg-paper-card p-12 text-center">
          <div className="inline-flex p-3 border border-rule bg-paper mb-3 text-ink-muted">
            <Icon name="bookmark" size={20} />
          </div>
          <h3 className="font-serif font-bold text-base text-ink">No Saved Lanes</h3>
          <p className="text-xs font-mono text-ink-muted mt-1 max-w-sm mx-auto">
            You haven't bookmarked any rate comparisons yet. Run a comparison on the home screen and click "Save Lane".
          </p>
          <Link
            to="/"
            className="mt-4 inline-block px-4 py-2 bg-stamp text-paper font-mono text-xs uppercase tracking-wider hover:bg-stamp-hover"
          >
            Run a Comparison
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedList.map((item) => {
            const cheapest = item.result.rankedOptions?.[0];
            return (
              <div
                key={item.id}
                className="border border-rule bg-paper-card p-5 flex flex-col justify-between hover:border-ink transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] text-ink-muted uppercase">
                        {new Date(item.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <h2 className="font-serif font-bold text-lg text-ink mt-0.5">
                        {item.input.origin} → {item.input.destination}
                      </h2>
                    </div>
                    {item.label && (
                      <span className="px-2 py-0.5 border border-rule font-mono text-[11px] text-ink bg-paper">
                        {item.label}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 text-xs font-mono text-ink-muted space-y-1">
                    <div>Weight: <strong className="text-ink">{item.input.weightKg.toLocaleString()} kg</strong> • Class: <strong className="text-ink capitalize">{item.input.cargoClass}</strong></div>
                    <div>Distance: <strong className="text-ink">{item.result.distanceKm} km</strong></div>
                  </div>

                  {cheapest && (
                    <div className="mt-4 p-2.5 bg-paper border border-rule flex items-center justify-between text-xs font-mono">
                      <span className="text-ink-muted">Cheapest: {cheapest.label}</span>
                      <strong className="text-ink text-sm tabular-nums">
                        ₹{(cheapest.totalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-rule-light flex items-center justify-between text-xs font-mono">
                  <Link
                    to={`/compare/${item.comparison_id}`}
                    className="text-stamp font-semibold hover:underline flex items-center space-x-1"
                  >
                    <span>Open Live Comparison</span>
                    <Icon name="chevron-right" size={16} />
                  </Link>

                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(item.id)}
                    disabled={deleteMutation.isPending}
                    className="text-ink-muted hover:text-stamp p-1"
                    title="Remove from saved lanes"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import { LoadingSkeleton, ErrorState } from '../components/StateViews';
import type { RateParameter } from '../types';

export const AdminRatesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [note, setNote] = useState('');
  const [editedParams, setEditedParams] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['adminRates'],
    queryFn: () => api.getAdminRates(),
    enabled: user?.role === 'admin',
  });

  // Prepopulate edited params from active parameters
  useEffect(() => {
    if (data?.activeParameters) {
      const initial: Record<string, number> = {};
      data.activeParameters.forEach((p) => {
        initial[p.key] = Number(p.value);
      });
      setEditedParams(initial);
    }
  }, [data]);

  const createRateMutation = useMutation({
    mutationFn: (newParams: Array<{ key: string; value: number; unit: string; description: string; sourceNote?: string }>) =>
      api.createAdminRates(note, newParams),
    onSuccess: (res) => {
      setFeedback({ type: 'success', message: `Activated Rate Version #${res.versionId} with audit log recorded.` });
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['adminRates'] });
    },
    onError: (err: any) => {
      setFeedback({
        type: 'error',
        message: err instanceof ApiError ? err.message : 'Failed to create and activate rate set',
      });
    },
  });

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="inline-flex p-3 border border-stamp bg-paper mb-4 text-stamp">
          <Icon name="lock" size={20} />
        </div>
        <h2 className="font-serif font-bold text-xl text-ink">Access Forbidden</h2>
        <p className="text-xs font-mono text-ink-muted mt-2">
          Administrator privileges are required to modify rate configuration benchmarks.
        </p>
      </div>
    );
  }

  if (isLoading) return <div className="max-w-7xl mx-auto p-8"><LoadingSkeleton /></div>;
  if (error) return <div className="max-w-7xl mx-auto p-8"><ErrorState message="Could not fetch rate configurations" onRetry={() => refetch()} /></div>;

  const activeParamsMap = new Map(data?.activeParameters.map((p) => [p.key, Number(p.value)]));

  // Count parameters with diff
  const diffCount = Object.entries(editedParams).filter(
    ([k, v]) => activeParamsMap.has(k) && activeParamsMap.get(k) !== v,
  ).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setFeedback({ type: 'error', message: 'A descriptive revision note is mandatory for audit logging.' });
      return;
    }

    if (!data?.activeParameters) return;

    const payload = data.activeParameters.map((p) => ({
      key: p.key,
      value: editedParams[p.key] ?? Number(p.value),
      unit: p.unit,
      description: p.description,
      sourceNote: p.source_note || undefined,
    }));

    createRateMutation.mutate(payload);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="border-b border-rule pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-2xl text-ink">
            Freight Rate Configuration & Audit Ledger
          </h1>
          <p className="text-xs font-mono text-ink-muted mt-1">
            Manage cost engine parameters. Any activation creates an immutable version and writes an audit log.
          </p>
        </div>

        <div className="font-mono text-xs text-ink-muted bg-paper px-3 py-1.5 border border-rule">
          Total Benchmark Parameters: <strong className="text-ink">{data?.activeParameters.length || 0}</strong>
        </div>
      </div>

      {feedback && (
        <div
          className={`mb-6 p-3 border text-xs font-mono flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-green-50 border-green-700 text-green-800'
              : 'bg-red-50 border-stamp text-stamp'
          }`}
        >
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} className="font-bold ml-2">×</button>
        </div>
      )}

      {/* Main configuration editor form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-paper-card border border-rule p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-4 mb-4">
            <div>
              <h2 className="font-serif font-bold text-base text-ink">
                Create New Rate Configuration Version
              </h2>
              <p className="text-xs font-mono text-ink-muted mt-0.5">
                Modifications will be compared against the currently active rate set.
              </p>
            </div>

            {diffCount > 0 && (
              <span className="stamp-badge">
                {diffCount} Parameter{diffCount > 1 ? 's' : ''} Modified
              </span>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="audit-note" className="block text-xs font-mono uppercase tracking-wider text-ink font-semibold mb-1">
              Revision Audit Note <span className="text-stamp">*</span>
            </label>
            <input
              id="audit-note"
              type="text"
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Q4 2026 Diesel Price Adjustment (+5% fuel surcharge) per IOCL revision"
              className="w-full px-3 py-2 text-sm bg-paper-input text-ink border border-rule focus:border-ink placeholder-ink-muted font-mono"
            />
          </div>

          {/* Parameters table */}
          <div className="border border-rule overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs font-mono divide-y divide-rule">
              <thead className="bg-paper sticky top-0 border-b border-rule uppercase text-[10px] text-ink-muted tracking-wider">
                <tr>
                  <th className="p-2.5">Key</th>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5 text-right">Active Value</th>
                  <th className="p-2.5 text-right w-36">New Value</th>
                  <th className="p-2.5">Unit</th>
                  <th className="p-2.5 text-center">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule-light bg-paper-card">
                {data?.activeParameters.map((param) => {
                  const activeVal = Number(param.value);
                  const currentVal = editedParams[param.key] ?? activeVal;
                  const hasDiff = currentVal !== activeVal;

                  return (
                    <tr key={param.key} className={hasDiff ? 'bg-amber-50/60' : undefined}>
                      <td className="p-2.5 font-semibold text-ink whitespace-nowrap">{param.key}</td>
                      <td className="p-2.5 text-ink-muted text-[11px] max-w-xs">{param.description}</td>
                      <td className="p-2.5 text-right tabular-nums text-ink-muted whitespace-nowrap">
                        {activeVal}
                      </td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          step="any"
                          value={currentVal}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setEditedParams((prev) => ({
                              ...prev,
                              [param.key]: isNaN(val) ? 0 : val,
                            }));
                          }}
                          className={`w-28 px-2 py-1 text-right text-xs bg-paper-input border tabular-nums ${
                            hasDiff ? 'border-stamp font-bold text-stamp' : 'border-rule focus:border-ink text-ink'
                          }`}
                        />
                      </td>
                      <td className="p-2.5 text-ink-muted text-[11px] whitespace-nowrap">{param.unit}</td>
                      <td className="p-2.5 text-center font-mono text-[10px]">
                        {hasDiff ? (
                          <span className="text-stamp font-bold">
                            {(currentVal - activeVal > 0 ? '+' : '') + (currentVal - activeVal).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={createRateMutation.isPending || diffCount === 0}
              className="px-6 py-2.5 bg-stamp hover:bg-stamp-hover text-paper font-mono font-semibold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {createRateMutation.isPending ? (
                <>
                  <Icon name="refresh" size={16} className="animate-spin text-paper" />
                  <span>Activating In Transaction...</span>
                </>
              ) : (
                <span>Activate New Rate Version ({diffCount} changes)</span>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Historical Versions List */}
      <div className="mt-8">
        <h2 className="font-serif font-bold text-lg text-ink mb-3">Version History</h2>
        <div className="border border-rule bg-paper-card divide-y divide-rule font-mono text-xs">
          {data?.versions.map((ver) => (
            <div key={ver.id} className="p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="font-bold text-ink">Version #{ver.id}</span>
                {ver.is_active && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 border border-green-300 text-[10px] uppercase font-semibold">
                    Active
                  </span>
                )}
                <span className="text-ink-muted italic">{ver.note || 'No revision note'}</span>
              </div>
              <div className="text-[11px] text-ink-muted">
                By: <strong className="text-ink">{ver.created_by}</strong> •{' '}
                {new Date(ver.created_at).toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

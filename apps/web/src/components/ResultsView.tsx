import React, { useState, useMemo } from 'react';
import type { CompareResponse, CompareInput } from '../types';
import { ModeCard } from './ModeCard';
import { Icon } from './Icon';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

interface ResultsViewProps {
  result: CompareResponse;
  input: CompareInput;
}

type SortCriteria = 'cheapest' | 'fastest' | 'carbon';

export const ResultsView: React.FC<ResultsViewProps> = ({ result, input }) => {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState<SortCriteria>('cheapest');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Sorting logic
  const sortedOptions = useMemo(() => {
    const list = [...result.rankedOptions];
    if (sortBy === 'cheapest') {
      return list.sort((a, b) => a.totalPaise - b.totalPaise);
    }
    if (sortBy === 'fastest') {
      return list.sort((a, b) => a.transit.minDays - b.transit.minDays || a.totalPaise - b.totalPaise);
    }
    if (sortBy === 'carbon') {
      return list.sort((a, b) => a.co2Kg - b.co2Kg || a.totalPaise - b.totalPaise);
    }
    return list;
  }, [result.rankedOptions, sortBy]);

  // Identify badges
  const cheapestMode = useMemo(() => {
    return [...result.rankedOptions].sort((a, b) => a.totalPaise - b.totalPaise)[0]?.mode;
  }, [result.rankedOptions]);

  const fastestMode = useMemo(() => {
    return [...result.rankedOptions].sort((a, b) => a.transit.minDays - b.transit.minDays)[0]?.mode;
  }, [result.rankedOptions]);

  const lowestCo2Mode = useMemo(() => {
    return [...result.rankedOptions].sort((a, b) => a.co2Kg - b.co2Kg)[0]?.mode;
  }, [result.rankedOptions]);

  const handleShare = () => {
    const url = `${window.location.origin}/compare/${result.comparisonId}`;
    navigator.clipboard.writeText(url);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  };

  const handleSaveLane = async () => {
    if (!user) {
      // Redirect or suggest sign in
      window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    setSaveStatus('saving');
    try {
      await api.saveComparison(result.comparisonId, `${input.origin} to ${input.destination} (${input.weightKg} kg)`);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Route Header Banner */}
      <div className="bg-paper-card border border-rule p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rule pb-4">
          <div>
            <span className="font-mono text-[10px] text-ink-muted uppercase tracking-wider block">
              Consignment Route & Specifications
            </span>
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink tracking-tight mt-0.5">
              {input.origin} <span className="text-ink-muted font-normal">→</span> {input.destination}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-mono text-ink-muted">
              <span>Gross Wt: <strong className="text-ink font-semibold">{input.weightKg.toLocaleString()} kg</strong></span>
              <span>•</span>
              <span>Cargo: <strong className="text-ink capitalize">{input.cargoClass.replace('-', ' ')}</strong></span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <span>Distance:</span>
                <strong className="text-ink font-semibold">{result.distanceKm} km</strong>
                <span className="text-[10px] px-1 border border-rule uppercase">
                  {result.distanceSource === 'ors' ? 'ORS Highway' : 'Great-Circle Est.'}
                </span>
              </span>
            </div>
          </div>

          {/* Action buttons: Share, Save, Print */}
          <div className="flex items-center space-x-2 no-print">
            <button
              type="button"
              onClick={handleShare}
              className="px-3 py-1.5 text-xs font-mono text-ink border border-rule hover:border-ink bg-paper flex items-center space-x-1.5 transition-colors"
              title="Copy shareable comparison link"
            >
              <Icon name="share" size={16} />
              <span>{copyFeedback ? 'Link Copied!' : 'Share'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-mono text-ink border border-rule hover:border-ink bg-paper flex items-center space-x-1.5 transition-colors"
              title="Print one-page PDF consignment note"
            >
              <Icon name="print" size={16} />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleSaveLane}
              disabled={saveStatus === 'saving' || saveStatus === 'saved'}
              className={`px-3 py-1.5 text-xs font-mono border flex items-center space-x-1.5 transition-colors ${
                saveStatus === 'saved'
                  ? 'border-green-700 text-green-700 bg-green-50'
                  : 'border-rule hover:border-ink bg-paper text-ink'
              }`}
            >
              <Icon name={saveStatus === 'saved' ? 'bookmark-fill' : 'bookmark'} size={16} />
              <span>
                {saveStatus === 'saved'
                  ? 'Lane Saved'
                  : saveStatus === 'saving'
                  ? 'Saving...'
                  : user
                  ? 'Save Lane'
                  : 'Sign in to Save'}
              </span>
            </button>
          </div>
        </div>

        {/* E-Way Bill Notice Alert (if applicable) */}
        {result.ewayBillNotice && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-mono flex items-start space-x-2">
            <Icon name="alert" size={18} className="text-amber-800 mt-0.5" />
            <div>
              <span className="font-semibold uppercase block">Statutory Compliance Advisory:</span>
              <span>{result.ewayBillNotice}</span>
            </div>
          </div>
        )}

        {/* Sort Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <span className="text-ink-muted">
            Displaying {result.rankedOptions.length} viable multi-modal options:
          </span>

          <div className="flex items-center space-x-1 bg-paper p-0.5 border border-rule no-print">
            <span className="px-2 text-[10px] text-ink-muted uppercase">Sort by:</span>
            <button
              type="button"
              onClick={() => setSortBy('cheapest')}
              className={`px-2.5 py-1 text-xs uppercase tracking-wider ${
                sortBy === 'cheapest' ? 'bg-ink text-paper font-semibold' : 'text-ink hover:text-ink-muted'
              }`}
            >
              Cheapest
            </button>
            <button
              type="button"
              onClick={() => setSortBy('fastest')}
              className={`px-2.5 py-1 text-xs uppercase tracking-wider ${
                sortBy === 'fastest' ? 'bg-ink text-paper font-semibold' : 'text-ink hover:text-ink-muted'
              }`}
            >
              Fastest
            </button>
            <button
              type="button"
              onClick={() => setSortBy('carbon')}
              className={`px-2.5 py-1 text-xs uppercase tracking-wider ${
                sortBy === 'carbon' ? 'bg-ink text-paper font-semibold' : 'text-ink hover:text-ink-muted'
              }`}
            >
              Lowest CO₂
            </button>
          </div>
        </div>
      </div>

      {/* Ranked Mode Cards */}
      <div className="space-y-4">
        {sortedOptions.map((modeRes) => (
          <ModeCard
            key={modeRes.mode}
            modeResult={modeRes}
            isCheapest={modeRes.mode === cheapestMode}
            isFastest={modeRes.mode === fastestMode}
            isLowestCo2={modeRes.mode === lowestCo2Mode}
          />
        ))}
      </div>

      {/* Omitted Modes Section */}
      {result.omittedModes.length > 0 && (
        <div className="border border-rule bg-paper p-4 text-xs font-mono">
          <div className="font-semibold text-ink uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <Icon name="alert" size={16} className="text-ink-muted" />
            <span>Omitted Transport Modes (Non-Viable for this Consignment)</span>
          </div>
          <ul className="divide-y divide-rule-light">
            {result.omittedModes.map((omitted) => (
              <li key={omitted.mode} className="py-2 flex flex-col sm:flex-row sm:items-baseline justify-between text-ink-muted">
                <span className="font-semibold text-ink">{omitted.label}:</span>
                <span className="text-xs italic">{omitted.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Legal & Regulatory Disclaimer */}
      <footer className="border-t border-rule pt-4 text-xs text-ink-muted font-mono leading-relaxed">
        <p>
          <strong className="text-ink uppercase tracking-wider">Modelled Estimate Notice:</strong> {result.disclaimer}
        </p>
        <p className="mt-1 text-[11px]">
          Rate Configuration Version: <strong className="text-ink">#{result.rateVersionId}</strong> • Reference ID:{' '}
          <strong className="text-ink">{result.comparisonId}</strong>
        </p>
      </footer>
    </div>
  );
};

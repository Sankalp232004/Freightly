import React, { useState } from 'react';
import type { ModeResult } from '../types';
import { LedgerBreakdown } from './LedgerBreakdown';
import { Icon, type IconName } from './Icon';

interface ModeCardProps {
  modeResult: ModeResult;
  isCheapest: boolean;
  isFastest: boolean;
  isLowestCo2: boolean;
}

export const ModeCard: React.FC<ModeCardProps> = ({
  modeResult,
  isCheapest,
  isFastest,
  isLowestCo2,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getModeIcon = (): IconName => {
    switch (modeResult.mode) {
      case 'road_ftl':
      case 'road_ltl':
        return 'truck';
      case 'rail':
        return 'train';
      case 'air':
        return 'plane';
      case 'coastal':
        return 'ship';
      default:
        return 'truck';
    }
  };

  const formattedRupees = (modeResult.totalPaise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <article className="border border-rule bg-paper-card mb-4 transition-all">
      {/* Top Banner if Lowest Cost */}
      {isCheapest && (
        <div className="bg-paper px-4 py-1.5 border-b border-rule flex items-center justify-between">
          <span className="stamp-badge">
            Lowest Cost
          </span>
          <span className="font-mono text-[11px] text-stamp font-medium">
            Best Economy Choice
          </span>
        </div>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
          {/* Mode Title & Vehicle */}
          <div className="flex items-start space-x-3">
            <div className="p-2 border border-rule bg-paper text-ink mt-0.5">
              <Icon name={getModeIcon()} size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-serif font-bold text-base text-ink">
                  {modeResult.label}
                </h3>
                {isFastest && !isCheapest && (
                  <span className="px-1.5 py-0.5 border border-rule font-mono text-[10px] text-ink-muted uppercase">
                    Fastest
                  </span>
                )}
                {isLowestCo2 && !isCheapest && (
                  <span className="px-1.5 py-0.5 border border-rule font-mono text-[10px] text-green-700 uppercase">
                    Lowest CO₂
                  </span>
                )}
              </div>
              {modeResult.vehicleType && (
                <p className="text-xs font-mono text-ink-muted mt-0.5">
                  Specification: {modeResult.vehicleType}
                </p>
              )}
            </div>
          </div>

          {/* Price — Tabular Numerals, Right-Aligned */}
          <div className="text-left sm:text-right">
            <div className="font-mono text-xl sm:text-2xl font-bold text-ink tabular-nums">
              ₹{formattedRupees}
            </div>
            <div className="text-[11px] font-mono text-ink-muted">
              Inclusive of benchmark fuel & tolls
            </div>
          </div>
        </div>

        {/* Plain Language Rationale */}
        <div className="mt-3 pt-2.5 border-t border-rule-light text-xs text-ink">
          <span className="font-mono text-ink-muted uppercase text-[10px] tracking-wider block sm:inline sm:mr-2">
            Assessment:
          </span>
          <span className="italic">{modeResult.rankReason}</span>
        </div>

        {/* Transit & CO2 Badges */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center space-x-3">
            <span className="px-2 py-1 bg-paper border border-rule text-ink flex items-center space-x-1">
              <span>Transit:</span>
              <strong className="tabular-nums font-semibold">
                {modeResult.transit.minDays}–{modeResult.transit.maxDays} days
              </strong>
            </span>
            <span className="px-2 py-1 bg-paper border border-rule text-ink flex items-center space-x-1">
              <Icon name="leaf" size={16} className="text-green-700" />
              <strong className="tabular-nums font-semibold">{modeResult.co2Kg} kg</strong>
            </span>
          </div>

          {/* Toggle Ledger Button */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1 text-xs font-mono text-ink border border-rule hover:border-ink bg-paper flex items-center space-x-1 transition-colors"
          >
            <span>{expanded ? 'Hide Ledger' : 'View Ledger Breakdown'}</span>
            <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} />
          </button>
        </div>

        {/* Expandable Printed Ledger */}
        {expanded && <LedgerBreakdown modeResult={modeResult} />}
      </div>
    </article>
  );
};

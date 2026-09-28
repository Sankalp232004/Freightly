import React from 'react';
import type { ModeResult } from '../types';

interface LedgerBreakdownProps {
  modeResult: ModeResult;
}

export const LedgerBreakdown: React.FC<LedgerBreakdownProps> = ({ modeResult }) => {
  const formatInr = (amountPaise: number) => {
    const rupees = amountPaise / 100;
    return `₹${rupees.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="bg-paper p-4 border border-rule font-mono text-xs text-ink mt-3">
      {/* Ledger Header */}
      <div className="flex items-center justify-between border-b border-rule pb-2 mb-3 text-[11px] text-ink-muted uppercase tracking-wider">
        <span>Line Item Description</span>
        <span>Amount (INR)</span>
      </div>

      {/* Line items with dotted leaders */}
      <div className="space-y-1.5">
        {modeResult.lineItems.map((item, idx) => (
          <div key={idx} className="flex items-baseline justify-between">
            <span className="text-ink/90 whitespace-nowrap">{item.label}</span>
            <div className="ledger-dotted-leader" aria-hidden="true" />
            <span className="tabular-nums font-medium text-ink whitespace-nowrap">
              {formatInr(item.amountPaise)}
            </span>
          </div>
        ))}
      </div>

      {/* Double rule above the total */}
      <div className="ledger-total-rule my-3 pt-2 pb-2">
        <div className="flex items-baseline justify-between text-sm font-bold text-ink">
          <span className="uppercase tracking-wide">Total Estimated Cost</span>
          <span className="tabular-nums text-base">
            {formatInr(modeResult.totalPaise)}
          </span>
        </div>
      </div>

      {/* Advisory & Tax Footnotes */}
      <div className="text-[10px] text-ink-muted pt-1 flex flex-col sm:flex-row justify-between gap-1">
        <span>
          {modeResult.gstApplied
            ? '✓ Includes applicable GST / RCM advisory breakdown'
            : 'Excludes destination state municipal levies if applicable'}
        </span>
        <span className="tabular-nums">
          Distance: {modeResult.distanceKm} km • CO₂: {modeResult.co2Kg} kg
        </span>
      </div>
    </div>
  );
};

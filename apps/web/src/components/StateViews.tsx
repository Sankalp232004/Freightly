import React from 'react';
import { Icon } from './Icon';

export const EmptyState: React.FC = () => {
  return (
    <div className="border border-dashed border-rule bg-paper-card p-8 sm:p-12 text-center">
      <div className="inline-flex p-3 border border-rule bg-paper mb-4 text-ink-muted">
        <Icon name="scale" size={20} />
      </div>
      <h3 className="font-serif font-bold text-lg text-ink">
        Consignment Rate Ledger
      </h3>
      <p className="text-xs text-ink-muted font-mono max-w-md mx-auto mt-2 leading-relaxed">
        Specify your origin, destination, and gross cargo weight in the consignment note on the left to immediately calculate ranked multi-modal options with transparent cost line items.
      </p>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left font-mono text-xs border-t border-rule pt-6 max-w-lg mx-auto">
        <div className="p-2 border border-rule-light bg-paper">
          <strong className="block text-ink">Road FTL/LTL</strong>
          <span className="text-[11px] text-ink-muted">Dedicated & shared national highway freight</span>
        </div>
        <div className="p-2 border border-rule-light bg-paper">
          <strong className="block text-ink">Rail Freight</strong>
          <span className="text-[11px] text-ink-muted">High-volume container rakes (&gt;400 km)</span>
        </div>
        <div className="p-2 border border-rule-light bg-paper">
          <strong className="block text-ink">Air Cargo</strong>
          <span className="text-[11px] text-ink-muted">Time-critical express & high-value escort</span>
        </div>
        <div className="p-2 border border-rule-light bg-paper">
          <strong className="block text-ink">Coastal Shipping</strong>
          <span className="text-[11px] text-ink-muted">Port-to-port maritime corridor</span>
        </div>
      </div>
    </div>
  );
};

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="bg-paper-card border border-rule p-5">
        <div className="h-4 bg-rule-light w-1/3 mb-3"></div>
        <div className="h-8 bg-rule w-2/3 mb-4"></div>
        <div className="h-4 bg-rule-light w-1/2"></div>
      </div>

      {/* Mode cards skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-rule bg-paper-card p-5">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-3 w-1/2">
              <div className="w-10 h-10 bg-rule"></div>
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-rule w-3/4"></div>
                <div className="h-3 bg-rule-light w-1/2"></div>
              </div>
            </div>
            <div className="w-1/4 text-right space-y-2">
              <div className="h-6 bg-rule w-full ml-auto"></div>
              <div className="h-3 bg-rule-light w-3/4 ml-auto"></div>
            </div>
          </div>
          <div className="h-3 bg-rule-light w-full mb-3"></div>
          <div className="h-8 bg-paper border border-rule w-full"></div>
        </div>
      ))}
    </div>
  );
};

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="border border-stamp bg-paper-card p-6 sm:p-8">
      <div className="flex items-start space-x-3">
        <div className="p-2 border border-stamp text-stamp bg-paper flex-shrink-0">
          <Icon name="alert" size={20} />
        </div>
        <div className="flex-1">
          <h3 className="font-serif font-bold text-base text-stamp">
            Unable to Complete Rate Comparison
          </h3>
          <p className="mt-1 text-xs text-ink font-mono leading-relaxed">
            {message}
          </p>
          <p className="mt-2 text-xs text-ink-muted font-mono">
            Check network connectivity, confirm city spellings, or retry the request.
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-ink text-paper font-mono text-xs uppercase tracking-wider hover:bg-ink/90 flex items-center space-x-1.5 transition-colors"
            >
              <Icon name="refresh" size={16} />
              <span>Retry Request</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

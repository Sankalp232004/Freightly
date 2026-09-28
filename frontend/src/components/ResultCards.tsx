import React from 'react';
import { Truck, Train, Plane, Ship, Leaf, Clock, CheckCircle2 } from 'lucide-react';

export interface ModeOption {
  mode: 'FTL' | 'LTL' | 'Rail' | 'Air' | 'Coastal';
  costBreakdown: {
    baseFreight: number;
    fuelSurcharge: number;
    handling: number;
    tolls?: number;
    firstLastMile?: number;
    gst: number;
    totalCost: number;
  };
  transitTimeDays: [number, number];
  co2EstimateKg: number;
  isOptimal?: boolean;
}

interface ResultCardsProps {
  options: ModeOption[];
}

const getModeIcon = (mode: string) => {
  switch (mode) {
    case 'FTL':
    case 'LTL':
      return <Truck size={24} className="w-6 h-6 text-freight-textMain shrink-0" />;
    case 'Rail':
      return <Train size={24} className="w-6 h-6 text-freight-textMain shrink-0" />;
    case 'Air':
      return <Plane size={24} className="w-6 h-6 text-freight-textMain shrink-0" />;
    case 'Coastal':
      return <Ship size={24} className="w-6 h-6 text-freight-textMain shrink-0" />;
    default:
      return <Truck size={24} className="w-6 h-6 text-freight-textMain shrink-0" />;
  }
};

const ResultCards: React.FC<ResultCardsProps> = ({ options }) => {
  if (!options || options.length === 0) return null;
  
  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Determine the optimal option (e.g., lowest cost)
  const sortedOptions = [...options].sort((a, b) => a.costBreakdown.totalCost - b.costBreakdown.totalCost);
  const optimalMode = sortedOptions[0].mode;

  return (
    <div className="flex flex-col gap-6">
      {sortedOptions.map((option, index) => {
        const isOptimal = option.mode === optimalMode;
        
        return (
          <div key={option.mode} className={`flex flex-col md:flex-row bg-freight-panel border ${isOptimal ? 'border-freight-brand ring-1 ring-freight-brand shadow-sm' : 'border-freight-border'} rounded-none overflow-hidden`}>
            
            {/* Left Col - Identity & Metrics */}
            <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-freight-border flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gray-50 border border-freight-border rounded-none">
                      {getModeIcon(option.mode)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold font-display text-freight-textMain tracking-tight leading-none">{option.mode}</h3>
                      <p className="text-xs text-freight-textMuted uppercase tracking-widest mt-1">Option {String(index + 1).padStart(2, '0')}</p>
                    </div>
                  </div>
                  {isOptimal && (
                    <div className="flex items-center text-xs font-semibold text-freight-brand bg-orange-50 px-2 py-1 rounded-none border border-orange-200">
                      <CheckCircle2 size={14} className="w-3.5 h-3.5 mr-1 shrink-0" /> CHEAPEST
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div>
                    <div className="flex items-center text-xs font-medium text-freight-textMuted uppercase tracking-wide mb-1">
                      <Clock size={14} className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Transit
                    </div>
                    <div className="font-mono text-lg font-medium text-freight-textMain tabular-nums">
                      {option.transitTimeDays[0]}-{option.transitTimeDays[1]} <span className="text-xs font-sans text-freight-textMuted">days</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center text-xs font-medium text-freight-textMuted uppercase tracking-wide mb-1">
                      <Leaf size={14} className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Carbon
                    </div>
                    <div className="font-mono text-lg font-medium text-freight-textMain tabular-nums">
                      {Math.round(option.co2EstimateKg)} <span className="text-xs font-sans text-freight-textMuted">kg</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col - Cost Breakdown */}
            <div className="w-full md:w-80 p-6 flex flex-col bg-gray-50/30">
              <div className="mb-4 pb-4 border-b border-freight-border">
                <p className="text-xs font-medium text-freight-textMuted uppercase tracking-wide mb-1">Total Estimated Cost</p>
                <div className="font-mono text-3xl font-bold text-freight-textMain tabular-nums flex items-baseline">
                  <span className="font-sans text-xl mr-1 text-freight-textMuted">₹</span>{formatINR(option.costBreakdown.totalCost)}
                </div>
              </div>

              <div className="space-y-2.5 flex-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-freight-textMuted">Base Freight</span>
                  <span className="font-mono font-medium text-freight-textMain tabular-nums">{formatINR(option.costBreakdown.baseFreight)}</span>
                </div>
                {option.costBreakdown.fuelSurcharge > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-freight-textMuted">Fuel Surcharge</span>
                    <span className="font-mono font-medium text-freight-textMain tabular-nums">{formatINR(option.costBreakdown.fuelSurcharge)}</span>
                  </div>
                )}
                {option.costBreakdown.tolls !== undefined && option.costBreakdown.tolls > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-freight-textMuted">Tolls & Duties</span>
                    <span className="font-mono font-medium text-freight-textMain tabular-nums">{formatINR(option.costBreakdown.tolls)}</span>
                  </div>
                )}
                {option.costBreakdown.handling > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-freight-textMuted">Handling</span>
                    <span className="font-mono font-medium text-freight-textMain tabular-nums">{formatINR(option.costBreakdown.handling)}</span>
                  </div>
                )}
                {option.costBreakdown.firstLastMile !== undefined && option.costBreakdown.firstLastMile > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-freight-textMuted">F/L Mile</span>
                    <span className="font-mono font-medium text-freight-textMain tabular-nums">{formatINR(option.costBreakdown.firstLastMile)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm pt-2.5 mt-1 border-t border-freight-border">
                  <span className="text-freight-textMuted font-medium">GST (Tax)</span>
                  <span className="font-mono font-medium text-freight-textMain tabular-nums">{formatINR(option.costBreakdown.gst)}</span>
                </div>
              </div>
            </div>
            
          </div>
        );
      })}
    </div>
  );
};

export default ResultCards;

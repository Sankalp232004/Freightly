import React from 'react';
import { AlertCircle } from 'lucide-react';

const DisclaimerBanner: React.FC = () => {
  return (
    <div className="flex items-start p-3 bg-red-50 border border-red-200 text-freight-textMain text-sm rounded-none">
      <AlertCircle size={16} className="w-4 h-4 text-freight-alert mt-0.5 mr-2 shrink-0" />
      <div>
        <span className="font-semibold text-freight-alert mr-1">ESTIMATES ONLY:</span>
        <span className="text-freight-textMuted">These figures are algorithmic estimates based on current averages. Do not use as final carrier quotes.</span>
      </div>
    </div>
  );
};

export default DisclaimerBanner;

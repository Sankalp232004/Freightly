import React, { useState } from 'react';
import CompareForm, { type ShipmentFormData } from './components/CompareForm';
import ResultCards from './components/ResultCards';
import DisclaimerBanner from './components/DisclaimerBanner';
import { Package, Truck, Train, Plane, Ship, Activity, RefreshCw, Box } from 'lucide-react';

function App() {
  const [options, setOptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async (data: ShipmentFormData) => {
    setIsLoading(true);
    setError(null);
    setOptions([]);

    try {
      const response = await fetch('http://localhost:3001/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to fetch comparison data');

      const result = await response.json();
      setOptions(result.options);
    } catch (err) {
      console.error(err);
      setError('Unable to fetch shipping rates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-freight-bg flex flex-col font-sans">
      {/* Header - Functional, no cosplay */}
      <header className="bg-freight-panel border-b border-freight-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-freight-textMain tracking-tight font-display flex items-center gap-2">
              ROUTEWISE
            </h1>
            <div className="h-5 w-px bg-freight-border mx-2 hidden sm:block"></div>
            <span className="text-sm font-medium text-freight-textMuted hidden sm:block">Logistics Cost Comparator</span>
          </div>
          {/* Removed V1.0 tag */}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column - Input Form */}
          <div className="lg:col-span-5 flex flex-col gap-6 sticky top-24">
            <CompareForm onSubmit={handleCompare} isLoading={isLoading} />
            {options.length > 0 && <DisclaimerBanner />}
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-7 flex flex-col min-h-[400px]">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-freight-alert rounded-none flex items-center font-medium">
                {error}
              </div>
            )}
            
            {options.length > 0 ? (
              <ResultCards options={options} />
            ) : (
              !isLoading && !error && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border border-dashed border-freight-border bg-freight-panel/50 rounded-none text-freight-textMuted">
                  <Box className="w-12 h-12 mb-4 text-freight-border stroke-1" />
                  <p className="text-lg font-medium font-display text-freight-textMain mb-2">Enter Consignment Details</p>
                  <p className="max-w-md text-sm">Provide origin, destination, and cargo specs to compare logistics options across road, rail, air, and coastal modes.</p>
                </div>
              )
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}

export default App;

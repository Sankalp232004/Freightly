import React, { useState } from 'react';
import { MapPin, Scale, Box, Loader2, ChevronDown } from 'lucide-react';

export interface ShipmentFormData {
  origin: string;
  destination: string;
  distanceKm: number;
  weightKg: number;
  category: 'general' | 'fragile' | 'temperature-controlled' | 'hazmat' | 'high-value';
  isRegisteredBusiness: boolean;
}

interface CompareFormProps {
  onSubmit: (data: ShipmentFormData) => void;
  isLoading: boolean;
}

const CompareForm: React.FC<CompareFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<ShipmentFormData>({
    origin: '',
    destination: '',
    distanceKm: 0,
    weightKg: 500,
    category: 'general',
    isRegisteredBusiness: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? Number(value) : value)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col bg-freight-panel border border-freight-border rounded-none overflow-hidden shadow-sm">
      
      {/* Header */}
      <div className="bg-white px-5 py-4 border-b border-freight-border flex justify-between items-center">
        <h2 className="text-base font-semibold font-display text-freight-textMain tracking-tight">
          Consignment Details
        </h2>
      </div>

      <div className="flex flex-col p-6 space-y-6">
        
        {/* Route Details */}
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-xs font-medium text-freight-textMuted uppercase tracking-wide mb-1.5">Origin</label>
            <div className="relative">
              <input required type="text" name="origin" value={formData.origin} onChange={handleChange} 
                     className="block w-full pl-9 pr-3 py-2.5 bg-white border border-freight-border rounded-none text-freight-textMain text-sm focus:outline-none focus:ring-1 focus:ring-freight-textMuted focus:border-freight-textMuted transition-colors appearance-none" 
                     placeholder="City or PIN" />
              <MapPin size={16} className="absolute left-3 top-3 w-4 h-4 text-freight-textMuted shrink-0" />
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-medium text-freight-textMuted uppercase tracking-wide mb-1.5">Destination</label>
            <div className="relative">
              <input required type="text" name="destination" value={formData.destination} onChange={handleChange} 
                     className="block w-full pl-9 pr-3 py-2.5 bg-white border border-freight-border rounded-none text-freight-textMain text-sm focus:outline-none focus:ring-1 focus:ring-freight-textMuted focus:border-freight-textMuted transition-colors appearance-none" 
                     placeholder="City or PIN" />
              <MapPin size={16} className="absolute left-3 top-3 w-4 h-4 text-freight-textMuted shrink-0" />
            </div>
          </div>
        </div>

        {/* Cargo Details */}
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-xs font-medium text-freight-textMuted uppercase tracking-wide mb-1.5">Distance (km)</label>
            <div className="relative">
              <input required type="number" name="distanceKm" value={formData.distanceKm || ''} onChange={handleChange} 
                     className="block w-full pl-3 pr-3 py-2.5 bg-white border border-freight-border rounded-none text-freight-textMain font-mono text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-freight-textMuted focus:border-freight-textMuted transition-colors appearance-none" 
                     placeholder="0" />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-freight-textMuted uppercase tracking-wide mb-1.5">Gross Wt (kg)</label>
            <div className="relative">
              <input required type="number" min="50" step="10" name="weightKg" value={formData.weightKg || ''} onChange={handleChange} 
                     className="block w-full pl-9 pr-3 py-2.5 bg-white border border-freight-border rounded-none text-freight-textMain font-mono text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-freight-textMuted focus:border-freight-textMuted transition-colors appearance-none" 
                     placeholder="0" />
              <Scale size={16} className="absolute left-3 top-3 w-4 h-4 text-freight-textMuted shrink-0" />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-freight-textMuted uppercase tracking-wide mb-1.5">Cargo Class</label>
            <div className="relative">
              <select name="category" value={formData.category} onChange={handleChange} 
                      className="block w-full pl-9 pr-3 py-2.5 bg-white border border-freight-border rounded-none text-freight-textMain text-sm focus:outline-none focus:ring-1 focus:ring-freight-textMuted focus:border-freight-textMuted transition-colors appearance-none cursor-pointer">
                <option value="general">Standard (FMCG)</option>
                <option value="fragile">Fragile</option>
                <option value="temperature-controlled">Temp-Controlled</option>
                <option value="hazmat">Hazardous</option>
                <option value="high-value">High Value</option>
              </select>
              <Box size={16} className="absolute left-3 top-3 w-4 h-4 text-freight-textMuted shrink-0 pointer-events-none" />
              <ChevronDown size={16} className="absolute right-3 top-3 w-4 h-4 text-freight-textMuted shrink-0 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Compliance */}
        <div className="pt-2">
          <label className="flex items-start cursor-pointer group">
            <div className="relative flex items-center h-5 mt-0.5">
              <input type="checkbox" name="isRegisteredBusiness" checked={formData.isRegisteredBusiness} onChange={handleChange} 
                     className="peer h-4 w-4 rounded-none border border-freight-textMuted text-freight-textMuted focus:ring-freight-textMuted bg-white transition-all appearance-none checked:border-freight-textMuted checked:bg-freight-textMuted" />
              <svg className="absolute w-3 h-3 ml-[2px] hidden peer-checked:block pointer-events-none text-white shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <span className="text-sm font-medium text-freight-textMain block group-hover:text-freight-textMuted transition-colors">
                GST Registered Entity
              </span>
              <span className="text-xs text-freight-textMuted mt-0.5 block">Apply Reverse Charge Mechanism (RCM)</span>
            </div>
          </label>
        </div>

      </div>

      {/* Action CTA */}
      <div className="px-6 py-4 bg-gray-50/50 border-t border-freight-border">
        <button type="submit" disabled={isLoading} 
                className="w-full bg-freight-brand text-white font-medium text-sm py-2.5 rounded-none hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center shadow-sm">
          {isLoading ? (
            <span className="flex items-center">
              <Loader2 size={16} className="w-4 h-4 animate-spin mr-2 shrink-0" />
              Processing...
            </span>
          ) : (
            "Compare Rates"
          )}
        </button>
      </div>
    </form>
  );
};

export default CompareForm;

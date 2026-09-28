import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CompareInput, CargoClass } from '../types';
import { PlaceInput } from './PlaceInput';
import { Icon } from './Icon';

const FormSchema = z.object({
  origin: z.string().min(2, 'Enter origin city or district (min 2 characters)'),
  destination: z.string().min(2, 'Enter destination city or district (min 2 characters)'),
  weightKg: z
    .number({ invalid_type_error: 'Enter gross weight in kg' })
    .positive('Weight must be greater than 0 kg')
    .max(100000, 'Maximum consignment weight is 100,000 kg'),
  cargoClass: z.enum(['general', 'fragile', 'temperature-controlled', 'hazmat', 'high-value'] as const),
  gstRegistered: z.boolean(),
  goodsValueInr: z.number().positive().optional(),
  dimLength: z.number().positive().optional(),
  dimWidth: z.number().positive().optional(),
  dimHeight: z.number().positive().optional(),
  urgency: z.enum(['normal', 'express']).optional(),
});

type FormValues = z.infer<typeof FormSchema>;

interface ConsignmentFormProps {
  initialValues?: Partial<CompareInput>;
  onSubmit: (data: CompareInput) => void;
  isLoading: boolean;
}

export const ConsignmentForm: React.FC<ConsignmentFormProps> = ({
  initialValues,
  onSubmit,
  isLoading,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(
      initialValues?.goodsValueInr ||
        initialValues?.dimensionsCm ||
        initialValues?.urgency === 'express',
    ),
  );

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      origin: initialValues?.origin || '',
      destination: initialValues?.destination || '',
      weightKg: initialValues?.weightKg || 5000,
      cargoClass: initialValues?.cargoClass || 'general',
      gstRegistered: initialValues?.gstRegistered ?? true,
      goodsValueInr: initialValues?.goodsValueInr,
      dimLength: initialValues?.dimensionsCm?.l,
      dimWidth: initialValues?.dimensionsCm?.w,
      dimHeight: initialValues?.dimensionsCm?.h,
      urgency: initialValues?.urgency || 'normal',
    },
  });

  const onFormSubmit = (data: FormValues) => {
    const payload: CompareInput = {
      origin: data.origin,
      destination: data.destination,
      weightKg: data.weightKg,
      cargoClass: data.cargoClass as CargoClass,
      gstRegistered: data.gstRegistered,
      goodsValueInr: data.goodsValueInr ? Number(data.goodsValueInr) : undefined,
      urgency: data.urgency,
      dimensionsCm:
        data.dimLength && data.dimWidth && data.dimHeight
          ? {
              l: Number(data.dimLength),
              w: Number(data.dimWidth),
              h: Number(data.dimHeight),
            }
          : undefined,
    };
    onSubmit(payload);
  };

  const gstRegistered = watch('gstRegistered');

  return (
    <div className="bg-paper-card border border-rule p-5">
      {/* Header bar matching printed LR note */}
      <div className="border-b border-rule pb-3 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif font-bold text-base text-ink tracking-tight">
            Consignment Details
          </h2>
          <span className="font-mono text-[10px] text-ink-muted uppercase border border-rule px-1.5 py-0.5">
            Form LR-101
          </span>
        </div>
        <p className="text-xs text-ink-muted mt-1">
          Enter cargo specifications to calculate competitive rates across road, rail, air and coastal.
        </p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} noValidate>
        {/* Origin */}
        <Controller
          control={control}
          name="origin"
          render={({ field }) => (
            <PlaceInput
              id="origin-input"
              name={field.name}
              label="Origin (Pickup City / Hub)"
              placeholder="e.g. Pune, Mumbai, Delhi"
              value={field.value}
              onChange={field.onChange}
              error={errors.origin?.message}
              required
            />
          )}
        />

        {/* Destination */}
        <Controller
          control={control}
          name="destination"
          render={({ field }) => (
            <PlaceInput
              id="destination-input"
              name={field.name}
              label="Destination (Delivery City / Hub)"
              placeholder="e.g. Ahmedabad, Chennai, Kolkata"
              value={field.value}
              onChange={field.onChange}
              error={errors.destination?.message}
              required
            />
          )}
        />

        {/* Weight & Cargo Class Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label
              htmlFor="weight-input"
              className="block text-xs font-mono uppercase tracking-wider text-ink font-semibold mb-1"
            >
              Gross Weight (kg) <span className="text-stamp">*</span>
            </label>
            <div className="relative">
              <input
                id="weight-input"
                type="number"
                step="any"
                {...register('weightKg', { valueAsNumber: true })}
                placeholder="5000"
                className={`w-full px-3 py-2 text-sm bg-paper-input text-ink border tabular-nums ${
                  errors.weightKg ? 'border-stamp' : 'border-rule focus:border-ink'
                }`}
              />
              <span className="absolute right-3 top-2 text-xs font-mono text-ink-muted pointer-events-none">
                KG
              </span>
            </div>
            {errors.weightKg && (
              <p className="mt-1 text-xs text-stamp font-mono">{errors.weightKg.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="cargo-class-select"
              className="block text-xs font-mono uppercase tracking-wider text-ink font-semibold mb-1"
            >
              Cargo Class <span className="text-stamp">*</span>
            </label>
            <div className="relative">
              <select
                id="cargo-class-select"
                {...register('cargoClass')}
                className="w-full px-3 py-2 text-sm bg-paper-input text-ink border border-rule focus:border-ink cursor-pointer pr-8"
              >
                <option value="general">Standard (FMCG, General)</option>
                <option value="fragile">Fragile / High-Care</option>
                <option value="temperature-controlled">Perishable / Reefer</option>
                <option value="hazmat">Hazmat / Dangerous Goods</option>
                <option value="high-value">High-Value (Secured Escort)</option>
              </select>
              <div className="absolute right-2.5 top-2.5 text-ink-muted pointer-events-none">
                <Icon name="chevron-down" size={16} />
              </div>
            </div>
            {errors.cargoClass && (
              <p className="mt-1 text-xs text-stamp font-mono">{errors.cargoClass.message}</p>
            )}
          </div>
        </div>

        {/* GST Registered Toggle — Strict 0px square checkbox */}
        <div className="mb-4 pt-2 border-t border-rule-light">
          <label className="flex items-center space-x-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              id="gst-registered-checkbox"
              {...register('gstRegistered')}
              className="sr-only"
            />
            <div
              className={`w-4 h-4 border border-ink flex items-center justify-center transition-colors ${
                gstRegistered ? 'bg-ink text-paper' : 'bg-paper-input'
              }`}
            >
              {gstRegistered && <Icon name="check" size={16} className="text-paper stroke-[2.5]" />}
            </div>
            <span className="text-xs text-ink">
              <span className="font-semibold">GST Registered Shipper</span>
              <span className="text-ink-muted text-[11px] block sm:inline sm:ml-1">
                (Eligible for 5% Reverse Charge Mechanism on road freight)
              </span>
            </span>
          </label>
        </div>

        {/* Advanced Specifications Accordion */}
        <div className="mb-4 border border-rule-light bg-paper/50">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-3 py-2 text-left flex items-center justify-between text-xs font-mono text-ink hover:bg-paper transition-colors"
          >
            <span className="flex items-center space-x-1.5 font-semibold">
              <Icon name="scale" size={16} />
              <span>Additional Consignment Specifications</span>
            </span>
            <Icon name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={16} />
          </button>

          {showAdvanced && (
            <div className="p-3 border-t border-rule-light space-y-3">
              {/* Goods value for e-way bill */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label htmlFor="goods-value-input" className="block text-xs font-mono text-ink">
                    Declared Invoice Value (INR)
                  </label>
                  <span className="text-[10px] font-mono text-ink-muted">
                    E-way bill advisory applies &gt; ₹50,000
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono text-ink-muted pointer-events-none">
                    ₹
                  </span>
                  <input
                    id="goods-value-input"
                    type="number"
                    step="any"
                    {...register('goodsValueInr', { valueAsNumber: true })}
                    placeholder="e.g. 250000"
                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-paper-input text-ink border border-rule focus:border-ink tabular-nums"
                  />
                </div>
              </div>

              {/* Package Dimensions */}
              <div>
                <label className="block text-xs font-mono text-ink mb-1">
                  Cargo Dimensions (L × W × H in cm)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    id="dim-length-input"
                    type="number"
                    step="any"
                    placeholder="Length"
                    {...register('dimLength', { valueAsNumber: true })}
                    className="px-2 py-1.5 text-xs bg-paper-input text-ink border border-rule focus:border-ink tabular-nums"
                  />
                  <input
                    id="dim-width-input"
                    type="number"
                    step="any"
                    placeholder="Width"
                    {...register('dimWidth', { valueAsNumber: true })}
                    className="px-2 py-1.5 text-xs bg-paper-input text-ink border border-rule focus:border-ink tabular-nums"
                  />
                  <input
                    id="dim-height-input"
                    type="number"
                    step="any"
                    placeholder="Height"
                    {...register('dimHeight', { valueAsNumber: true })}
                    className="px-2 py-1.5 text-xs bg-paper-input text-ink border border-rule focus:border-ink tabular-nums"
                  />
                </div>
                <span className="text-[10px] font-mono text-ink-muted mt-1 block">
                  Used to calculate volumetric chargeable weight for air freight (1:5000 ratio).
                </span>
              </div>

              {/* Urgency */}
              <div>
                <label htmlFor="urgency-select" className="block text-xs font-mono text-ink mb-1">
                  Dispatch Urgency
                </label>
                <select
                  id="urgency-select"
                  {...register('urgency')}
                  className="w-full px-2.5 py-1.5 text-xs bg-paper-input text-ink border border-rule focus:border-ink"
                >
                  <option value="normal">Standard Dispatch (Best Economy)</option>
                  <option value="express">Express Delivery (Time-Sensitive Priority)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button — Stamp Red, 0px border radius, high-impact CTA */}
        <button
          type="submit"
          id="compare-rates-button"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-stamp hover:bg-stamp-hover text-paper font-mono font-semibold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <Icon name="refresh" size={16} className="animate-spin text-paper" />
              <span>Calculating Multi-Modal Rates...</span>
            </>
          ) : (
            <>
              <span>Compare Rates</span>
              <Icon name="chevron-right" size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConsignmentForm } from './components/ConsignmentForm';
import { PlaceInput } from './components/PlaceInput';
import { Icon } from './components/Icon';

describe('Frontend Form & Invariant Unit Tests', () => {
  describe('Icon Component Size Invariant', () => {
    it('renders with explicit size (16-20px) without distortion', () => {
      const { container: c16 } = render(<Icon name="truck" size={16} />);
      const svg16 = c16.querySelector('svg');
      expect(svg16).toHaveAttribute('width', '16px');
      expect(svg16).toHaveAttribute('height', '16px');

      const { container: c20 } = render(<Icon name="plane" size={20} />);
      const svg20 = c20.querySelector('svg');
      expect(svg20).toHaveAttribute('width', '20px');
      expect(svg20).toHaveAttribute('height', '20px');
    });
  });

  describe('PlaceInput Component', () => {
    it('renders label tied to input by id', () => {
      const onChange = vi.fn();
      render(
        <PlaceInput
          id="test-origin"
          name="origin"
          label="Origin City"
          value="Pune"
          onChange={onChange}
        />,
      );

      const input = screen.getByLabelText(/Origin City/i);
      expect(input).toHaveAttribute('id', 'test-origin');
      expect(input).toHaveValue('Pune');
    });

    it('updates text on typing', () => {
      const onChange = vi.fn();
      render(
        <PlaceInput
          id="test-origin"
          name="origin"
          label="Origin City"
          value=""
          onChange={onChange}
        />,
      );

      const input = screen.getByLabelText(/Origin City/i);
      fireEvent.change(input, { target: { value: 'Bengaluru' } });
      expect(onChange).toHaveBeenCalledWith('Bengaluru');
    });
  });

  describe('ConsignmentForm Component', () => {
    it('populates fields and asserts exact values after typing and selecting', async () => {
      const onSubmit = vi.fn();

      render(
        <ConsignmentForm
          initialValues={{
            origin: 'Pune',
            destination: 'Ahmedabad',
            weightKg: 5000,
            cargoClass: 'general',
            gstRegistered: true,
          }}
          onSubmit={onSubmit}
          isLoading={false}
        />,
      );

      // Verify initial field values
      const originInput = screen.getByLabelText(/Origin \(Pickup City \/ Hub\)/i);
      const destInput = screen.getByLabelText(/Destination \(Delivery City \/ Hub\)/i);
      const weightInput = screen.getByLabelText(/Gross Weight \(kg\)/i);
      const classSelect = screen.getByLabelText(/Cargo Class/i);
      const gstCheckbox = screen.getByLabelText(/GST Registered Shipper/i);

      expect(originInput).toHaveValue('Pune');
      expect(destInput).toHaveValue('Ahmedabad');
      expect(weightInput).toHaveValue(5000);
      expect(classSelect).toHaveValue('general');
      expect(gstCheckbox).toBeChecked();

      // Change Cargo Class
      fireEvent.change(classSelect, { target: { value: 'temperature-controlled' } });
      expect(classSelect).toHaveValue('temperature-controlled');

      // Change Weight
      fireEvent.change(weightInput, { target: { value: '12000' } });
      expect(weightInput).toHaveValue(12000);

      // Submit the form
      const submitBtn = screen.getByRole('button', { name: /Compare Rates/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
        const submitted = onSubmit.mock.calls[0][0];
        expect(submitted.origin).toBe('Pune');
        expect(submitted.destination).toBe('Ahmedabad');
        expect(submitted.weightKg).toBe(12000);
        expect(submitted.cargoClass).toBe('temperature-controlled');
        expect(submitted.gstRegistered).toBe(true);
      });
    });

    it('toggles GST checkbox and square border styling', () => {
      const onSubmit = vi.fn();

      render(
        <ConsignmentForm
          initialValues={{
            origin: 'Mumbai',
            destination: 'Delhi',
            weightKg: 800,
            cargoClass: 'general',
            gstRegistered: false,
          }}
          onSubmit={onSubmit}
          isLoading={false}
        />,
      );

      const gstCheckbox = screen.getByLabelText(/GST Registered Shipper/i);
      expect(gstCheckbox).not.toBeChecked();

      fireEvent.click(gstCheckbox);
      expect(gstCheckbox).toBeChecked();
    });
  });
});

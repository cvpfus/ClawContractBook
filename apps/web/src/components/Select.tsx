import { useState } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({ value, onChange, options, placeholder }: SelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);

  const handleChange = (newValue: string) => {
    onChange(newValue);
  };

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

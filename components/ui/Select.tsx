import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, error, options, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <select
        className={`w-full px-3 py-2 bg-white border rounded-md text-sm shadow-sm
        focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
        ${error ? 'border-red-500' : 'border-slate-300'} ${className}`}
        {...props}
      >
        <option value="" disabled>Выберите опцию</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};
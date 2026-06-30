"use client";

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  error?: string;
}

export function Field({ label, required, children, className = "", error }: FieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-sm font-medium text-charcoal-300">
        {label}
        {required && <span className="text-coral-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

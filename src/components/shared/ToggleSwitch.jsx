import React from 'react';

const ToggleSwitch = ({
  checked,
  onChange,
  disabled = false,
  label,
  showStateText = false,
  onText = 'ON',
  offText = 'OFF',
  stateText,
  activeClassName = 'bg-brand-purple',
  inactiveClassName = 'bg-black/15 dark:bg-white/20',
  labelClassName = 'text-muted-foreground',
  className = '',
}) => {
  const stateLabel = stateText ?? (checked ? onText : offText);
  const accessibleLabel = label || stateLabel;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={accessibleLabel}
      disabled={disabled}
      onClick={onChange}
      className={`inline-flex items-center gap-2 rounded-full transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <span
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          checked ? activeClassName : inactiveClassName
        }`}
      >
        <span
          className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
      {(label || showStateText) && (
        <span className={`text-sm font-medium ${labelClassName}`}>
          {label}
          {showStateText && (
            <span className={`ml-1 font-semibold ${checked ? 'text-success' : 'text-muted-foreground'}`}>
              {stateLabel}
            </span>
          )}
        </span>
      )}
    </button>
  );
};

export default ToggleSwitch;

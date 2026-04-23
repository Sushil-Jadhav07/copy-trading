import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EMPTY_VALUE = '__EMPTY__';

const DivSelect = ({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select',
  disabled = false,
  className = '',
  triggerClassName = '',
  contentClassName = '',
  includeEmptyOption = true,
  emptyOptionLabel = null,
  onFocus,
}) => (
  <div className={className} onFocus={onFocus}>
    <Select
      value={value === '' ? EMPTY_VALUE : String(value)}
      onValueChange={(nextValue) => {
        const resolved = nextValue === EMPTY_VALUE ? '' : nextValue;
        onChange?.(resolved);
      }}
      disabled={disabled}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {includeEmptyOption && (
          <SelectItem value={EMPTY_VALUE}>{emptyOptionLabel || placeholder}</SelectItem>
        )}
        {options.map((option) => (
          <SelectItem key={String(option.value)} value={String(option.value)} disabled={Boolean(option.disabled)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default DivSelect;

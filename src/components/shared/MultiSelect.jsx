import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MultiSelect = ({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select options...',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const removeValue = (e, optionValue) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex min-h-[42px] w-full cursor-pointer items-center justify-between rounded-xl border border-border bg-black/5 px-3 py-1.5 text-sm transition-all focus:border-brand-purple dark:bg-white/5 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-border/80'
        } ${isOpen ? 'border-brand-purple ring-1 ring-brand-purple/20' : ''}`}
      >
        <div className="flex flex-wrap gap-1.5">
          {value.length === 0 && (
            <span className="text-muted-foreground/60">{placeholder}</span>
          )}
          {value.map((val) => {
            const option = options.find((o) => String(o.value) === String(val));
            return (
              <span
                key={val}
                className="flex items-center gap-1 rounded-lg bg-brand-purple/10 px-2 py-0.5 text-xs font-bold text-brand-purple border border-brand-purple/20"
              >
                {option?.label || val}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-brand-purple/80"
                  onClick={(e) => removeValue(e, val)}
                />
              </span>
            );
          })}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-xl backdrop-blur-xl"
          >
            {options.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                No accounts available
              </div>
            ) : (
              options.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                      isSelected
                        ? 'bg-brand-purple/10 text-brand-purple font-bold'
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>{option.label}</span>
                    {isSelected && <Check className="h-4 w-4" />}
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MultiSelect;

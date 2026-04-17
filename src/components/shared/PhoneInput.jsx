import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Phone } from 'lucide-react';

// Using flagcdn.com SVG flags — renders perfectly on all browsers including mobile WebView
// Format: https://flagcdn.com/w20/{iso2_lowercase}.png
const COUNTRY_CODES = [
  { code: '+91',  iso: 'in', name: 'India' },
  { code: '+1',   iso: 'us', name: 'USA' },
  { code: '+44',  iso: 'gb', name: 'UK' },
  { code: '+971', iso: 'ae', name: 'UAE' },
  { code: '+65',  iso: 'sg', name: 'Singapore' },
  { code: '+61',  iso: 'au', name: 'Australia' },
  { code: '+49',  iso: 'de', name: 'Germany' },
  { code: '+81',  iso: 'jp', name: 'Japan' },
  { code: '+33',  iso: 'fr', name: 'France' },
  { code: '+86',  iso: 'cn', name: 'China' },
  { code: '+971', iso: 'ae', name: 'UAE' },
  { code: '+27',  iso: 'za', name: 'South Africa' },
];

// Deduplicate by code
const UNIQUE_CODES = COUNTRY_CODES.filter(
  (item, index, arr) => arr.findIndex((c) => c.code === item.code) === index
);

const FlagImg = ({ iso, size = 20 }) => (
  <img
    src={`https://flagcdn.com/w${size}/${iso}.png`}
    srcSet={`https://flagcdn.com/w${size * 2}/${iso}.png 2x`}
    width={size}
    height={Math.round(size * 0.67)}
    alt=""
    className="rounded-sm flex-shrink-0 object-cover"
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
    loading="lazy"
    onError={(e) => { e.target.style.display = 'none'; }}
  />
);

const PhoneInput = ({
  value,
  onChange,
  countryCode,
  onCountryChange,
  inputStyle,
  placeholder = 'Phone number',
  required = false,
  maxLength = 12,
}) => {
  const [showDrop, setShowDrop] = useState(false);
  const dropRef = useRef(null);

  const selected = UNIQUE_CODES.find((c) => c.code === countryCode) || UNIQUE_CODES[0];

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, maxLength);
    onChange(digits);
  };

  return (
    <div className="flex gap-2">
      {/* Country selector */}
      <div ref={dropRef} className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setShowDrop((p) => !p)}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={inputStyle}
        >
          <FlagImg iso={selected.iso} size={20} />
          <span className="text-slate-400 dark:text-slate-200 tabular-nums">{selected.code}</span>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showDrop ? 'rotate-180' : ''}`} />
        </button>

        {showDrop && (
          <div
            className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.98)',
              border: '1px solid rgba(0,0,0,0.10)',
              minWidth: '200px',
              maxHeight: '260px',
              overflowY: 'auto',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            {UNIQUE_CODES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => { onCountryChange(c.code); setShowDrop(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors hover:bg-emerald-500/10 ${selected.code === c.code ? 'bg-emerald-500/8' : ''}`}
              >
                <FlagImg iso={c.iso} size={20} />
                <span className="font-semibold text-slate-800 tabular-nums">{c.code}</span>
                <span className="text-slate-400 text-xs">{c.name}</span>
                {selected.code === c.code && (
                  <span className="ml-auto text-emerald-500 text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Phone number input */}
      <div className="relative flex-1">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <input
          type="tel"
          name="phone"
          autoComplete="tel-national"
          inputMode="numeric"
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
          style={inputStyle}
          required={required}
        />
      </div>
    </div>
  );
};

export default PhoneInput;

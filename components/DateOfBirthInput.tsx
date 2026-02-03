import React, { useState, useCallback } from 'react';

function formatDisplay(digits: string): string {
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

function toYYYYMMDD(digits: string): string {
  if (digits.length !== 8) return '';
  const mm = digits.slice(0, 2);
  const dd = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  const year = parseInt(yyyy, 10);
  if (month < 1 || month > 12) return '';
  if (day < 1 || day > 31) return '';
  if (year < 1900 || year > 2100) return '';
  return `${yyyy}-${mm}-${dd}`;
}

interface DateOfBirthInputProps {
  name: string;
  required?: boolean;
  className?: string;
}

export function DateOfBirthInput({ name, required, className = '' }: DateOfBirthInputProps) {
  const [digits, setDigits] = useState('');
  const display = formatDisplay(digits);
  const isoValue = toYYYYMMDD(digits);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const nextDigits = raw.replace(/\D/g, '').slice(0, 8);
    setDigits(nextDigits);
  }, []);

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="MM/DD/YYYY"
        value={display}
        onChange={handleChange}
        maxLength={10}
        className={className}
        aria-label="Date of Birth"
      />
      <input
        type="hidden"
        name={name}
        value={isoValue}
        required={required}
        tabIndex={-1}
        aria-hidden
      />
    </>
  );
}

export default DateOfBirthInput;

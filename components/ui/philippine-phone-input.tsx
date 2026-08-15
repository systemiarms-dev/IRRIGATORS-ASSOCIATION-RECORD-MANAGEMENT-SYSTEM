'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { isValidPhilippineMobile, normalizePhilippineMobile } from '@/lib/utils/phone';

export { isValidPhilippineMobile, normalizePhilippineMobile };

interface PhilippinePhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * A Philippine mobile number input rendered as 11 individual boxes.
 * The first two boxes are fixed to "0" and "9" (Philippine numbers always
 * start with 09); the remaining nine accept one digit each.
 */
const PhilippinePhoneInput = React.forwardRef<HTMLDivElement, PhilippinePhoneInputProps>(
  ({ value, onChange, disabled, className }, ref) => {
    const digits = React.useMemo(() => value.replace(/\D/g, ''), [value]);
    const boxRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    const setBoxRef = (i: number) => (el: HTMLInputElement | null) => {
      boxRefs.current[i] = el;
    };

    const focusBox = (i: number) => {
      if (i >= 0 && i <= 10) boxRefs.current[i]?.focus();
    };

    const editableDigits = React.useMemo(() => {
      const arr = digits.slice(2, 11).split('');
      while (arr.length < 9) arr.push('');
      return arr;
    }, [digits]);

    const assemble = React.useCallback(
      (editable: string[]) => {
        const joined = editable.join('').replace(/\s+/g, '');
        onChange(joined ? `09${joined}` : '');
      },
      [onChange]
    );

    const handleBoxChange = (index: number, raw: string) => {
      if (disabled) return;
      if (index < 2) return;
      const clean = raw.replace(/\D/g, '');
      const editable = [...editableDigits];

      if (clean.length > 1) {
        // Paste / multi-char input: distribute digits from this box onward.
        // Auto-convert legacy "+63..." / "63..." input to the 09 format.
        let dist = clean;
        if (dist.startsWith('63') && dist.length >= 12) dist = '0' + dist.slice(2, 12);
        let cursor = index - 2;
        for (const ch of dist.slice(0, 9 - cursor)) {
          if (cursor >= 9) break;
          editable[cursor] = ch;
          cursor++;
        }
        assemble(editable);
        focusBox(Math.min(cursor - 1 + 2, 10));
        return;
      }

      const slot = index - 2;
      editable[slot] = clean;
      assemble(editable);
      if (clean) focusBox(index + 1);
      else focusBox(index - 1);
    };

    const handleBoxKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        const box = boxRefs.current[index];
        if (box && box.value === '') {
          e.preventDefault();
          handleBoxChange(index - 1, '');
          focusBox(index > 2 ? index - 1 : 2);
        }
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        focusBox(index > 2 ? index - 1 : 2);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        focusBox(index < 10 ? index + 1 : 10);
      }
    };

    const handleBoxClick = (index: number) => {
      boxRefs.current[index]?.select();
    };

    const boxCls = (fixed: boolean) =>
      cn(
        'w-9 h-10 sm:w-10 text-center text-sm font-bold rounded-xl border bg-white text-slate-900 px-1 tabular-nums',
        fixed ? 'border-slate-200 text-slate-600 bg-slate-50' : 'border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-600',
        'transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60',
        '[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
      );

    return (
      <div ref={ref} className={cn('flex items-center gap-1.5 flex-wrap', className)}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => {
          const isPrefix = i < 2;
          const display = isPrefix ? (i === 0 ? '0' : '9') : editableDigits[i - 2];
          return (
            <Input
              key={i}
              ref={setBoxRef(i)}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={11}
              disabled={disabled || isPrefix}
              readOnly={isPrefix}
              tabIndex={isPrefix ? -1 : undefined}
              value={display}
              onChange={(e) => !isPrefix && handleBoxChange(i, e.target.value)}
              onKeyDown={(e) => !isPrefix && handleBoxKeyDown(i, e)}
              onClick={() => !isPrefix && handleBoxClick(i)}
              onFocus={(e) => !isPrefix && e.target.select()}
              className={boxCls(isPrefix)}
              aria-label={isPrefix ? i === 0 ? 'Digit 0' : 'Digit 9' : `Digit ${i + 1}`}
            />
          );
        })}
      </div>
    );
  }
);
PhilippinePhoneInput.displayName = 'PhilippinePhoneInput';

export { PhilippinePhoneInput };
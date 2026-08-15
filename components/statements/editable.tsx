'use client';

import React, { useEffect, useRef, useState } from 'react';
import { formatPHP } from '@/lib/utils/formatters';
import { Pencil, X } from 'lucide-react';

interface NumberFieldProps {
  value: number;
  editable?: boolean;
  hasOverride?: boolean;
  onCommit?: (value: number) => void;
  onRemove?: () => void;
  className?: string;
  emptyWhenZero?: boolean;
  emptyText?: string;
}

/**
 * Inline-editable PHP value cell (numbers only).
 * - Auto mode / protected cells: plain read-only span, no affixes.
 * - Manual mode: click-to-edit (pen icon); a remove (X) button appears next to
 *   the pen when the cell carries a manual override so it can be reset.
 */
export function NumberField({
  value,
  editable = false,
  hasOverride = false,
  onCommit,
  onRemove,
  className = '',
  emptyWhenZero = false,
  emptyText = '₱ -',
}: NumberFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const display = emptyWhenZero && !value ? emptyText : formatPHP(value || 0);

  if (!editable) {
    return <span className={className}>{display}</span>;
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="any"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = parseFloat(draft);
          setEditing(false);
          if (!isNaN(n) && n !== value) onCommit?.(n);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const n = parseFloat(draft);
            setEditing(false);
            if (!isNaN(n) && n !== value) onCommit?.(n);
          }
          if (e.key === 'Escape') setEditing(false);
        }}
        onClick={(e) => e.stopPropagation()}
        className={`w-24 text-right font-mono text-xs bg-white border border-emerald-400 rounded px-1.5 py-0.5 shadow-sm outline-none focus:ring-2 focus:ring-emerald-300 ${className}`}
        aria-label="Edit value"
      />
    );
  }

  return (
    <span className={`inline-flex items-center justify-end gap-1 ${className}`}>
      <button
        type="button"
        title="Click to edit (numbers only)"
        onClick={() => {
          setDraft(String(value ?? 0));
          setEditing(true);
        }}
        style={{ font: 'inherit', textTransform: 'inherit' }}
        className="inline-flex items-center justify-end gap-1 rounded px-1 -mx-1 cursor-pointer border border-dashed border-transparent hover:border-emerald-500 hover:bg-emerald-50/70 transition-colors"
      >
        {display}
        <Pencil className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
      </button>
      {hasOverride && onRemove && (
        <button
          type="button"
          title="Remove this value (back to ₱ 0.00)"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors shrink-0"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}

interface TextFieldProps {
  value: string;
  editable?: boolean;
  hasOverride?: boolean;
  onCommit?: (value: string) => void;
  onRemove?: () => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}

/**
 * Inline-editable text cell (association name, address, SEC no., officer names, etc.).
 */
export function TextField({ value, editable = false, hasOverride = false, onCommit, onRemove, className = '', inputClassName = 'w-44', placeholder = '' }: TextFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!editable) {
    return <span className={`${className} ${value ? '' : 'text-slate-300'}`}>{value || placeholder}</span>;
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        style={{ font: 'inherit', textTransform: 'inherit' }}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onCommit?.(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setEditing(false);
            if (draft !== value) onCommit?.(draft);
          }
          if (e.key === 'Escape') setEditing(false);
        }}
        onClick={(e) => e.stopPropagation()}
        className={`${inputClassName} bg-white border border-emerald-400 rounded px-1.5 py-0.5 shadow-sm outline-none focus:ring-2 focus:ring-emerald-300`}
        aria-label="Edit text"
      />
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <button
        type="button"
        title="Click to edit"
        onClick={() => {
          setDraft(value ?? '');
          setEditing(true);
        }}
        style={{ font: 'inherit', textTransform: 'inherit' }}
        className="inline-flex items-center gap-1 rounded px-1 -mx-1 cursor-text border border-dashed border-transparent hover:border-emerald-500 hover:bg-emerald-50/70 transition-colors"
      >
        <span className="text-left">{value}</span>
        <Pencil className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
      </button>
      {hasOverride && onRemove && (
        <button
          type="button"
          title="Remove this override"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors shrink-0"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}
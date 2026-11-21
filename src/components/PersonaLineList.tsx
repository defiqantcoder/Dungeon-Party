import React, { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';

interface PersonaLineListProps {
  label: string;
  value: string;
  placeholder: string;
  isEditing: boolean;
  readOnly: boolean;
  onChange: (nextValue: string) => void;
}

function splitToLines(raw: string): string[] {
  if (!raw) return [];
  return raw.split('\n');
}

function sanitizeSingleLine(text: string): string {
  return text.replace(/[\r\n]+/g, ' ');
}

export const PersonaLineList: React.FC<PersonaLineListProps> = ({
  label,
  value,
  placeholder,
  isEditing,
  readOnly,
  onChange,
}) => {
  // Local line list preserves newly added blank inputs until typed or removed
  const [lines, setLines] = useState<string[]>(() => splitToLines(value));
  const [quickAddActive, setQuickAddActive] = useState(false);
  const lastCommittedRef = useRef<string>(value);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const pendingFocusIndexRef = useRef<number | null>(null);

  // Sync external updates (e.g., JSON import, blank reset, or F5 modal edits)
  useEffect(() => {
    if (value !== lastCommittedRef.current) {
      lastCommittedRef.current = value;
      setLines(splitToLines(value));
    }
  }, [value]);

  // Clear empty trailing rows when leaving edit mode or entering Party Share View
  useEffect(() => {
    if (readOnly) {
      setQuickAddActive(false);
      setLines(splitToLines(value));
      return;
    }
    if (!isEditing && !quickAddActive) {
      const cleaned = lines.filter((line) => line.trim().length > 0);
      if (cleaned.length !== lines.length) {
        setLines(cleaned);
      }
    }
  }, [isEditing, quickAddActive, readOnly, value]);

  // Focus newly added input after render
  useEffect(() => {
    if (pendingFocusIndexRef.current !== null) {
      const idx = pendingFocusIndexRef.current;
      pendingFocusIndexRef.current = null;
      const el = inputRefs.current[idx];
      if (el) {
        el.focus();
      }
    }
  }, [lines, quickAddActive, isEditing]);

  const commitLines = (nextLines: string[]) => {
    setLines(nextLines);
    const serialized = nextLines
      .map((l) => sanitizeSingleLine(l).trim())
      .filter(Boolean)
      .join('\n');
    lastCommittedRef.current = serialized;
    onChange(serialized);
  };

  const handleLineChange = (index: number, rawInput: string) => {
    const clean = sanitizeSingleLine(rawInput);
    const nextLines = lines.map((line, i) => (i === index ? clean : line));
    commitLines(nextLines);
  };

  const handleAddLine = () => {
    if (readOnly) return;
    if (!isEditing) {
      setQuickAddActive(true);
    }
    const baseLines =
      !isEditing && !quickAddActive
        ? splitToLines(value).filter((l) => l.trim().length > 0)
        : lines;
    const nextIndex = baseLines.length;
    pendingFocusIndexRef.current = nextIndex;
    setLines([...baseLines, '']);
  };

  const handleRemoveLine = (index: number) => {
    if (readOnly) return;
    const nextLines = lines.filter((_, i) => i !== index);
    commitLines(nextLines);
    if (!isEditing && nextLines.every((l) => l.trim().length > 0)) {
      setQuickAddActive(false);
    }
  };

  const handleLineKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (lines[index]?.trim()) {
        handleAddLine();
      } else {
        e.currentTarget.blur();
      }
    } else if (e.key === 'Escape') {
      e.currentTarget.blur();
      if (!isEditing) {
        const cleaned = lines.filter((l) => l.trim().length > 0);
        setLines(cleaned);
        setQuickAddActive(false);
      }
    }
  };

  const showInputs = !readOnly && (isEditing || quickAddActive);
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  const singularLabel = label.endsWith('s') ? label.slice(0, -1) : label;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
          {label}
        </label>
        {!readOnly && quickAddActive && !isEditing && (
          <button
            type="button"
            onClick={() => {
              const cleaned = lines.filter((l) => l.trim().length > 0);
              commitLines(cleaned);
              setQuickAddActive(false);
            }}
            className="text-[10px] font-mono text-[#c084fc] hover:underline cursor-pointer"
          >
            Done
          </button>
        )}
      </div>

      {!showInputs ? (
        <div className="bg-[#080c0a] border border-[#2e243b] rounded p-2 text-xs text-[#d4e0da] min-h-[38px]">
          {nonEmptyLines.length === 0 ? (
            <span className="text-[#65766e] italic">Unrecorded</span>
          ) : (
            <ul className="divide-y divide-[#1d1827]">
              {nonEmptyLines.map((line, idx) => (
                <li
                  key={`${label}-view-${idx}`}
                  className="py-1 first:pt-0 last:pb-0 flex items-start gap-2 leading-snug"
                >
                  <span
                    className="font-mono text-[10px] text-[#a855f7] mt-0.5 shrink-0 select-none"
                    aria-hidden="true"
                  >
                    —
                  </span>
                  <span className="min-w-0 break-words">{line}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {lines.length === 0 ? (
            <div className="bg-[#080c0a] border border-dashed border-[#2e243b] rounded px-2.5 py-2 text-[11px] text-[#65766e] italic">
              No {label.toLowerCase()} added yet.
            </div>
          ) : (
            lines.map((line, idx) => (
              <div
                key={`${label}-edit-${idx}`}
                className="flex items-center gap-1.5"
              >
                <span
                  className="font-mono text-[10px] text-[#65766e] w-4 text-right shrink-0 select-none tabular-nums"
                  aria-hidden="true"
                >
                  {idx + 1}.
                </span>
                <input
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  value={line}
                  onChange={(e) => handleLineChange(idx, e.target.value)}
                  onKeyDown={(e) => handleLineKeyDown(e, idx)}
                  placeholder={placeholder}
                  aria-label={`${singularLabel} ${idx + 1}`}
                  className="ledger-input flex-1 min-w-0 px-2 py-1 text-xs leading-snug"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveLine(idx)}
                  aria-label={`Remove ${singularLabel.toLowerCase()} ${idx + 1}`}
                  title={`Remove ${singularLabel.toLowerCase()}`}
                  className="p-1 text-[#65766e] hover:text-[#ff4d4d] transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {!readOnly && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={handleAddLine}
            className="px-2 py-0.5 rounded bg-[#080c0a] border border-[#2e243b] hover:border-[#c084fc] text-[11px] font-mono text-[#9eb0a7] hover:text-[#c084fc] inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3 text-[#c084fc]" />
            <span>Add more</span>
          </button>
        </div>
      )}
    </div>
  );
};

import React from 'react';

interface InlineNameEditorProps {
  inputRef?: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  disabled: boolean;
  isSaving: boolean;
}

export function InlineNameEditor({
  inputRef,
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  isSaving,
}: InlineNameEditorProps) {
  return (
    <>
      <div className="detail-inline-edit">
        <input
          ref={inputRef}
          className="detail-title-input"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
        {isSaving && <span className="detail-saving">💾</span>}
      </div>
      <p className="detail-hint-sm">↵ Enter para salvar</p>
    </>
  );
}

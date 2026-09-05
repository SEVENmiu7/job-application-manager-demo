import { useEffect, useState } from 'react';
import { Check, LoaderCircle, Pencil, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface InlineFieldEditorProps {
  label: string;
  value?: string | null;
  emptyText?: string;
  multiline?: boolean;
  disabled?: boolean;
  triggerClassName?: string;
  onSave: (value: string) => Promise<boolean | void>;
}

export function InlineFieldEditor({
  label,
  value,
  emptyText = '未填写',
  multiline = false,
  disabled = false,
  triggerClassName,
  onSave,
}: InlineFieldEditorProps) {
  const normalizedValue: string = value || '';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(normalizedValue);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setDraft(normalizedValue);
  }, [open, normalizedValue]);

  const save = async () => {
    if (draft.trim() === normalizedValue.trim()) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      const result = await onSave(draft.trim());
      if (result !== false) setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen: boolean) => !saving && setOpen(nextOpen)}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'group/inline flex min-w-0 items-center gap-1.5 rounded-md text-left outline-none transition hover:text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
            triggerClassName,
          )}
          aria-label={`编辑${label}`}
          title={`单击编辑${label}`}
        >
          <span className="min-w-0 flex-1 truncate">
            {normalizedValue || emptyText}
          </span>
          <Pencil className="size-3 shrink-0 opacity-0 transition group-hover/inline:opacity-70 group-focus-visible/inline:opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 rounded-xl border-border p-0 shadow-xl"
      >
        <form
          className="p-3"
          onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            event.stopPropagation();
            void save();
          }}
        >
          <div className="mb-2 text-xs font-bold text-foreground-muted">
            编辑{label}
          </div>
          {multiline ? (
            <Textarea
              autoFocus
              value={draft}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDraft(event.target.value)
              }
              placeholder={`填写${label}`}
              className="min-h-28 resize-y"
              onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                  event.preventDefault();
                  event.stopPropagation();
                  void save();
                }
              }}
            />
          ) : (
            <Input
              autoFocus
              value={draft}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setDraft(event.target.value)
              }
              placeholder={`填写${label}`}
              onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(false);
                }
              }}
            />
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[11px] text-foreground-muted">
              {multiline ? 'Ctrl + Enter 保存' : 'Enter 保存'}
            </span>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                <X />
                取消
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <LoaderCircle className="animate-spin" /> : <Check />}
                保存
              </Button>
            </div>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

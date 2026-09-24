import { type ReactNode, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PRESET_TAGS = ['Clip', 'Highlight', 'Clutch', 'Review', 'Funny'];

interface ReplayEntryEditFormProps {
    initialName: string;
    initialTags: string[];
    initialNotes: string;
    presetTags?: string[];
    isSaving?: boolean;
    error?: ReactNode;
    onCancel: () => void;
    onSave: (patch: { name: string; tags: string[]; notes: string }) => void;
}

export function ReplayEntryEditForm({
    initialName,
    initialTags,
    initialNotes,
    presetTags = PRESET_TAGS,
    isSaving = false,
    error,
    onCancel,
    onSave,
}: ReplayEntryEditFormProps) {
    const [name, setName] = useState(initialName);
    const [tags, setTags] = useState<string[]>(initialTags);
    const [notes, setNotes] = useState(initialNotes);
    const [customTagInput, setCustomTagInput] = useState('');

    // UserMetadataSchema.name is z.string().nonempty() — mirror that here
    // so the save button can't submit something the schema will reject.
    const nameInvalid = name.trim().length === 0;
    const customTags = tags.filter((t) => !presetTags.includes(t));

    function toggleTag(tag: string) {
        setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
    }

    function addCustomTag() {
        const val = customTagInput.trim();
        if (!val || tags.includes(val)) {
            setCustomTagInput('');
            return;
        }
        setTags((prev) => [...prev, val]);
        setCustomTagInput('');
    }

    function handleSave() {
        if (nameInvalid) return;
        onSave({ name: name.trim(), tags, notes });
    }

    return (
        <div className="flex flex-col gap-3.5 border-t border-border/50 px-4 pb-4 pt-3.5">
            <div>
                <div className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Name <span className="text-primary">required</span>
                </div>
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name this replay"
                    className={cn('h-8 text-sm', nameInvalid && 'border-destructive focus-visible:ring-destructive')}
                />
            </div>

            <div>
                <div className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Tags</div>
                <div className="flex flex-wrap items-center gap-1.5">
                    {presetTags.map((tag) => {
                        const selected = tags.includes(tag);
                        return (
                            <Badge
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                variant={selected ? 'default' : 'outline'}
                                className="cursor-pointer select-none rounded-full px-2.5 py-1 text-xs font-normal"
                            >
                                {tag}
                            </Badge>
                        );
                    })}
                    {customTags.map((tag) => (
                        <Badge
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            variant="default"
                            className="flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-xs font-normal"
                        >
                            {tag}
                            <X className="size-2.5" />
                        </Badge>
                    ))}
                    <input
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomTag();
                            }
                        }}
                        placeholder="+ add custom"
                        className="w-28 rounded-full border border-dashed border-border bg-transparent px-2.5 py-1 text-xs text-foreground outline-none placeholder:text-muted-foreground/60"
                    />
                </div>
            </div>

            <div>
                <div className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Notes</div>
                <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this replay…"
                    rows={2}
                    className="text-xs resize-y"
                />
            </div>

            {error && <div className="text-xs text-destructive">{error}</div>}

            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
                <Button size="sm" disabled={nameInvalid || isSaving} onClick={handleSave}>
                    {isSaving && <Loader2 className="animate-spin" />}
                    Save
                </Button>
            </div>
        </div>
    );
}

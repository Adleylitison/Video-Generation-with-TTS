import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

interface ScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ScriptEditor({ value, onChange, disabled }: ScriptEditorProps) {
  const charCount = value.length;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex-1 flex flex-col p-6 gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Script</h2>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span data-testid="text-word-count">{wordCount} words</span>
            <span data-testid="text-char-count">{charCount} characters</span>
          </div>
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Enter your video script here... Describe the story or information you want to convey. For emotive videos, focus on the narrative arc and emotional beats. For informative videos, organize your key points clearly."
          className="flex-1 resize-none font-mono text-base min-h-[400px]"
          data-testid="input-script"
        />
      </CardContent>
    </Card>
  );
}

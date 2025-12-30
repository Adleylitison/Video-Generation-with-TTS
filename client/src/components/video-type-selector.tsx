import { Card, CardContent } from "@/components/ui/card";
import { Heart, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoTypeSelectorProps {
  value: "emotive" | "informative";
  onChange: (value: "emotive" | "informative") => void;
  disabled?: boolean;
}

export function VideoTypeSelector({ value, onChange, disabled }: VideoTypeSelectorProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">Video Type</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onChange("emotive")}
            disabled={disabled}
            data-testid="button-type-emotive"
            className={cn(
              "flex flex-col items-center justify-center gap-3 p-6 rounded-md border-2 transition-all hover-elevate active-elevate-2",
              value === "emotive"
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            )}
          >
            <Heart className={cn(
              "h-8 w-8",
              value === "emotive" ? "text-primary" : "text-muted-foreground"
            )} />
            <div className="text-center">
              <div className={cn(
                "font-semibold mb-1",
                value === "emotive" ? "text-foreground" : "text-muted-foreground"
              )}>
                Emotive/Story
              </div>
              <div className="text-xs text-muted-foreground">
                Enhanced emotional feedback
              </div>
            </div>
          </button>
          
          <button
            onClick={() => onChange("informative")}
            disabled={disabled}
            data-testid="button-type-informative"
            className={cn(
              "flex flex-col items-center justify-center gap-3 p-6 rounded-md border-2 transition-all hover-elevate active-elevate-2",
              value === "informative"
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            )}
          >
            <BookOpen className={cn(
              "h-8 w-8",
              value === "informative" ? "text-primary" : "text-muted-foreground"
            )} />
            <div className="text-center">
              <div className={cn(
                "font-semibold mb-1",
                value === "informative" ? "text-foreground" : "text-muted-foreground"
              )}>
                Informative
              </div>
              <div className="text-xs text-muted-foreground">
                Clear, literal content
              </div>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

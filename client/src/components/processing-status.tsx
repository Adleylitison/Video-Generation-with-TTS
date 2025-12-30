import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProcessingStage } from "@shared/schema";

interface ProcessingStatusProps {
  stage: ProcessingStage;
  progress: number;
  currentStep: string;
  error?: string;
}

const stages = [
  { id: "analyzing", label: "Analyzing Script", description: "Understanding content and emotion" },
  { id: "generating_tts", label: "Generating Audio", description: "Creating voiceover narration" },
  { id: "generating_music", label: "Creating Music", description: "Composing background score" },
  { id: "generating_video", label: "Generating Video", description: "Creating visual content" },
  { id: "composing", label: "Composing Final Video", description: "Adding subtitles and effects" },
  { id: "error", label: "Error", description: "Processing failed" },
] as const;

export function ProcessingStatus({ stage, progress, currentStep, error }: ProcessingStatusProps) {
  const currentStageIndex = stages.findIndex((s) => s.id === stage);
  const isError = stage === "error";
  const isComplete = stage === "complete";

  const getStageStatus = (index: number) => {
    if (isError && index === currentStageIndex) return "error";
    if (isComplete || index < currentStageIndex) return "complete";
    if (index === currentStageIndex) return "processing";
    return "pending";
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Processing Status</h2>
          {!isError && !isComplete && (
            <span className="text-sm text-muted-foreground" data-testid="text-progress">
              {progress}%
            </span>
          )}
        </div>

        <Progress value={progress} className="h-2" data-testid="progress-bar" />

        <div className="space-y-3">
          {stages.map((stageInfo, index) => {
            const status = getStageStatus(index);
            return (
              <div
                key={stageInfo.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-md transition-colors",
                  status === "processing" && "bg-primary/10",
                  status === "complete" && "bg-chart-3/10"
                )}
                data-testid={`stage-${stageInfo.id}`}
              >
                <div className="mt-0.5">
                  {status === "complete" && (
                    <CheckCircle2 className="h-5 w-5 text-chart-3" />
                  )}
                  {status === "processing" && (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  )}
                  {status === "error" && (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  {status === "pending" && (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className={cn(
                    "font-medium",
                    status === "complete" && "text-chart-3",
                    status === "processing" && "text-primary",
                    status === "error" && "text-destructive",
                    status === "pending" && "text-muted-foreground"
                  )}>
                    {stageInfo.label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {status === "processing" ? currentStep : stageInfo.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="font-medium text-destructive mb-1">Error</div>
            <div className="text-sm text-destructive/90" data-testid="text-error">
              {error}
            </div>
          </div>
        )}

        {isComplete && (
          <div className="p-4 bg-chart-3/10 border border-chart-3/20 rounded-md">
            <div className="font-medium text-chart-3 mb-1">Complete!</div>
            <div className="text-sm text-muted-foreground">
              Your video has been generated successfully and is ready to download.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Download } from "lucide-react";

interface VideoPreviewProps {
  videoUrl?: string;
  isProcessing?: boolean;
  projectId?: string;
  projectTitle?: string;
}

export function VideoPreview({ videoUrl, isProcessing, projectId, projectTitle }: VideoPreviewProps) {
  const handleDownload = () => {
    if (!projectId) return;
    const downloadUrl = `/api/projects/${projectId}/download`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${projectTitle || 'video'}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex-1 flex flex-col p-6 gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Preview</h2>
          {videoUrl && projectId && (
            <Button 
              onClick={handleDownload}
              variant="outline"
              size="sm"
              data-testid="button-download-video"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div 
            className="relative bg-muted/30 rounded-lg overflow-hidden"
            style={{ 
              aspectRatio: "9/16",
              maxHeight: "calc(100vh - 300px)",
              width: "auto"
            }}
          >
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                className="w-full h-full"
                data-testid="video-preview"
              >
                Your browser does not support video playback.
              </video>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
                <div className="rounded-full bg-muted/50 p-6">
                  <Play className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <div className="font-medium text-muted-foreground mb-1">
                    {isProcessing ? "Video Processing" : "No Video Yet"}
                  </div>
                  <div className="text-sm text-muted-foreground max-w-xs">
                    {isProcessing 
                      ? "Your video is being generated. Preview will appear here when ready."
                      : "Enter your script and click Generate Video to create your vertical video content."
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Sparkles, LogOut, FolderOpen, Plus } from "lucide-react";
import { ScriptEditor } from "@/components/script-editor";
import { VideoTypeSelector } from "@/components/video-type-selector";
import { EmotionSliders } from "@/components/emotion-sliders";
import { ProcessingStatus } from "@/components/processing-status";
import { VideoPreview } from "@/components/video-preview";
import { ProjectList } from "@/components/project-list";
import { ThemeToggle } from "@/components/theme-toggle";
import { ApiKeyManager } from "@/components/api-key-manager";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { ProcessingStage, VideoProject, ProcessingStatus as ProcessingStatusType, EmotionSettings } from "@shared/schema";
import { defaultEmotionSettings } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Home() {
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [videoType, setVideoType] = useState<"emotive" | "informative">("emotive");
  const [emotions, setEmotions] = useState<EmotionSettings>(defaultEmotionSettings);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>("analyzing");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [videoUrl, setVideoUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [currentProjectId, setCurrentProjectId] = useState<string>();
  const [showProjectList, setShowProjectList] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string>();
  const { toast } = useToast();
  const { user } = useAuth();
  const pollingIntervalRef = useRef<NodeJS.Timeout>();

  // Poll for processing status
  useEffect(() => {
    if (!currentProjectId || !isProcessing) {
      return;
    }

    const pollStatus = async () => {
      try {
        const status = await fetch(`/api/projects/${currentProjectId}/status`);
        if (status.ok) {
          const data: ProcessingStatusType = await status.json();
          setProcessingStage(data.stage);
          setProgress(data.progress);
          setCurrentStep(data.currentStep);
          
          if (data.error) {
            setError(data.error);
            setIsProcessing(false);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
            }
            toast({
              title: "Error",
              description: data.error,
              variant: "destructive",
            });
          }

          if (data.stage === "complete") {
            setIsProcessing(false);
            setVideoUrl(`/api/projects/${currentProjectId}/video`);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
            }
            toast({
              title: "Success!",
              description: "Your video has been generated successfully.",
            });
          }
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    };

    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(pollStatus, 2000);
    pollStatus(); // Initial poll

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [currentProjectId, isProcessing, toast]);

  const handleGenerate = async () => {
    if (!script.trim() || !title.trim()) {
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(undefined);
    setVideoUrl(undefined);
    setProcessingStage("analyzing");
    
    try {
      // Create project
      const projectRes = await apiRequest("POST", "/api/projects", {
        title,
        script,
        videoType,
        emotions,
      });
      const project: VideoProject = await projectRes.json();

      setCurrentProjectId(project.id);

      // Invalidate projects list query to refresh the sidebar
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });

      // Start generation
      await apiRequest("POST", `/api/projects/${project.id}/generate`, {});

      toast({
        title: "Video Generation Started",
        description: "Your video is being processed. This may take a few minutes.",
      });
    } catch (err) {
      setIsProcessing(false);
      if (err instanceof Error && isUnauthorizedError(err)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      const errorMessage = err instanceof Error ? err.message : "Failed to start video generation";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (currentProjectId) {
      const link = document.createElement("a");
      link.href = `/api/projects/${currentProjectId}/download`;
      link.download = `${title.replace(/\s+/g, "-")}.mp4`;
      link.click();
    }
  };

  const handleSelectProject = (project: VideoProject) => {
    // Load project data into editor
    setTitle(project.title);
    setScript(project.script);
    setVideoType(project.videoType);
    setEmotions(project.emotions || defaultEmotionSettings);
    setCurrentProjectId(project.id);
    
    // Update processing state based on project status
    const isProjectProcessing = project.status === "processing";
    setIsProcessing(isProjectProcessing);
    
    // Set video URL, progress, and error based on status
    if (project.status === "complete") {
      setVideoUrl(`/api/projects/${project.id}/video`);
      setProcessingStage("complete");
      setProgress(100);
      setError(undefined);
    } else if (project.status === "processing") {
      // Resume polling for processing projects
      setVideoUrl(undefined);
      setProcessingStage("analyzing");
      setProgress(0);
      setError(undefined);
    } else if (project.status === "error") {
      setVideoUrl(undefined);
      setProcessingStage("analyzing");
      setProgress(0);
      setError("Previous generation failed. Please try again.");
    } else {
      // draft or other status
      setVideoUrl(undefined);
      setProcessingStage("analyzing");
      setProgress(0);
      setError(undefined);
    }
    
    setShowProjectList(false);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await apiRequest("DELETE", `/api/projects/${projectToDelete}`, {});
      
      // Clear editor if deleted project is currently loaded
      if (currentProjectId === projectToDelete) {
        setTitle("");
        setScript("");
        setVideoType("emotive");
        setEmotions(defaultEmotionSettings);
        setCurrentProjectId(undefined);
        setVideoUrl(undefined);
        setError(undefined);
        setProcessingStage("analyzing");
        setProgress(0);
        setIsProcessing(false);
      }
      
      // Invalidate projects list query
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      toast({
        title: "Project Deleted",
        description: "The project has been removed successfully.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete project";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setProjectToDelete(undefined);
    }
  };

  const handleNewProject = () => {
    setTitle("");
    setScript("");
    setVideoType("emotive");
    setEmotions(defaultEmotionSettings);
    setCurrentProjectId(undefined);
    setVideoUrl(undefined);
    setError(undefined);
    setProcessingStage("analyzing");
    setProgress(0);
    setIsProcessing(false);
    setShowProjectList(false);
  };

  const canGenerate = title.trim() && script.trim().length >= 10;
  const isComplete = processingStage === "complete";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-semibold">AI Video Studio</h1>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback>
                    {user.firstName?.[0]}{user.lastName?.[0] || user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user.firstName || user.email}
                </span>
              </div>
            )}
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-140px)]">
          {/* Project List Sidebar */}
          {showProjectList && (
            <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Projects
                </h2>
                <Button
                  size="sm"
                  onClick={handleNewProject}
                  data-testid="button-new-project"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
              </div>
              <ProjectList
                onSelectProject={handleSelectProject}
                onDeleteProject={handleDeleteProject}
                selectedProjectId={currentProjectId}
              />
            </div>
          )}
          
          {/* Left Panel - Controls */}
          <div className={`${showProjectList ? "lg:col-span-2" : "lg:col-span-2"} flex flex-col gap-6 overflow-y-auto`}>
            {/* Project List Toggle Button */}
            {!showProjectList && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProjectList(true)}
                className="self-start"
                data-testid="button-show-projects"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                My Projects
              </Button>
            )}
            {/* Project Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base">Project Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Awesome Video"
                disabled={isProcessing}
                className="h-11"
                data-testid="input-title"
              />
            </div>

            {/* Video Type Selector */}
            <VideoTypeSelector
              value={videoType}
              onChange={setVideoType}
              disabled={isProcessing}
            />

            {/* Emotion Controls */}
            <EmotionSliders
              emotions={emotions}
              onChange={setEmotions}
              disabled={isProcessing}
            />

            {/* API Key Manager */}
            <ApiKeyManager />

            {/* Script Editor */}
            <div className="flex-1 min-h-[400px]">
              <ScriptEditor
                value={script}
                onChange={setScript}
                disabled={isProcessing}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || isProcessing}
                className="flex-1 h-12 text-base"
                data-testid="button-generate"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                {isProcessing ? "Generating..." : "Generate Video"}
              </Button>
              {videoUrl && (
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="h-12"
                  data-testid="button-download"
                >
                  <Download className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Right Panel - Preview & Status */}
          <div className="lg:col-span-2 flex flex-col gap-6 overflow-y-auto">
            {/* Video Preview */}
            <div className="flex-1 min-h-[500px]">
              <VideoPreview 
                videoUrl={videoUrl} 
                isProcessing={isProcessing}
                projectId={currentProjectId}
                projectTitle={title}
              />
            </div>

            {/* Processing Status */}
            {isProcessing && (
              <ProcessingStatus
                stage={processingStage}
                progress={progress}
                currentStep={currentStep}
                error={error}
              />
            )}
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
              All generated videos and associated files will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              className="bg-destructive text-destructive-foreground hover-elevate"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

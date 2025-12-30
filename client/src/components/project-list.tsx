import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, Trash2, FileVideo, Clock } from "lucide-react";
import type { VideoProject } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface ProjectListProps {
  onSelectProject: (project: VideoProject) => void;
  onDeleteProject: (projectId: string) => void;
  selectedProjectId?: string;
}

export function ProjectList({ onSelectProject, onDeleteProject, selectedProjectId }: ProjectListProps) {
  const { data: projects, isLoading } = useQuery<VideoProject[]>({
    queryKey: ["/api/projects"],
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileVideo className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-center">No projects yet</p>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Create your first video to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => {
        const isSelected = project.id === selectedProjectId;
        const statusBadgeVariant = 
          project.status === "complete" ? "default" : 
          project.status === "error" ? "destructive" : 
          "secondary";

        return (
          <Card 
            key={project.id}
            className={`hover-elevate cursor-pointer transition-all toggle-elevate ${
              isSelected ? "toggle-elevated" : ""
            }`}
            onClick={() => onSelectProject(project)}
            data-testid={`card-project-${project.id}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base flex items-center gap-2 truncate">
                    <Video className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate" data-testid={`text-title-${project.id}`}>{project.title}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3" />
                    <span data-testid={`text-createdAt-${project.id}`}>
                      {project.createdAt ? formatDistanceToNow(new Date(project.createdAt), { addSuffix: true }) : "Recently"}
                    </span>
                  </CardDescription>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(project.id);
                  }}
                  data-testid={`button-delete-${project.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs capitalize" data-testid={`badge-type-${project.id}`}>
                  {project.videoType}
                </Badge>
                <Badge variant={statusBadgeVariant} className="text-xs capitalize" data-testid={`badge-status-${project.id}`}>
                  {project.status}
                </Badge>
              </div>
              {project.script && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2" data-testid={`text-script-${project.id}`}>
                  {project.script}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

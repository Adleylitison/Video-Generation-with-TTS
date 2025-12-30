import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { videoProcessor } from "./services/videoProcessor";
import { insertVideoProjectSchema } from "@shared/schema";
import express from "express";
import fs from "fs";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getVideoStream, deleteVideoFromDrive } from "./services/googleDrive";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Create a new video project (protected)
  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const data = insertVideoProjectSchema.parse(req.body);
      const userId = req.user.claims.sub;
      const project = await storage.createProject(userId, data);
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // Get user's projects (protected)
  app.get("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await storage.getUserProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  // Get a specific project (protected)
  app.get("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      // Verify the project belongs to the user
      if (project.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  // Start video generation (protected)
  app.post("/api/projects/:id/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      // Verify the project belongs to the user
      if (project.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Update project status to processing
      await storage.updateProject(project.id, { status: "processing" });

      // Start processing asynchronously
      videoProcessor.processVideo({
        projectId: project.id,
        title: project.title,
        script: project.script,
        videoType: project.videoType,
        emotions: project.emotions || undefined,
        onProgress: async (status) => {
          // Progress updates are stored in storage and can be polled
          if (status.stage === "complete") {
            const videoPath = await videoProcessor.getVideoPath(project.id);
            await storage.updateProject(project.id, {
              status: "complete",
              videoUrl: videoPath ? `/api/projects/${project.id}/download` : undefined,
            });
          } else if (status.stage === "error") {
            await storage.updateProject(project.id, { status: "error" });
          }
        },
      }).catch((error) => {
        console.error("Video processing error:", error);
      });

      res.json({ message: "Video generation started", projectId: project.id });
    } catch (error) {
      console.error("Error starting video generation:", error);
      res.status(500).json({ error: "Failed to start video generation" });
    }
  });

  // Get processing status (protected)
  app.get("/api/projects/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getProject(req.params.id);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ error: "Status not found" });
      }
      const status = await storage.getProcessingStatus(req.params.id);
      if (!status) {
        return res.status(404).json({ error: "Status not found" });
      }
      res.json(status);
    } catch (error) {
      console.error("Error fetching status:", error);
      res.status(500).json({ error: "Failed to fetch status" });
    }
  });

  // Stream video for preview (protected)
  app.get("/api/projects/:id/video", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      // Verify the project belongs to the user
      if (project.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Accept-Ranges", "bytes");

      // Try Google Drive first, then fallback to local file
      if (project.driveFileId) {
        try {
          const videoStream = await getVideoStream(project.driveFileId);
          videoStream.pipe(res);
          return;
        } catch (driveError) {
          console.warn("Failed to stream from Drive, trying local file:", driveError);
        }
      }
      
      // Fallback to local file
      const localPath = await videoProcessor.getVideoPath(req.params.id);
      if (!localPath) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      const stat = fs.statSync(localPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(localPath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(localPath).pipe(res);
      }
    } catch (error) {
      console.error("Error streaming video:", error);
      res.status(500).json({ error: "Failed to stream video" });
    }
  });

  // Download generated video (protected)
  app.get("/api/projects/:id/download", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      // Verify the project belongs to the user
      if (project.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const fileName = `${project.title.replace(/\s+/g, "-")}.mp4`;
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

      // Try Google Drive first, then fallback to local file
      if (project.driveFileId) {
        try {
          const videoStream = await getVideoStream(project.driveFileId);
          videoStream.pipe(res);
          return;
        } catch (driveError) {
          console.warn("Failed to download from Drive, trying local file:", driveError);
        }
      }
      
      // Fallback to local file
      const localPath = await videoProcessor.getVideoPath(req.params.id);
      if (!localPath) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      fs.createReadStream(localPath).pipe(res);
    } catch (error) {
      console.error("Error downloading video:", error);
      res.status(500).json({ error: "Failed to download video" });
    }
  });

  // Delete a project and its associated files (protected)
  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      // Verify the project belongs to the user
      if (project.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Delete from Google Drive if file exists
      if (project.driveFileId) {
        try {
          await deleteVideoFromDrive(project.driveFileId);
        } catch (error) {
          console.error("Error deleting file from Drive:", error);
          // Continue with project deletion even if Drive deletion fails
        }
      }

      const success = await storage.deleteProject(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Clean up any local temp files
      await videoProcessor.cleanupProject(req.params.id);
      await storage.deleteProcessingStatus(req.params.id);

      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

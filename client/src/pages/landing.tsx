import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, Sparkles, Music, Wand2 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12">
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <Video className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">AI Video Studio</h1>
          </div>
          <Button
            data-testid="button-login"
            onClick={() => window.location.href = "/api/login"}
          >
            Log In
          </Button>
        </header>

        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Transform Scripts into Stunning Videos
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Create professional vertical videos with AI-powered narration, music, and visuals
            in minutes
          </p>
          <Button
            size="lg"
            data-testid="button-get-started"
            onClick={() => window.location.href = "/api/login"}
          >
            Get Started
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="p-6">
            <Wand2 className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Smart Script Analysis</h3>
            <p className="text-sm text-muted-foreground">
              AI analyzes your script to extract themes and emotional beats
            </p>
          </Card>

          <Card className="p-6">
            <Sparkles className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">AI Narration</h3>
            <p className="text-sm text-muted-foreground">
              Professional text-to-speech with natural, emotive voiceovers
            </p>
          </Card>

          <Card className="p-6">
            <Music className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Dynamic Music</h3>
            <p className="text-sm text-muted-foreground">
              AI-generated background music that matches your video's mood
            </p>
          </Card>

          <Card className="p-6">
            <Video className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Background Video</h3>
            <p className="text-sm text-muted-foreground">
              AI-generated visuals synchronized with your content
            </p>
          </Card>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            <h3 className="text-2xl font-bold mb-4">Choose Your Style</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">📖 Emotive/Story Mode</h4>
                <p className="text-sm text-muted-foreground">
                  Synchronized music and visuals for enhanced emotional feedback.
                  Perfect for storytelling and engaging narratives.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">📊 Informative Mode</h4>
                <p className="text-sm text-muted-foreground">
                  Literal content display with simple background music.
                  Ideal for educational content and explanatory videos.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

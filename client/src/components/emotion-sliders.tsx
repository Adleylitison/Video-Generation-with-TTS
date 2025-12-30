import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smile, Frown, Angry, AlertTriangle, Sparkles, Coffee } from "lucide-react";
import type { EmotionSettings } from "@shared/schema";

interface EmotionSlidersProps {
  emotions: EmotionSettings;
  onChange: (emotions: EmotionSettings) => void;
  disabled?: boolean;
}

const emotionConfig = [
  { key: "happy" as const, label: "Happy", icon: Smile, color: "text-yellow-500" },
  { key: "sad" as const, label: "Sad", icon: Frown, color: "text-blue-500" },
  { key: "angry" as const, label: "Angry", icon: Angry, color: "text-red-500" },
  { key: "fearful" as const, label: "Fearful", icon: AlertTriangle, color: "text-purple-500" },
  { key: "surprised" as const, label: "Surprised", icon: Sparkles, color: "text-orange-500" },
  { key: "calm" as const, label: "Calm", icon: Coffee, color: "text-green-500" },
];

export function EmotionSliders({ emotions, onChange, disabled }: EmotionSlidersProps) {
  const handleSliderChange = (key: keyof EmotionSettings, value: number[]) => {
    onChange({
      ...emotions,
      [key]: value[0],
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Voice Emotion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {emotionConfig.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="space-y-2" data-testid={`emotion-slider-${key}`}>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <Icon className={`h-4 w-4 ${color}`} />
                {label}
              </Label>
              <span className="text-xs text-muted-foreground w-8 text-right" data-testid={`emotion-value-${key}`}>
                {emotions[key]}%
              </span>
            </div>
            <Slider
              value={[emotions[key]]}
              onValueChange={(value) => handleSliderChange(key, value)}
              max={100}
              min={0}
              step={5}
              disabled={disabled}
              className="w-full"
              data-testid={`slider-${key}`}
            />
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-4">
          Adjust sliders to control the emotional tone of the voiceover. Higher values mean stronger expression.
        </p>
      </CardContent>
    </Card>
  );
}

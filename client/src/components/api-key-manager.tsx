import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock, Save } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

interface ApiKeyManagerProps {
  onSave?: (keys: { sora: string; gemini: string; pipecat: string; }) => void;
}

export function ApiKeyManager({ onSave }: ApiKeyManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showKeys, setShowKeys] = useState({ sora: false, gemini: false, pipecat: false });
  const [keys, setKeys] = useState({
    sora: localStorage.getItem("sora_api_key") || "",
    gemini: localStorage.getItem("gemini_api_key") || "",
    pipecat: localStorage.getItem("pipecat_api_key") || "",
  });
  const { toast } = useToast();

  const handleSave = () => {
    localStorage.setItem("sora_api_key", keys.sora);
    localStorage.setItem("gemini_api_key", keys.gemini);
    localStorage.setItem("pipecat_api_key", keys.pipecat);
    
    onSave?.(keys);
    
    toast({
      title: "API Keys Saved",
      description: "Your API keys have been securely saved.",
    });
  };

  const toggleVisibility = (key: keyof typeof showKeys) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasAllKeys = keys.sora && keys.gemini && keys.pipecat;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            className="w-full p-6 flex items-center justify-between hover-elevate active-elevate-2"
            data-testid="button-toggle-api-keys"
          >
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">API Configuration</h2>
            </div>
            <div className="flex items-center gap-2">
              {hasAllKeys && (
                <span className="text-sm text-chart-3 font-medium">
                  Configured
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {isOpen ? "Hide" : "Show"}
              </span>
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="px-6 pb-6 space-y-4 border-t border-border pt-6">
            <div className="space-y-2">
              <Label htmlFor="sora-key">Sora 2 API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="sora-key"
                    type={showKeys.sora ? "text" : "password"}
                    value={keys.sora}
                    onChange={(e) => setKeys((prev) => ({ ...prev, sora: e.target.value }))}
                    placeholder="sk-..."
                    className="pr-10"
                    data-testid="input-sora-key"
                  />
                  <button
                    onClick={() => toggleVisibility("sora")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                    type="button"
                    data-testid="button-toggle-sora-key"
                  >
                    {showKeys.sora ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gemini-key">Gemini API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="gemini-key"
                    type={showKeys.gemini ? "text" : "password"}
                    value={keys.gemini}
                    onChange={(e) => setKeys((prev) => ({ ...prev, gemini: e.target.value }))}
                    placeholder="AIza..."
                    className="pr-10"
                    data-testid="input-gemini-key"
                  />
                  <button
                    onClick={() => toggleVisibility("gemini")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                    type="button"
                    data-testid="button-toggle-gemini-key"
                  >
                    {showKeys.gemini ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pipecat-key">Pipecat API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="pipecat-key"
                    type={showKeys.pipecat ? "text" : "password"}
                    value={keys.pipecat}
                    onChange={(e) => setKeys((prev) => ({ ...prev, pipecat: e.target.value }))}
                    placeholder="pk-..."
                    className="pr-10"
                    data-testid="input-pipecat-key"
                  />
                  <button
                    onClick={() => toggleVisibility("pipecat")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                    type="button"
                    data-testid="button-toggle-pipecat-key"
                  >
                    {showKeys.pipecat ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSave}
              className="w-full"
              data-testid="button-save-keys"
            >
              <Save className="h-4 w-4 mr-2" />
              Save API Keys
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

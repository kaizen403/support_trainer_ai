"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, FileText, Trash2, Loader2, CheckCircle, AlertCircle, Settings } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Document {
  id: string;
  filename: string;
  createdAt: string;
  updatedAt: string;
  ingestionStatus?: "processing" | "indexed" | "failed";
  documentType?: string;
}

interface Training {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  mode: string;
  skillTags: string[];
  config?: Record<string, unknown>;
}

interface PersonaSettings {
  temperament: "calm" | "neutral" | "firm" | "aggressive";
  expertise: "beginner" | "intermediate" | "advanced" | "expert";
  complexity: "low" | "medium" | "high" | "extreme";
}

const temperamentOptions = [
  { value: "calm", label: "Calm", description: "Relaxed and easy-going customer" },
  { value: "neutral", label: "Neutral", description: "Balanced, neither friendly nor hostile" },
  { value: "firm", label: "Firm", description: "Assertive but professional" },
  { value: "aggressive", label: "Aggressive", description: "Hostile and demanding" },
];

const expertiseOptions = [
  { value: "beginner", label: "Beginner", description: "Limited product knowledge" },
  { value: "intermediate", label: "Intermediate", description: "Some familiarity with products" },
  { value: "advanced", label: "Advanced", description: "Good technical understanding" },
  { value: "expert", label: "Expert", description: "Deep technical expertise" },
];

const complexityOptions = [
  { value: "low", label: "Low", description: "Simple, straightforward scenarios" },
  { value: "medium", label: "Medium", description: "Moderate challenge level" },
  { value: "high", label: "High", description: "Complex multi-step scenarios" },
  { value: "extreme", label: "Extreme", description: "Maximum difficulty with edge cases" },
];

export default function ScenarioConfigurationPage() {
  const { data: session } = useSession();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [personaSettings, setPersonaSettings] = useState<PersonaSettings>({
    temperament: "firm",
    expertise: "advanced",
    complexity: "high",
  });

  useEffect(() => {
    fetchTrainings();
  }, []);

  useEffect(() => {
    if (selectedTraining) {
      fetchDocuments(selectedTraining.id);
      if (selectedTraining.config?.persona) {
        setPersonaSettings(selectedTraining.config.persona as PersonaSettings);
      }
    }
  }, [selectedTraining]);

  const fetchTrainings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/trainings`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setTrainings(data);
        if (data.length > 0 && !selectedTraining) {
          setSelectedTraining(data[0]);
        }
      }
    } catch {
      toast.error("Failed to fetch trainings");
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (trainingId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/documents/${trainingId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch {
      toast.error("Failed to fetch documents");
    }
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTraining) return;

    const allowedTypes = [
      "text/plain",
      "text/markdown",
      "text/x-markdown",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    
    const allowedExtensions = [".txt", ".md", ".pdf", ".docx"];
    const fileExtension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast.error("Only .txt, .md, .pdf, and .docx files are supported");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(`${API_URL}/api/documents/${selectedTraining.id}/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const result = await response.json();
        toast.success(`Uploaded ${result.filename} successfully`);
        fetchDocuments(selectedTraining.id);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to upload document");
      }
    } catch {
      toast.error("Failed to upload document");
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
      e.target.value = "";
    }
  }, [selectedTraining]);

  const handleDeleteDocument = async (documentId: string) => {
    if (!selectedTraining) return;

    try {
      const response = await fetch(
        `${API_URL}/api/documents/${selectedTraining.id}/${documentId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        toast.success("Document deleted successfully");
        fetchDocuments(selectedTraining.id);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete document");
      }
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedTraining) return;

    setSavingSettings(true);
    try {
      const response = await fetch(`${API_URL}/api/trainings/${selectedTraining.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: selectedTraining.name,
          description: selectedTraining.description,
          systemPrompt: selectedTraining.systemPrompt,
          config: {
            ...selectedTraining.config,
            persona: personaSettings,
          },
        }),
      });

      if (response.ok) {
        toast.success("Scenario settings saved successfully");
        setIsSettingsOpen(false);
        fetchTrainings();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "indexed":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="mr-1 h-3 w-3" />
            Indexed
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scenario Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Upload training materials and tune persona intensity for your call center scenarios.
          </p>
        </div>
        {trainings.length > 0 && (
          <Select
            value={selectedTraining?.id}
            onValueChange={(value) => {
              const training = trainings.find((t) => t.id === value);
              if (training) setSelectedTraining(training);
            }}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a training scenario" />
            </SelectTrigger>
            <SelectContent>
              {trainings.map((training) => (
                <SelectItem key={training.id} value={training.id}>
                  {training.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {trainings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No training scenarios available. Create a training first.
            </p>
            <Button asChild>
              <a href="/trainings">Go to Trainings</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Training Materials</CardTitle>
                <CardDescription>Product docs, scripts, and objection guides.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".txt,.md,.pdf,.docx"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center gap-2 cursor-pointer"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Drop PDF, TXT, DOCX, or MD files here
                    </span>
                    <span className="text-xs text-muted-foreground">
                      or click to browse
                    </span>
                  </label>
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Uploaded Documents</h4>
                  {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No documents uploaded yet.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate">{doc.filename}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {getStatusBadge(doc.ingestionStatus)}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Persona Adjustments</CardTitle>
                <CardDescription>Balance temperament, expertise, and scenario complexity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Customer Temperament</span>
                      <p className="text-xs text-muted-foreground">
                        {temperamentOptions.find((o) => o.value === personaSettings.temperament)?.description}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {temperamentOptions.find((o) => o.value === personaSettings.temperament)?.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Technical Expertise</span>
                      <p className="text-xs text-muted-foreground">
                        {expertiseOptions.find((o) => o.value === personaSettings.expertise)?.description}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {expertiseOptions.find((o) => o.value === personaSettings.expertise)?.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Scenario Complexity</span>
                      <p className="text-xs text-muted-foreground">
                        {complexityOptions.find((o) => o.value === personaSettings.complexity)?.description}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {complexityOptions.find((o) => o.value === personaSettings.complexity)?.label}
                    </Badge>
                  </div>
                </div>

                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Settings className="mr-2 h-4 w-4" />
                      Adjust Settings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Persona Settings</DialogTitle>
                      <DialogDescription>
                        Configure the AI customer persona for this training scenario.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="temperament">Customer Temperament</Label>
                        <Select
                          value={personaSettings.temperament}
                          onValueChange={(value) =>
                            setPersonaSettings((prev) => ({ ...prev, temperament: value as PersonaSettings["temperament"] }))
                          }
                        >
                          <SelectTrigger id="temperament">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {temperamentOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label} - {option.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="expertise">Technical Expertise</Label>
                        <Select
                          value={personaSettings.expertise}
                          onValueChange={(value) =>
                            setPersonaSettings((prev) => ({ ...prev, expertise: value as PersonaSettings["expertise"] }))
                          }
                        >
                          <SelectTrigger id="expertise">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {expertiseOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label} - {option.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="complexity">Scenario Complexity</Label>
                        <Select
                          value={personaSettings.complexity}
                          onValueChange={(value) =>
                            setPersonaSettings((prev) => ({ ...prev, complexity: value as PersonaSettings["complexity"] }))
                          }
                        >
                          <SelectTrigger id="complexity">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {complexityOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label} - {option.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveSettings} disabled={savingSettings}>
                        {savingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Settings
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Content Alignment</CardTitle>
              <CardDescription>Ensure training scenarios match uploaded materials.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4">
                    <div className="text-2xl font-bold">{documents.length}</div>
                    <div className="text-sm text-muted-foreground">Documents</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-2xl font-bold">
                      {documents.filter((d) => d.ingestionStatus === "indexed").length}
                    </div>
                    <div className="text-sm text-muted-foreground">Indexed</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-2xl font-bold">
                      {documents.filter((d) => d.ingestionStatus === "processing").length}
                    </div>
                    <div className="text-sm text-muted-foreground">Processing</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Documents are automatically processed and indexed for use in training scenarios.
                  Indexed documents are immediately available for AI retrieval during sessions.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

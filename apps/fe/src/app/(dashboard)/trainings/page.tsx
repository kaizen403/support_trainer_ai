"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Eye } from "lucide-react";
import Link from "next/link";

interface Training {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  createdAt: string;
  updatedAt: string;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  personaPreset: 'RUDE' | 'CHILL' | 'UNEXPECTED' | 'NEUTRAL' | 'DEMANDING';
  temperament: string;
  expertise: string;
  complexity: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

interface TrainingFormData {
  name: string;
  description: string;
  systemPrompt: string;
  scenarioId?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function TrainingsPage() {
  const { data: session } = useSession();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [scenariosLoading, setScenariosLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [formData, setFormData] = useState<TrainingFormData>({
    name: "",
    description: "",
    systemPrompt: "",
    scenarioId: undefined,
  });

  const role = session && "member" in session
    ? (session.member as { role?: string } | undefined)?.role
    : undefined;
  const isAdmin = role === "admin" || role === "owner";

  const fetchTrainings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/trainings`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setTrainings(data);
      }
    } catch {
      toast.error("Failed to fetch trainings");
    } finally {
      setLoading(false);
    }
  };

  const fetchScenarios = async () => {
    setScenariosLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/scenarios`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setScenarios(data);
      }
    } catch {
      toast.error("Failed to fetch scenarios");
    } finally {
      setScenariosLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainings();
  }, []);

  useEffect(() => {
    if (isCreateOpen) {
      fetchScenarios();
    }
  }, [isCreateOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/trainings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Training created successfully");
        setIsCreateOpen(false);
        setFormData({ name: "", description: "", systemPrompt: "", scenarioId: undefined });
        fetchTrainings();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create training");
      }
    } catch {
      toast.error("Failed to create training");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTraining) return;
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/trainings/${selectedTraining.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Training updated successfully");
        setIsEditOpen(false);
        setSelectedTraining(null);
        setFormData({ name: "", description: "", systemPrompt: "" });
        fetchTrainings();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update training");
      }
    } catch {
      toast.error("Failed to update training");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTraining) return;
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/trainings/${selectedTraining.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Training deleted successfully");
        setIsDeleteOpen(false);
        setSelectedTraining(null);
        fetchTrainings();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete training");
      }
    } catch {
      toast.error("Failed to delete training");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (training: Training) => {
    setSelectedTraining(training);
    setFormData({
      name: training.name,
      description: training.description,
      systemPrompt: training.systemPrompt,
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (training: Training) => {
    setSelectedTraining(training);
    setIsDeleteOpen(true);
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
          <h3 className="text-lg font-medium">Training Scenarios</h3>
          <p className="text-sm text-muted-foreground">
            Manage AI-powered training scenarios for your team.
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Training
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create Training</DialogTitle>
                <DialogDescription>
                  Create a new training scenario for your team.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Objection Handling"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what this training covers..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="systemPrompt">AI System Prompt</Label>
                    <Textarea
                      id="systemPrompt"
                      placeholder="You are a customer who..."
                      className="min-h-[150px]"
                      value={formData.systemPrompt}
                      onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="scenario">Scenario (Optional)</Label>
                    {scenariosLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading scenarios...
                      </div>
                    ) : scenarios.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No scenarios available. Create scenarios in Scenario Configuration.
                      </p>
                    ) : (
                      <Select
                        value={formData.scenarioId || "none"}
                        onValueChange={(value) =>
                          setFormData({ ...formData, scenarioId: value === "none" ? undefined : value })
                        }
                      >
                        <SelectTrigger id="scenario">
                          <SelectValue placeholder="Select a scenario (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {scenarios.map((scenario) => (
                            <SelectItem key={scenario.id} value={scenario.id}>
                              {scenario.name} ({scenario.personaPreset.toLowerCase()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Training
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Trainings</CardTitle>
          <CardDescription>
            {trainings.length === 0
              ? "No trainings yet. Create your first training scenario."
              : `${trainings.length} training scenario${trainings.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trainings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground mb-4">
                No training scenarios have been created yet.
              </p>
              {isAdmin && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Training
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainings.map((training) => (
                  <TableRow key={training.id}>
                    <TableCell className="font-medium">
                      <Link href={`/trainings/${training.id}`} className="hover:underline">
                        {training.name}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {training.description}
                    </TableCell>
                    <TableCell>
                      {new Date(training.createdAt).toLocaleDateString()}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Link href={`/trainings/${training.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(training)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(training)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Training</DialogTitle>
            <DialogDescription>
              Update the training scenario details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-systemPrompt">AI System Prompt</Label>
                <Textarea
                  id="edit-systemPrompt"
                  className="min-h-[150px]"
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Training</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedTraining?.name}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface Scenario {
  id: string;
  name: string;
  description: string;
  personaPreset: "RUDE" | "CHILL" | "UNEXPECTED" | "NEUTRAL" | "DEMANDING";
  temperament: string;
  expertise: string;
  complexity: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

interface ScenarioFormData {
  name: string;
  description: string;
  personaPreset: "RUDE" | "CHILL" | "UNEXPECTED" | "NEUTRAL" | "DEMANDING";
  temperament: string;
  expertise: string;
  complexity: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const personaPresetOptions = [
  { value: "RUDE", label: "Rude", color: "red", description: "Hostile, impatient, aggressive customer" },
  { value: "CHILL", label: "Chill", color: "green", description: "Relaxed, easy-going, cooperative" },
  { value: "UNEXPECTED", label: "Unexpected", color: "purple", description: "Unpredictable, changes topics suddenly" },
  { value: "NEUTRAL", label: "Neutral", color: "blue", description: "Balanced, professional, straightforward" },
  { value: "DEMANDING", label: "Demanding", color: "orange", description: "High expectations, wants immediate solutions" },
];

const getPersonaPresetColor = (preset: string) => {
  switch (preset) {
    case "RUDE":
      return "bg-red-500 hover:bg-red-600";
    case "CHILL":
      return "bg-green-500 hover:bg-green-600";
    case "UNEXPECTED":
      return "bg-purple-500 hover:bg-purple-600";
    case "NEUTRAL":
      return "bg-blue-500 hover:bg-blue-600";
    case "DEMANDING":
      return "bg-orange-500 hover:bg-orange-600";
    default:
      return "bg-gray-500 hover:bg-gray-600";
  }
};

export default function ScenarioManagementPage() {
  const { data: session } = useSession();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [formData, setFormData] = useState<ScenarioFormData>({
    name: "",
    description: "",
    personaPreset: "NEUTRAL",
    temperament: "",
    expertise: "",
    complexity: "",
  });

  const role = session && "member" in session
    ? (session.member as { role?: string } | undefined)?.role
    : undefined;
  const isAdmin = role === "admin" || role === "owner";

  const fetchScenarios = async () => {
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/scenarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Scenario created successfully");
        setIsCreateOpen(false);
        setFormData({
          name: "",
          description: "",
          personaPreset: "NEUTRAL",
          temperament: "",
          expertise: "",
          complexity: "",
        });
        fetchScenarios();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create scenario");
      }
    } catch {
      toast.error("Failed to create scenario");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScenario) return;
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/scenarios/${selectedScenario.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Scenario updated successfully");
        setIsEditOpen(false);
        setSelectedScenario(null);
        setFormData({
          name: "",
          description: "",
          personaPreset: "NEUTRAL",
          temperament: "",
          expertise: "",
          complexity: "",
        });
        fetchScenarios();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update scenario");
      }
    } catch {
      toast.error("Failed to update scenario");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedScenario) return;
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/scenarios/${selectedScenario.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Scenario deleted successfully");
        setIsDeleteOpen(false);
        setSelectedScenario(null);
        fetchScenarios();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete scenario");
      }
    } catch {
      toast.error("Failed to delete scenario");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setFormData({
      name: scenario.name,
      description: scenario.description,
      personaPreset: scenario.personaPreset,
      temperament: scenario.temperament,
      expertise: scenario.expertise,
      complexity: scenario.complexity,
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (scenario: Scenario) => {
    setSelectedScenario(scenario);
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
          <h1 className="text-2xl font-bold">Scenario Management</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage reusable customer persona scenarios for training.
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Scenario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create Scenario</DialogTitle>
                <DialogDescription>
                  Create a new reusable customer persona scenario.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Aggressive Customer"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe this customer persona scenario..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="personaPreset">Persona Preset *</Label>
                    <Select
                      value={formData.personaPreset}
                      onValueChange={(value) =>
                        setFormData({ ...formData, personaPreset: value as ScenarioFormData["personaPreset"] })
                      }
                    >
                      <SelectTrigger id="personaPreset">
                        <SelectValue placeholder="Select a persona preset" />
                      </SelectTrigger>
                      <SelectContent>
                        {personaPresetOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label} - {option.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="temperament">Temperament *</Label>
                    <Input
                      id="temperament"
                      placeholder="e.g., Hostile and impatient"
                      value={formData.temperament}
                      onChange={(e) => setFormData({ ...formData, temperament: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expertise">Expertise *</Label>
                    <Input
                      id="expertise"
                      placeholder="e.g., High technical knowledge"
                      value={formData.expertise}
                      onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="complexity">Complexity *</Label>
                    <Input
                      id="complexity"
                      placeholder="e.g., Multi-step problem solving"
                      value={formData.complexity}
                      onChange={(e) => setFormData({ ...formData, complexity: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Scenario
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Scenarios</CardTitle>
          <CardDescription>
            {scenarios.length === 0
              ? "No scenarios yet. Create your first scenario."
              : `${scenarios.length} scenario${scenarios.length === 1 ? "" : "s"} available`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scenarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground mb-4">
                No scenarios have been created yet.
              </p>
              {isAdmin && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Scenario
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Persona Preset</TableHead>
                  <TableHead>Created</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarios.map((scenario) => (
                  <TableRow key={scenario.id}>
                    <TableCell className="font-medium">{scenario.name}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {scenario.description}
                    </TableCell>
                    <TableCell>
                      <Badge className={getPersonaPresetColor(scenario.personaPreset)}>
                        {personaPresetOptions.find((o) => o.value === scenario.personaPreset)?.label || scenario.personaPreset}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(scenario.createdAt).toLocaleDateString()}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(scenario)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(scenario)}
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
            <DialogTitle>Edit Scenario</DialogTitle>
            <DialogDescription>
              Update the scenario details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-personaPreset">Persona Preset *</Label>
                <Select
                  value={formData.personaPreset}
                  onValueChange={(value) =>
                    setFormData({ ...formData, personaPreset: value as ScenarioFormData["personaPreset"] })
                  }
                >
                  <SelectTrigger id="edit-personaPreset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {personaPresetOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} - {option.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-temperament">Temperament *</Label>
                <Input
                  id="edit-temperament"
                  value={formData.temperament}
                  onChange={(e) => setFormData({ ...formData, temperament: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-expertise">Expertise *</Label>
                <Input
                  id="edit-expertise"
                  value={formData.expertise}
                  onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-complexity">Complexity *</Label>
                <Input
                  id="edit-complexity"
                  value={formData.complexity}
                  onChange={(e) => setFormData({ ...formData, complexity: e.target.value })}
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
            <DialogTitle>Delete Scenario</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedScenario?.name}&quot;? This action
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

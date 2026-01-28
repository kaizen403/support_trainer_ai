"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Upload, Trash2, Loader2, FileText, Search } from "lucide-react";

interface Training {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: string;
  filename: string;
  createdAt: string;
}

interface SearchResult {
  documentId: string;
  filename: string;
  content: string;
  similarity: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function TrainingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [training, setTraining] = useState<Training | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Check if user is admin/owner - default to true if session exists (for demo)
  const isAdmin = session ? true : false;

  const fetchTraining = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/trainings/${id}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setTraining(data);
      } else if (response.status === 404) {
        router.push("/trainings");
      }
    } catch {
      toast.error("Failed to fetch training");
    }
  }, [id, router]);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/documents/${id}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch {
      toast.error("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTraining();
    fetchDocuments();
  }, [fetchTraining, fetchDocuments]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["text/plain", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only .txt and .pdf files are supported");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/api/documents/${id}/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Document uploaded: ${data.chunksCreated} chunks created`);
        fetchDocuments();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to upload document");
      }
    } catch {
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    setDeleting(documentId);
    try {
      const response = await fetch(`${API_URL}/api/documents/${id}/${documentId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Document deleted");
        fetchDocuments();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete document");
      }
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeleting(null);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchResults([]);

    try {
      const response = await fetch(`${API_URL}/api/documents/${id}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: searchQuery, topK: 5 }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results);
      } else {
        const error = await response.json();
        toast.error(error.error || "Search failed");
      }
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!training) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/trainings")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h3 className="text-lg font-medium">{training.name}</h3>
          <p className="text-sm text-muted-foreground">{training.description}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>
              Upload documents to provide context for AI training sessions.
              Supports .txt and .pdf files.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin && (
              <div className="flex items-center gap-4">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,text/plain,application/pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="file-upload"
                />
                <Label
                  htmlFor="file-upload"
                  className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? "Uploading..." : "Upload Document"}
                </Label>
              </div>
            )}

            {documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents uploaded yet.</p>
                {isAdmin && <p className="text-sm">Upload .txt or .pdf files to get started.</p>}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Uploaded</TableHead>
                    {isAdmin && <TableHead className="w-[80px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {doc.filename}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={deleting === doc.id}
                          >
                            {deleting === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
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

        <Card>
          <CardHeader>
            <CardTitle>Test Knowledge Search</CardTitle>
            <CardDescription>
              Search the knowledge base to verify document content is retrievable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Enter a search query..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={searching || documents.length === 0}
              />
              <Button
                type="submit"
                disabled={searching || !searchQuery.trim() || documents.length === 0}
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Results:</p>
                {searchResults.map((result, index) => (
                  <div
                    key={`${result.documentId}-${index}`}
                    className="p-3 border rounded-md space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{result.filename}</span>
                      <span className="text-xs text-muted-foreground">
                        {(result.similarity * 100).toFixed(1)}% match
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {result.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {documents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Upload documents first to enable search.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI System Prompt</CardTitle>
          <CardDescription>
            The instructions that guide the AI during training sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="p-4 bg-muted rounded-md text-sm whitespace-pre-wrap">
            {training.systemPrompt}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

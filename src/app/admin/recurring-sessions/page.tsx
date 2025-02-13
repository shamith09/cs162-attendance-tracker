"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Home, Plus, Users, Trash2 } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface RecurringSession {
  id: string;
  name: string;
  created_at: string;
  student_count: number;
}

export default function RecurringSessions() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<RecurringSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<RecurringSession | null>(null);
  const [newSessionName, setNewSessionName] = useState("");
  const [studentNames, setStudentNames] = useState("");
  const [startSessionName, setStartSessionName] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] =
    useState<RecurringSession | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.isAdmin) {
      router.push("/");
      return;
    }

    const fetchSessions = async () => {
      try {
        const res = await fetch("/api/recurring-sessions");
        if (!res.ok) throw new Error("Failed to fetch sessions");
        const data = await res.json();
        setSessions(data.sessions);
      } catch (error) {
        console.error("Error fetching sessions:", error);
        toast.error("Failed to fetch recurring sessions");
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [session, status, router]);

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;

    try {
      const res = await fetch("/api/recurring-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSessionName,
          studentLines: studentNames
            .split(/[,\n]/)
            .map((line) => line.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create session");
      }

      const newSession = await res.json();
      setSessions((prev) => [newSession, ...prev]);
      setNewSessionName("");
      setStudentNames("");
      setIsCreateDialogOpen(false);
      toast.success("Recurring session created successfully");
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create session",
      );
    }
  };

  const handleStartSession = async () => {
    if (!selectedSession || !startSessionName.trim()) return;

    try {
      const res = await fetch(
        `/api/recurring-sessions/${selectedSession.id}/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: startSessionName,
            expirationSeconds: 300,
          }),
        },
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to start session");
      }

      const newSession = await res.json();
      setStartSessionName("");
      setIsStartDialogOpen(false);
      setSelectedSession(null);
      router.push(`/admin/sessions/${newSession.id}`);
    } catch (error) {
      console.error("Error starting session:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start session",
      );
    }
  };

  const handleDelete = async (session: RecurringSession) => {
    try {
      const res = await fetch(`/api/recurring-sessions/${session.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete session");
      setSessions(sessions.filter((s) => s.id !== session.id));
      toast.success("Session deleted successfully");
      setDeleteConfirmation(null);
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                <Home className="h-4 w-4" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">Admin Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Recurring Sessions</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex justify-between items-center mb-8 mt-4">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="CS 162 Logo" width={40} height={40} />
            <h1 className="text-2xl font-bold text-foreground">
              Recurring Sessions
            </h1>
          </div>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Recurring Session</DialogTitle>
                <DialogDescription>
                  Create a new recurring session and add students to its roster.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Session Name</Label>
                  <Input
                    id="name"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="e.g., [TA Name] Discussion"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="students">
                    Student Names and Emails (paste from spreadsheet, with names
                    in first column and emails in second)
                  </Label>
                  <div className="text-sm text-muted-foreground mb-2">
                    Accepts tab-separated or comma-separated values. Each line
                    should contain a name and email.
                  </div>
                  <Textarea
                    id="students"
                    value={studentNames}
                    onChange={(e) => setStudentNames(e.target.value)}
                    placeholder="John Doe&#9;john@berkeley.edu..."
                    rows={10}
                  />
                </div>
                <Button onClick={handleCreateSession} className="w-full">
                  Create Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Available Sessions</CardTitle>
              <span className="text-sm text-muted-foreground">
                Total: {sessions.length}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      {new Date(s.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{s.student_count}</TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSession(s);
                          setStartSessionName(s.name);
                          setIsStartDialogOpen(true);
                        }}
                      >
                        Start Session
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/admin/recurring-sessions/${s.id}`)
                        }
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteConfirmation(s)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {sessions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground"
                    >
                      No recurring sessions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Session</DialogTitle>
              <DialogDescription>
                Start a new session using this recurring session as a template.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sessionName">Session Name</Label>
                <Input
                  id="sessionName"
                  value={startSessionName}
                  onChange={(e) => setStartSessionName(e.target.value)}
                  placeholder="Enter session name"
                />
              </div>
              <Button onClick={handleStartSession} className="w-full">
                Start Session
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!deleteConfirmation}
          onOpenChange={() => setDeleteConfirmation(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Recurring Session</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &ldquo;
                {deleteConfirmation?.name}&rdquo;? This will remove the roster
                but keep all past sessions.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmation(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  deleteConfirmation && handleDelete(deleteConfirmation)
                }
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

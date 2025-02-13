"use client";

import { useEffect, useState, use } from "react";
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home, Search, Save, Eye, Trash2, Plus, Pencil, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RecurringSession {
  id: string;
  name: string;
  created_at: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  added_at: string;
}

interface Session {
  id: string;
  name: string;
  created_at: string;
  ended_at: string | null;
  creator_name: string;
  creator_email: string;
}

export default function RecurringSessionDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessionData, setSessionData] = useState<RecurringSession | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [rosterText, setRosterText] = useState("");
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    ids: string[];
  } | null>(null);
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [startSessionName, setStartSessionName] = useState("");
  const [expirationValue, setExpirationValue] = useState(1);
  const [expirationUnit, setExpirationUnit] = useState<
    "seconds" | "minutes" | "hours"
  >("seconds");
  const [renameSession, setRenameSession] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.isAdmin) {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      try {
        const [sessionRes, rosterRes, sessionsRes] = await Promise.all([
          fetch(`/api/recurring-sessions/${id}`),
          fetch(`/api/recurring-sessions/${id}/roster`),
          fetch(`/api/sessions?recurringSessionId=${id}`),
        ]);

        if (!sessionRes.ok || !rosterRes.ok || !sessionsRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const [sessionData, rosterData, sessionsData] = await Promise.all([
          sessionRes.json(),
          rosterRes.json(),
          sessionsRes.json(),
        ]);

        setSessionData(sessionData);
        setStudents(rosterData.students);
        setSessions(sessionsData.sessions || []);
        setRosterText(
          rosterData.students
            .map((s: Student) => `${s.name}\t${s.email || ""}`)
            .join("\n"),
        );
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, session, status, router]);

  const handleUpdateRoster = async () => {
    try {
      const res = await fetch(`/api/recurring-sessions/${id}/roster`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNames: rosterText
            .split(/[,\n]/)
            .map((name) => name.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update roster");
      }

      const { students: newStudents } = await res.json();
      setStudents(newStudents);
      setEditMode(false);
      toast.success("Roster updated successfully");
    } catch (error) {
      console.error("Error updating roster:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update roster",
      );
    }
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedSessions(sessions.map((s) => s.id));
    } else {
      setSelectedSessions([]);
    }
  };

  const handleSelectOne = (
    sessionId: string,
    checked: boolean | "indeterminate",
  ) => {
    if (checked) {
      setSelectedSessions([...selectedSessions, sessionId]);
    } else {
      setSelectedSessions(selectedSessions.filter((id) => id !== sessionId));
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmation({ ids: [sessionId] });
  };

  const deleteSelected = () => {
    setDeleteConfirmation({ ids: Array.from(selectedSessions) });
  };

  const handleDelete = async () => {
    if (!deleteConfirmation) return;
    try {
      await Promise.all(
        deleteConfirmation.ids.map((id) =>
          fetch(`/api/sessions/${id}`, { method: "DELETE" }),
        ),
      );
      setSessions((sessions) =>
        sessions.filter((s) => !deleteConfirmation.ids.includes(s.id)),
      );
      setSelectedSessions([]);
      setDeleteConfirmation(null);
    } catch (error) {
      console.error("Error deleting sessions:", error);
    }
  };

  const handleStartSession = async () => {
    try {
      const res = await fetch(`/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: startSessionName,
          recurringSessionId: id,
          expirationValue: expirationValue,
          expirationUnit: expirationUnit,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to start session");
      }

      const sessionData = await res.json();
      setSessions((sessions) => [...sessions, sessionData]);
      setIsStartDialogOpen(false);
      setStartSessionName("");
      setExpirationValue(1);
      setExpirationUnit("seconds");
      toast.success("Session started successfully");
    } catch (error) {
      console.error("Error starting session:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start session",
      );
    }
  };

  const handleRename = async () => {
    if (!renameSession) return;
    try {
      const res = await fetch(`/api/sessions/${renameSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameSession.name }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to rename session");
      }

      const updatedSession = await res.json();
      setSessions((sessions) =>
        sessions.map((s) => (s.id === renameSession.id ? updatedSession : s)),
      );
      setRenameSession(null);
      toast.success("Session renamed successfully");
    } catch (error) {
      console.error("Error renaming session:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to rename session",
      );
    }
  };

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <LoadingSpinner />
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Session not found</h1>
          <Button onClick={() => router.push("/admin/recurring-sessions")}>
            Back to Recurring Sessions
          </Button>
        </div>
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
              <BreadcrumbLink href="/admin/recurring-sessions">
                Recurring Sessions
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Recurring Session Details</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex justify-between items-center mb-8 mt-4">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="CS 162 Logo" width={40} height={40} />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {sessionData.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Created {new Date(sessionData.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsStartDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Start Session
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/admin/recurring-sessions")}
            >
              Back
            </Button>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Student Roster</CardTitle>
              <div className="flex items-center gap-4">
                <Button
                  variant={editMode ? "default" : "outline"}
                  onClick={() => setEditMode(!editMode)}
                >
                  {editMode ? (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </>
                  )}
                </Button>
                {!editMode && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Total Students: {students.length}
                    </span>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roster">
                    Student Names and Emails (paste from spreadsheet, with names
                    in first column and emails in second)
                  </Label>
                  <div className="text-sm text-muted-foreground mb-2">
                    Accepts tab-separated or comma-separated values. Each line
                    should contain a name and email.
                  </div>
                  <Textarea
                    id="roster"
                    value={rosterText}
                    onChange={(e) => setRosterText(e.target.value)}
                    placeholder="John Doe&#9;john@berkeley.edu..."
                    rows={20}
                  />
                </div>
                <Button onClick={handleUpdateRoster} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Roster
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        {new Date(student.added_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredStudents.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-muted-foreground"
                      >
                        No students found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Session History</CardTitle>
            <div className="w-[140px] flex justify-end">
              {selectedSessions.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteSelected}
                >
                  Delete Selected ({selectedSessions.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]">
                    <Checkbox
                      checked={selectedSessions.length === sessions.length}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedSessions.includes(s.id)}
                        onCheckedChange={(checked) =>
                          handleSelectOne(s.id, checked)
                        }
                        aria-label={`Select ${s.name}`}
                      />
                    </TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.creator_name || s.creator_email}</TableCell>
                    <TableCell>
                      {new Date(s.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {s.ended_at ? (
                        <Badge variant="destructive">Ended</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => router.push(`/admin/sessions/${s.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            setRenameSession({ id: s.id, name: s.name })
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={(e) => deleteSession(s.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sessions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      No sessions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog
          open={!!deleteConfirmation}
          onOpenChange={() => setDeleteConfirmation(null)}
        >
          <DialogContent className="bg-background border">
            <DialogHeader>
              <DialogTitle>
                Delete{" "}
                {deleteConfirmation?.ids.length === 1 ? "Session" : "Sessions"}
              </DialogTitle>
              <DialogDescription className="space-y-2">
                Are you sure you want to delete{" "}
                {deleteConfirmation?.ids.length === 1
                  ? "this session"
                  : `${deleteConfirmation?.ids.length} sessions`}
                ?
                <span className="block text-destructive font-semibold mt-4">
                  This action is irreversible and will delete all associated
                  attendance records.
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmation(null)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                <Label>Session Name</Label>
                <Input
                  value={startSessionName}
                  onChange={(e) => setStartSessionName(e.target.value)}
                  placeholder="Enter session name"
                />
              </div>
              <div className="space-y-2">
                <Label>Code Expiration</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={expirationValue}
                    onChange={(e) =>
                      setExpirationValue(
                        Math.max(1, parseInt(e.target.value) || 1),
                      )
                    }
                    className="w-20"
                  />
                  <Select
                    value={expirationUnit}
                    onValueChange={(value) =>
                      setExpirationUnit(
                        value as "seconds" | "minutes" | "hours",
                      )
                    }
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seconds">seconds</SelectItem>
                      <SelectItem value="minutes">minutes</SelectItem>
                      <SelectItem value="hours">hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleStartSession} className="w-full">
                Start Session
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!renameSession}
          onOpenChange={() => setRenameSession(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Session</DialogTitle>
              <DialogDescription>
                Enter a new name for this session.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Session Name</Label>
                <Input
                  value={renameSession?.name || ""}
                  onChange={(e) =>
                    setRenameSession((prev) =>
                      prev ? { ...prev, name: e.target.value } : null,
                    )
                  }
                  placeholder="Enter session name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameSession(null)}>
                Cancel
              </Button>
              <Button onClick={handleRename}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

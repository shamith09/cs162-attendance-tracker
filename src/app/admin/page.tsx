"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { TestQrCode } from "@/components/TestQrCode";
import { AttendanceTable } from "@/components/AttendanceTable";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Home,
  Trash2,
  X,
  Eye,
  StopCircle,
  Check,
  History,
  Pencil,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import "react-circular-progressbar/dist/styles.css";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AdminManagement } from "@/components/AdminManagement";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { DynamicQRCode } from "@/components/DynamicQRCode";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/hooks/use-toast";
import { CircularTimer } from "@/components/CircularTimer";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Session {
  id: string;
  name: string;
  created_at: string;
  ended_at: string | null;
  expiration_seconds: number;
  creator_name: string;
  creator_email: string;
}

interface Attendance {
  user_name: string;
  user_email: string;
  timestamp: string;
}

interface Analytics {
  totalSessions: number;
  totalStudents: number;
  averageAttendance: number;
  attendanceOverTime: { name: string; attendance: number }[];
}

interface RecurringSession {
  id: string;
  name: string;
  created_at: string;
  student_count: number;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [expirationValue, setExpirationValue] = useState(10);
  const [expirationUnit, setExpirationUnit] = useState<
    "seconds" | "minutes" | "hours"
  >("seconds");
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [attendees, setAttendees] = useState<Attendance[]>([]);
  const [qrCode, setQrCode] = useState("");
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [renameSession, setRenameSession] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    ids: string[];
  } | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [showMySessionsOnly, setShowMySessionsOnly] = useState(false);
  const [isMarkingManual, setIsMarkingManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [selectedRecurringSession, setSelectedRecurringSession] =
    useState<RecurringSession | null>(null);
  const [recurringSessions, setRecurringSessions] = useState<
    RecurringSession[]
  >([]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.isAdmin) {
      router.push("/");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (currentSession) {
      // Fetch QR code
      const fetchCode = async () => {
        try {
          const codeRes = await fetch(
            "/api/code?sessionId=" + currentSession.id,
          );
          if (codeRes.ok) {
            const codeData = await codeRes.json();
            const url = `${window.location.origin}/mark/${codeData.code}`;
            setQrCode(url);
            setCodeExpiry(new Date(codeData.expiresAt));
          }
        } catch (error) {
          console.error("Error fetching code:", error);
        }
      };

      // Initial QR code fetch
      fetchCode();
      // Poll QR code based on expiration time
      const codeInterval = setInterval(
        fetchCode,
        currentSession.expiration_seconds * 1000,
      );

      // Fetch attendees
      const fetchAttendees = async () => {
        try {
          const attendeesRes = await fetch(
            "/api/attendance?sessionId=" + currentSession.id,
          );
          if (attendeesRes.ok) {
            const attendeesData = await attendeesRes.json();
            setAttendees(attendeesData.attendees);
          }
        } catch (error) {
          console.error("Error fetching attendees:", error);
        }
      };

      // Initial attendees fetch
      fetchAttendees();
      // Poll attendees every 3 seconds
      const attendeesInterval = setInterval(fetchAttendees, 3000);

      return () => {
        clearInterval(codeInterval);
        clearInterval(attendeesInterval);
      };
    } else {
      setCodeExpiry(null);
      setAttendees([]);
    }
  }, [currentSession]);

  useEffect(() => {
    if (!codeExpiry) return;

    const timer = setInterval(() => {
      const now = new Date();
      if (now >= codeExpiry) {
        clearInterval(timer);
      } else {
        const remaining = codeExpiry.getTime() - now.getTime();
        if (remaining <= 3000) {
          setIsFlashing(true);
          setTimeout(() => setIsFlashing(false), 250);
        } else {
          setIsFlashing(false);
        }
        setCodeExpiry((prev) => new Date(prev!.getTime()));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [codeExpiry]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch("/api/sessions");
        if (!res.ok) {
          const errorData = await res.text();
          throw new Error(
            `Failed to fetch sessions: ${res.status} ${res.statusText} - ${errorData}`,
          );
        }
        const data = await res.json();
        setPastSessions(data.sessions || []);

        // Find the most recent active session created by the current user
        const activeSession = data.sessions?.find(
          (s: Session) =>
            !s.ended_at && s.creator_email === session?.user?.email,
        );
        if (activeSession && !currentSession) {
          setCurrentSession(activeSession);
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
        setPastSessions([]);
      }
    };
    fetchSessions();
  }, [session, currentSession]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      }
    };
    fetchAnalytics();
  }, [pastSessions]);

  useEffect(() => {
    const fetchRecurringSessions = async () => {
      try {
        const res = await fetch("/api/recurring-sessions");
        if (res.ok) {
          const data = await res.json();
          setRecurringSessions(data.sessions || []);
        }
      } catch (error) {
        console.error("Error fetching recurring sessions:", error);
      }
    };
    fetchRecurringSessions();
  }, []);

  const endSession = async () => {
    if (!currentSession) return;
    try {
      await fetch("/api/sessions/" + currentSession.id, {
        method: "PUT",
      });

      // Fetch fresh session data to get updated info
      const sessionsRes = await fetch("/api/sessions");
      const { sessions } = await sessionsRes.json();
      setPastSessions(sessions);
      setCurrentSession(null);
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmation({ ids: [sessionId] });
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedSessions(pastSessions.map((s) => s.id));
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

  const deleteSelected = () => {
    setDeleteConfirmation({ ids: Array.from(selectedSessions) });
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
      setPastSessions((sessions) =>
        sessions.map((s) =>
          s.id === renameSession.id ? { ...s, name: renameSession.name } : s,
        ),
      );

      // Update current session if it's being renamed
      if (currentSession?.id === renameSession.id) {
        setCurrentSession(updatedSession);
      }

      setRenameSession(null);
      toast({
        title: "Success",
        description: "Session renamed successfully",
      });
    } catch (error) {
      console.error("Error renaming session:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to rename session",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmation) return;
    try {
      await Promise.all(
        deleteConfirmation.ids.map((id) =>
          fetch(`/api/sessions/${id}`, { method: "DELETE" }),
        ),
      );
      setPastSessions((sessions) =>
        sessions.filter((s) => !deleteConfirmation.ids.includes(s.id)),
      );
      setSelectedSessions([]);

      // Clear current session if it's being deleted
      if (
        currentSession &&
        deleteConfirmation.ids.includes(currentSession.id)
      ) {
        setCurrentSession(null);
      }

      setDeleteConfirmation(null);
    } catch (error) {
      console.error("Error deleting sessions:", error);
    }
  };

  const filteredSessions = pastSessions.filter((s) => {
    const matchesName = s.name.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesCreator =
      !showMySessionsOnly || s.creator_email === session?.user?.email;
    return matchesName && matchesCreator;
  });

  const markManualAttendance = async () => {
    if (!currentSession || !manualName) return;

    try {
      const res = await fetch("/api/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSession.id,
          name: manualName,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to mark attendance");
      }

      toast({
        title: "Success",
        description: "Attendance marked successfully",
      });
      setManualName("");
      setIsMarkingManual(false);

      // Refresh attendees list
      const attendeesRes = await fetch(
        "/api/attendance?sessionId=" + currentSession.id,
      );
      if (attendeesRes.ok) {
        const attendeesData = await attendeesRes.json();
        setAttendees(attendeesData.attendees);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message || "Failed to mark attendance",
          variant: "destructive",
        });
      }
    }
  };

  const startSession = async () => {
    if (!sessionName.trim()) return;

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sessionName,
          expirationSeconds:
            expirationValue *
            (expirationUnit === "hours"
              ? 3600
              : expirationUnit === "minutes"
                ? 60
                : 1),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to start session");
      }

      const newSession = await res.json();
      setSessionName("");
      setCurrentSession(newSession);
      // Refresh sessions list
      const sessionsRes = await fetch("/api/sessions");
      const { sessions } = await sessionsRes.json();
      setPastSessions(sessions);
    } catch (error) {
      console.error("Error starting session:", error);
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message || "Failed to start session",
          variant: "destructive",
        });
      }
    }
  };

  const startRecurringSession = async (recurringSession: RecurringSession) => {
    try {
      const res = await fetch(
        `/api/recurring-sessions/${recurringSession.id}/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: recurringSession.name,
            expirationSeconds:
              expirationValue *
              (expirationUnit === "hours"
                ? 3600
                : expirationUnit === "minutes"
                  ? 60
                  : 1),
          }),
        },
      );
      if (!res.ok) throw new Error("Failed to start session");
      const newSession = await res.json();
      setCurrentSession(newSession);
      // Refresh sessions list
      const sessionsRes = await fetch("/api/sessions");
      const { sessions } = await sessionsRes.json();
      setPastSessions(sessions);
    } catch (error) {
      console.error("Error starting session:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to start session",
        variant: "destructive",
      });
    }
  };

  if (status === "loading" || !session?.user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <LoadingSpinner
          text={!session?.user?.isAdmin ? "Redirecting..." : "Loading..."}
        />
      </div>
    );
  }

  if (currentSession && isFullscreen) {
    return (
      <div className="fixed inset-0 bg-background">
        <Button
          variant="ghost"
          className="absolute top-4 left-4 z-50"
          onClick={() => setIsFullscreen(false)}
        >
          <X className="h-6 w-6" />
        </Button>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={60} minSize={40}>
            <DynamicQRCode
              code={qrCode}
              codeExpiry={codeExpiry}
              isFlashing={isFlashing}
              expirationSeconds={currentSession.expiration_seconds}
            />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="p-8 h-screen overflow-hidden">
              <h2 className="text-2xl font-bold mb-4">Current Attendees</h2>
              <AttendanceTable
                data={attendees}
                className="h-[calc(100vh-8rem)]"
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
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
              <BreadcrumbPage>Admin Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex justify-between items-center mb-8 mt-4">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="CS 162 Logo"
              width={40}
              height={40}
              className="h-10 w-auto"
            />
            <h1 className="text-2xl font-bold text-foreground">
              Admin Dashboard
            </h1>
          </div>
          <div className="flex gap-2">
            {currentSession && (
              <Button variant="destructive" onClick={endSession}>
                <StopCircle className="h-4 w-4 mr-2" />
                End Session
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push("/admin/recurring-sessions")}
            >
              <History className="h-4 w-4 mr-2" />
              Recurring Sessions
            </Button>
          </div>
        </div>

        {!currentSession ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Start New Session</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter session name"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        startSession();
                      }
                    }}
                  />
                  <Button onClick={startSession}>Start</Button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    Code expires every:
                  </span>
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
                <div className="border-t pt-4">
                  <Label className="text-sm text-muted-foreground mb-2 block">
                    Or start from recurring session:
                  </Label>
                  <div className="flex gap-3">
                    <Select
                      value={selectedRecurringSession?.id || ""}
                      onValueChange={(value) => {
                        const session = recurringSessions.find(
                          (s) => s.id === value,
                        );
                        setSelectedRecurringSession(session || null);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a recurring session" />
                      </SelectTrigger>
                      <SelectContent>
                        {recurringSessions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedRecurringSession && (
                      <Button
                        onClick={() =>
                          startRecurringSession(selectedRecurringSession)
                        }
                      >
                        Start
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CardTitle>{currentSession.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setRenameSession({
                          id: currentSession.id,
                          name: currentSession.name,
                        });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-card p-4 rounded-md space-y-8">
                  {qrCode && (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col items-center gap-3">
                          <p className="font-mono text-2xl font-bold text-foreground">
                            {qrCode.split("/").pop()?.slice(-6).toUpperCase()}
                          </p>
                          <QRCodeSVG
                            value={qrCode}
                            size={200}
                            className="bg-white dark:bg-black p-2 rounded-lg"
                          />
                        </div>
                        {codeExpiry && (
                          <div className="flex flex-col items-center gap-2">
                            <CircularTimer
                              expiryDate={codeExpiry}
                              totalDurationMs={
                                currentSession.expiration_seconds * 1000
                              }
                              isFlashing={isFlashing}
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                      <TestQrCode url={qrCode} />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Current Attendees</CardTitle>
                  <Button onClick={() => setIsMarkingManual(true)}>
                    Mark Manually
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] overflow-hidden">
                  <AttendanceTable data={attendees} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
            <div className="flex items-center gap-4 mb-4">
              <Input
                placeholder="Filter by name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="max-w-sm"
              />
              <Toggle
                pressed={showMySessionsOnly}
                onPressedChange={setShowMySessionsOnly}
                className="gap-2 px-4"
              >
                {showMySessionsOnly && <Check className="h-4 w-4" />}
                My Sessions
              </Toggle>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]">
                    <Checkbox
                      checked={
                        selectedSessions.length === filteredSessions.length
                      }
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
                {filteredSessions.map((s) => (
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
                        {!s.ended_at &&
                          s.creator_email === session?.user?.email && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => endSession()}
                            >
                              <StopCircle className="h-4 w-4" />
                            </Button>
                          )}
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
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {analytics && (
          <Card className="mt-8 mb-8">
            <CardHeader>
              <CardTitle>Overall Analytics (experimental)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Sessions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.totalSessions}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Students
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.totalStudents}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Average Attendance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.averageAttendance} students
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Attendance Trend</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.attendanceOverTime}
                      margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [
                          `${value} students`,
                          "Attendance",
                        ]}
                      />
                      <Bar
                        dataKey="attendance"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <AdminManagement />

        <Dialog
          open={!!renameSession}
          onOpenChange={() => setRenameSession(null)}
        >
          <DialogContent className="bg-background border">
            <DialogHeader>
              <DialogTitle>Rename Session</DialogTitle>
              <DialogDescription>
                Enter a new name for this session.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={renameSession?.name || ""}
              onChange={(e) =>
                setRenameSession((prev) =>
                  prev ? { ...prev, name: e.target.value } : null,
                )
              }
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameSession(null)}>
                Cancel
              </Button>
              <Button onClick={handleRename}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        <Dialog open={isMarkingManual} onOpenChange={setIsMarkingManual}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark Manual Attendance</DialogTitle>
              <DialogDescription>
                Enter the student&apos;s name to mark them as present for this
                session.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Input
                placeholder="Student name..."
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsMarkingManual(false)}
              >
                Cancel
              </Button>
              <Button onClick={markManualAttendance}>Mark Present</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

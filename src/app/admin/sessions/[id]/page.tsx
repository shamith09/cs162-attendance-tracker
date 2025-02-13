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
import { Home, Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/toaster";

interface Session {
  id: string;
  name: string;
  created_at: string;
  ended_at: string | null;
  expiration_minutes: number;
  recurring_session_id: string | null;
}

interface Student {
  id: string;
  name: string;
  email: string;
  status: "present" | "absent" | "excused";
  timestamp?: string;
  isNonRoster?: boolean;
}

interface AttendanceRecord {
  user_id: string;
  user_name: string;
  user_email: string;
  timestamp: string;
  is_excused: boolean;
}

interface RosterStudent {
  id: string;
  name: string;
  email: string;
  added_at: string;
}

export default function SessionDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [nonRosterStudents, setNonRosterStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.isAdmin) {
      router.push("/");
      return;
    }

    const fetchSessionData = async () => {
      try {
        const [sessionRes, attendeesRes] = await Promise.all([
          fetch(`/api/sessions/${id}`),
          fetch(`/api/attendance?sessionId=${id}`),
        ]);

        if (!sessionRes.ok || !attendeesRes.ok) {
          throw new Error("Failed to fetch session data");
        }

        const [sessionData, attendeesData] = await Promise.all([
          sessionRes.json(),
          attendeesRes.json(),
        ]);

        setSessionData(sessionData);

        // If this is a recurring session, fetch the roster
        if (sessionData.recurring_session_id) {
          const rosterRes = await fetch(
            `/api/recurring-sessions/${sessionData.recurring_session_id}/roster`,
          );
          if (!rosterRes.ok) {
            throw new Error("Failed to fetch roster");
          }
          const { students: rosterStudents } = await rosterRes.json();

          // Create a set of roster emails for quick lookup
          const rosterEmails = new Set(
            rosterStudents.map((s: RosterStudent) => s.email),
          );

          // Separate attendees into roster and non-roster students
          const { rosterAttendees, nonRosterAttendees } =
            attendeesData.attendees.reduce(
              (
                acc: {
                  rosterAttendees: AttendanceRecord[];
                  nonRosterAttendees: AttendanceRecord[];
                },
                attendee: AttendanceRecord,
              ) => {
                if (rosterEmails.has(attendee.user_email)) {
                  acc.rosterAttendees.push(attendee);
                } else {
                  acc.nonRosterAttendees.push(attendee);
                }
                return acc;
              },
              { rosterAttendees: [], nonRosterAttendees: [] },
            );

          // Create attendance map for roster students
          const attendanceMap = new Map<string, AttendanceRecord>(
            rosterAttendees.map((a: AttendanceRecord) => [a.user_email, a]),
          );

          // Process roster students
          const combinedStudents = rosterStudents.map((s: RosterStudent) => {
            const attendance = attendanceMap.get(s.email);
            return {
              id: s.id,
              name: s.name,
              email: s.email,
              status: attendance
                ? attendance.is_excused
                  ? "excused"
                  : "present"
                : "absent",
              timestamp: attendance?.timestamp,
            };
          });

          // Process non-roster students
          const nonRoster = nonRosterAttendees.map((a: AttendanceRecord) => ({
            id: a.user_id,
            name: a.user_name,
            email: a.user_email,
            status: a.is_excused ? "excused" : "present",
            timestamp: a.timestamp,
            isNonRoster: true,
          }));

          setStudents(combinedStudents);
          setNonRosterStudents(nonRoster);
        } else {
          // For non-recurring sessions, just show attendees
          setStudents(
            attendeesData.attendees.map((a: AttendanceRecord) => ({
              id: a.user_id,
              name: a.user_name,
              email: a.user_email,
              status: a.is_excused ? "excused" : "present",
              timestamp: a.timestamp,
            })),
          );
          setNonRosterStudents([]);
        }
      } catch (error) {
        console.error("Error fetching session data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [id, session, status, router]);

  const handleAddStudent = async () => {
    if (!studentName.trim()) return;

    try {
      const res = await fetch("/api/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id, name: studentName }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to add student",
        });
        return;
      }

      // Refresh attendees list
      const attendeesRes = await fetch(`/api/attendance?sessionId=${id}`);
      const attendeesData = await attendeesRes.json();
      setStudents((prev) =>
        prev.map((s) => {
          const attendee = attendeesData.attendees.find(
            (a: AttendanceRecord) => a.user_email === s.email,
          );
          return attendee
            ? { ...s, status: "present", timestamp: attendee.timestamp }
            : s;
        }),
      );
      setStudentName("");
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Student added successfully",
      });
    } catch (error) {
      console.error("Error adding student:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add student",
      });
    }
  };

  const handleExcuseAbsence = async (studentId: string) => {
    try {
      const res = await fetch(`/api/attendance/${id}/excuse`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: studentId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to excuse absence");
      }

      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, status: "excused" } : s)),
      );
      toast({
        title: "Success",
        description: "Absence excused",
      });
    } catch (error) {
      console.error("Error excusing absence:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to excuse absence",
      });
    }
  };

  const handleAddToRoster = async (student: Student) => {
    try {
      const res = await fetch(
        `/api/recurring-sessions/${sessionData?.recurring_session_id}/roster`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: student.id }),
        },
      );

      if (!res.ok) {
        const error = await res.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to add student to roster",
        });
        return;
      }

      const { students } = await res.json();
      setStudents(students);
      setNonRosterStudents(
        nonRosterStudents.filter((s) => s.id !== student.id),
      );
      toast({
        title: "Success",
        description: `${student.name} has been added to the roster`,
      });
    } catch (error) {
      console.error("Error adding student to roster:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add student to roster",
      });
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
          <Button onClick={() => router.push("/admin")}>
            Back to Dashboard
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
              <BreadcrumbPage>Session Details</BreadcrumbPage>
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
                {new Date(sessionData.created_at).toLocaleDateString()}{" "}
                {new Date(sessionData.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Student Manually</DialogTitle>
                  <DialogDescription>
                    Enter the student&apos;s name to add them to this session.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Student Name</Label>
                    <Input
                      id="name"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Enter student name"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddStudent();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleAddStudent}
                    className="w-full"
                    disabled={!studentName.trim()}
                  >
                    Add Student
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => router.push("/admin")}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Attendance Record</CardTitle>
              <div className="flex items-center gap-4">
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
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={`${student.id}-${student.email}`}>
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>
                      <TableCell>{student.email || "No email"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            student.status === "present"
                              ? "success"
                              : student.status === "excused"
                                ? "warning"
                                : "destructive"
                          }
                        >
                          {student.status.charAt(0).toUpperCase() +
                            student.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {student.timestamp
                          ? new Date(student.timestamp).toLocaleTimeString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {student.status === "absent" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExcuseAbsence(student.id)}
                          >
                            Excuse
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {sessionData.recurring_session_id &&
                nonRosterStudents.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      Non-Roster Attendees
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {nonRosterStudents.map((student) => (
                          <TableRow key={`${student.id}-${student.email}`}>
                            <TableCell className="font-medium">
                              {student.name}
                            </TableCell>
                            <TableCell>{student.email || "No email"}</TableCell>
                            <TableCell className="space-x-2">
                              <Badge
                                variant={
                                  student.status === "present"
                                    ? "success"
                                    : student.status === "excused"
                                      ? "warning"
                                      : "destructive"
                                }
                              >
                                {student.status.charAt(0).toUpperCase() +
                                  student.status.slice(1)}
                              </Badge>
                              <Badge variant="outline">Non-Roster</Badge>
                            </TableCell>
                            <TableCell>
                              {student.timestamp
                                ? new Date(
                                    student.timestamp,
                                  ).toLocaleTimeString()
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddToRoster(student)}
                              >
                                Add to Roster
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Admin {
  email: string;
  name: string;
  sessions_started: number;
}

export function AdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<Admin[]>([]);
  const [filter, setFilter] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [adminToRemove, setAdminToRemove] = useState<Admin | null>(null);
  const { toast } = useToast();
  const { data: session } = useSession();

  // Email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@(berkeley\.edu|.*\.berkeley\.edu)$/;

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Must be a valid berkeley.edu email address");
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setNewAdminEmail(email);
    if (email) {
      validateEmail(email);
    } else {
      setEmailError(null);
    }
  };

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await fetch("/api/admins");
      if (!res.ok) throw new Error("Failed to fetch admins");
      const data = await res.json();
      setAdmins(data.admins);
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch admins",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  useEffect(() => {
    const lowercaseFilter = filter.toLowerCase();
    setFilteredAdmins(
      admins.filter(
        (admin) =>
          admin.email.toLowerCase().includes(lowercaseFilter) ||
          (admin.name?.toLowerCase() || "").includes(lowercaseFilter),
      ),
    );
  }, [filter, admins]);

  const addAdmin = async () => {
    if (!validateEmail(newAdminEmail)) return;

    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newAdminEmail, name: newAdminName }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add admin");
      }
      toast({
        title: "Success",
        description: "Admin added successfully",
      });
      setNewAdminEmail("");
      setNewAdminName("");
      setEmailError(null);
      fetchAdmins();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message || "Failed to add admin",
          variant: "destructive",
        });
      }
    }
  };

  const removeAdmin = async (email: string) => {
    try {
      const res = await fetch("/api/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove admin");
      }
      toast({
        title: "Success",
        description: "Admin removed successfully",
      });
      setAdminToRemove(null);
      fetchAdmins();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message || "Failed to remove admin",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Admin Management</CardTitle>
          <CardDescription>
            Manage who has administrative access to the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between gap-4">
              <Input
                placeholder="Filter by name or email..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="max-w-sm"
              />
              <div className="flex flex-col gap-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addAdmin();
                  }}
                  className="flex gap-2"
                >
                  <div className="flex-1 flex flex-col gap-1">
                    <Input
                      placeholder="Email..."
                      value={newAdminEmail}
                      onChange={handleEmailChange}
                      className={`max-w-sm ${emailError ? "border-red-500" : ""}`}
                    />
                  </div>
                  <Input
                    placeholder="Name (optional)..."
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="flex-1 max-w-sm"
                  />
                  <Button type="submit" disabled={!!emailError}>
                    Add
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground">
                  Only berkeley.edu email addresses are allowed
                </p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Sessions Started</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((admin) => (
                  <TableRow key={admin.email}>
                    <TableCell>{admin.name || "N/A"}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.sessions_started}</TableCell>
                    <TableCell>
                      {admin.email !== session?.user?.email ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setAdminToRemove(admin)}
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!adminToRemove}
        onOpenChange={() => setAdminToRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Admin Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove admin access from{" "}
              {adminToRemove?.name || adminToRemove?.email}? This action can be
              undone by adding them back as an admin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminToRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => adminToRemove && removeAdmin(adminToRemove.email)}
            >
              Remove Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

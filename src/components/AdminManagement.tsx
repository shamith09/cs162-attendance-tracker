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
  const { toast } = useToast();
  const { data: session } = useSession();

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
    if (!newAdminEmail) return;
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
            <div className="flex gap-2">
              <Input
                placeholder="Email..."
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="max-w-sm"
              />
              <Input
                placeholder="Name (optional)..."
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={addAdmin}>Add</Button>
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
                        onClick={() => removeAdmin(admin.email)}
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
  );
}


import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/entities/User';
import { Team } from '@/entities/Team';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Search, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ROLES = [
  "admin", 
  "scrutineer", 
  "track_marshal", 
  "bp_judge", 
  "cm_judge", 
  "design_judge_software", 
  "design_judge_mechanical", 
  "design_judge_electronics", 
  "design_judge_overall", 
  "team_captain", 
  "team_member",
  "viewer"
];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [allUsers, allTeams] = await Promise.all([User.list(), Team.list()]);
      setUsers(allUsers);
      setTeams(allTeams);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      app_role: user.app_role || 'team_member',
      team_id: user.team_id || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    try {
      await User.update(editingUser.id, formData);
      setIsDialogOpen(false);
      setEditingUser(null);
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  };

  const getTeamName = (teamId) => teams.find(t => t.id === teamId)?.name || 'N/A';

  const filteredUsers = users.filter(user =>
    (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button disabled>
          <UserPlus className="mr-2 h-4 w-4" /> Invite User (Not Implemented)
        </Button>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input 
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                </TableCell>
              </TableRow>
            ) : filteredUsers.map(user => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{getTeamName(user.team_id)}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">{user.app_role?.replace('_', ' ')}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {editingUser?.full_name}</DialogTitle>
            <DialogDescription>{editingUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-select">Role</Label>
              <Select
                value={formData.app_role}
                onValueChange={(value) => setFormData(prev => ({ ...prev, app_role: value }))}
              >
                <SelectTrigger id="role-select">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(role => (
                    <SelectItem key={role} value={role} className="capitalize">{role.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-select">Team</Label>
              <Select
                value={formData.team_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, team_id: value }))}
              >
                <SelectTrigger id="team-select">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Team } from "@/entities/Team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [currentUser, allTeams] = await Promise.all([User.me(), Team.list()]);
        setUser(currentUser);
        setFormData({
          first_name: currentUser.first_name || "",
          last_name: currentUser.last_name || "",
          father_name: currentUser.father_name || "",
          phone: currentUser.phone || "",
          emergency_contact: currentUser.emergency_contact || "",
          campsite_staying: currentUser.campsite_staying || false,
          ehic_number: currentUser.ehic_number || "",
          team_id: currentUser.team_id || "",
        });
        setTeams(allTeams);
      } catch (e) {
        navigate(createPageUrl("Home"));
      }
      setLoading(false);
    };
    loadData();
  }, [navigate]);

  const handleInputChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await User.updateMyUserData(formData);
      setSuccess(true);
      setTimeout(() => navigate(createPageUrl("Dashboard")), 2000);
    } catch (err) {
      setError("Failed to update profile. Please check your details and try again.");
      console.error(err);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Please provide your details to continue. Some fields can only be changed by an administrator.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
 
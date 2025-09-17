import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Shield, LogIn } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const isProfileComplete = (user) => {
  return user && user.app_role && user.team_id && user.first_name && user.last_name;
};

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        if (isProfileComplete(currentUser)) {
          navigate(createPageUrl("Dashboard"));
        }
      } catch (e) {
        // User not logged in
        setUser(null);
      }
      setLoading(false);
    };
    checkUser();
  }, [navigate]);

  const handleLogin = async () => {
    try {
      await User.login();
    } catch (e) {
      setError("Login failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user && !isProfileComplete(user)) {
    navigate(createPageUrl("Profile"));
    return null; // or a loading spinner
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-block p-4 bg-blue-100 rounded-full mb-6">
          <Shield className="w-12 h-12 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-800">
          Formula IHU Inspection Platform
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Welcome to the official platform for managing inspection bookings and live scrutineering for Formula IHU.
        </p>
        <div className="mt-8">
          <Button onClick={handleLogin} size="lg" className="bg-blue-600 hover:bg-blue-700">
            <LogIn className="mr-2 h-5 w-5" />
            Login / Register
          </Button>
        </div>
        {error && (
          <Alert variant="destructive" className="mt-6 max-w-md mx-auto">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
       <div className="absolute bottom-4 text-sm text-gray-500">
        Logo provided by Formula IHU Team
      </div>
    </div>
  );
}
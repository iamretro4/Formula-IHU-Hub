import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Settings, Construction } from 'lucide-react';

export default function SystemSettings() {
  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-1">Manage global platform configurations.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Inspection Types</CardTitle>
          <CardDescription>Manage the types of inspections, their durations, and prerequisites.</CardDescription>
        </CardHeader>
        <CardContent>
            <Alert>
                <Construction className="h-4 w-4" />
                <AlertTitle>Feature Under Construction</AlertTitle>
                <AlertDescription>
                    This section will allow administrators to create, edit, and delete inspection types dynamically. This functionality is not yet implemented.
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
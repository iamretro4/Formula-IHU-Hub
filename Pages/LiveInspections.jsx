
import React, { useState, useEffect, useCallback } from 'react';
import { Booking } from '@/entities/Booking';
import { InspectionType } from '@/entities/InspectionType';
import { Team } from '@/entities/Team';
import { InspectionResult } from '@/entities/InspectionResult';
import { ChecklistTemplate } from '@/entities/ChecklistTemplate';
import { ChecklistCheck } from '@/entities/ChecklistCheck';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Play, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';

export default function LiveInspectionsPage() {
    const [user, setUser] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [teams, setTeams] = useState([]);
    const [inspectionTypes, setInspectionTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startingInspection, setStartingInspection] = useState(null);
    const navigate = useNavigate();
    const today = new Date().toISOString().split('T')[0];

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const currentUser = await User.me();
            setUser(currentUser);

            const [allBookings, allTeams, allInspectionTypes] = await Promise.all([
                Booking.filter({ date: today }),
                Team.list(),
                InspectionType.list()
            ]);

            setBookings(allBookings.sort((a,b) => a.start_time.localeCompare(b.start_time)));
            setTeams(allTeams);
            setInspectionTypes(allInspectionTypes);
        } catch (e) {
            console.error("Failed to load data:", e);
        }
        setLoading(false);
    }, [today]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const getTeamName = (teamId) => teams.find(t => t.id === teamId)?.name || '...';
    const getInspectionTypeName = (typeId) => inspectionTypes.find(t => t.id === typeId)?.name || '...';

    const handleStartInspection = async (booking) => {
        setStartingInspection(booking.id);
        try {
            // 1. Create InspectionResult
            const inspectionResult = await InspectionResult.create({
                booking_id: booking.id,
                status: 'ongoing',
                started_at: new Date().toISOString(),
                scrutineer_ids: [user.id],
            });

            // 2. Find the inspection type to get its key
            const inspectionType = inspectionTypes.find(t => t.id === booking.inspection_type_id);
            if (!inspectionType) {
                throw new Error("Inspection type not found");
            }

            // 3. Find all checklist template items for this inspection type using the key
            const templateItems = await ChecklistTemplate.filter({
                inspection_type_key: inspectionType.key
            });

            // 4. If no templates found, create basic ones for the inspection type
            if (templateItems.length === 0) {
                console.log(`Creating basic checklist for inspection type: ${inspectionType.key}`);

                // Create some basic template items
                const basicTemplates = [
                    {
                        inspection_type_key: inspectionType.key,
                        section: "GENERAL CHECK",
                        item_code: "1",
                        description: "General safety check completed",
                        required: true,
                        order_index: 1
                    },
                    {
                        inspection_type_key: inspectionType.key,
                        section: "GENERAL CHECK",
                        item_code: "2",
                        description: "All requirements met",
                        required: true,
                        order_index: 2
                    }
                ];

                const createdTemplates = await ChecklistTemplate.bulkCreate(basicTemplates);

                // Create checks for the newly created templates
                const checksToCreate = createdTemplates.map(item => ({
                    inspection_result_id: inspectionResult.id,
                    template_id: item.id,
                    checked: false
                }));
                await ChecklistCheck.bulkCreate(checksToCreate);
            } else {
                // Create ChecklistCheck records for existing templates
                const checksToCreate = templateItems.map(item => ({
                    inspection_result_id: inspectionResult.id,
                    template_id: item.id,
                    checked: false
                }));
                await ChecklistCheck.bulkCreate(checksToCreate);
            }

            // 5. Update booking status
            await Booking.update(booking.id, { status: 'ongoing' });

            // 6. Navigate to the inspection page
            navigate(createPageUrl(`Inspection?id=${inspectionResult.id}`));

        } catch (error) {
            console.error("Failed to start inspection:", error);
            alert("Failed to start inspection. Please try again.");
        }
        setStartingInspection(null);
    };

    const handleContinueInspection = async (booking) => {
        // Find the most recent ongoing inspection result for this booking
        const results = await InspectionResult.filter({ booking_id: booking.id, status: 'ongoing' }, '-created_date', 1);
        if (results.length > 0) {
            navigate(createPageUrl(`Inspection?id=${results[0].id}`));
        } else {
            // This could happen if the status was changed elsewhere.
            // For robustness, you might want to show an alert to the user.
            console.error("Could not find an ongoing inspection for this booking.");
            loadData(); // Refresh the list
        }
    };

    const renderBookingList = (filteredBookings) => {
        if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;
        if (filteredBookings.length === 0) return <p className="text-center text-gray-500 p-8">No inspections in this category.</p>;

        return (
            <div className="space-y-4">
                {filteredBookings.map(booking => (
                    <Card key={booking.id} className="flex items-center justify-between p-4">
                        <div>
                            <p className="font-bold">{getInspectionTypeName(booking.inspection_type_id)}</p>
                            <p className="text-sm text-gray-700">{getTeamName(booking.team_id)} - Vehicle {teams.find(t => t.id === booking.team_id)?.vehicle_number || ''}</p>
                            <p className="text-sm text-gray-500">Slot: {booking.start_time}</p>
                            {booking.is_rescrutineering && <Badge variant="outline" className="mt-1">Rescrutineering</Badge>}
                        </div>
                        {booking.status === 'upcoming' && (
                            <Button onClick={() => handleStartInspection(booking)} disabled={startingInspection === booking.id}>
                                {startingInspection === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                                Start
                            </Button>
                        )}
                        {booking.status === 'ongoing' && (
                             <Button variant="secondary" onClick={() => handleContinueInspection(booking)}>
                                Continue <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        )}
                    </Card>
                ))}
            </div>
        );
    };

    const upcomingBookings = bookings.filter(b => b.status === 'upcoming');
    const ongoingBookings = bookings.filter(b => b.status === 'ongoing');

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Live Inspections Queue</CardTitle>
                    <CardDescription>View and manage today's inspections.</CardDescription>

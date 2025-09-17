
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/entities/User';
import { Team } from '@/entities/Team';
import { Booking } from '@/entities/Booking';
import { InspectionType } from '@/entities/InspectionType';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, XCircle, CalendarPlus, Info, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { uniqBy } from 'lodash';

// Time slot generation logic
const generateTimeSlots = (startTime, endTime, duration) => {
    const slots = [];
    let current = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);

    while (current < end) {
        slots.push(current.toTimeString().substring(0, 5));
        current.setMinutes(current.getMinutes() + duration);
    }
    return slots;
};

export default function BookInspectionPage() {
    const [user, setUser] = useState(null);
    const [teamBookings, setTeamBookings] = useState([]);
    const [allBookings, setAllBookings] = useState([]);
    const [inspectionTypes, setInspectionTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [selectedInspectionTypeId, setSelectedInspectionTypeId] = useState('');
    const [selectedSlot, setSelectedSlot] = useState('');
    const [availableSlots, setAvailableSlots] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();
    const today = new Date().toISOString().split('T')[0];

    // Load all necessary data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const currentUser = await User.me();
            if (!['team_leader', 'inspection_responsible', 'admin'].includes(currentUser.app_role)) {
                navigate(createPageUrl('Dashboard'));
                return;
            }
            setUser(currentUser);
            
            const [allInspTypes, allBks] = await Promise.all([
                InspectionType.list('sort_order'),
                Booking.list()
            ]);
            
            // Deduplicate inspection types by key
            const uniqueInspectionTypes = uniqBy(allInspTypes, 'key');
            setInspectionTypes(uniqueInspectionTypes);

            setAllBookings(allBks);
            setTeamBookings(allBks.filter(b => b.team_id === currentUser.team_id));

        } catch (e) {
            console.error(e);
            setError("Failed to load data. Please refresh the page.");
        }
        setLoading(false);
    }, [navigate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Calculate eligibility for each inspection type
    const getEligibility = useCallback((inspectionType) => {
        if (!user) return { eligible: false, reason: "Loading user data..." };

        const passedInspections = new Set(
            teamBookings.filter(b => b.status === 'passed').map(b => {
                const type = inspectionTypes.find(it => it.id === b.inspection_type_id);
                return type?.key;
            })
        );

        if (passedInspections.has(inspectionType.key)) {
            return { eligible: false, reason: "Already passed." };
        }

        for (const prereqKey of (inspectionType.prerequisites || [])) {
            if (!passedInspections.has(prereqKey)) {
                 const prereqName = inspectionTypes.find(it => it.key === prereqKey)?.name || prereqKey;
                 return { eligible: false, reason: `Requires ${prereqName} to be passed.` };
            }
        }
        
        return { eligible: true, reason: "" };
    }, [user, teamBookings, inspectionTypes]);


    // Update available slots when inspection type changes
    useEffect(() => {
        if (!selectedInspectionTypeId) {
            setAvailableSlots([]);
            return;
        }

        const selectedType = inspectionTypes.find(it => it.id === selectedInspectionTypeId);
        if (!selectedType) return;
        
        const todaysBookings = allBookings.filter(b => b.date === today && b.inspection_type_id === selectedInspectionTypeId);
        
        // Rescrutineering logic
        const hasFailed = teamBookings.some(b => b.inspection_type_id === selectedInspectionTypeId && b.status === 'failed');
        let minStartTimeForRescrut = '00:00';
        if (hasFailed) {
            const firstTimeBookingsToday = todaysBookings.filter(b => !b.is_rescrutineering);
            if (firstTimeBookingsToday.length > 0) {
                minStartTimeForRescrut = firstTimeBookingsToday.reduce((latest, b) => b.start_time > latest ? b.start_time : latest, '00:00');
            }
        }
        
        const allPossibleSlots = generateTimeSlots('08:00', '18:00', selectedType.duration_minutes);
        
        const available = allPossibleSlots.reduce((acc, slot) => {
            if (hasFailed && slot < minStartTimeForRescrut) {
                return acc; // Skip slots before the last first-timer for rescrutineering
            }

            const bookedLanes = todaysBookings
                .filter(b => b.start_time === slot)
                .map(b => b.resource_index);
            
            for (let i = 0; i < selectedType.concurrent_slots; i++) {
                if (!bookedLanes.includes(i)) {
                    acc.push({ time: slot, resource_index: i });
                    // For simplicity, we'll just offer the first available lane per time slot
                    // In a real scenario, you might want to show all lanes
                    return acc; 
                }
            }
            return acc;
        }, []);

        setAvailableSlots(available);
        setSelectedSlot('');

    }, [selectedInspectionTypeId, inspectionTypes, allBookings, teamBookings, today]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        
        if (!selectedInspectionTypeId || !selectedSlot) {
            setError("Please select an inspection type and a time slot.");
            setIsSubmitting(false);
            return;
        }

        try {
            const selectedType = inspectionTypes.find(it => it.id === selectedInspectionTypeId);
            const { time, resource_index } = JSON.parse(selectedSlot);
            
            const hasFailedBefore = teamBookings.some(b => b.inspection_type_id === selectedInspectionTypeId && b.status === 'failed');

            const newBooking = {
                team_id: user.team_id,
                inspection_type_id: selectedInspectionTypeId,
                date: today,
                start_time: time,
                end_time: new Date(new Date(`1970-01-01T${time}`).getTime() + selectedType.duration_minutes * 60000).toTimeString().substring(0,5),
                resource_index: resource_index,
                is_rescrutineering: hasFailedBefore,
                status: 'upcoming',
                created_by: user.email
            };

            await Booking.create(newBooking);
            navigate(createPageUrl("Dashboard"));


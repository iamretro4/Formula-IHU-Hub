
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User } from '@/entities/User';
import { InspectionResult } from '@/entities/InspectionResult';
import { ChecklistCheck } from '@/entities/ChecklistCheck';
import { ChecklistTemplate } from '@/entities/ChecklistTemplate';
import { Booking } from '@/entities/Booking';
import { Team } from '@/entities/Team';
import { InspectionType } from '@/entities/InspectionType';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Check, X, MessageSquare, Save, Users, Clock, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createPageUrl } from '@/utils';

const ChecklistItem = ({ item, onCheck, onNoteSave, isScrutineer }) => {
    const [note, setNote] = useState(item.check.note || '');
    const [showNote, setShowNote] = useState(false);

    const handleNoteSave = () => {
        onNoteSave(item.check.id, note);
        setShowNote(false);
    };

    return (
        <div className="flex items-start gap-4 p-4 border-b">
            <Checkbox
                id={`check-${item.template.id}`}
                checked={item.check.checked}
                onCheckedChange={(checked) => onCheck(item.check.id, checked)}
                disabled={!isScrutineer}
                className="mt-1"
            />
            <div className="flex-1">
                <label htmlFor={`check-${item.template.id}`} className="font-medium block">
                    {item.template.item_code}. {item.template.description}
                </label>
                {item.check.checked_by && (
                    <p className="text-xs text-gray-500 mt-1">
                        Checked by {item.check.checked_by_name || 'User'} at {item.check.checked_at ? new Date(item.check.checked_at).toLocaleTimeString() : 'Unknown time'}
                    </p>
                )}
                {item.check.note && !showNote && (
                     <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded-md mt-2">Note: {item.check.note}</p>
                )}
            </div>
            {isScrutineer && (
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon"><MessageSquare className="w-4 h-4" /></Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Note for item {item.template.item_code}</DialogTitle>
                        </DialogHeader>
                        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
                        <Button onClick={handleNoteSave}>Save Note</Button>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};


export default function InspectionPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    
    const [inspectionResult, setInspectionResult] = useState(null);
    const [booking, setBooking] = useState(null);
    const [team, setTeam] = useState(null);
    const [inspectionType, setInspectionType] = useState(null);
    const [checklist, setChecklist] = useState([]);
    const [scrutineers, setScrutineers] = useState([]);

    const location = useLocation();
    const navigate = useNavigate();

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams(location.search);
            const resultId = params.get('id');

            if (!resultId) {
                setError("No inspection specified.");
                setLoading(false);
                return;
            }
            
            const [
                user,
                result
            ] = await Promise.all([
                User.me(),
                InspectionResult.get(resultId)
            ]);
            
            setCurrentUser(user);
            setInspectionResult(result);

            const [
                bk,
                checks
            ] = await Promise.all([
                Booking.get(result.booking_id),
                ChecklistCheck.filter({ inspection_result_id: result.id })
            ]);
            
            setBooking(bk);

            // Simplified scrutineer display
            setScrutineers([{ id: user.id, full_name: user.full_name || 'Current Scrutineer' }]);

            const [tm, inspType] = await Promise.all([
                Team.get(bk.team_id),
                InspectionType.get(bk.inspection_type_id)
            ]);

            setTeam(tm);
            setInspectionType(inspType);

            // Get templates using the inspection type key instead of ID
            const templates = await ChecklistTemplate.filter({ 
                inspection_type_key: inspType.key 
            });

            console.log('Templates found:', templates.length);
            console.log('Checks found:', checks.length);
            console.log('Inspection type key:', inspType.key);

            // Combine templates with their corresponding checks
            const combined = templates
                .map(template => {
                    const check = checks.find(c => c.template_id === template.id);
                    return check ? { template, check } : null;
                })
                .filter(item => item !== null)
                .sort((a,b) => a.template.order_index - b.template.order_index);

            setChecklist(combined);

            console.log('Combined checklist:', combined.length);

        } catch (e) {
            console.error(e);
            setError("Failed to load inspection data.");
        }
        setLoading(false);
    }, [location.search]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const isScrutineer = inspectionResult?.scrutineer_ids?.includes(currentUser?.id) || currentUser?.app_role === 'admin' || currentUser?.app_role === 'scrutineer';

    const handleCheck = async (checkId, isChecked) => {
        const originalChecklist = [...checklist];
        const userName = currentUser.full_name || currentUser.email || 'Unknown User';
        
        // Optimistic update
        setChecklist(prev => prev.map(item => 
            item.check.id === checkId ? { 
                ...item, 
                check: {
                    ...item.check, 
                    checked: isChecked,
                    checked_by: currentUser.id,
                    checked_by_name: userName,
                    checked_at: new Date().toISOString()
                }
            } : item
        ));
        
        try {
            await ChecklistCheck.update(checkId, {
                checked: isChecked,
                checked_by: currentUser.id,
                checked_by_name: userName,
                checked_at: new Date().toISOString()
            });
        } catch (error) {
            console.error(error);
            setChecklist(originalChecklist); // Revert on error
        }
    };
    
    const handleNoteSave = async (checkId, note) => {
        const originalChecklist = [...checklist];
        setChecklist(prev => prev.map(item => item.check.id === checkId ? { ...item, check: {...item.check, note: note } } : item));
        try {
            await ChecklistCheck.update(checkId, { note });
        } catch (error) {
            console.error(error);
            setChecklist(originalChecklist);
        }
    };

    const handleFinishInspection = async (status) => {
        if (!window.confirm(`Are you sure you want to mark this inspection as ${status.toUpperCase()}?`)) return;
        try {
            await InspectionResult.update(inspectionResult.id, {
                status,
                completed_at: new Date().toISOString()
            });
            await Booking.update(booking.id, { status });
            navigate(createPageUrl('Dashboard'));
        } catch (error) {
            console.error(error);
            setError("Failed to finalize inspection.");
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    if (error) return <div className="p-8"><Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></div>;

    const groupedChecklist = checklist.reduce((acc, item) => {
        const section = item.template.section;
        if (!acc[section]) acc[section] = [];
        acc[section].push(item);
        return acc;
    }, {});
    
    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <Card className="max-w-5xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-2xl">{inspectionType?.name} Inspection</CardTitle>
                    <CardDescription className="text-lg">{team?.name} - Vehicle {team?.vehicle_number}</CardDescription>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2"><Users className="w-4 h-4"/> Scrutineer(s): {scrutineers.map(s => s.full_name || s.email).join(', ')}</div>
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4"/> Started: {new Date(inspectionResult.started_at).toLocaleString()}</div>
                    </div>
                </CardHeader>
                <CardContent>
                    {checklist.length === 0 ? (
                        <Alert>
                            <AlertTitle>No Checklist Items</AlertTitle>
                            <AlertDescription>
                                No checklist items found for this inspection. This may indicate a setup issue.
                                <br />Debug info: Check the browser console for more details.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        Object.entries(groupedChecklist).map(([section, items]) => (
                            <div key={section} className="mb-8">
                                <h3 className="text-xl font-bold p-4 bg-gray-100 rounded-t-lg border-b">{section}</h3>
                                <div className="bg-white rounded-b-lg border border-t-0">
                                    {items.map(item => (
                                        <ChecklistItem 
                                            key={item.template.id} 
                                            item={item} 
                                            onCheck={handleCheck} 
                                            onNoteSave={handleNoteSave}
                                            isScrutineer={isScrutineer}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
                {isScrutineer && checklist.length > 0 && (
                    <CardFooter className="flex justify-end gap-4">
                        <Button variant="destructive" onClick={() => handleFinishInspection('failed')}>
                            <X className="w-4 h-4 mr-2" />
                            Mark as Failed
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleFinishInspection('passed')}>
                            <Check className="w-4 h-4 mr-2" />
                             Mark as Passed
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}

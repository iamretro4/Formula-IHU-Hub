-- Migration: 034_fix_booking_rls.sql
-- Description: Unlocks read access on the bookings table for all authenticated users.
-- This allows the lane-assignment logic (which queries 'bookings') to accurately detect
-- reserved slots for ALL teams, preventing duplicate key violations. It also ensures the Calendar populates correctly.

DROP POLICY IF EXISTS "bookings_select" ON bookings;

CREATE POLICY "bookings_select" ON bookings FOR SELECT USING (
    auth.role() = 'authenticated'
);

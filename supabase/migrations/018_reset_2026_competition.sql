-- =====================================================
-- Reset for 2026 competition: clear all data except admin,
-- then seed 2026 teams.
-- Admin preserved: antonis.ntwnas@gmail.com
-- Migration: 018_reset_2026_competition.sql
--
-- NOTE: This only deletes from public tables (e.g. user_profiles).
-- To allow deleted emails to sign up again, also run migration
-- 019_clean_auth_users_after_reset.sql (cleans auth.users).
-- =====================================================

DO $$
DECLARE
  admin_email text := 'antonis.ntwnas@gmail.com';
BEGIN
  -- 1. Unlink admin from any team so we can delete teams
  UPDATE public.user_profiles
  SET team_id = NULL
  WHERE email = admin_email;

  -- 2. Delete in FK-safe order (child tables first)

  -- Judge/audit
  DELETE FROM public.judge_score_audit;
  DELETE FROM public.judged_event_scores;
  DELETE FROM public.judged_event_bookings;
  DELETE FROM public.judged_event_criteria;
  DELETE FROM public.judged_events;

  -- Feedback
  DELETE FROM public.feedback_judge_assignments;
  DELETE FROM public.feedback_bookings;
  DELETE FROM public.feedback_slots;

  -- Inspection
  DELETE FROM public.inspection_comments;
  DELETE FROM public.inspection_progress;
  DELETE FROM public.inspection_results;
  DELETE FROM public.bookings;

  -- Track
  DELETE FROM public.track_incidents;
  DELETE FROM public.track_activity_log;
  DELETE FROM public.track_sessions;

  -- Dynamic events
  DELETE FROM public.dynamic_event_runs;
  DELETE FROM public.dynamic_event_results;
  DELETE FROM public.efficiency_results;

  -- Uploads & notifications
  DELETE FROM public.team_uploads;
  DELETE FROM public.notifications;
  DELETE FROM public.audit_logs;

  -- 3. Remove all user profiles except admin
  DELETE FROM public.user_profiles
  WHERE email != admin_email;

  -- 4. Delete all teams
  DELETE FROM public.teams;
END $$;

-- =====================================================
-- Seed 2026 competition teams (from registration list)
-- =====================================================

INSERT INTO public.teams (name, code, vehicle_class, university) VALUES
  ('Aristotle University Racing Team Electric', 'AURTE', 'EV', 'Aristotle University of Thessaloniki'),
  ('Poseidon Racing Team', 'PRT', 'EV', 'National Technical University of Athens'),
  ('Prom Racing', 'PROM', 'EV', 'University of Macedonia'),
  ('Centaurus Racing Team', 'CRT', 'EV', 'University of Thessaly'),
  ('Perseus Racing', 'PERSEUS', 'EV', 'University of Patras'),
  ('Democritus Racing Team', 'DRT', 'EV', 'Democritus University of Thrace'),
  ('UoP Racing Team', 'UOP', 'EV', 'University of Peloponnese'),
  ('Aristotle Racing Team', 'ART', 'EV', 'Aristotle University of Thessaloniki'),
  ('Formula Students Technical University of Crete', 'FSTUC', 'EV', 'Technical University of Crete'),
  ('Minautor Racing Team', 'MINAUTOR', 'EV', 'Technical University of Crete'),
  ('Pelops Racing Team', 'PELOPS', 'EV', 'University of Peloponnese'),
  ('fufracingteam', 'FUF', 'EV', 'Frederick University'),
  ('FRTUCY', 'FRTUCY', 'EV', 'University of Cyprus'),
  ('Daedalus Racing Team', 'DAEDALUS', 'EV', 'Technical University of Crete'),
  ('BCN eMotorsport', 'BCN', 'EV', 'Universitat Politècnica de Catalunya'),
  ('Joanneum Racing Graz', 'JRG', 'EV', 'FH Joanneum Graz'),
  ('High-Voltage Motorsports e.V.', 'HVM', 'EV', 'University of Applied Sciences Munich'),
  ('TU Istanbul Racing', 'TUIST', 'EV', 'Istanbul Technical University'),
  ('Formula Electric Belgium', 'FEB', 'EV', 'Belgium'),
  ('STUBA Green Team', 'STUBA', 'EV', 'Slovak University of Technology Bratislava'),
  ('YTU Racing', 'YTU', 'EV', 'Yıldız Technical University'),
  ('Deefholt Dynamics e.V.', 'DD', 'EV', 'Germany'),
  ('NTHU Racing', 'NTHU', 'EV', 'National Tsing Hua University'),
  ('TGU RACING', 'TGU', 'EV', 'Tamagawa University'),
  ('DTU - Self Driving Car', 'DTU', 'EV', 'Technical University of Denmark'),
  ('ART TU Cluj-Napoca', 'ARTTU', 'EV', 'Technical University of Cluj-Napoca'),
  ('Team Octane Racing Electric', 'TORE', 'EV', 'India'),
  ('AMZ Racing', 'AMZ', 'EV', 'ETH Zurich'),
  ('Rennteam Uni Stuttgart', 'RUS', 'EV', 'University of Stuttgart'),
  ('BME Motorsport', 'BMEM', 'EV', 'Budapest University of Technology'),
  ('Tampere Formula Student', 'TFS', 'EV', 'Tampere University'),
  ('Trakya Racing Formula Student Team', 'TRFST', 'EV', 'Trakya University'),
  ('UGATU Racing Team', 'UGATU', 'EV', 'Hungary'),
  ('OzU Racing', 'OZU', 'EV', 'Özyeğin University'),
  ('MES Racing', 'MES', 'EV', 'Turkey'),
  ('BlueStreamline', 'BSL', 'EV', 'Germany'),
  ('PGRacing Team', 'PGR', 'EV', 'Germany'),
  ('Universitas Indonesia Racing Team', 'UIRT', 'EV', 'Universitas Indonesia'),
  ('ENP RACING TEAM', 'ENP', 'EV', 'France'),
  ('Formula Student ONPU', 'FSONPU', 'EV', 'Odessa National Polytechnic University'),
  ('UPB Drive', 'UPB', 'EV', 'University Politehnica of Bucharest'),
  ('Universidad Europea de Madrid', 'UEM', 'EV', 'Universidad Europea de Madrid'),
  ('NFS Team', 'NFS', 'EV', 'Turkey'),
  ('DEU Formula Racing Team', 'DEU', 'EV', 'Dokuz Eylül University'),
  ('IZTECH RACING', 'IZTECH', 'EV', 'İzmir Institute of Technology'),
  ('TU Brno Racing', 'TUBRNO', 'EV', 'Brno University of Technology'),
  ('ARUS', 'ARUS', 'EV', 'Romania'),
  ('Baltic Racing Team', 'BRT', 'EV', 'Lithuania'),
  ('ESTACA FORMULA TEAM', 'ESTACA', 'EV', 'ESTACA'),
  ('TUfast Racing Team E-technology', 'TUFAST', 'EV', 'Technical University of Munich'),
  ('Raceyard E', 'RYE', 'EV', 'Germany'),
  ('Dynamics e.V.', 'DYNEV', 'EV', 'Germany'),
  ('BGRacing', 'BGR', 'EV', 'Germany'),
  ('greenBEAR', 'GBEAR', 'EV', 'Germany'),
  ('UniPR Racing Team', 'UNIPR', 'EV', 'University of Parma'),
  ('BlueStreamlinEV', 'BSLEV', 'EV', 'Germany'),
  ('UniNa Corse', 'UNINA', 'EV', 'University of Naples'),
  ('E-Traxx', 'ETRAXX', 'EV', 'Germany'),
  ('Rennstall Esslingen', 'RE', 'EV', 'Hochschule Esslingen'),
  ('ENI Metz Racing Team', 'ENIMETZ', 'EV', 'Metz'),
  ('BME Formula Racing Team', 'BMEF', 'EV', 'Budapest University of Technology'),
  ('FESB Racing', 'FESB', 'EV', 'Croatia'),
  ('PUT Motorsport', 'PUT', 'EV', 'Poznan University of Technology'),
  ('UPC ecoRacing', 'UPCER', 'EV', 'Universitat Politècnica de Catalunya'),
  ('Team wob-racing.', 'WOBS', 'EV', 'Germany'),
  ('T.U.C. Racing e.V.', 'TUCR', 'EV', 'Germany'),
  ('Formula Student Team Weingarten', 'FSTW', 'EV', 'RWU Weingarten'),
  ('BRS Motorsport', 'BRS', 'EV', 'Germany'),
  ('Bauman Racing Team', 'BMRT', 'EV', 'Bauman Moscow State Technical University'),
  ('Green Lion Racing', 'GLR', 'EV', 'Canada'),
  ('AU Dolphins', 'AUD', 'EV', 'Aalborg University'),
  ('HofSpanung Motorsport e.V.', 'HSM', 'EV', 'Germany'),
  ('FS Team Tallinn', 'FSTT', 'EV', 'Tallinn University of Technology'),
  ('Team Starcraft', 'TSC', 'EV', 'Germany'),
  ('Elefant Racing Bayreuth', 'ERB', 'EV', 'University of Bayreuth'),
  ('UGRacing', 'UGR', 'EV', 'Germany'),
  ('Team Spark', 'SPARK', 'EV', 'Germany'),
  ('Team Ojas Racing', 'TOJAS', 'EV', 'India'),
  ('Scuderia Mensa HS RheinMain Racing', 'SMR', 'EV', 'HS RheinMain'),
  ('Racetech Racing Team TU Bergakademie Freiberg e.V.', 'RTTUB', 'EV', 'TU Freiberg'),
  ('TecnoCampus Motorsports', 'TCM', 'EV', 'TecnoCampus'),
  ('Dynamics UPC Manresa', 'DUPC', 'EV', 'Universitat Politècnica de Catalunya'),
  ('UMD Racing e.V.', 'UMD', 'EV', 'Germany'),
  ('Riteh Racing Team', 'RITEH', 'EV', 'University of Rijeka'),
  ('RUB Motorsport', 'RUB', 'EV', 'Ruhr University Bochum'),
  ('ION Racing UiS', 'ION', 'EV', 'University of Stavanger'),
  ('Aixtreme Racing', 'AIXT', 'EV', 'Germany'),
  ('Formula Student FEUP', 'FSFEUP', 'EV', 'University of Porto'),
  ('STES Racing Electric', 'STES', 'EV', 'Spain'),
  ('METU Formula Racing', 'METU', 'EV', 'Middle East Technical University'),
  ('KOU Racing', 'KOU', 'EV', 'Koc University'),
  ('HFS Racing Team', 'HFS', 'EV', 'Germany'),
  ('SUAS Racing', 'SUAS', 'EV', 'Germany'),
  ('e-Tech Racing', 'ETECH', 'EV', 'Germany'),
  ('UH Racing', 'UHR', 'EV', 'Germany'),
  ('Team Crack Platoon', 'TCP', 'EV', 'Germany'),
  ('HSNR Racing', 'HSNR', 'EV', 'Hochschule Niederrhein'),
  ('Ignition Racing Team electric', 'IRT', 'EV', 'Germany'),
  ('E-Motion Rennteam Aalen e.V.', 'EMRA', 'EV', 'Aalen University'),
  ('Blue Flash Mobility Concepts', 'BFMC', 'EV', 'Germany'),
  ('UWB eRacing Team Pilsen', 'UWB', 'EV', 'University of West Bohemia'),
  ('Leiria Academic Racing Team', 'LART', 'EV', 'Polytechnic of Leiria'),
  ('Team Advantix', 'ADVX', 'EV', 'Germany'),
  ('e.gnition Hamburg', 'EGN', 'EV', 'Hamburg'),
  ('Paul Ifrim', 'PIFRIM', 'EV', 'Romania'),
  ('UPT Racing Team', 'UPT', 'EV', 'Politehnica University of Timișoara'),
  ('Turon Motorsport', 'TURON', 'EV', 'Hungary'),
  ('T.U.IASI Racing', 'TUIASI', 'EV', 'Technical University of Iași'),
  ('ESTU Racing', 'ESTU', 'EV', 'Turkey'),
  ('NED Racers Formula Student', 'NED', 'EV', 'Netherlands'),
  ('Formula UEM', 'FUEM', 'EV', 'Spain'),
  ('Togliatti Racing Team', 'TRT', 'EV', 'Russia'),
  ('Marseille Racing', 'MR', 'EV', 'Marseille'),
  ('UJI Motorsport', 'UJI', 'EV', 'Universitat Jaume I'),
  ('TU-Sofia Racing', 'TUSOF', 'EV', 'Technical University of Sofia'),
  ('CRT Universidad de Córdoba', 'CRTUC', 'EV', 'Universidad de Córdoba'),
  ('NUST Formula Student Team', 'NUST', 'EV', 'NUST Pakistan'),
  ('SAU FORMULA', 'SAU', 'EV', 'Turkey'),
  ('Cukurova Racing', 'CUKU', 'EV', 'Çukurova University'),
  ('Kingston racing', 'KING', 'EV', 'Kingston University')
ON CONFLICT (code) DO NOTHING;

-- Ensure admin profile has login_approved and app_role
UPDATE public.user_profiles
SET login_approved = true, app_role = 'admin'
WHERE email = 'antonis.ntwnas@gmail.com';

-- Alternative: Update existing user_profiles by email with old site data.
-- Use this when users have already signed up on the NEW site (new IDs).
-- Run this instead of 003 if you did not migrate auth.users with the old IDs.
--
-- This creates a temp table with the old profile data, then updates user_profiles
-- where email matches. Created_at is left unchanged.

CREATE TEMP TABLE _old_profiles (
  email text PRIMARY KEY,
  first_name text,
  last_name text,
  father_name text,
  phone text,
  emergency_contact text,
  campsite_staying boolean,
  ehic_number text,
  profile_completed boolean,
  team_lead boolean,
  app_role text,
  university_name text,
  faculty_advisor_name text,
  faculty_advisor_position text,
  billing_address text,
  vat_id text,
  login_approved boolean
);

INSERT INTO _old_profiles VALUES
  ('enesorman@trakya.edu.tr', 'Enes', 'ORMAN', 'Erdal', '+90 541 767 1274', '+90 505 645 1481', true, null, false, true, 'viewer', 'Trakya University', 'Oguzhan ERDEM', 'Prof. Dr.', 'Trakya University Foundation I. Murat Mah. Gungor Mazlum Cad. Basari 77 Sitesi D Blok D:2 Edirne / Turkey', 'TR859 055 98 65', false),
  ('huseyinkocamis@std.iyte.edu.tr', 'Hüseyin Poyraz', 'Kocamış', 'Ahmet', '+90 543 517 2920', '+90 545 487 08 02', true, null, false, true, 'viewer', 'Izmir Institute of Technology', 'Büşra Karaş Apetrei', 'Lecturer', 'İzmir Yüksek Teknoloji Enstitüsü Vakfı İzmir Teknoloji Geliştirme Bölgesi Teknopark İzmir A1 Blok No:32 Gülbahçe / Urla / İZMİR 35430 Turkey', '4840084586 Kemeraltı Vergi Dairesi (Turkish VAT)', false),
  ('paul.ifrim@student.tuiasi.ro', 'Paul', 'Ifrim', 'Ciprian', '+40787661942', '+40766901229', true, null, true, true, 'viewer', 'Technical University Gheorghe Asachi Iasi', 'Virlan Bogdan', 'Professor', 'Strada Rândunica 2', 'RO14771323', false),
  ('m.lahlal@glracing.de', 'Mohamed', 'Lahlal', 'Majid', '+4915733566181', '+491633920045', true, null, false, true, 'viewer', 'Bergische Universität Wuppertal', 'Marco Kuhlmeier', 'Senior Engineer', 'Gaußstraße 20', null, false),
  ('formulastudentmacedonia@gmail.com', 'Stefan', 'Stojanov', 'Toni', '+389 78 448 486', '+389 78 335 491', true, null, false, true, 'viewer', 'Ss. Cyril and Methodius University in Skopje (UKIM)', 'Dame Dimitrovski', 'Professor', 'Rugjer Boshkovikj 18, Skopje, 1000, North Macedonia', '4057024568799', false),
  ('t.theodorou@glracing.de', 'Theodoros', 'Theodorou', 'Panagiotis', '+4915738822541', '+4917661069705', true, null, false, false, 'viewer', 'Bergische Universität Wuppertal', 'Dr. Marco Kuhlmeier', 'Senior Engineer', 'Gaußstraße 20, 42119 Wuppertal', null, false);

UPDATE public.user_profiles u
SET
  first_name = o.first_name,
  last_name = o.last_name,
  father_name = o.father_name,
  phone = o.phone,
  emergency_contact = o.emergency_contact,
  campsite_staying = o.campsite_staying,
  ehic_number = o.ehic_number,
  profile_completed = o.profile_completed,
  team_lead = o.team_lead,
  app_role = o.app_role::public.user_role,
  university_name = o.university_name,
  faculty_advisor_name = o.faculty_advisor_name,
  faculty_advisor_position = o.faculty_advisor_position,
  billing_address = o.billing_address,
  vat_id = o.vat_id,
  login_approved = o.login_approved,
  updated_at = now()
FROM _old_profiles o
WHERE u.email = o.email;

DROP TABLE _old_profiles;

-- Transfer old user_profiles from previous site to new Supabase project.
-- PREREQUISITE: The corresponding auth users must already exist in auth.users with these exact IDs.
-- If they do not, this INSERT will fail with a foreign key violation.
-- To migrate auth users from the old project, use Supabase Dashboard (old project) to export
-- or recreate users on the new project (e.g. invite by email, or use Admin API), then run
-- this migration. If users sign up again on the new site they get new IDs; in that case
-- update user_profiles by email instead of inserting with old IDs.

INSERT INTO public.user_profiles (
  id, email, first_name, last_name, father_name, phone, emergency_contact,
  campsite_staying, ehic_number, team_id, profile_completed, created_at, updated_at,
  team_lead, app_role, university_name, faculty_advisor_name, faculty_advisor_position,
  billing_address, vat_id, login_approved
)
VALUES
  (
    '103ff3d7-ecfb-4a0c-af8e-3101f65aaa1d',
    'enesorman@trakya.edu.tr',
    'Enes', 'ORMAN', 'Erdal',
    '+90 541 767 1274', '+90 505 645 1481',
    true, null, null, false,
    '2026-01-31 12:36:08.82956+00', '2026-01-31 12:36:08.82956+00',
    true, 'viewer',
    'Trakya University', 'Oguzhan ERDEM', 'Prof. Dr.',
    'Trakya University Foundation I. Murat Mah. Gungor Mazlum Cad. Basari 77 Sitesi D Blok D:2 Edirne / Turkey',
    'TR859 055 98 65',
    false
  ),
  (
    '187e4a88-0790-4b13-a549-1c6c3adf7575',
    'huseyinkocamis@std.iyte.edu.tr',
    'Hüseyin Poyraz', 'Kocamış', 'Ahmet',
    '+90 543 517 2920', '+90 545 487 08 02',
    true, null, null, false,
    '2026-01-30 15:04:10.165909+00', '2026-01-30 15:04:10.165909+00',
    true, 'viewer',
    'Izmir Institute of Technology', 'Büşra Karaş Apetrei', 'Lecturer',
    'İzmir Yüksek Teknoloji Enstitüsü Vakfı İzmir Teknoloji Geliştirme Bölgesi Teknopark İzmir A1 Blok No:32 Gülbahçe / Urla / İZMİR 35430 Turkey',
    '4840084586 Kemeraltı Vergi Dairesi (Turkish VAT)',
    false
  ),
  (
    '2fcf8897-41b2-4fa1-93da-a8016801ca31',
    'paul.ifrim@student.tuiasi.ro',
    'Paul', 'Ifrim', 'Ciprian',
    '+40787661942', '+40766901229',
    true, null, null, true,
    '2026-01-30 15:22:57.374629+00', '2026-01-30 15:32:49.637378+00',
    true, 'viewer',
    'Technical University Gheorghe Asachi Iasi', 'Virlan Bogdan', 'Professor',
    'Strada Rândunica 2',
    'RO14771323',
    false
  ),
  (
    '474019a2-e885-4342-a51e-95001d29cf30',
    'm.lahlal@glracing.de',
    'Mohamed', 'Lahlal', 'Majid',
    '+4915733566181', '+491633920045',
    true, null, null, false,
    '2026-01-30 18:53:09.845388+00', '2026-01-30 18:53:09.845388+00',
    true, 'viewer',
    'Bergische Universität Wuppertal', 'Marco Kuhlmeier', 'Senior Engineer',
    'Gaußstraße 20',
    null,
    false
  ),
  (
    'd28994f5-8b05-4c0d-a88c-44d3888b2ab4',
    'formulastudentmacedonia@gmail.com',
    'Stefan', 'Stojanov', 'Toni',
    '+389 78 448 486', '+389 78 335 491',
    true, null, null, false,
    '2026-01-31 15:39:51.015998+00', '2026-01-31 15:39:51.015998+00',
    true, 'viewer',
    'Ss. Cyril and Methodius University in Skopje (UKIM)', 'Dame Dimitrovski', 'Professor',
    'Rugjer Boshkovikj 18, Skopje, 1000, North Macedonia',
    '4057024568799',
    false
  ),
  (
    'fdc2f9d3-c28a-4f0c-8351-8eb42038acb7',
    't.theodorou@glracing.de',
    'Theodoros', 'Theodorou', 'Panagiotis',
    '+4915738822541', '+4917661069705',
    true, null, null, false,
    '2026-01-30 18:56:59.97881+00', '2026-01-30 18:56:59.97881+00',
    false, 'viewer',
    'Bergische Universität Wuppertal', 'Dr. Marco Kuhlmeier', 'Senior Engineer',
    'Gaußstraße 20, 42119 Wuppertal',
    null,
    false
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  father_name = EXCLUDED.father_name,
  phone = EXCLUDED.phone,
  emergency_contact = EXCLUDED.emergency_contact,
  campsite_staying = EXCLUDED.campsite_staying,
  ehic_number = EXCLUDED.ehic_number,
  team_id = EXCLUDED.team_id,
  profile_completed = EXCLUDED.profile_completed,
  updated_at = EXCLUDED.updated_at,
  team_lead = EXCLUDED.team_lead,
  app_role = EXCLUDED.app_role,
  university_name = EXCLUDED.university_name,
  faculty_advisor_name = EXCLUDED.faculty_advisor_name,
  faculty_advisor_position = EXCLUDED.faculty_advisor_position,
  billing_address = EXCLUDED.billing_address,
  vat_id = EXCLUDED.vat_id,
  login_approved = EXCLUDED.login_approved;

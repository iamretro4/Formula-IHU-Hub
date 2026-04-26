-- =====================================================
-- Formula IHU Hub - 2026 Inspection Checklists
-- Migration: 030_pop_checklist_templates_2026.sql
-- =====================================================

-- 1. Add vehicle_class to checklist_templates if not exists
ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS vehicle_class public.vehicle_class;

-- 2. Clear existing templates to start fresh with 2026 data
TRUNCATE TABLE checklist_templates CASCADE;

-- 3. Insert new templates
INSERT INTO checklist_templates (inspection_type_id, section, item_code, description, required, order_index, vehicle_class) VALUES
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_22', '[IN5.1.1] Car in ready to race condition and clean', true, 1, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_23', '[IN5.1.1] Check bracelet for tallest driver', true, 2, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_24', '[T2.2.1] GROUND CLEARANCE +30mm', true, 3, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_25', '[T2.5.1] SUSPENSION

The vehicle must be equipped with fully operational front and rear suspension systems including shock absorbers and a usable wheel travel of at least 50mm and a minimum jounce of 25mm with driver seated.', true, 4, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_26', '[T5.2] HARNESS TYPE

A six or seven point harness is installed with the one of the following certifications:

• SFI Specification 16.1, SFI Specification 16.5,SFI Specification 16.6
• or FIA specification 8853/2016.

Date on belts must be valid:
SFI spec harnesses must be replaced following December 31st of the 2nd year after the date
of manufacture as indicated by the label. FIA spec harnesses must be replaced following
December 31st of the year marked on the label.', true, 5, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_NOTE', '[T5.1.3
T5.1.4] DRIVING POSITION

Note reclined or upright driving position:
upright position – Position with a seat back angled at 30° or less from the vertical
reclined position – Position with a seat back angled at more than 30° from the vertical', true, 6, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - Scrutineer check ', 'MECHANICAL_MECH1_c3c91f', 'Must pass over pelvic area between 45 - 65 deg. to horizontal for upright driver, 60-80 deg. for reclined. The lap belts must not be routed over the sides
of the seat. Pivoting mounting with eye bolts or
shoulder bolts attached securely to primary structure.', true, 7, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - Scrutineer check ', 'MECHANICAL_MECH1_28', '[T5.4] LAP BELT

• Securely attached to Primary Structure

• Upright: between 45° & 60° from horizontal

• Reclined: between 60° & 80° from horizontal

• From anchor point straight to drivers body

• In side view it must be capable of pivoting freely', true, 8, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - Scrutineer check ', 'MECHANICAL_MECH1_29', '[T5.5] SHOULDER HARNESS 

• Width: Without HANS Device: 75mm, With HANS Device: 50mm (T5.2.1)

• 180-230 mm apart measured center to center

• Between -20° & +10° from horizontal

• Tilt lock adjuster

• From anchor point straight to drivers body

• Must not pass through the firewall', true, 9, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - Scrutineer check ', 'MECHANICAL_MECH1_30', '[T5.6] ANTI-SUBMARINE BELT

• With the belts going vertically down from the groin, or angled up to 20° rearwards. The anchorage points should be approximately 100 mm apart.
      OR 
• Anchorage points must be on the primary structure at or near the lap belt anchorages

• can use the same attachment point as the lap belts', true, 10, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - Scrutineer check ', 'MECHANICAL_MECH1_31', '[T5.3.2] Harnesses, belts and straps must not pass through a firewall, i.e. all harness attachment points must be on the driver''s side of any firewall.', true, 11, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - Scrutineer check ', 'MECHANICAL_MECH1_32', '[T5.3.3] The lap belts and anti submarine belts must not be routed over the sides of the seat. 

• Where the belts or harness pass through a hole in the seat, the seat must be rolled 
or grommeted to prevent chafing of the belts.', true, 12, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - SAFETY CHECKS with TALLEST dri', 'MECHANICAL_MECH1_No.', '[Rule No] Checkpoint', true, 13, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_33', '[T5.7.2] • Be vertical or near vertical in side view.', true, 14, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_34', '• Minimum thickness of 40mm', true, 15, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_35', '• Be padded with an energy absorbing material:
-that meets either the SFI 45.2 standard
-or is listed in the FIA technical list n°17 as a type B material for single seater cars', true, 16, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_36', '• Have a minimum width of 150 mm
• Have a minimum height of 150 mm', true, 17, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_37', '• Be located so that for each driver:

– The restraint is no more than 25mm away from the back of the driver''s helmet, with the driver in their normal driving position.

– The contact point of the back of the driver''s helmet on the head restraint is no less than 50mm from any edge of the head restraint.', true, 18, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_38', '[T5.7.3] • The head restraint and its mounting must withstand a force of 890N applied in the rearward direction at any point on its surface.', true, 19, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_39', '[T5.8.1] Roll bar or bracing that could be hit by driver''s helmet must be covered with 12 mm thick padding;

• SFI spec 45.1 or FIA 8857-2001

Gently move the driver''s head to make sure that any object that comes in contact with it is covered by padding, or has sufficient clearance.

Pay attention to the connections of the shuttdown buttons mounted on the Main Hoop.', true, 20, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_40', '[T4.9.1] VEHICLE CONTROLS

• All vehicle controls must be operated from inside the cockpit without any part of the driver, e.g. hands, arms or elbows, being outside the vertical planes tangent to the outermost surface of the side impact structure.', true, 21, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_42', '[T4.3.1] MAIN HOOP & FRONT HOOP HEIGHTS
 
When seated normally and restrained by the driver''s restraint system, the helmet of the tallest driver must:

• Be a minimum of 50mm away from the straight line drawn from the top of the main hoop to the top of the front hoop.

• Be a minimum of 50mm away from the straight line drawn from the top of the main hoop to the lower end of the main hoop bracing if the bracing extends rearwards.

• Be no further rearwards than the rear surface of the main hoop if the main hoop bracing extends forwards.', true, 22, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_43', 'DRIVER''S FOOT PROTECTION

• The feet of the driver must within the primary structure in all views when touching the pedals', true, 23, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_44', '[T11.4.4] SHUTDOWN BUTTONS

One shutdown button serves as a cockpit-mounted shutdown button and must
• have a minimum diameter of 24mm
• be located in easy reach of a belted-in driver
• be alongside of the steering wheel and unobstructed by the steering wheel or any other part of the vehicle
• the international electrical symbol consisting of a red spark on a white-edged blue triangle must be affixed in close proximity', true, 24, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_45', '[T11.11] CAMERA MOUNTS 

The body of any video/photographic camera which is not exclusively used as sensor for the AS unit must be secured at a minimum of two points on different sides of the camera body. If a tether is used to restrain the camera, the tether length must be limited so that the camera cannot contact the driver.', true, 25, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_46', '[T2.9.1] Wheelbase has to be a minimum of 1525 mm', true, 26, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_72150b', 'APPROVAL STATUS', true, 27, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_MECH 1', 'Approval (Control box) (DON''T CHANGE MANUALLY)', true, 28, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - BODYWORK & AERODYNAMICS', 'MECHANICAL_MECH1_No._29', '[Rule No] Checkpoint', true, 29, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - BODYWORK & AERODYNAMICS', 'MECHANICAL_MECH1_99', '[T2.3.1] • No large holes in bodywork, except for cockpit opening. Minimal openings around the front suspension and steering system
components are allowed.', true, 30, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - BODYWORK & AERODYNAMICS', 'MECHANICAL_MECH1_100', '[T2.3.2] In any side view in front of the cockpit opening and outside the area defined in T8.2 all
parts of the bodywork must have no external concave radii of curvatures. Any gaps 
between bodywork and other parts must be reduced to a minimum.', true, 31, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - BODYWORK & AERODYNAMICS', 'MECHANICAL_MECH1_101', '[T4.7.1] FLOOR PANELS

• Floor panel installed from foot area until firewall. Gaps must be less than 3mm

• Deflection of floor panels which can ocure with a seated driver or during a race can''t cause a gap greater than 3mm

• Enclosed chassis structures, structures between the chassis and the ground and every local minimum that can accumulate fluids must have two venting holes of at least 25mm diameter in the lowest part of the structure to prevent accumulation of liquids. An undertray assembly must not be able to connect the drainage holes in the adjacent sides of a firewall (Grey Area)', true, 32, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - AERO GENERAL ', 'MECHANICAL_MECH1_102', '[T8] • All wings securely attached, deflection may not exceed 25mm when a force of 50 N is placed at any random place in any random direction locally or 10mm when a force of 200N is applied at an surface area of 225cm2', true, 33, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - AERO GENERAL ', 'MECHANICAL_MECH1_103', '[T8] • Front facing edges off aero dives must have a radius of 5 mm if horizontal and 3 mm if vertical and 38mm radius at 45° at the nosecone', true, 34, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - AERO GENERAL ', 'MECHANICAL_MECH1_104', '• Attachment of the rear wing must be in the nodes of the MAIN HOOP (MAIN HOOP BRACINGS)', true, 35, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - AERO GENERAL ', 'MECHANICAL_MECH1_105', '[T8] No parts are allowed within the 75 mm keep out zone (see image below)', true, 36, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - 106 Scrutineer check ', 'MECHANICAL_MECH1_107', '[T8] FRONT AERO (EV - WITH ACCUMULATOR STICKER AND ACCUMULATOR INSIDE)
Measurements according T8 aerodynamic devices, figure 14', true, 37, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - 106 Scrutineer check ', 'MECHANICAL_MECH1_108', '[T8] REAR AERO  (EV - WITH ACCUMULATOR STICKER AND ACCUMULATOR INSIDE)
Measurements according T8 aerodynamic devices, figure 14', true, 38, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - 109 Scrutineer check ', 'MECHANICAL_MECH1_110', '[EV4.10.8] TSAL

The TSAL must:

•Be located lower than the highest point of the main hoop and including the mounting within the roll over protection envelope ,seeT1.1.15.
 
•Be no lower than 75mm from the highest point of the main hoop.

•Not be able to contact the driver''s helmet in any circumstances. 

The entire illuminated surface of the TSAL must be clearly visible: 

•Except for angles less than 10° which are blocked by the main hoop. 

•From a point 1.60m vertically from ground level  within 3m horizontal radius from theTSAL. 

•In direct sun light.', true, 39, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2 ', 'MECHANICAL_MECH2_47', '[T3.6] Approved SES', true, 1, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2 ', 'MECHANICAL_MECH2_48', '[A5.7] Approved SESA (if applicable, monocoque only)', true, 2, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2 ', 'MECHANICAL_MECH2_49', '[T3.18] IA test speciment and approved IA data (except for teams with a standard IA)', true, 3, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2 ', 'MECHANICAL_MECH2_50', '[T3.5] Laminate test specimens', true, 4, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - GENERAL', 'MECHANICAL_MECH2_No.', '[Rule No] Checkpoint', true, 5, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - GENERAL', 'MECHANICAL_MECH2_51', '[T3.1] The chassis has to be constructed with node-to-node triangles: All structural frame members must meet the min. material requirements:
• Two roll hoops that are braced
• A front bulkhead with support system and IA
• Side impact structures
• All hoops and bracings must meet the min. material requirements', true, 6, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT IMPACT PROTECTION (REMOV', 'MECHANICAL_MECH2_No._7', '[Rule No] Checkpoint', true, 7, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ASSEMBLY (IA', 'MECHANICAL_MECH2_52', '[T3.17.6] • The attachment of the IA assembly must be designed to provide an adequate load path for transverse and vertical loads in the event of off-center and off-axis impacts. 

• Segmented foam attenuators must have the segments bonded together to prevent sliding or parallelogramming.', true, 8, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ASSEMBLY (IA', 'MECHANICAL_MECH2_53', '[T3.16.6
T3.17.3] BOLTED

• If the IA assembly is bolted to the FBH,  it must be the same size as the outside dimensions of the front bulkhead

• One 8mm metric grade 8.8 bolt must be used for every 200mm of reference perimeter. Smaller but more bolts may be used if equivalency is shown. The bolts are considered critical fastenerts (T10)

Check for positive locking', true, 9, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ASSEMBLY (IA', 'MECHANICAL_MECH2_54', 'WELDED

• If it is welded to the front bulkhead, it must extend at least to the centerline of the front bulkhead tubing in all directions.', true, 10, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ASSEMBLY (IA', 'MECHANICAL_MECH2_55', '• The AIP must not extend past the outside edges of the front bulkhead.', true, 11, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ', 'MECHANICAL_MECH2_56', '[T3.17.2] • At least 100mm high and 200mm wide for a minimum distance of 200mm forward
of the front bulkhead.', true, 12, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ', 'MECHANICAL_MECH2_57', '[T3.17.2] • No portion of the required 100 ×200 ×200 mm3 volume of the IA can be positioned
more than 350 mm above the ground.', true, 13, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ', 'MECHANICAL_MECH2_58', '[T3.17.2] • Attached securely and directly to the Anti Intrusion Plate (AIP).

•Aerodynamic support chassis attachment
point must be located rearward of the AIP (T 3.20.2)', true, 14, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ', 'MECHANICAL_MECH2_59', '[T3.17.5] • Attached to the AIP by a minimum of four 8 mm metric grade 8.8 bolts. The
bolts are considered critical fasteners and must comply with T 10.

• Attached to the AIP using adhesive must be able to carry a load of 60kN in any direction.', true, 15, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ', 'MECHANICAL_MECH2_60', '[T3.17.7] For ''''standard'''' FSAE IAs:

• If the FBH width is larger than 400 mm and/or its height is larger than
350 mm a diagonal or X-bracing that is a front bulkhead support tube or an approved
equivalent per T 3.2, must be included in the front bulkhead or equivalent for monocoque bulkheads.

• Must use a 1.5 mm solid steel AIP that is welded along its full perimeter to a steel
bulkhead or use a 4 mm solid aluminium AIP that is bolted to any bulkhead with a
minimum of eight 8 mm metric grade 8.8 bolts.

• The adhesive used to mount the "standard" IA to the AIP has a shear strength of at least 24 MPa.', true, 16, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ', 'MECHANICAL_MECH2_61', '[T3.17.3
T3.17.4] ANTI INTRUSION PLATE (AIP)

• Thickness = min 1.5mm solid steel or 4.0mm aluminium. 

• Alternative AIP designs are permissible if equivalency to T 3.17.3 is proven by physical testing as in T 3.19.2. (Check SES and IAD)', true, 17, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT STRUCTURE', 'MECHANICAL_MECH2_No._18', '[Rule No] Checkpoint', true, 18, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT STRUCTURE', 'MECHANICAL_MECH2_62', '[T3.13] FRONT BULKHEAD

•  Any alternative material used for the front bulkhead must have a perimeter shear strength equivalent to a 1.5 mm thick steel plate.', true, 19, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT STRUCTURE', 'MECHANICAL_MECH2_63', '[T3.14] FRONT BULKHEAD SUPPORT

• Must support the FBH back to Front Hoop by minimum 3 tubes on each side

UPPER MEMBER

- attached to FBH maximum 50mm from the top and to the FH maximum of 50mm bellow the upper SIS member

- If attachmentpoint is more than 100mm above the upper SIS member, triangulation is needed to transfer load to the MH

LOWER MEMBER

- attached to the base of the FBH and the base of the FH

DIAGONAL MEMBER

- must triangulate the upper and lower member node-to-node', true, 20, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT STRUCTURE', 'MECHANICAL_MECH2_64', '[T3.12] FRONT HOOP BRACING

• The front hoop bracing attaches on each side of the front hoop as well as the structure forward of the driver''s feet. A minimum of two tubes without any bends must be straight on a line in side view of the frame and must have a minimum distance of 100 mm between each other at the front hoop .

• Attached to front hoop not lower than 50mm from top-most surface of the front hoop (not applicable for monocoque).

• If the front hoop is inclined more than 10° to the rear, additional braces extending rearwards are required.

•Openings or reductions in effective panel height within a composite front hoop bracing or a composite front bulkhead support must not exceed a total area of 625 cm2.', true, 21, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.10)', 'MECHANICAL_MECH2_65', '[T3.2.1] • Material must be metal with a wall thickness at least 2 mm.', true, 22, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.10)', 'MECHANICAL_MECH2_66', '[T3.10.3] •  In side view, no part of the front hoop can be inclined more than 20° from vertical.', true, 23, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.10)', 'MECHANICAL_MECH2_67', '[T3.8.4] •  The lower roll hoop tubing attachment points must be within 50 mm of the
endpoints of the roll hoop.', true, 24, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.10)', 'MECHANICAL_MECH2_8a08b9', 'FRONT HOOP ATTACHMENT', true, 25, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.10)', 'MECHANICAL_MECH2_68', '• Check if the submitted design matches the structure on the car', true, 26, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.10)', 'MECHANICAL_MECH2_69', '• Check proper manufacturing', true, 27, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.10)', 'MECHANICAL_MECH2_70', '[T3.10.5] BOLTED FH

• The front hoop requires six attachment points, two on each side connecting to the front bulkhead support structures and two connecting to the front hoop bracing, and must therefore show equivalency to 180 kN, as follows from T 3.16.1 and T 3.12.4.', true, 28, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.10)', 'MECHANICAL_MECH2_71', '[T3.16.3] • Each attachment point requires a minimum of two 8 mm metric grade 8.8 bolts and steel backing plates with a minimum thickness of 2 mm.', true, 29, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.10)', 'MECHANICAL_MECH2_72', '[T10.1.4] • Check e/D of attachments (> 1.5 Hole Diameter)', true, 30, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.10)', 'MECHANICAL_MECH2_73', '[T3.10.6] LAMINATED FH

• Fully laminating the front hoop to the monocoque is acceptable. Fully laminating means that the hoop has to be encapsulated with laminate around its whole circumference, see figure 5. Equivalence to T 3.7.4 must be shown in the SES. The laminate encapsulating the front hoop must overlap by at least 25 mm on each side. It must have the same lay-up as the laminate that it is connecting to.

(The manufacuring quality is to be checked - dry areas, insufficient overlap, bad laminating quality)', true, 31, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP', 'MECHANICAL_MECH2_No._32', '[Rule No] Checkpoint', true, 32, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP', 'MECHANICAL_MECH2_74', '[T3.8
T3.9] MAIN HOOP

• The main hoop must be constructed of a single piece of uncut, continuous, closed section steel tubing.

• Material must be steel with a wall thickness at least 2 mm (T3.2.1).
 (inspecion holes if needed)

• In side view the portion of the main hoop which is above its upper attachment point to the side impact structure must be inclined less than 10° from vertical.

•In side view any bends in the main hoop above its upper attachment point to the primary structure must be braced to a node of the main hoop bracing support structure with tubing meeting the requirements of main hoop bracing.

• In side view any portion lower than the upper attachment point to the side impact structure must be inclined either forward or not more than 10° rearward.

•The lower roll hoop tubing attachment points must be within 50 mm of the
endpoints of the roll hoop. (T3.8.4).', true, 33, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP', 'MECHANICAL_MECH2_75', '[T3.11] MAIN HOOP BRACING

• Material must be steel and the bracings must be straight.

• Bracings must be attached to the main hoop no lower than 160 mm below the top-most surface of the main hoop. The angle between bracings and main hoop must be greater than 30 deg.

• If any item which extends outside of the primary structure is attached to the main hoop braces, additional bracing is required to prevent bending loads in a rollover situation. 
(Usually rear wing supports, aplies to anything that induces loads to the Main Hoop Bracing tubes)', true, 34, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP', 'MECHANICAL_MECH2_76', '[T5.5] SHOULDER HARNESS BAR / MOUNTING

• Minimum thickness 2mm (T3.2.1)

• Must be steel, or tested and calculated to show equivalence.

• Must not transfer load to the Main Hoop Bracing without additional triangulation-bracing

• Check attachment calculations on SES and compare the attachments on the car with the ones submitted', true, 35, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP ATTACHMENTS ', 'MECHANICAL_MECH2_77', '• Check if the submitted design matches the structure on the car', true, 36, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP ATTACHMENTS ', 'MECHANICAL_MECH2_78', '[T3.16.3
T3.16.4] • Each attachment point requires a minimum of two 8 mm metric grade 8.8 bolts and steel backing plates with a minimum thickness of 2 mm.

• Or one 10 mm metric grade 8.8 bolt, if the bolt is on the centerline of the tube.', true, 37, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP ATTACHMENTS ', 'MECHANICAL_MECH2_79', '[T10.1.4] • Check e/D of attachments (> 1.5 Hole Diameter)', true, 38, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP ATTACHMENTS ', 'MECHANICAL_MECH2_80', '[T10.1.1
T10.2.2] • Check positive locking (nylon nuts allowed if area is less than 80 degrees)', true, 39, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP ATTACHMENTS ', 'MECHANICAL_MECH2_81', '• Check proper manufacturing', true, 40, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - TEMPLATE FITTING', 'MECHANICAL_MECH2_No._41', '[Rule No] Checkpoint', true, 41, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - TEMPLATE FITTING', 'MECHANICAL_MECH2_82', '[T4.1] COCKPIT OPENING

• Insert template 2 into cockpit. The firewall may not be removed. Teams are allowed to remove the seat, steering wheel and all padding

• Template passes down below the top of the Side Impact Structure (or 320mm above lowest point in car, monocoque only)', true, 42, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - TEMPLATE FITTING', 'MECHANICAL_MECH2_83', '[T4.2] COCKPIT INTERNAL CROSS SECTION

• Check if pedals are in most forward position. 

*MOST FORWARD = TOWARDS FRONT BULKHEAD
*REARWARDS = TOWARDS MAIN HOOP

• Insert template into cockpit. Steering wheel and padding may only be removed if no tools are required and the driver is able to do so from the driving position.

• Template passes through to 100mm from rearmost pedal face.', true, 43, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - TEMPLATE FITTING', 'MECHANICAL_MECH2_84', '[T5.9.1] DRIVER''S LEG PROTECTION 

• All moving, suspension and steering components and other sharp edges inside the cockpit between the front hoop and a vertical plane 100 mm rearward of the pedals, must be shielded with solid material.', true, 44, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - TEMPLATE FITTING', 'MECHANICAL_MECH2_85', '• Check if anything from the rear of the pedal box (brake lines, cables etc.) is forward than the inner FBH skin, or is crimped-crashed to it.', true, 45, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - TEMPLATE FITTING', 'MECHANICAL_MECH2_86', '[T4.3] PERCY

Insert percy into cockpit

The figure has to be positioned in the vehicle as follows:

• The seat adjusted to the rearmost position.
 (REARMOST = TOWARDS MAIN HOOP)

• The pedals adjusted to the frontmost position.
 (FRONTMOST = TOWARDS FRONT BULKHEAD)

• The bottom 200mm circle placed on the seat bottom. The distance between the center of the circle and the rearmost actuation face of the pedals must be minimum 915mm.

• The middle circle positioned on the seat back

• The upper 300mm circle positioned 25mm away from the head restraint.

• Top is at least 50mm below the line between the main hoop and front hoop', true, 46, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT STRUCTURES', 'MECHANICAL_MECH2_No._47', '[Rule No] Checkpoint', true, 47, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT STRUCTURES', 'MECHANICAL_MECH2_87', '[T3.15] SIDE IMPACT STRUCTURE (Τ3.15)

• Must consist of at least three members on each side 

• UPPER MEMBER: must connect the front and main hoop and must be at a height of 240mm and 320 mm above the lowest inside chassis point between the front and main hoop

• LOWER MEMBER: must connect the bottom of the main hoop and the bottom of the front hoop

• DIAGONAL MEMBER: must triangulate the upper and lower member between the roll hoops node-to-node.', true, 48, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - HARNESS ATTACHMENTS', 'MECHANICAL_MECH2_No._49', '[Rule No] Checkpoint', true, 49, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - HARNESS ATTACHMENTS', 'MECHANICAL_MECH2_88', '• Check if the submitted design matches the structure on the car', true, 50, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - HARNESS ATTACHMENTS', 'MECHANICAL_MECH2_89', '• Check if the submitted test configuration matches the structure on the car', true, 51, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - HARNESS ATTACHMENTS', 'MECHANICAL_MECH2_90', '[T4.5.1
T4.5.2] • If attached to monocoque one 10 mm metric grade 8.8 bolt or two 8 mm metric grade 8.8 bolts (or bolts of an equivalent standard) and steel backing plates with a minimum thickness of 2 mm. If no backing plates are used check thorouglhy the testing presented

• If attached to the primary structure using brackets must use two 8 mm metric grade 8.8 or stronger fasteners.', true, 52, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - HARNESS ATTACHMENTS', 'MECHANICAL_MECH2_91', '[T10.1.1
T10.2.2] • Check positive locking (nylon nuts allowed if area is less than 80 degrees)', true, 53, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - HARNESS ATTACHMENTS', 'MECHANICAL_MECH2_92', '[T4.5.5] • Minimum thickness 1.6mm steel or 4mm aluminium (if not, testing to be presented)', true, 54, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_No._55', '[Rule No] Checkpoint', true, 55, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_981dfd', 'ACCUMULATOR CONTAINER ATTACHMENTS 
 (EV - WITH ACCUMULATOR STICKER AND ACCUMULATOR INSIDE)', true, 56, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_93', '• Check if the submitted design matches the structure on the car', true, 57, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_94', '[EV5.5.13] • Any brackets used to mount the TSAC must be made of steel 1.6 mm thick or aluminum 4 mm thick and must have gussets to carry bending loads. Each attachment point including brackets, backing plates, and inserts, must be able to withstand 20 kN in any direction.', true, 58, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_95', '[EV5.5.5] •  Each attachment point requires steel backing plates with a minimum thickness of
2 mm. Alternate materials may be used for backing plates if equivalency is approved.
(Check SES)', true, 59, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_96', '[T10.1.4] • Check e/D of attachments (> 1.5 Hole Diameter)', true, 60, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_97', '[T10.1.1
T10.2.2] • Check positive locking (nylon nuts allowed if area is less than 80 degrees)', true, 61, 'EV') ON CONFLICT (inspection_type_id, item_code, vehicle_class) DO NOTHING;

INSERT INTO checklist_templates (inspection_type_id, section, item_code, description, required, order_index, vehicle_class) VALUES
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_98', '• Check proper manufacturing', true, 62, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_3b2c0d', 'APPROVAL STATUS', true, 63, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_MECH 2', 'Approval (Control box) (DON''T CHANGE MANUALLY)', true, 64, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3_COOLING', '[T7.2] COOLING GENERAL', true, 1, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3__2', '[T 7.2.1
T 7.2.2] COOLANT FLUID
• TS components may only use plain water, air or oil as the coolant,  see T 1.2.2', true, 2, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3__3', '[T 7.2.3] • Cooling systems using plain water (except outboard wheel motors and their cooling hoses) must have a heat resistant (Permanently rated for at least 100 °C), rigid and rigidly mounted cover which meets the requirements of T 4.8.2.', true, 3, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3__4', '[T 7.2.8
T 7.2.6] • Any cooling overflow system must be equiped with a catch tank, located behind the firewall, below shoulder level

• Cooling catch cans minimal 10% fluid volume or 100ml, whichever is greater.', true, 4, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3__5', '[T 7.2.5] • Other fluids must have a minimum volume of 10% of the fluid being contained or 900 ml whichever is greater.', true, 5, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3__6', '• No fluid hoses out of the chassis or monocoque in direct line of sight of driver exceptions for in-wheel motors. Without stone-strike protection', true, 6, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3__7', '[T 7.2.7] • All parts of the engine cooling and lubrication system, including their mountings, must be rated for at least 120 °C or the temperatures the respective fluid may reach, whichever is higher.', true, 7, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3__8', '[T7.2.9] Any catch can must vent through a hose with a minimum internal diameter of 3mm down to the bottom level of the chassis and must exit outside the bodywork.', true, 8, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3__9', 'FLUID LEAKS

No type of fluid leak (Oil, water, grease, fuel, Brake fluid) is permitted', true, 9, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - DRIVE TRAIN SHIELDS AND GUARDS', 'MECHANICAL_MECH3__10', '[Rule No] Checkpoint', true, 10, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - DRIVE TRAIN SHIELDS AND GUARDS', 'MECHANICAL_MECH3__11', '[T7.3.1] Oil pump lower than chassis

• The lowest point of any lubrication system can only be lower than the line between the lowest point of the main hoop and the lowest chassis member behind the lubrication system if it is protected from hitting the ground by a structure mounted directly to the chassis.', true, 11, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - DRIVE TRAIN SHIELDS AND GUARDS', 'MECHANICAL_MECH3__12', '[T 7.3.2] Exposed rotating final drivetrain parts, such as gears, clutches, chains and belts must be fitted with scatter shields. Scatter shields and their mountings must:

• Be constructed of non-perforated 2 mm steel or 3 mm aluminium alloy 6061-T6.

•Cover chains and belts from the drive sprocket to the driven sprocket/chain wheel/belt or pulley.

• Start and end parallel to the lowest point of the driven sprocket/chain wheel/belt or pulley.

• Scatter shields for chains and belts must be centered on the centerline of the chain or belt and remain aligned with the chain or belt under all conditions.

• For non-metallic chains and belts: 3mm min. nonperforated aluminum alloy 6061-T6.

•The minimum width of the scatter shield should be at least three times the width of the chain or belt. (chain width is mesured at the thickest part of the chain, usualy on the pins)', true, 12, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - DRIVE TRAIN SHIELDS AND GUARDS', 'MECHANICAL_MECH3__13', '[T7.3.2] • All fasteners attaching scatter shields, guards and their mountings must be 6mm metric grade 8.8 or stronger and must comply with T10.1.', true, 13, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - DRIVE TRAIN SHIELDS AND GUARDS', 'MECHANICAL_MECH3__14', '[T7.3.5] • Finger guards are required to cover any parts that spin while the vehicle is stationary. Finger guards may be made of lighter material, sufficient to resist finger forces. Mesh or perforated material may be used but must prevent the passage of a 12mm diameter object through the guard.', true, 14, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - DRIVE TRAIN SHIELDS AND GUARDS', 'MECHANICAL_MECH3__15', '[T7.3.4] MOTORCASING

• Motorcasings must have a housing or separate scatter shield from non perforated 2 mm aluminium alloy 6061-T6 or equivalent. The scatter shield may be split into two equal sections, each 1 mm thick.', true, 15, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__16', '[Rule No] Checkpoint', true, 16, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__17', '[T 4.8.1] The firewall must separate the cockpit from all components of 

- hydraulic fluid except brake system and dampers
- flammable liquids
- the low voltage battery 
- any TS component (EV1.1.1)', true, 17, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__18', '[T 4.8.2] • The firewall must cover any straight line between the parts mentioned in T 4.8.1 and any part of the tallest driver below a plane 100 mm above the bottom of the helmet.', true, 18, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__19', '[T 4.6.2] HEAT INSULATION

• Adequate heat insulation must be provided to ensure that the driver is not able to contact any parts of the vehicle with a surface temperature above 60 °C. The insulation may be external to the cockpit or incorporated with the driver''s seat or firewall. The design must address all three types of heat transfer with the following minimum requirements between the heat source and the part that the driver could contact:

(a) Conduction insulation by:
(i) No direct contact, or
(ii) a heat resistant, conduction insulation material with a minimum thickness of
8 mm.

(b) Convection insulation by a minimum air gap of 25 mm.

(c) Radiation insulation by:
(i) A solid metal heat shield with a minimum thickness of 0.4 mm or
(ii) reflective foil or tape when combined with T 4.6.2.a.ii.', true, 19, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__20', '[T1.2.1
T 4.8.3] • The firewall must be a non-permeable surface made from a rigid, fire resistant material, see T 1.2.1, which must be rigidly mounted to the vehicle''s structure.

A material is considered Fire Retardant if it meets one of the following standards (ask for proof) : 

• UL94 V-0 for the minimum used material thickness

• FAR 25.853(a)(1)(i)

Equivalent standards are only accepted, if the team shows equivalence and this is approved by the officials prior to the event.', true, 20, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__21', '[T 4.8.4] • Any firewall must seal completely against the passage of fluids, especially at the sides and the floor of the cockpit.', true, 21, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__22', '[T 4.8.5] • Pass-throughs for wiring, cables, etc. are permitted if grommets are used to seal the passthrough.', true, 22, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__23', '[T 4.8.6] • Multiple panels may be used to form the firewall but must overlap at least 5mm and be sealed at the joints. Any sealing material must not be vital to the structural integrity of the firewall.', true, 23, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__24', '[T 4.8.7] The TS firewall between driver and TS components must be composed of two layers:

• One layer, facing the TS side, must be made of aluminium with a thickness of at least
0.5 mm. This part of the TS firewall must be grounded according to EV 3.1.

• The second layer, facing the driver, must be made of an electrically insulating and fire
retardant material, see T 1.2.1. The second layer must not be made of CFRP.

• The thickness of the second layer must be sufficient to prevent penetrating this layer
with a 4 mm wide screwdriver and 250 N of force.
A sample of the TS firewall must be presented at technical inspection.', true, 24, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__25', '[T 4.8.8] • Conductive parts, except for the chassis and firewall mounting points, may not protrude through the TS firewall or must be properly insulated on the driver''s side. The driver must not be able to touch uninsulated firewall mounting points while operating the vehicle.', true, 25, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__26', '[T 4.8.9] • TS parts outside of the envelope, see EV 4.4.3, do not need a firewall.', true, 26, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - BELOW CV CLASS ONLY', 'MECHANICAL_MECH3__27', '[False] Check box if car is EV', true, 27, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - BELOW CV CLASS ONLY', 'MECHANICAL_MECH3__28', 'APPROVAL STATUS', true, 28, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - BELOW CV CLASS ONLY', 'MECHANICAL_MECH3_APPROVAL', 'Approval (Control box) (DON''T CHANGE MANUALLY)', true, 29, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FREE PLAY', 'MECHANICAL_MECH4_160e3f', 'GUIDELINES

• Check the wheels'' free play in both TOE and CAMBER direction

- Play in camber direction can be treated with more leniency within reasonable levels.

- Play in TOE direction in REAR wheels must be barely existent 

- Force capable to rock the vehicle should be applied

- Larger wheels are usually expected to have more play (more leverage)

- While moving the wheels, inspect the A-arm mounting points on the chassis as well as the mounting points inside the rim.

- While moving the REAR wheels, inspect the TOE link mounting points (on the chassis and on the wheel assemby)

- If the suspension is mounted to the uprights with brackets, the brackets need to be rigid (check for deflections)', true, 1, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FREE PLAY', 'MECHANICAL_MECH4_176', '• FRONT LEFT', true, 2, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FREE PLAY', 'MECHANICAL_MECH4_177', '• FRONT RIGHT', true, 3, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FREE PLAY', 'MECHANICAL_MECH4_178', '• REAR LEFT', true, 4, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FREE PLAY', 'MECHANICAL_MECH4_179', '• REAR RIGHT', true, 5, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FASTENING ', 'MECHANICAL_MECH4_180', '[T2.6.1] WHEEL NUTS

• If a single nut is used to retain the wheel, a device must be incorporated to prevent loosening of the nut and the wheel. A second nut (jam nut) is not allowed.', true, 6, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FASTENING ', 'MECHANICAL_MECH4_181', '• Custom wheel nuts must show proof of good engineering practices. 
Purchased single nut systems must show proof of purchase.

- Ask for pretension force of the wheel lug assembly', true, 7, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FASTENING ', 'MECHANICAL_MECH4_182', 'No safety wiring for positive locking of center wheel nuts. Only proper industrially manufactured cotter pins, center lock wheel springs or mechanisms compliant with T10.2', true, 8, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FASTENING ', 'MECHANICAL_MECH4_183', '[T2.6.2
T2.6.3] WHEEL LUG BOLTS - STUDS - NUTS

• Wheel lug bolts and studs must be made of steel or titanium. The team must be able to show good engineering practice and providing adequate strength by calculations. Wheel lugbolts and studs must not be hollow.

• Aluminum wheel nuts may be used, but they must be hard anodized and in pristine condition.

• Wheel nuts must comply with T 10.2. An exception is made for commercially designed fasteners designated for wheels. In this case documentation must be presented together with proof of purchase, datasheets, calculations, proof of correct installment and other necessary documentation needed to prove their compliance.

- Ask for calculations that justify the design''s safety.', true, 9, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FASTENING ', 'MECHANICAL_MECH4_184', '• The assembly must be positively locked and be a mechanical connection (green example).

• Wheel studs may not be fastened/locked by friction only, e.g. a press fit (red example).

• Threaded studs are allowed as long as it is positively locked. 

• Off-the-self conical nuts as well as conical lug nut bolts are allowed if the correct pretension values are used.', true, 10, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM (T6) (VEHICLE ', 'MECHANICAL_MECH4_No.', '[Rule No] Checkpoint', true, 11, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM (T6) (VEHICLE ', 'MECHANICAL_MECH4_186', '[T2.8.1] • Steering systems using cables or belts for actuation are prohibited. 
This does not apply for autonomous steering actuators.', true, 12, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM (T6) (VEHICLE ', 'MECHANICAL_MECH4_187', '[T2.8.11] • Rear wheels steering maximum 6 degrees and with mechanical stops', true, 13, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM (T6) (VEHICLE ', 'MECHANICAL_MECH4_188', '[T10.2.6] • If adjustable tie-rod ends are used, a jam nut must be used to prevent loosening', true, 14, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING WHEEL', 'MECHANICAL_MECH4_189', '[T2.8.5
T2.8.7] • Steering wheel must be round, oval or near-oval with a quick release installed. No concave sections !

(Check quick release)', true, 15, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING WHEEL', 'MECHANICAL_MECH4_190', '[T2.8.6
T2.8.8] • The steering wheel must be no more than 250 mm rearward of the front hoop. This distance is measured horizontally, on the vehicle centerline, from the rear surface of the front hoop to the forward most surface of the steering wheel with the steering in any position.

• In any angular position, the top of the steering wheel must be no higher than the top-most surface of the front hoop.', true, 16, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING WHEEL', 'MECHANICAL_MECH4_191', '• Assess the steering wheel''s structural integrity by pushing it (from the handles) forwards to simulate breaking situation and backwards to simulate acceleration forces', true, 17, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM FREE PLAY', 'MECHANICAL_MECH4_192', '[T2.8.4] • Allowable steering system free play is limited to a total of 7° measured at the steering wheel.

- Position your foot against the wheel and slowly steer. Assess the force on your foot and the steering play existing.', true, 18, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM FREE PLAY', 'MECHANICAL_MECH4_193', '• Check for CONTACT between components in the wheel assembly 

(If in doubt, inspect again with the vehicle lifted and the wheels on)', true, 19, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM FREE PLAY', 'MECHANICAL_MECH4_733d74', 'FRONT LEFT', true, 20, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM FREE PLAY', 'MECHANICAL_MECH4_0b5079', 'FRONT RIGHT', true, 21, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM', 'MECHANICAL_MECH4_No._22', '[Rule No] Checkpoint', true, 22, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM', 'MECHANICAL_MECH4_194', '[T6.1.5] • No "Brake-by-wire" in manual mode.', true, 23, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM', 'MECHANICAL_MECH4_195', '[T6.1.1] • Hydraulic brake system that acts on all four wheels and is operated by a single control.', true, 24, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM', 'MECHANICAL_MECH4_196', '[T6.1.2] • Two independent hydraulic circuits. In case of leak or failure effective braking power maintained in on at least two wheels', true, 25, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM', 'MECHANICAL_MECH4_197', '[T6.1.5] • A single brake acting on a limited-slip differential is acceptable', true, 26, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM', 'MECHANICAL_MECH4_198', '[T6.1.3
T6.1.7] • Sealed to prevent leakage

• Unarmored plastic brake lines are prohibited.', true, 27, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM', 'MECHANICAL_MECH4_199', '[T6.1.8] • The brake system must be protected from failure of the drivetrain, see T 7.3.2, from touching any movable part and from minor collisions.

(rotating parts - gears, clutches, chains, belts etc must be fitted with scatter shield. Check protection of brae system)', true, 28, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM', 'MECHANICAL_MECH4_200', '[T6.1.9] Any part of the brake system must be within the surface envelope, see T1.1.18

•  No part of the braking system on the sprung part of the vehicle below the lower surface of the chassis', true, 29, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - !WHILE THE VEHICLE IS LIFTED, ', 'MECHANICAL_MECH4_No._30', '[Rule No] Checkpoint', true, 30, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - !WHILE THE VEHICLE IS LIFTED, ', 'MECHANICAL_MECH4_201', '[T2.8.3] STEERING SYSTEM STOPS

• Must have positive steering stops that prevent the steering linkages from
locking up. The stops must be placed on the rack and must prevent the tires and rims from contacting any other parts. Steering actuation must be possible during standstill.

(Check for collisions in the wheel assembly)', true, 31, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - !WHILE THE VEHICLE IS LIFTED, ', 'MECHANICAL_MECH4_b39f53', 'Guidelines

- Ask the teams to loosen the wheel nuts to jack the car up.

- Check for the proper position of the jacking device (use the points indicated by orange triangles if safe)

- Ask the team to remove the wheels', true, 32, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_No._33', '[Rule No] Checkpoint', true, 33, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_202', '[T 10.1.1
T 10.2.1] LOCKING:

The following fasteners are considered critical and have to be positively locked according to T10.2: 

• Steering System
• Braking system (Pedalbox)  
• Suspension System                       
• ETC
• Primary Structure (M2)
• Drivers harness (M2)
• Accumulator Container (M2)', true, 34, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_2c0ccd', 'FRONT LEFT', true, 35, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_a9ea29', 'A-ARMS and A-ARM MOUNTS', true, 36, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_203', '[T 10.2.4] • 2 threads minimum', true, 37, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_204', '[T 10.2.1] • Positive locking', true, 38, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_205', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 39, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_206', '• Check if the bolts are tight', true, 40, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_207', 'TIE ROD AND TIE ROD LENGTH ADJUSTING SYSTEM', true, 41, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_208', '[T 10.2.4] • 2 threads minimum', true, 42, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_209', '[T 10.2.1] • Positive locking', true, 43, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_210', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 44, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_211', '• Check if the bolts are tight', true, 45, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_212', 'PUSH/PULL ROD AND LENGTH ADJUSTING SYSTEM', true, 46, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_213', '[T 10.2.4] • 2 threads minimum', true, 47, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_214', '[T 10.2.1] • Positive locking', true, 48, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_215', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 49, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_216', '• Check if the bolts are tight', true, 50, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_217', 'BRAKE CALIPERS', true, 51, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_218', '[T 10.2.4] • 2 threads minimum', true, 52, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_219', '[T 10.2.1] • Positive locking', true, 53, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_220', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 54, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_221', '• Check if the bolts are tight', true, 55, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_222', 'BRAKE DISKS', true, 56, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_223', '[T 10.2.4] • 2 threads minimum', true, 57, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_224', '[T 10.2.1] • Positive locking', true, 58, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_225', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 59, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_226', '• Check if the bolts are tight', true, 60, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_227', 'FRONT RIGHT', true, 61, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_228', 'A-ARMS and A-ARM MOUNTS', true, 62, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_229', '[T 10.2.4] • 2 threads minimum', true, 63, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_230', '[T 10.2.1] • Positive locking', true, 64, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_231', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 65, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_232', '• Check if the bolts are tight', true, 66, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_233', 'TIE ROD AND TIE ROD LENGTH ADJUSTING SYSTEM', true, 67, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_234', '[T 10.2.4] • 2 threads minimum', true, 68, 'EV') ON CONFLICT (inspection_type_id, item_code, vehicle_class) DO NOTHING;

INSERT INTO checklist_templates (inspection_type_id, section, item_code, description, required, order_index, vehicle_class) VALUES
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_235', '[T 10.2.1] • Positive locking', true, 69, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_236', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 70, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_237', '• Check if the bolts are tight', true, 71, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_238', 'PUSH/PULL ROD AND LENGTH ADJUSTING SYSTEM', true, 72, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_239', '[T 10.2.4] • 2 threads minimum', true, 73, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_240', '[T 10.2.1] • Positive locking', true, 74, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_241', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 75, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_242', '• Check if the bolts are tight', true, 76, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_243', 'BRAKE CALIPERS', true, 77, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_244', '[T 10.2.4] • 2 threads minimum', true, 78, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_245', '[T 10.2.1] • Positive locking', true, 79, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_246', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 80, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_247', '• Check if the bolts are tight', true, 81, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_248', 'BRAKE DISKS', true, 82, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_249', '[T 10.2.4] • 2 threads minimum', true, 83, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_250', '[T 10.2.1] • Positive locking', true, 84, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_251', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 85, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_252', '• Check if the bolts are tight', true, 86, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_253', 'REAR LEFT', true, 87, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_254', 'A-ARMS and A-ARM MOUNTS', true, 88, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_255', '[T 10.2.4] • 2 threads minimum', true, 89, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_256', '[T 10.2.1] • Positive locking', true, 90, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_257', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 91, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_258', '• Check if the bolts are tight', true, 92, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_259', 'TOE LINK AND TOE LINK LENGTH ADJUSTING SYSTEM', true, 93, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_260', '[T 10.2.4] • 2 threads minimum', true, 94, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_261', '[T 10.2.1] • Positive locking', true, 95, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_262', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 96, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_263', '• Check if the bolts are tight', true, 97, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_264', 'PUSH/PULL RODS AND THEIR LENGTH ADJUSTING SYSTEM', true, 98, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_265', '[T 10.2.4] • 2 threads minimum', true, 99, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_266', '[T 10.2.1] • Positive locking', true, 100, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_267', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 101, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_268', '• Check if the bolts are tight', true, 102, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_269', 'BRAKE CALIPERS', true, 103, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_270', '[T 10.2.4] • 2 threads minimum', true, 104, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_271', '[T 10.2.1] • Positive locking', true, 105, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_272', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 106, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_273', '• Check if the bolts are tight', true, 107, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_274', 'BRAKE DISKS', true, 108, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_275', '[T 10.2.4] • 2 threads minimum', true, 109, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_276', '[T 10.2.1] • Positive locking', true, 110, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_277', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 111, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_278', '• Check if the bolts are tight', true, 112, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_279', 'REAR RIGHT', true, 113, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_280', 'A-ARMS and A-ARM MOUNTS', true, 114, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_281', '[T 10.2.4] • 2 threads minimum', true, 115, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_282', '[T 10.2.1] • Positive locking', true, 116, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_283', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 117, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_284', '• Check if the bolts are tight', true, 118, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_285', 'TOE LINK AND TOE LINK LENGTH ADJUSTING SYSTEM', true, 119, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_286', '[T 10.2.4] • 2 threads minimum', true, 120, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_287', '[T 10.2.1] • Positive locking', true, 121, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_288', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 122, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_289', '• Check if the bolts are tight', true, 123, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_290', 'PUSH/PULL RODS AND THEIR LENGTH ADJUSTING SYSTEM', true, 124, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_291', '[T 10.2.4] • 2 threads minimum', true, 125, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_292', '[T 10.2.1] • Positive locking', true, 126, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_293', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 127, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_294', '• Check if the bolts are tight', true, 128, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_295', 'BRAKE CALIPERS', true, 129, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_296', '[T 10.2.4] • 2 threads minimum', true, 130, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_297', '[T 10.2.1] • Positive locking', true, 131, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_298', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 132, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_299', '• Check if the bolts are tight', true, 133, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_300', 'BRAKE DISKS', true, 134, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_301', '[T 10.2.4] • 2 threads minimum', true, 135, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_302', '[T 10.2.1] • Positive locking', true, 136, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_303', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 137, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_304', '• Check if the bolts are tight', true, 138, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_305', 'DIFFERENTIAL MOUNT', true, 139, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_306', '[T 10.2.4] • 2 threads minimum', true, 140, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_307', '[T 10.2.1] • Positive locking', true, 141, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_308', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 142, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_309', '• Check if the bolts are tight', true, 143, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_310', 'WHEEL-MOTOR-GEARBOX ASSEMBLY

• The teams should provide a 2D cross section of the assembly and explain the design. The individual components (motor mount, bearring installation, planetery gear box installation etc.) shall be properly locked and cosist a safe design

• Check to the possible extend, if the presented design matches the installation on the car', true, 144, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM', 'MECHANICAL_MECH4_311', '[T 10.2.4] • 2 threads minimum', true, 145, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM', 'MECHANICAL_MECH4_312', '[T 10.2.1] • Positive locking', true, 146, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM', 'MECHANICAL_MECH4_313', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 147, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM', 'MECHANICAL_MECH4_314', '• Check if the bolts are tight', true, 148, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM', 'MECHANICAL_MECH4_315', 'Any part of the steering system assembly that is not clearly visible and serves as a critical fastner must be presented in an engineering style drawing or photo', true, 149, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM', 'MECHANICAL_MECH4_316', '[T2.8.9
T2.8.10] STEERING RACK

• must be mechanically attached to the primary structure.

• Joints between all components attaching the steering wheel to the steering rack must be mechanical and visible at technical inspection. Bonded joints are allowed in accordance with T 3.2.8.', true, 150, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM ', 'MECHANICAL_MECH4_No._151', '[Rule No] Checkpoint', true, 151, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM ', 'MECHANICAL_MECH4_317', '[T6.1.11] • The brake pedal, including the pedal face, must be fabricated from steel or aluminium or machined from steel, aluminium or titanium.', true, 152, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM ', 'MECHANICAL_MECH4_318', '• Repeat check on safety wiring of the braking assembly on each wheel', true, 153, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM ', 'MECHANICAL_MECH4_319', '[T6.1.10] • The brake pedal and its mounting must be designed to withstand a force of     2 kN without any failure of the brake system or pedal box. This may be tested by pressing the pedal with the maximum force that can be exerted.', true, 154, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM ', 'MECHANICAL_MECH4_320', '[T6.2] BRAKE OVER-TRAVEL SWITCH - BOTS 

• The BOTS must be a push-pull, push-rotate or flip type mechanical switch

• The driver must not be able to reset it.

• Visually Check if the brake pedal is designed so that the BOTS can be triggered. Teams should provide extra documentation if the method of triggering is unclear.', true, 155, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - VEHICLE ASSEMBLED AND ON THE G', 'MECHANICAL_MECH4_No._156', '[Rule No] Checkpoint', true, 156, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - VEHICLE ASSEMBLED AND ON THE G', 'MECHANICAL_MECH4_321', '[T6.1.9] BRAKE PEDAL TEST 

• Enter the vehicle and kick the brake pedal 

• Also apply force progressively and slowly to feel any abnormal flexing. 

Pay special attention to the brake pedal and pedalbox assembly, failures happen.', true, 157, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - VEHICLE ASSEMBLED AND ON THE G', 'MECHANICAL_MECH4_322', '[T2.8.2
T2.8.3] STEERING SYSTEM CHECK 

• The steering wheel must directly mechanically actuate the front wheels.

• Steering actuation must be possible during standstill.

- While inside the vehicle, quickly steer the wheels to check including your weight', true, 158, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - VEHICLE ASSEMBLED AND ON THE G', 'MECHANICAL_MECH4_eda6be', 'APPROVAL STATUS', true, 159, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - VEHICLE ASSEMBLED AND ON THE G', 'MECHANICAL_MECH4_MECH 4', 'Approval (Control box) (DON''T CHANGE MANUALLY)', true, 160, 'EV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_22', '[IN5.1.1] Car in ready to race condition and clean', true, 1, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_23', '[IN5.1.1] Check bracelet for tallest driver', true, 2, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_24', '[T2.2.1] GROUND CLEARANCE (EV - WITH ACCUMULATOR STICKER AND ACCUMULATOR INSIDE)

• clearance + 30mm', true, 3, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_25', '[T2.5.1] SUSPENSION (EV - WITH ACCUMULATOR STICKER AND ACCUMULATOR INSIDE)

The vehicle must be equipped with fully operational front and rear suspension systems including shock absorbers and a usable wheel travel of at least 50mm and a minimum jounce of 25mm with driver seated.', true, 4, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_26', '[T5.2] HARNESS TYPE

A six or seven point harness is installed with the one of the following certifications:

• SFI Specification 16.1, SFI Specification 16.5,SFI Specification 16.6
• or FIA specification 8853/2016.

Date on belts must be valid:
SFI spec harnesses must be replaced following December 31st of the 2nd year after the date
of manufacture as indicated by the label. FIA spec harnesses must be replaced following
December 31st of the year marked on the label.', true, 5, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_NOTE', '[T5.1.3
T5.1.4] DRIVING POSITION

Note reclined or upright driving position:
upright position – Position with a seat back angled at 30° or less from the vertical
reclined position – Position with a seat back angled at more than 30° from the vertical', true, 6, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_d901e8', 'Must pass over pelvic area between 45 - 65 deg. to horizontal for upright driver, 60-80 deg.
for reclined. The lap belts must not be routed over the sides
of the seat.Pivoting mounting with eye bolts or
shoulder bolts attached securely to primary structure. Min.
tab thickness 1.6 mm. Attachment brackets to the monocoque
must be steel, see T4.5.5.', true, 7, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_28', '[T5.4] LAP BELT

• Securely attached to Primary Structure

• Upright: between 45° & 60° from horizontal

• Reclined: between 60° & 80° from horizontal

• From anchor point straight to drivers body

• In side view it must be capable of pivoting freely', true, 8, 'CV') ON CONFLICT (inspection_type_id, item_code, vehicle_class) DO NOTHING;

INSERT INTO checklist_templates (inspection_type_id, section, item_code, description, required, order_index, vehicle_class) VALUES
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_29', '[T5.5] SHOULDER HARNESS 

• Width: Without HANS Device: 75mm, With HANS Device: 50mm (T5.2.1)

• 180-230 mm apart measured center to center

• Between -20° & +10° from horizontal

• Tilt lock adjuster

• From anchor point straight to drivers body

• Must not pass through the firewall', true, 9, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_30', '[T5.6] ANTI-SUBMARINE BELT

• With the belts going vertically down from the groin, or angled up to 20° rearwards. The anchorage points should be approximately 100 mm apart.
      OR 
• Anchorage points must be on the primary structure at or near the lap belt anchorages

• can use the same attachment point as the lap belts', true, 10, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_31', '[T5.3.2] Harnesses, belts and straps must not pass through a firewall, i.e. all harness attachment points must be on the driver''s side of any firewall.', true, 11, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1', 'MECHANICAL_MECH1_32', '[T5.3.3] The lap belts and anti submarine belts must not be routed over the sides of the seat. 

• Where the belts or harness pass through a hole in the seat, the seat must be rolled 
or grommeted to prevent chafing of the belts.', true, 12, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - SAFETY CHECKS with TALLEST dri', 'MECHANICAL_MECH1_No.', '[Rule No] Checkpoint', true, 13, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_33', '[T5.7.2] • Be vertical or near vertical in side view.', true, 14, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_34', '• Minimum thickness of 40mm', true, 15, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_35', '• Be padded with an energy absorbing material:
-that meets either the SFI 45.2 standard
-or is listed in the FIA technical list n°17 as a type B material for single seater cars', true, 16, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_36', '• Have a minimum width of 150 mm
• Have a minimum height of 150 mm', true, 17, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_37', '• Be located so that for each driver:

– The restraint is no more than 25mm away from the back of the driver''s helmet, with the driver in their normal driving position.

– The contact point of the back of the driver''s helmet on the head restraint is no less than 50mm from any edge of the head restraint.', true, 18, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_38', '[T5.7.3] • The head restraint and its mounting must withstand a force of 890N applied in the rearward direction at any point on its surface.', true, 19, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_39', '[T5.8.1] Roll bar or bracing that could be hit by driver''s helmet must be covered with 12 mm thick padding;

• SFI spec 45.1 or FIA 8857-2001

Gently move the driver''s head to make sure that any object that comes in contact with it is covered by padding, or has sufficient clearance.

Pay attention to the connections of the shuttdown buttons mounted on the Main Hoop.', true, 20, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_40', '[T4.9.1] VEHICLE CONTROLS

• All vehicle controls must be operated from inside the cockpit without any part of the driver, e.g. hands, arms or elbows, being outside the vertical planes tangent to the outermost surface of the side impact structure.', true, 21, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_41', '[T4.10] FIELD VIEW

• Minimum of 100 deg. ﬁeld view either side. Head rotation allowed or mirrors. If mirrors, must be ﬁrmly installed and adjusted', true, 22, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_42', '[T4.3.1] MAIN HOOP & FRONT HOOP HEIGHTS
 
When seated normally and restrained by the driver''s restraint system, the helmet of the tallest driver must:

• Be a minimum of 50mm away from the straight line drawn from the top of the main hoop to the top of the front hoop.

• Be a minimum of 50mm away from the straight line drawn from the top of the main hoop to the lower end of the main hoop bracing if the bracing extends rearwards.

• Be no further rearwards than the rear surface of the main hoop if the main hoop bracing extends forwards.', true, 23, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_43', 'DRIVER''S FOOT PROTECTION

• The feet of the driver must within the primary structure in all views when touching the pedals', true, 24, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_44', '[T11.4.4] SHUTDOWN BUTTONS

One shutdown button serves as a cockpit-mounted shutdown button and must
• have a minimum diameter of 24mm
• be located in easy reach of a belted-in driver
• be alongside of the steering wheel and unobstructed by the steering wheel or any other part of the vehicle
• the international electrical symbol consisting of a red spark on a white-edged blue triangle must be affixed in close proximity', true, 25, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_45', '[T11.11] CAMERA MOUNTS 

The body of any video/photographic camera which is not exclusively used as sensor for the AS unit must be secured at a minimum of two points on different sides of the camera body. If a tether is used to restrain the camera, the tether length must be limited so that the camera cannot contact the driver.', true, 26, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_46', '[T2.9.1] Wheelbase has to be a minimum of 1525 mm', true, 27, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_1d9022', 'APPROVAL STATUS', true, 28, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - HEAD RESTRAINT - PADDING', 'MECHANICAL_MECH1_MECH 1', 'Approval (Control box) (DON''T CHANGE MANUALLY)', true, 29, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - BODYWORK & AERODYNAMICS', 'MECHANICAL_MECH1_No._30', '[Rule No] Checkpoint', true, 30, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - BODYWORK & AERODYNAMICS', 'MECHANICAL_MECH1_99', '[T2.3.1] • No large holes in bodywork, except for cockpit opening and except for the venting holes', true, 31, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - BODYWORK & AERODYNAMICS', 'MECHANICAL_MECH1_100', '[T2.3.2] In any side view in front of the cockpit opening and outside the area defined in T8.2 all
parts of the bodywork must have no external concave radii of curvatures. Any gaps 
between bodywork and other parts must be reduced to a minimum.', true, 32, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - BODYWORK & AERODYNAMICS', 'MECHANICAL_MECH1_101', '[T4.7.1] FLOOR PANELS

• Floor panel installed from foot area until firewall. Gaps must be less than 3mm

• Deflection of floor panels which can ocure with a seated driver or during a race can''t cause a gap greater than 3mm

• Enclosed chassis structures, structures between the chassis and the ground and every local minimum that can accumulate fluids must have two venting holes of at least 25mm diameter in the lowest part of the structure to prevent accumulation of liquids.', true, 33, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - BODYWORK & AERODYNAMICS', 'MECHANICAL_MECH1_102', '[T2.2.1] GROUND CLEARANCE 

• Check if the car has passed ground clearance (M1)', true, 34, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - AERO GENERAL ', 'MECHANICAL_MECH1_103', '[T8] • All wings securely attached, deflection may not exceed 25mm when a force of 50 N is placed at any random place in any random direction locally or 10mm when a force of 200N is applied at an surface area of 225cm2

- Use sandbags to check', true, 35, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - AERO GENERAL ', 'MECHANICAL_MECH1_104', '[T8] • Front facing edges off aero dives must have a radius of 5 mm if horizontal and 3 mm if vertical and 38mm radius at 45° at the nosecone', true, 36, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - AERO GENERAL ', 'MECHANICAL_MECH1_105', '• Attachment of the rear wing must be in the nodes of the MAIN HOOP (MAIN HOOP BRACINGS)', true, 37, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - AERO GENERAL ', 'MECHANICAL_MECH1_106', '[T8] No parts are allowed within the 75 mm keep out zone (see image below)', true, 38, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - AERO GENERAL ', 'MECHANICAL_MECH1_107', '[T8] FRONT AERO (EV - WITH ACCUMULATOR STICKER AND ACCUMULATOR INSIDE)
Measurements according T8 aerodynamic devices, figure 16 (Provided in scrutineering area)', true, 39, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - AERO GENERAL ', 'MECHANICAL_MECH1_108', '[T8] REAR AERO  (EV - WITH ACCUMULATOR STICKER AND ACCUMULATOR INSIDE)
Measurements according T8 aerodynamic devices, figure 16 (Provided in scrutineering area)', true, 40, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 1 - AERO GENERAL ', 'MECHANICAL_MECH1_109', '[EV4.10.8] TSAL

The TSAL must:

•Be located lower than the highest point of the main hoop and including the mounting within the roll over protection envelope ,seeT1.1.15.
 
•Be no lower than 75mm from the highest point of the main hoop.

•Not be able to contact the driver''s helmet in any circumstances. 

The entire illuminated surface of the TSAL must be clearly visible: 

•Except for angles less than 10° which are blocked by the main hoop. 

•From a point 1.60m vertically from ground level  within 3m horizontal radius from theTSAL. 

•In direct sun light.', true, 41, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2 ', 'MECHANICAL_MECH2_47', '[T3.6] Approved SES', true, 1, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2 ', 'MECHANICAL_MECH2_48', '[A5.7] Approved SESA (if applicable, monocoque only)', true, 2, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2 ', 'MECHANICAL_MECH2_49', '[T3.18] IA test specimen and approved IA data (except for teams with a standard IA)', true, 3, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2 ', 'MECHANICAL_MECH2_50', '[T3.5] Laminate test specimens', true, 4, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - GENERAL', 'MECHANICAL_MECH2_No.', '[Rule No] Checkpoint', true, 5, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - GENERAL', 'MECHANICAL_MECH2_51', '[T3.1] The chassis has to be constructed with node-to-node triangles: All structural frame members must meet the min. material requirements 
• Two roll hoops that are braced
• A front bulkhead with support system and IA
• Side impact structures
• All hoops and bracings must meet the min. material requirements', true, 6, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT IMPACT PROTECTION (REMOV', 'MECHANICAL_MECH2_No._7', '[Rule No] Checkpoint', true, 7, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ASSEMBLY (IA', 'MECHANICAL_MECH2_52', '[T3.17.6] • The attachment of the IA assembly must be designed to provide an adequate load path for transverse and vertical loads in the event of off-center and off-axis impacts. 

• Segmented foam attenuators must have the segments bonded together to prevent sliding or parallelogramming.', true, 8, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ASSEMBLY (IA', 'MECHANICAL_MECH2_53', '[T3.16.6
T3.17.3] BOLTED

• If the IA assembly is bolted to the FBH,  it must be the same size as the outside dimensions of the front bulkhead

• One 8mm metric grade 8.8 bolt must be used for every 200mm of reference perimeter. Smaller but more bolts may be used if equivalency is shown. The bolts are considered critical fastenerts (T10)

Check for positive locking', true, 9, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ASSEMBLY (IA', 'MECHANICAL_MECH2_54', 'WELDED

• If it is welded to the front bulkhead, it must extend at least to the centerline of the front bulkhead tubing in all directions.', true, 10, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ASSEMBLY (IA', 'MECHANICAL_MECH2_55', '• The AIP must not extend past the outside edges of the front bulkhead.', true, 11, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ', 'MECHANICAL_MECH2_56', '[T3.17.2] • At least 100mm high and 200mm wide for a minimum distance of 200mm forward
of the front bulkhead.', true, 12, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ', 'MECHANICAL_MECH2_57', '[T3.17.2] • No portion of the required 100 ×200 ×200 mm3 volume of the IA can be positioned
more than 350 mm above the ground.', true, 13, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ', 'MECHANICAL_MECH2_58', '[T3.17.2] • Attached securely and directly to the Anti Intrusion Plate (AIP).

• No wing supports through IA', true, 14, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ', 'MECHANICAL_MECH2_59', '[T3.17.5] • Attached to the AIP by a minimum of four 8 mm metric grade 8.8 bolts. The
bolts are considered critical fasteners and must comply with T 10.', true, 15, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ', 'MECHANICAL_MECH2_60', '[T3.17.7] For ''''standard'''' FSAE IAs:

• if th FBH width is larger than 400 mm and/or its height is larger than
350 mm a diagonal or X-bracing that is a front bulkhead support tube or an approved
equivalent per T 3.2, must be included in the front bulkhead. Or equivalent for monocoque bulkheads.

• must use a 1.5 mm solid steel AIP that is welded along its full perimeter to a steel
bulkhead or use a 4 mm solid aluminium AIP that is bolted to any bulkhead with a
minimum of eight 8 mm metric grade 8.8 bolts', true, 16, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT ATTENUATOR ', 'MECHANICAL_MECH2_61', '[T3.17.3
T3.17.4] ANTI INTRUSION PLATE (AIP)

• Thickness = min 1.5mm solid steel or 4.0mm aluminium. 

• Alternative AIP designs are permissible if equivalency to T 3.17.3 is proven by physical testing as in T 3.19.2. (Check SES and IAD)', true, 17, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT STRUCTURE', 'MECHANICAL_MECH2_No._18', '[Rule No] Checkpoint', true, 18, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT STRUCTURE', 'MECHANICAL_MECH2_62', '[T3.13
T3.14] FRONT BULKHEAD 

•  Any alternative material used for the front bulkhead must have a perimeter shear strength equivalent to a 1.5 mm thick steel plate.

•  The front bulkhead must be supported back to the front hoop by a minimum of three tubes on each side', true, 19, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT STRUCTURE', 'MECHANICAL_MECH2_63', '[T3.14] FRONT BULKHEAD SUPPORT

• Must support the FBH back to Front Hoop by minimum 3 tubes on each side

UPPER MEMBER
- attached to FBH maximum 50mm from the top and to the FH maximum of 50mm bellow the upper SIS member

- If attachmentpoint is more than 100mm above theupper SIS member, triangulation is needed to transfer load to the MH

LOWER MEMBER: attached to the base of the FBH and the base of the FH

DIAGONAL MEMBER: must triangulate the upper and lower member node-to-node', true, 20, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT STRUCTURE', 'MECHANICAL_MECH2_64', '[T3.11] FRONT HOOP BRACING

• The front hoop bracing attaches on each side of the front hoop as well as the structure forward of the driver''s feet. A minimum of two tubes without any bends must be straight on a line in side view of the frame and must have a minimum distance of 100 mm between each other at the front hoop 

• Attached to front hoop not lower than 50mm from top-most surface of the front hoop (not applicable for monocoque)

• If the front hoop is inclined more than 10° to the rear, additional braces extending rearwards are required', true, 21, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.9)', 'MECHANICAL_MECH2_65', '[T3.2.1] • Material must be metal with a wall thickness at least 2 mm
 (inspecion holes if needed)', true, 22, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.9)', 'MECHANICAL_MECH2_66', '[T3.9.3] •  In side view, no part of the front hoop can be inclined more than 20° from vertical.', true, 23, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.9)', 'MECHANICAL_MECH2_67', '[T3.7.4] •  The lower roll hoop tubing attachment points must be within 50 mm of the
endpoints of the roll hoop. (T3.7.4)', true, 24, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.9)', 'MECHANICAL_MECH2_ecd1d5', 'FRONT HOOP ATTACHMENT', true, 25, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.9)', 'MECHANICAL_MECH2_68', '• Check if the submitted design matches the structure on the car', true, 26, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.9)', 'MECHANICAL_MECH2_69', '• Check proper manufacturing', true, 27, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.9)', 'MECHANICAL_MECH2_70', '[T3.9.5] BOLTED FH

• The front hoop requires six attachment points, two on each side connecting to the front bulkhead support structures and two connecting to the front hoop bracing, and must therefore show equivalency to 180 kN, as follows from T 3.16.1 and T 3.11.4.', true, 28, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.9)', 'MECHANICAL_MECH2_71', '[T3.16.3] • Each attachment point requires a minimum of two 8 mm metric grade 8.8 bolts and steel backing plates with a minimum thickness of 2 mm.', true, 29, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.9)', 'MECHANICAL_MECH2_72', '[T10.1.4] • Check e/D of attachments (> 1.5 Hole Diameter)', true, 30, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - FRONT HOOP (T3.9)', 'MECHANICAL_MECH2_73', '[T3.9.6] LAMINATED FH

• Fully laminating the front hoop to the monocoque is acceptable. Fully laminating means that the hoop has to be encapsulated with laminate around its whole circumference, see figure 5. Equivalence to T 3.7.4 must be shown in the SES. The laminate encapsulating the front hoop must overlap by at least 25 mm on each side. It must have the same lay-up as the laminate that it is connecting to.

(The manufacuring quality is to be checked - dry areas, insufficient overlap, bad laminating quality)', true, 31, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP', 'MECHANICAL_MECH2_No._32', '[Rule No] Checkpoint', true, 32, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP', 'MECHANICAL_MECH2_74', '[T3.8
T3.7] MAIN HOOP

• The main hoop must be constructed of a single piece of uncut, continuous, closed section steel tubing.

• Material must be steel with a wall thickness at least 2 mm (T3.2.1) (inspecion holes if needed)

• In side view the portion of the main hoop which is above its upper attachment point to the side impact structure must be inclined less than 10° from vertical

• In side view any portion lower than the upper attachment point to the side impact structure must be inclined either forward or not more than 10° rearward

•In side view any bends in the main hoop above its upper attachment point to the primary structure must be braced to a node of the main hoop bracing support structure with tubing meeting the requirements of main hoop bracing.

•The lower roll hoop tubing attachment points must be within 50 mm of the
endpoints of the roll hoop. (T3.7.4)', true, 33, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP', 'MECHANICAL_MECH2_75', '[T3.10] MAIN HOOP BRACING

• Material must be steel and the bracings must be straight.

• Bracings must be attached to the main hoop no lower than 160 mm below the top-most surface of the main hoop. The angle between bracings and main hoop must be greater than 30 deg.

• Proper construction for removable braces (if applicable) see T3.12

• If any item which extends outside of the primary structure is attached to the main hoop braces, additional bracing is required to prevent bending loads in a rollover situation. 
(Usually rear wing supports, aplies to anything that induces loads to the Main Hoop Bracing tubes)', true, 34, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP', 'MECHANICAL_MECH2_76', '[T5.5] SHOULDER HARNESS BAR / MOUNTING

• Minimum thickness 2mm (T3.2.1)

• Must be steel, or tested and calculated to show equivalence.

• Must not transfer load to the Main Hoop Bracing without additional triangulation-bracing

• Check attachment calculations on SES and compare the attachments on the car with the ones submitted', true, 35, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP ATTACHMENTS ', 'MECHANICAL_MECH2_77', '• Check if the submitted design matches the structure on the car', true, 36, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP ATTACHMENTS ', 'MECHANICAL_MECH2_78', '[T3.16.3
T3.16.4] • Each attachment point requires a minimum of two 8 mm metric grade 8.8 bolts and steel backing plates with a minimum thickness of 2 mm.

• Or one 10 mm metric grade 8.8 bolt, if the bolt is on the centerline of the tube', true, 37, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP ATTACHMENTS ', 'MECHANICAL_MECH2_79', '[T10.1.4] • Check e/D of attachments (> 1.5 Hole Diameter)', true, 38, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP ATTACHMENTS ', 'MECHANICAL_MECH2_80', '[T10.1.1
T10.2.2] • Check positive locking (nylon nuts allowed if area is less than 80 degrees)', true, 39, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - MAIN HOOP ATTACHMENTS ', 'MECHANICAL_MECH2_81', '• Check proper manufacturing', true, 40, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - TEMPLATE FITTING', 'MECHANICAL_MECH2_No._41', '[Rule No] Checkpoint', true, 41, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - TEMPLATE FITTING', 'MECHANICAL_MECH2_82', '[T4.1] COCKPIT OPENING

• Insert template 2 into cockpit. The firewall may not be removed. Teams are allowed to remove the seat, steering wheel and all padding

• Template passes down below the top of the Side Impact Structure (or 320mm above lowest point in car, monocoque only)', true, 42, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - TEMPLATE FITTING', 'MECHANICAL_MECH2_83', '[T4.2] COCKPIT INTERNAL CROSS SECTION

• Check if pedals are in most forward position. 

*MOST FORWARD = TOWARDS FRONT BULKHEAD
*REARWARDS = TOWARDS MAIN HOOP

• Insert template 3 into cockpit. Steering wheel and padding may only be removed if no tools are required and the driver is able to do so from the driving position.

• Template passes through to 100mm from rearmost pedal face.', true, 43, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - TEMPLATE FITTING', 'MECHANICAL_MECH2_84', '[T5.9.1] DRIVER''S LEG PROTECTION 

• All moving suspension and steering components and other sharp edges inside the cockpit between the front hoop and a vertical plane 100 mm rearward of the pedals, must be shielded with solid material.', true, 44, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - TEMPLATE FITTING', 'MECHANICAL_MECH2_85', '• Check if anything from the rear of the pedal box (brake lines, cables etc.) is forward than the inner FBH skin, or is crimped-crashed to it.', true, 45, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - TEMPLATE FITTING', 'MECHANICAL_MECH2_86', '[T4.3] PERCY

Insert percy into cockpit

The figure has to be positioned in the vehicle as follows:

• The seat adjusted to the rearmost position (REARMOST = TOWARDS MAIN HOOP)

• The pedals adjusted to the frontmost position (FRONTMOST = TOWARDS FRONT BULKHEAD)

• The bottom 200mm circle placed on the seat bottom. The distance between the center of the circle and the rearmost actuation face of the pedals must be minimum 915mm.

• The middle circle positioned on the seat back

• The upper 300mm circle positioned 25mm away from the head restraint.

• Top is at least 50mm below the line between the main hoop and front hoop', true, 46, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT STRUCTURES', 'MECHANICAL_MECH2_No._47', '[Rule No] Checkpoint', true, 47, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - IMPACT STRUCTURES', 'MECHANICAL_MECH2_87', '[T3.15] SIDE IMPACT STRUCTURE (Τ3.15)

• Must consist of at least three members on each side 

• UPPER MEMBER: must connect the front and main hoop and must be at a height of 240mm and 320 mm above the lowest inside chassis point between the front and main hoop

• LOWER MEMBER: must connect the bottom of the main hoop and the bottom of the front hoop

• DIAGONAL MEMBER: must triangulate the upper and lower member between the roll hoops node-to-node.', true, 48, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - HARNESS ATTACHMENTS', 'MECHANICAL_MECH2_No._49', '[Rule No] Checkpoint', true, 49, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - HARNESS ATTACHMENTS', 'MECHANICAL_MECH2_88', '• Check if the submitted design matches the structure on the car', true, 50, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - HARNESS ATTACHMENTS', 'MECHANICAL_MECH2_89', '• Check if the submitted test configuration matches the structure on the car', true, 51, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - HARNESS ATTACHMENTS', 'MECHANICAL_MECH2_90', '[T4.5.1
T4.5.2] • If attached to monocoque one 10 mm metric grade 8.8 bolt or two 8 mm metric grade 8.8 bolts (or bolts of an equivalent standard) and steel backing plates with a minimum thickness of 2 mm. If no backing plates are used check thorouglhy the testing presented

• If attached to the primary structure using brackets must use two 8 mm metric grade 8.8 or stronger fasteners.', true, 52, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - HARNESS ATTACHMENTS', 'MECHANICAL_MECH2_91', '[T10.1.1
T10.2.2] • Check positive locking (nylon nuts allowed if area is less than 80 degrees)', true, 53, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - HARNESS ATTACHMENTS', 'MECHANICAL_MECH2_92', '[T4.5.5] • Minimum thickness 1.6mm steel or 4mm aluminium (if not, testing to be presented)', true, 54, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_No._55', '[Rule No] Checkpoint', true, 55, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_9b0f1a', 'ACCUMULATOR CONTAINER ATTACHMENTS 
 (EV - WITH ACCUMULATOR STICKER AND ACCUMULATOR INSIDE)', true, 56, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_93', '• Check if the submitted design matches the structure on the car', true, 57, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_94', '[EV5.5.13] • Any brackets used to mount the TSAC must be made of steel 1.6 mm thick or aluminum 4 mm thick and must have gussets to carry bending loads. Each attachment point including brackets, backing plates, and inserts, must be able to withstand 20 kN in any direction.', true, 58, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_95', '[EV5.5.5] •  Each attachment point requires steel backing plates with a minimum thickness of
2 mm. Alternate materials may be used for backing plates if equivalency is approved.
(Check SES)', true, 59, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_96', '[T10.1.4] • Check e/D of attachments (> 1.5 Hole Diameter)', true, 60, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_97', '[T10.1.1
T10.2.2] • Check positive locking (nylon nuts allowed if area is less than 80 degrees)', true, 61, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_98', '• Check proper manufacturing', true, 62, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_52ebe2', 'APPROVAL STATUS', true, 63, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 2  - !ONLY IF THE TEAM HAS PASSED T', 'MECHANICAL_MECH2_MECH 2', 'Approval (Control box) (DON''T CHANGE MANUALLY)', true, 64, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3_COOLING', '[T7.2] COOLING GENERAL', true, 1, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3__2', '[T 7.2.1
T 7.2.2] COOLANT FLUID

• CV - Water-cooled engines must only use plain water.', true, 2, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3__3', '[T 7.2.3] • Cooling systems using plain water (except outboard wheel motors and their cooling hoses) must have a heat resistant (Permanently rated for at least 100 °C), rigid and rigidly mounted cover which meets the requirements of T 4.8.2.', true, 3, 'CV') ON CONFLICT (inspection_type_id, item_code, vehicle_class) DO NOTHING;

INSERT INTO checklist_templates (inspection_type_id, section, item_code, description, required, order_index, vehicle_class) VALUES
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3__4', '[T 7.2.8
T 7.2.6] • Any cooling overflow system must be equiped with a catch tank, located behind the firewall, below shoulder level

• Cooling catch cans minimal 10% fluid volume or 100ml, whichever is greater.', true, 4, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3__5', '[T 7.2.5] • Other fluids must have a minimum volume of 10% of the fluid being contained or 900 ml whichever is greater.', true, 5, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3__6', '• No fluid hoses out of the chassis or monocoque in direct line of sight of driver exceptions for in-wheel motors. Without stone-strike protection', true, 6, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3__7', '[T 7.2.7] • All parts of the engine cooling and lubrication system, including their mountings, must be rated for at least 120 °C or the temperatures the respective fluid may reach, whichever is higher.', true, 7, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3__8', '[T7.2.9] Any catch can must vent through a hose with a minimum internal diameter of 3mm down to the bottom level of the chassis and must exit outside the bodywork.', true, 8, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3', 'MECHANICAL_MECH3__9', 'FLUID LEAKS

No type of fluid leak (Oil, grease, coolant, fuel, Brake fluid) is permitted', true, 9, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - DRIVE TRAIN SHIELDS AND GUARDS', 'MECHANICAL_MECH3__10', '[Rule No] Checkpoint', true, 10, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - DRIVE TRAIN SHIELDS AND GUARDS', 'MECHANICAL_MECH3__11', '[T7.3.1] Oil pump lower than chassis

• The lowest point of any lubrication system can only be lower than the line between the lowest point of the main hoop and the lowest chassis member behind the lubrication system if it is protected from hitting the ground by a structure mounted directly to the chassis.', true, 11, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - DRIVE TRAIN SHIELDS AND GUARDS', 'MECHANICAL_MECH3__12', '[T 7.3.2] Exposed rotating final drivetrain parts, such as gears, clutches, chains and belts must be fitted with scatter shields. Scatter shields and their mountings must:

• Be constructed of non-perforated 2 mm min. steel or 3 mm min. aluminium alloy 6061-T6.

•Cover chains and belts from the drive sprocket to the driven sprocket/chain wheel/belt or pulley.

• Start and end parallel to the lowest point of the driven sprocket/chain wheel/belt or pulley.

• Scatter shields for chains and belts must be centered on the centerline of the chain or belt and remain aligned with the chain or belt under all conditions.

• For non-metallic chains and belts: 3mm min. nonperforated aluminum alloy 6061-T6.

•The minimum width of the scatter shield should be at least three times the width of the chain or belt. (chain width is mesured at the thickest part of the chain, usualy on the pins)', true, 12, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - DRIVE TRAIN SHIELDS AND GUARDS', 'MECHANICAL_MECH3__13', '[T7.3.2] • All fasteners attaching scatter shields, guards and their mountings must be 6mm metric grade 8.8 or stronger and must comply with T10.1.', true, 13, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - DRIVE TRAIN SHIELDS AND GUARDS', 'MECHANICAL_MECH3__14', '[T7.3.5] • Finger guards are required to cover any parts that spin while the vehicle is stationary. Finger guards may be made of lighter material, sufficient to resist finger forces. Mesh or perforated material may be used but must prevent the passage of a 12mm diameter object through the guard.', true, 14, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__15', '[Rule No] Checkpoint', true, 15, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__16', '[T 4.8.1] The firewall must separate the cockpit from all components of 

- the fuel supply system
- hydraulic fluid except brake system and dampers
- flammable liquids
- the low voltage battery', true, 16, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__17', '[T 4.8.2] • The firewall must cover any straight line between the parts mentioned in T 4.8.1 and any part of the tallest driver below a plane 100 mm above the bottom of the helmet.', true, 17, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__18', '[T 4.6.2] HEAT INSULATION

• Adequate heat insulation must be provided to ensure that the driver is not able to contact any parts of the vehicle with a surface temperature above 60 °C. The insulation may be external to the cockpit or incorporated with the driver''s seat or firewall. The design must address all three types of heat transfer with the following minimum requirements between the heat source and the part that the driver could contact:

(a) Conduction insulation by:
(i) No direct contact, or
(ii) a heat resistant, conduction insulation material with a minimum thickness of
8 mm.

(b) Convection insulation by a minimum air gap of 25 mm.

(c) Radiation insulation by:
(i) A solid metal heat shield with a minimum thickness of 0.4 mm or
(ii) reflective foil or tape when combined with T 4.6.2.a.ii.', true, 18, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__19', '[T1.2.1
T 4.8.3] • The firewall must be a non-permeable surface made from a rigid, fire resistant material, see T 1.2.1, which must be rigidly mounted to the vehicle''s structure.

A material is considered Fire Retardant if it meets one of the following standards (ask for proof) : 

• UL94 V-0 for the minimum used material thickness

• FAR 25.853(a)(1)(i)

Equivalent standards are only accepted, if the team shows equivalence and this is approved by the officials prior to the event.', true, 19, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__20', '[T 4.8.4] • Any firewall must seal completely against the passage of fluids, especially at the sides and the floor of the cockpit.', true, 20, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__21', '[T 4.8.5] • Pass-throughs for wiring, cables, etc. are permitted if grommets are used to seal the passthrough.', true, 21, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - FIREWALL (T4.8)', 'MECHANICAL_MECH3__22', '[T 4.8.6] • Multiple panels may be used to form the firewall but must overlap at least 5mm and be sealed at the joints. Any sealing material must not be vital to the structural integrity of the firewall.', true, 22, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__23', '[Rule No] Checkpoint', true, 23, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__24', '[CV1.1] ENGINE
• The engine(s) used to power the vehicle must be piston engine(s) using a four-stroke primary heat cycle with a displacement not exceeding 710 cm3 per cycle.', true, 24, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__25', '[CV1.2] • Each vehicle must be equipped with an on-board starter, which must be used to start the vehicle.', true, 25, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__26', '[CV1.3.1] SURFACE ENVELOPE

• All parts of the engine air and fuel control systems (including the throttle and the complete air intake system, including the air filter and any air boxes) must lie within the surface envelope, see T1.1.18. ).', true, 26, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__27', '[CV1.3.2] AIR INTAKE

• Any portion of the air intake system that is less than 350mm above the ground must be shielded from side or rear impact collisions by structure built according to T3.15 (with exception of the first point under T3.15.1) and must follow T3.16 when having bolted attachments.', true, 27, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__28', '[CV1.3.3] • The intake manifold must be securely attached to the engine block or cylinder head with brackets and mechanical fasteners. The threaded fasteners used to secure the intake manifold are considered critical fasteners and must comply with T10.Min M4, grade 8.8 OEM type M3, grade 8.8', true, 28, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__29', '[CV1.3.4] • Intake systems with significant mass or cantilever from the cylinder head must be supported to prevent stress to the intake system. Supports to the engine must be rigid. Supports to the chassis must incorporate isolation to allow for engine movement and chassis torsion.', true, 29, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__30', '[CV1.4] • The vehicle must be equipped with a throttle body. The throttle body may be of any size or design. The throttle must be actuated mechanically by a foot pedal, i.e. via a cable or a rod system, see CV1.5, or by an ETC system, see CV1.6.The throttle system mechanism must be protected from debris ingress to prevent jamming.', true, 30, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__31', '[CV1.5] THROTTLE
 • The throttle actuation system must use at least two return springs located at the throttle body, so that the failure of any one of the two springs will not prevent the throttle returning to the idle position.  Each return spring must be capable of returning the throttle to the idle position with the other disconnected.
 Springs in the Throttle Position Sensor (TPS) are not acceptable as return springs.', true, 31, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__32', '[CV1.5] • Throttle cables must be located at least 50mm from any exhaust system component and out of the exhaust stream.Throttle cables or rods must have smooth operation and must not have the possibility of binding or sticking. They must be protected from being bent or kinked by the driver''s foot during operation or when entering the vehicle. A positive pedal stop must be incorporated on the accelerator pedal to prevent over-stressing the throttle cable or actuation system.', true, 32, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__33', '[CV1.7] RESTRICTOR

• Gasoline fueled vehicles - 20mm
• E 85 fueled vehicles - 19mm
• For naturally aspirated engines, the sequence must be: throttle body, restrictor, and engine, see figure 17
• For turbocharged or supercharged engines, the sequence must be: restrictor, compressor, throttle body, engine, see figure 19', true, 33, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__34', '[CV2.2.1] FUEL TANK

• The fuel tank must be located within the rollover protection envelope, see T1.1.16, except the fuel filler neck if it is 350mm above the ground.', true, 34, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__35', '[CV2.2.2] • All parts of the fuel storage and supply system must lie within the surface envelope,
see T1.1.18..', true, 35, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__36', '[CV2.2.2] • In side view no portion of the fuel system can project below the lower surface of the chassis.', true, 36, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__37', '[CV2.2.3] • All parts of the fuel storage and supply system must be adequately protected against any heat sources and located at least 50mm from any exhaust system component.', true, 37, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__38', '[CV2.2.4] • All parts of the fuel system which can come in contact with the fuel must be rated for permanent contact with fuel.

Check RESIN datasheet for carbon fiber fuel tanks.', true, 38, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__39', '[CV2.3.1] • The fuel tank is defined as the part of the fuel containment device that is in contact with the fuel. It may be made of a rigid material or a flexible material.', true, 39, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__40', '[CV2.3.2] • The fuel tank must be securely attached to the vehicle structure with mountings that allow some flexibility such that chassis flex cannot unintentionally load the fuel tank.', true, 40, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__41', '[CV2.3.3] • The fuel tank must not touch any part of the vehicle other than its mounting and parts of the fuel system at any time.', true, 41, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__42', '[CV2.4.1] FUEL LINES

Fuel lines between fuel tank and fuel rail and return lines must have:
• Reinforced rubber fuel lines with an abrasion protection with a fuel hose clamp which has a full 360° wrap, a nut and bolt system for tightening and rolled edges to prevent the clamp cutting into the hose, or
• Metal braided hoses with crimped-on or reusable, threaded fittings.
• be rated for temperatures of at least 120 ◦C..', true, 42, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__43', '[CV2.4.4] Fuel lines must be securely attached to the vehicle and/or engine.', true, 43, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__44', '[CV2.5.1] The following requirements apply to LPI (low pressure injection <10 bar) fuel systems:
• The fuel lines must comply with CV2.4.
• The fuel rail must be securely attached to the engine cylinder block, cylinder head, or intake manifold with mechanical fasteners. The threaded fasteners used to secure the fuel rail are considered critical fasteners and must comply with T10.
• The use of fuel rails made from plastic, carbon fiber or rapid prototyping flammable materials is prohibited. However, the use of unmodified Original Equipment Manufacturer (OEM) Fuel Rails manufactured from these materials is acceptable.', true, 44, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__45', '[CV2.5.2] The following requirements apply to HPI and DI fuel systems:
• All high pressure fuel lines must be stainless steel rigid line or Aeroquip FC807 smooth bore PTFE hose with stainless steel reinforcement and visible Nomex tracer yarn. Use of elastomeric seals is prohibited. Lines must be rigidly connected every 100mm by mechanical fasteners to structural engine components.
• The fuel rail must be securely attached to the engine cylinder head with mechanical fasteners. The fastening method must be sufficient to hold the fuel rail in place with the maximum regulated pressure acting on the injector internals and neglecting any assistance from in-cylinder pressure acting on the injector tip. The threaded fasteners used to secure the fuel rail are considered critical fasteners and must comply with T10.
• The fuel pump must be rigidly mounted to structural engine components.
• A fuel pressure regulator must be fitted between the high and low pressure sides of the fuel system in parallel with the DI boost pump. The external regulator must be used even if the DI boost pump comes equipped with an internal regulator.
• Prior to the tilt test specified in IN7, engines fitted with mechanically actuated fuel pumps must be run to fill and pressure the system downstream of the high pressure pump.', true, 45, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__46', '[CV2.6] The fuel tank must have a filler neck which:
• has at least an inner diameter of 35mm at any point between the fuel tank and the top of the fuel filler cap.
• is angled at no more than 30° from the vertical
• is accompanied by a clear fuel resistant sight tube above the top of the fuel tank with a length of at least 125mm vertical height for reading the fuel level, see figure 19.
• is made of material that is permanently rated for temperatures of at least 120 °C.
• a clear filler neck tube may be used as a sight tube.', true, 46, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__47', '[CV2.6.3] A permanent, non-moveable, clear and easily visible fuel level line must be located between 12mm and 25mm below the top of the visible portion of the sight tube. This line will be used as the fill line for the tilt test (IN7.1), and before and after the endurance test to measure the amount of fuel used during the endurance event.', true, 47, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__48', '[CV2.8.2] All fuel vent lines must be equipped with a check valve to prevent fuel leakage when the tank is inverted. All fuel vent lines must exit outside the bodywork.', true, 48, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__49', 'Fuel type sticker near the fuel filler neck', true, 49, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__50', '[T 9.1] GAS CYLINDERS/TANKS

Proprietary manufactured, certified & labeled. 
Non-flammable gas, regulator directly on tank max. 10 bar (145 psi), securely mounted to chassis or engine, or in structural side pod, within the rollover envelope, not in cockpit, insulated from heat sources, appropriate lines & fittings for max. pressure of system. Positively retained, i.e. no tie-wraps.', true, 50, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__51', '[CV3.1.1] EXHAUST

The exhaust outlet must be routed to the side or rear of the vehicle and so that the driver is not subjected to fumes at any speed considering the draft of the vehicle.
The application of fibrous/absorbent material, e.g. "headerwrap", to the outside of an exhaust manifold or exhaust system is prohibited.', true, 51, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__52', '[CV3.1.2] The exhaust outlet(s) must not extend more than 450mm behind the centerline of the rear axle and shall be no more than 600mm above the ground.', true, 52, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__53', '[CV3.1.3] Any exhaust components (headers, mufflers, etc.) that protrude from the side of the body in front of the main hoop must be shielded to prevent contact by persons approaching the vehicle or a driver exiting the vehicle. The temperature of the outer surface must not be harmful to a person touching it.', true, 53, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__54', '[T 6.3] BRAKE LIGHT 

Only one RED brake light, clearly visible from the rear; on vehicle centerline; height between wheel centerline & driver''s shoulders. Round, triangle, or rectangular on black background. 15 cm2 minimum illuminated area. 
LED strips OK if elements closer than 20mm apart and total length > 150 mm.', true, 54, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__55', '[CV4.1] SHUTDOWN CIRCUIT

The shutdown circuit directly controls all electrical power to the ignition, fuel injectors and all fuel pumps. It must act through a minimum of two mechanical relays. One relay for the fuel pump and at least one relay for injection and ignition.', true, 55, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__56', '[T11.3] An LVMS according to T11.2 must completely disable
• [EV ONLY] power to the LVS
• [CV ONLY] power from the Low Voltage (LV) battery and the alternator to the LVS

The LVMS must be mounted in the middle of a completely red circular area of  50mm diameter placed on a high contrast background.

The LVMS must be marked with "LV" and a symbol showing a red spark in a white edged blue triangle.

The LVMS must be removable in off state, which is in the vertical position and have a marker for the off and on positions.', true, 56, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__57', '[T11.4] SHUTDOWN BUTTONS

A system of three shutdown buttons must be installed on the vehicle.

Each shutdown button must be a push-pull or push-rotate mechanical emergency switch where pushing the button opens the shutdown circuit, see EV6.1 and CV4.1.

One button must be located on each side of the vehicle behind the driver''s compartment at approximately the level of the driver''s head. The minimum allowed diameter of the shutdown buttons on both sides of the vehicle is 40mm.
The buttons must be easy reachable from outside the vehicle.

One shutdown button serves as a cockpit-mounted shutdown button and must
• have a minimum diameter of 24mm
• be located in easy reach of a belted-in driver
• be alongside of the steering wheel and unobstructed by the steering wheel or any other part of the vehicle

The international electrical symbol consisting of a red spark on a white-edged blue triangle must be affixed in close proximity to each shutdown button.
Shutdown buttons must be rigidly mounted to the vehicle and must not be removed during maintenance.', true, 57, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__58', '[T11.5] INERTIA SWITCH 

An inertia switch must be part of the shutdown circuit, see CV4.1 and EV6.1, such that an impact will result in the shutdown circuit being opened. The inertia switch must latch until manually reset.

The device must be rigidly attached to the vehicle. It must be possible to demount the device so that its functionality may be tested by shaking it.', true, 58, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__59', '[T11.6] BRAKE SYSTEM PLAUSIBILITY DEVICE - BSPD

A standalone non-programmable circuit, the BSPD, must open the shutdown circuit, see EV6.1 and CV4.1, when hard braking occurs, whilst
• [EV ONLY]  5kW power is delivered to the motors.
• [CV ONLY] the throttle position is more than 25% over idle position.

The shutdown circuit must remain open until power cycling the LVMS or the BSPD may reset itself if the opening condition is no longer present for more than 10 s.

The action of opening the shutdown circuit must occur if the implausibility is persistent for more than 500 ms.', true, 59, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__60', '[T6.2] BRAKE OVER-TRAVEL SWITCH - BOTS

A brake pedal over-travel switch must be installed on the vehicle as part of the shutdown circuit, as in EV6 or CV4.1. This switch must be installed so that in the event of a failure in at least one of the brake circuits the brake pedal over-travel will result in the shutdown circuit being opened. This must function for all possible brake pedal and brake balance settings without damaging any part of the vehicle.', true, 60, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__61', '[T11.7] LOW VOLTAGE BATTERIES

LV batteries must be securely attached to the chassis and located within the rollover protection envelope
Any wet-cell battery located in the cockpit must be enclosed in a non-conductive, water proof (according to IPX7 or higher, IEC 60529) and acid resistant container.
Completely closed LV battery cases must have an overpressure relief. Venting gases must be separated from the driver by a firewall.

Battery packs based on lithium chemistry other than lithium iron phosphate (LiFePO4):
• Must have a fire retardant casing, see T1.2.1.
• Must include overcurrent protection that trips at or below the maximum specified discharge current of the cells.
• Must include overtemperature protection of at least 30% of the cells, meeting EV5.8.3, that trips when any cell leaves the allowed temperature range according to the manufacturer''s datasheet, but not more than 60 °C, for more than 1 s and disconnects the battery.
• Must include voltage protection of all cells that trips when any cell leaves the allowed voltage range according to the manufacturer''s datasheet for more than 500 ms and disconnects the battery.
• It must be possible to display all cell voltages and measured temperatures, e.g. by connecting a laptop.', true, 61, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3__62', 'APPROVAL STATUS', true, 62, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 3 - ENGINE, FUEL SYSTEM AND ELECTR', 'MECHANICAL_MECH3_APPROVAL', 'Approval (Control box) (DON''T CHANGE MANUALLY)', true, 63, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FREE PLAY', 'MECHANICAL_MECH4_ba6bab', 'GUIDELINES

• Check the wheels'' free play in both TOE and CAMBER direction

- Play in camber direction can be treated with more leniency within reasonable levels.

- Play in TOE direction in REAR wheels must be barely existent 

- Force capable to rock the vehicle should be applied

- Larger wheels are usually expected to have more play (more leverage)

- While moving the wheels, inspect the A-arm mounting points on the chassis as well as the mounting points inside the rim.

- While moving the REAR wheels, inspect the TOE link mounting points (on the chassis and on the wheel assemby)

- If the suspension is mounted to the uprights with brackets, the brackets need to be rigid (check for deflections)', true, 1, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FREE PLAY', 'MECHANICAL_MECH4_176', '• FRONT LEFT', true, 2, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FREE PLAY', 'MECHANICAL_MECH4_177', '• FRONT RIGHT', true, 3, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FREE PLAY', 'MECHANICAL_MECH4_178', '• REAR LEFT', true, 4, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FREE PLAY', 'MECHANICAL_MECH4_179', '• REAR RIGHT', true, 5, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FASTENING ', 'MECHANICAL_MECH4_180', '[T2.6.1] WHEEL NUTS

• If a single nut is used to retain the wheel, a device must be incorporated to prevent loosening of the nut and the wheel. A second nut (jam nut) is not allowed.', true, 6, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FASTENING ', 'MECHANICAL_MECH4_181', '• Custom wheel nuts must show proof of good engineering practices. 
Purchased single nut systems must show proof of purchase.

- Ask for pretension force of the wheel lug assembly', true, 7, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FASTENING ', 'MECHANICAL_MECH4_182', 'No safety wiring for positive locking of center wheel nuts. Only proper industrially manufactured cotter pins, center lock wheel springs or mechanisms compliant with T10.2', true, 8, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FASTENING ', 'MECHANICAL_MECH4_183', '[T2.6.2
T2.6.3] WHEEL LUG BOLTS - STUDS - NUTS

• Wheel lug bolts and studs must be made of steel or titanium. The team must be able to show good engineering practice and providing adequate strength by calculations. Wheel lugbolts and studs must not be hollow.

• Aluminum wheel nuts may be used, but they must be hard anodized and in pristine condition.

• Wheel nuts must comply with T 10.2. An exception is made for commercially designed fasteners designated for wheels. In this case documentation must be presented together with proof of purchase, datasheets, calculations, proof of correct installment and other necessary documentation needed to prove their compliance.

- Ask for calculations that justify the design''s safety.', true, 9, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FASTENING ', 'MECHANICAL_MECH4_184', '• The assembly must be positively locked and be a mechanical connection (green example).

• Wheel studs may not be fastened/locked by friction only, e.g. a press fit (red example).

• Threaded studs are allowed as long as it is positively locked. 

• Off-the-self conical nuts as well as conical lug nut bolts are allowed if the correct pretension values are used.', true, 10, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - WHEEL FASTENING ', 'MECHANICAL_MECH4_185', '[T2.5.1] SUSPENSION (EV - WITH ACCUMULATOR STICKER AND ACCUMULATOR INSIDE) (Checked also in M1 with driver inside)

• The vehicle must be equipped with fully operational front and rear suspension systems including shock absorbers and a usable wheel travel of at least 50mm and a minimum jounce of 25mm with driver seated.

• All supension pickup points must be secure and rigid', true, 11, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM (T6) (VEHICLE ', 'MECHANICAL_MECH4_No.', '[Rule No] Checkpoint', true, 12, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM (T6) (VEHICLE ', 'MECHANICAL_MECH4_186', '[T2.8.1] • Steering systems using cables or belts for actuation are prohibited. 
This does not apply for autonomous steering actuators.', true, 13, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM (T6) (VEHICLE ', 'MECHANICAL_MECH4_187', '[T2.8.11] • Rear wheels steering maximum 6 degrees and with mechanical stops', true, 14, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM (T6) (VEHICLE ', 'MECHANICAL_MECH4_188', '[T10.2.6] • If adjustable tie-rod ends are used, a jam nut must be used to prevent loosening

• Purchased devices that mechanically prevent loosening are allowed after being thoroughly inspected.', true, 15, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING WHEEL', 'MECHANICAL_MECH4_189', '[T2.8.5
T2.8.7] • Steering wheel must be round, oval or near-oval with a quick release installed. No concave sections !

(Check quick release)', true, 16, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING WHEEL', 'MECHANICAL_MECH4_190', '[T2.8.6
T2.8.8] • The steering wheel must be no more than 250 mm rearward of the front hoop. This distance is measured horizontally, on the vehicle centerline, from the rear surface of the front hoop to the forward most surface of the steering wheel with the steering in any position.

• In any angular position, the top of the steering wheel must be no higher than the top-most surface of the front hoop.', true, 17, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING WHEEL', 'MECHANICAL_MECH4_191', '• Assess the steering wheel''s structural integrity by pushing it (from the handles) forwards to simulate breaking situation and backwards to simulate acceleration forces', true, 18, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM FREE PLAY', 'MECHANICAL_MECH4_192', '[T2.8.4] • Allowable steering system free play is limited to a total of 7° measured at the steering wheel.

- Position your foot against the wheel and slowly steer. Assess the force on your foot and the steering play existing.', true, 19, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM FREE PLAY', 'MECHANICAL_MECH4_193', '• Check for CONTACT between components in the wheel assembly 

(If in doubt, inspect again with the vehicle lifted and the wheels on)', true, 20, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM FREE PLAY', 'MECHANICAL_MECH4_194', 'FRONT LEFT', true, 21, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM FREE PLAY', 'MECHANICAL_MECH4_195', 'FRONT RIGHT', true, 22, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM', 'MECHANICAL_MECH4_No._23', '[Rule No] Checkpoint', true, 23, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM', 'MECHANICAL_MECH4_196', '[T6.1.5] • No "Brake-by-wire" in manual mode.', true, 24, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM', 'MECHANICAL_MECH4_197', '[T6.1.1] • Hydraulic brake system that acts on all four wheels and is operated by a single control.', true, 25, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM', 'MECHANICAL_MECH4_198', '[T6.1.2] • Two independent hydraulic circuits. In case of leak or failure effective braking power maintained in on at least two wheels', true, 26, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM', 'MECHANICAL_MECH4_199', '[T6.1.4] • A single brake acting on a limited-slip differential is acceptable', true, 27, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM', 'MECHANICAL_MECH4_200', '[T6.1.3
T6.1.6] • Sealed to prevent leakage

• Unarmored plastic brake lines are prohibited.', true, 28, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM', 'MECHANICAL_MECH4_201', '[T6.1.7] • The brake system must be protected from failure of the drivetrain, see T 7.3.2, from touching any movable part and from minor collisions.

(rotating parts - gears, clutches, chains, belts etc must be fitted with scatter shield. Check protection of brae system)', true, 29, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM', 'MECHANICAL_MECH4_202', '[T6.1.8] Any part of the brake system must be within the surface envelope, see T1.1.18

•  No part of the braking system on the sprung part of the vehicle below the lower surface of the chassis', true, 30, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - !WHILE THE VEHICLE IS LIFTED, ', 'MECHANICAL_MECH4_No._31', '[Rule No] Checkpoint', true, 31, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - !WHILE THE VEHICLE IS LIFTED, ', 'MECHANICAL_MECH4_6660be', 'Guidelines

- Ask the teams to loosen the wheel nuts to jack the car up.

- Check for the proper position of the jacking device (use the points indicated by orange triangles if safe)

- Ask the team to remove the wheels', true, 32, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - !WHILE THE VEHICLE IS LIFTED, ', 'MECHANICAL_MECH4_203', '[T2.8.3] STEERING SYSTEM STOPS

• Must have positive steering stops that prevent the steering linkages from
locking up. The stops must be placed on the rack and must prevent the tires and rims from contacting any other parts. Steering actuation must be possible during standstill.

(Check for collisions in the wheel assembly)', true, 33, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_No._34', '[Rule No] Checkpoint', true, 34, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_204', '[T 10.1.1
T 10.2.1] LOCKING:

The following fasteners are considered critical and have to be positively locked according to T10.2: 

• Steering System
• Braking system (Pedalbox)  
• Suspension System                       
• ETC
• Primary Structure (M2)
• Drivers harness (M2)
• Accumulator Container (M2)', true, 35, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_8825f0', 'FRONT LEFT', true, 36, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_205', 'A-ARMS and A-ARM MOUNTS', true, 37, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_206', '[T 10.2.4] • 2 threads minimum', true, 38, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_207', '[T 10.2.1] • Positive locking', true, 39, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_208', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 40, 'CV') ON CONFLICT (inspection_type_id, item_code, vehicle_class) DO NOTHING;

INSERT INTO checklist_templates (inspection_type_id, section, item_code, description, required, order_index, vehicle_class) VALUES
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_209', '• Check if the bolts are tight', true, 41, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_210', 'TIE ROD AND TIE ROD LENGTH ADJUSTING SYSTEM', true, 42, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_211', '[T 10.2.4] • 2 threads minimum', true, 43, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_212', '[T 10.2.1] • Positive locking', true, 44, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_213', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 45, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_214', '• Check if the bolts are tight', true, 46, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_215', 'PUSH/PULL ROD AND LENGTH ADJUSTING SYSTEM', true, 47, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_216', '[T 10.2.4] • 2 threads minimum', true, 48, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_217', '[T 10.2.1] • Positive locking', true, 49, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_218', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 50, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_219', '• Check if the bolts are tight', true, 51, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_220', 'BRAKE CALIPERS', true, 52, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_221', '[T 10.2.4] • 2 threads minimum', true, 53, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_222', '[T 10.2.1] • Positive locking', true, 54, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_223', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 55, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_224', '• Check if the bolts are tight', true, 56, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_225', 'BRAKE DISKS', true, 57, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_226', '[T 10.2.4] • 2 threads minimum', true, 58, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_227', '[T 10.2.1] • Positive locking', true, 59, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_228', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 60, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_229', '• Check if the bolts are tight', true, 61, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_7c0218', 'FRONT RIGHT', true, 62, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_230', 'A-ARMS and A-ARM MOUNTS', true, 63, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_231', '[T 10.2.4] • 2 threads minimum', true, 64, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_232', '[T 10.2.1] • Positive locking', true, 65, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_233', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 66, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_234', '• Check if the bolts are tight', true, 67, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_235', 'TIE ROD AND TIE ROD LENGTH ADJUSTING SYSTEM', true, 68, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_236', '[T 10.2.4] • 2 threads minimum', true, 69, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_237', '[T 10.2.1] • Positive locking', true, 70, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_238', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 71, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_239', '• Check if the bolts are tight', true, 72, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_240', 'PUSH/PULL ROD AND LENGTH ADJUSTING SYSTEM', true, 73, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_241', '[T 10.2.4] • 2 threads minimum', true, 74, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_242', '[T 10.2.1] • Positive locking', true, 75, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_243', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 76, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_244', '• Check if the bolts are tight', true, 77, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_245', 'BRAKE CALIPERS', true, 78, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_246', '[T 10.2.4] • 2 threads minimum', true, 79, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_247', '[T 10.2.1] • Positive locking', true, 80, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_248', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 81, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_249', '• Check if the bolts are tight', true, 82, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_250', 'BRAKE DISKS', true, 83, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_251', '[T 10.2.4] • 2 threads minimum', true, 84, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_252', '[T 10.2.1] • Positive locking', true, 85, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_253', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 86, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_254', '• Check if the bolts are tight', true, 87, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_06237b', 'REAR LEFT', true, 88, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_255', 'A-ARMS and A-ARM MOUNTS', true, 89, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_256', '[T 10.2.4] • 2 threads minimum', true, 90, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_257', '[T 10.2.1] • Positive locking', true, 91, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_258', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 92, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_259', '• Check if the bolts are tight', true, 93, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_260', 'TOE LINK AND TOE LINK LENGTH ADJUSTING SYSTEM', true, 94, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_261', '[T 10.2.4] • 2 threads minimum', true, 95, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_262', '[T 10.2.1] • Positive locking', true, 96, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_263', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 97, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_264', '• Check if the bolts are tight', true, 98, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_265', 'PUSH/PULL RODS AND THEIR LENGTH ADJUSTING SYSTEM', true, 99, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_266', '[T 10.2.4] • 2 threads minimum', true, 100, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_267', '[T 10.2.1] • Positive locking', true, 101, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_268', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 102, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_269', '• Check if the bolts are tight', true, 103, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_270', 'BRAKE CALIPERS', true, 104, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_271', '[T 10.2.4] • 2 threads minimum', true, 105, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_272', '[T 10.2.1] • Positive locking', true, 106, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_273', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 107, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_274', '• Check if the bolts are tight', true, 108, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_275', 'BRAKE DISKS', true, 109, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_276', '[T 10.2.4] • 2 threads minimum', true, 110, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_277', '[T 10.2.1] • Positive locking', true, 111, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_278', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 112, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_279', '• Check if the bolts are tight', true, 113, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_5f4234', 'REAR RIGHT', true, 114, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_280', 'A-ARMS and A-ARM MOUNTS', true, 115, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_281', '[T 10.2.4] • 2 threads minimum', true, 116, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_282', '[T 10.2.1] • Positive locking', true, 117, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_283', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 118, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_284', '• Check if the bolts are tight', true, 119, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_285', 'TOE LINK AND TOE LINK LENGTH ADJUSTING SYSTEM', true, 120, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_286', '[T 10.2.4] • 2 threads minimum', true, 121, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_287', '[T 10.2.1] • Positive locking', true, 122, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_288', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 123, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_289', '• Check if the bolts are tight', true, 124, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_290', 'PUSH/PULL RODS AND THEIR LENGTH ADJUSTING SYSTEM', true, 125, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_291', '[T 10.2.4] • 2 threads minimum', true, 126, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_292', '[T 10.2.1] • Positive locking', true, 127, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_293', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 128, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_294', '• Check if the bolts are tight', true, 129, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_295', 'BRAKE CALIPERS', true, 130, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_296', '[T 10.2.4] • 2 threads minimum', true, 131, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_297', '[T 10.2.1] • Positive locking', true, 132, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_298', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 133, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_299', '• Check if the bolts are tight', true, 134, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_300', 'BRAKE DISKS', true, 135, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_301', '[T 10.2.4] • 2 threads minimum', true, 136, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_302', '[T 10.2.1] • Positive locking', true, 137, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_303', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 138, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_304', '• Check if the bolts are tight', true, 139, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_305', 'DIFFERENTIAL MOUNT', true, 140, 'CV') ON CONFLICT (inspection_type_id, item_code, vehicle_class) DO NOTHING;

INSERT INTO checklist_templates (inspection_type_id, section, item_code, description, required, order_index, vehicle_class) VALUES
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_306', '[T 10.2.4] • 2 threads minimum', true, 141, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_307', '[T 10.2.1] • Positive locking', true, 142, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_308', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 143, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_309', '• Check if the bolts are tight', true, 144, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - FASTENERS (T10)', 'MECHANICAL_MECH4_310', 'WHEEL-MOTOR-GEARBOX ASSEMBLY

• The teams should provide a 2D cross section of the assembly and explain the design. The individual components (motor mount, bearring installation, planetery gear box installation etc.) shall be properly locked and cosist a safe design

• Check to the possible extend, if the presented design matches the installation on the car', true, 145, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM', 'MECHANICAL_MECH4_311', '[T 10.2.4] • 2 threads minimum', true, 146, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM', 'MECHANICAL_MECH4_312', '[T 10.2.1] • Positive locking', true, 147, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM', 'MECHANICAL_MECH4_313', '[T 10.2.2] • No nylon locknuts in areas with heatsource 
(max 80 °C, minimum 50mm distance from the heatsource)', true, 148, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM', 'MECHANICAL_MECH4_314', '• Check if the bolts are tight', true, 149, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM', 'MECHANICAL_MECH4_315', '• The teams should provide a 2D cross section of the steering system assembly and explain the design. The individual components, transfer of movement to the wheels, upper and lower steering column bearing mount system should be checked', true, 150, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - STEERING SYSTEM', 'MECHANICAL_MECH4_316', '[T2.8.9] STEERING RACK

• must be mechanically attached to the primary structure.

• Joints between all components attaching the steering wheel to the steering rack must be mechanical and visible at technical inspection. Bonded joints are allowed in accordance with T 3.2.8.', true, 151, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM ', 'MECHANICAL_MECH4_No._152', '[Rule No] Checkpoint', true, 152, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM ', 'MECHANICAL_MECH4_317', '[T6.1.10] • The brake pedal, including the pedal face, must be fabricated from steel or aluminium or machined from steel, aluminium or titanium.', true, 153, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM ', 'MECHANICAL_MECH4_318', '• Repeat check on safety wiring of the braking assembly on each wheel', true, 154, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM ', 'MECHANICAL_MECH4_319', '[T6.1.9] • The brake pedal and its mounting must be designed to withstand a force of     2 kN without any failure of the brake system or pedal box. This may be tested by pressing the pedal with the maximum force that can be exerted by any official when seated normally

The team must provide calculations that all the individual components as mentioned above (brake pedal, brake pedal mounting, pedal box mounting) can withstand a 2 kN force.', true, 155, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - BRAKE SYSTEM ', 'MECHANICAL_MECH4_320', '[T6.2] BRAKE OVER-TRAVEL SWITCH - BOTS 

• The BOTS must be a push-pull, push-rotate or flip type mechanical switch

• The driver must not be able to reset it.

• Visually Check if the brake pedal is designed so that the BOTS can be triggered. Teams should provide extra documentation if the method of triggering is unclear.', true, 156, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - VEHICLE ASSEMBLED AND ON THE G', 'MECHANICAL_MECH4_No._157', '[Rule No] Checkpoint', true, 157, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - VEHICLE ASSEMBLED AND ON THE G', 'MECHANICAL_MECH4_321', '[T6.1.9] BRAKE PEDAL TEST 

• Enter the vehicle and kick the brake pedal 

• Also apply force progressively and slowly to feel any abnormal flexing. 

Pay special attention to the brake pedal and pedalbox assembly, failures happen.', true, 158, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - VEHICLE ASSEMBLED AND ON THE G', 'MECHANICAL_MECH4_322', '[T2.8.2
T2.8.3] STEERING SYSTEM CHECK 

• The steering wheel must directly mechanically actuate the front wheels.

• Steering actuation must be possible during standstill.

- While inside the vehicle, quickly steer the wheels to check including your weight', true, 159, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - VEHICLE ASSEMBLED AND ON THE G', 'MECHANICAL_MECH4_030b4c', 'APPROVAL STATUS', true, 160, 'CV'),
((SELECT id FROM inspection_types WHERE key = 'mechanical'), 'MECH 4 - VEHICLE ASSEMBLED AND ON THE G', 'MECHANICAL_MECH4_MECH 4', 'Approval (Control box) (DON''T CHANGE MANUALLY)', true, 161, 'CV') ON CONFLICT (inspection_type_id, item_code, vehicle_class) DO NOTHING;

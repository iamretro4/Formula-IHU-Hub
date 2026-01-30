export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          assigned_scrutineer_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          date: string
          end_time: string
          id: string
          inspection_status: string | null
          inspection_type_id: string
          is_rescrutineering: boolean | null
          notes: string | null
          priority_level: number | null
          resource_index: number
          start_time: string
          started_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          team_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_scrutineer_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          date: string
          end_time: string
          id?: string
          inspection_status?: string | null
          inspection_type_id: string
          is_rescrutineering?: boolean | null
          notes?: string | null
          priority_level?: number | null
          resource_index?: number
          start_time: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          team_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_scrutineer_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          date?: string
          end_time?: string
          id?: string
          inspection_status?: string | null
          inspection_type_id?: string
          is_rescrutineering?: boolean | null
          notes?: string | null
          priority_level?: number | null
          resource_index?: number
          start_time?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_inspection_type_id_fkey"
            columns: ["inspection_type_id"]
            isOneToOne: false
            referencedRelation: "inspection_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "unified_overall_results"
            referencedColumns: ["team_id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string | null
          description: string
          id: string
          inspection_type_id: string
          item_code: string
          item_index: number
          order_index: number
          parent_item_id: string | null
          required: boolean | null
          section: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          inspection_type_id: string
          item_code: string
          item_index?: number
          order_index: number
          parent_item_id?: string | null
          required?: boolean | null
          section: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          inspection_type_id?: string
          item_code?: string
          item_index?: number
          order_index?: number
          parent_item_id?: string | null
          required?: boolean | null
          section?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_inspection_type_id_fkey"
            columns: ["inspection_type_id"]
            isOneToOne: false
            referencedRelation: "inspection_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_templates_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_event_results: {
        Row: {
          best_time: number | null
          class_position: number | null
          event_type: Database["public"]["Enums"]["dynamic_event_type"]
          id: string
          points: number | null
          position: number | null
          status: Database["public"]["Enums"]["result_status"] | null
          team_id: string
          tmax: number | null
          tmin: number | null
          updated_at: string | null
        }
        Insert: {
          best_time?: number | null
          class_position?: number | null
          event_type: Database["public"]["Enums"]["dynamic_event_type"]
          id?: string
          points?: number | null
          position?: number | null
          status?: Database["public"]["Enums"]["result_status"] | null
          team_id: string
          tmax?: number | null
          tmin?: number | null
          updated_at?: string | null
        }
        Update: {
          best_time?: number | null
          class_position?: number | null
          event_type?: Database["public"]["Enums"]["dynamic_event_type"]
          id?: string
          points?: number | null
          position?: number | null
          status?: Database["public"]["Enums"]["result_status"] | null
          team_id?: string
          tmax?: number | null
          tmin?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_event_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamic_event_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "unified_overall_results"
            referencedColumns: ["team_id"]
          },
        ]
      }
      dynamic_event_runs: {
        Row: {
          corrected_time: number | null
          created_at: string | null
          driver_id: string | null
          event_type: Database["public"]["Enums"]["dynamic_event_type"]
          id: string
          notes: string | null
          penalties: Json | null
          raw_time: number | null
          recorded_at: string | null
          recorded_by: string
          run_number: number
          status: Database["public"]["Enums"]["run_status"] | null
          team_id: string
          weather_conditions: string | null
        }
        Insert: {
          corrected_time?: number | null
          created_at?: string | null
          driver_id?: string | null
          event_type: Database["public"]["Enums"]["dynamic_event_type"]
          id?: string
          notes?: string | null
          penalties?: Json | null
          raw_time?: number | null
          recorded_at?: string | null
          recorded_by: string
          run_number: number
          status?: Database["public"]["Enums"]["run_status"] | null
          team_id: string
          weather_conditions?: string | null
        }
        Update: {
          corrected_time?: number | null
          created_at?: string | null
          driver_id?: string | null
          event_type?: Database["public"]["Enums"]["dynamic_event_type"]
          id?: string
          notes?: string | null
          penalties?: Json | null
          raw_time?: number | null
          recorded_at?: string | null
          recorded_by?: string
          run_number?: number
          status?: Database["public"]["Enums"]["run_status"] | null
          team_id?: string
          weather_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_event_runs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamic_event_runs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "unified_overall_results"
            referencedColumns: ["team_id"]
          },
        ]
      }
      efficiency_results: {
        Row: {
          combined_endurance_efficiency_points: number | null
          efficiency_factor: number | null
          efficiency_points: number | null
          endurance_time: number | null
          energy_used: number | null
          id: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          combined_endurance_efficiency_points?: number | null
          efficiency_factor?: number | null
          efficiency_points?: number | null
          endurance_time?: number | null
          energy_used?: number | null
          id?: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          combined_endurance_efficiency_points?: number | null
          efficiency_factor?: number | null
          efficiency_points?: number | null
          endurance_time?: number | null
          energy_used?: number | null
          id?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "efficiency_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "efficiency_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "unified_overall_results"
            referencedColumns: ["team_id"]
          },
        ]
      }
      feedback_bookings: {
        Row: {
          approved_by: string | null
          created_at: string | null
          date: string
          end_time: string
          id: string
          location: string
          notes: string | null
          requested_by: string
          slot_id: string
          start_time: string
          status: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          location: string
          notes?: string | null
          requested_by: string
          slot_id: string
          start_time: string
          status?: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          location?: string
          notes?: string | null
          requested_by?: string
          slot_id?: string
          start_time?: string
          status?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_bookings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_bookings_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "feedback_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_bookings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_bookings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "unified_overall_results"
            referencedColumns: ["team_id"]
          },
        ]
      }
      feedback_judge_assignments: {
        Row: {
          assigned_at: string | null
          booking_id: string
          id: string
          judge_id: string
        }
        Insert: {
          assigned_at?: string | null
          booking_id: string
          id?: string
          judge_id: string
        }
        Update: {
          assigned_at?: string | null
          booking_id?: string
          id?: string
          judge_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_judge_assignments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "feedback_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_judge_assignments_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_slots: {
        Row: {
          description: string | null
          event_time: string
          id: string
          location: string
          name: string
          status: string
        }
        Insert: {
          description?: string | null
          event_time: string
          id?: string
          location: string
          name: string
          status?: string
        }
        Update: {
          description?: string | null
          event_time?: string
          id?: string
          location?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      inspection_comments: {
        Row: {
          booking_id: string
          comment: string
          created_at: string
          id: string
          item_id: string
          user_id: string
        }
        Insert: {
          booking_id: string
          comment: string
          created_at?: string
          id?: string
          item_id: string
          user_id: string
        }
        Update: {
          booking_id?: string
          comment?: string
          created_at?: string
          id?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_booking"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_item"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_progress: {
        Row: {
          booking_id: string
          checked_at: string
          comment: string | null
          id: string
          item_id: string
          locked: boolean | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_id: string
          checked_at?: string
          comment?: string | null
          id?: string
          item_id: string
          locked?: boolean | null
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string
          checked_at?: string
          comment?: string | null
          id?: string
          item_id?: string
          locked?: boolean | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_progress_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_progress_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_results: {
        Row: {
          booking_id: string
          completed_at: string | null
          created_at: string | null
          failure_reasons: string | null
          id: string
          next_steps: string | null
          overall_notes: string | null
          pass_conditions: string | null
          scrutineer_ids: string[]
          started_at: string | null
          status: Database["public"]["Enums"]["result_status"]
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          completed_at?: string | null
          created_at?: string | null
          failure_reasons?: string | null
          id?: string
          next_steps?: string | null
          overall_notes?: string | null
          pass_conditions?: string | null
          scrutineer_ids?: string[]
          started_at?: string | null
          status?: Database["public"]["Enums"]["result_status"]
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          completed_at?: string | null
          created_at?: string | null
          failure_reasons?: string | null
          id?: string
          next_steps?: string | null
          overall_notes?: string | null
          pass_conditions?: string | null
          scrutineer_ids?: string[]
          started_at?: string | null
          status?: Database["public"]["Enums"]["result_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_results_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_types: {
        Row: {
          active: boolean | null
          concurrent_slots: number
          created_at: string | null
          description: string | null
          duration: number
          duration_minutes: number
          id: string
          key: string
          name: string
          prerequisites: string[] | null
          requirements: string | null
          slot_count: number
          sort_order: number
        }
        Insert: {
          active?: boolean | null
          concurrent_slots?: number
          created_at?: string | null
          description?: string | null
          duration?: number
          duration_minutes: number
          id?: string
          key: string
          name: string
          prerequisites?: string[] | null
          requirements?: string | null
          slot_count?: number
          sort_order: number
        }
        Update: {
          active?: boolean | null
          concurrent_slots?: number
          created_at?: string | null
          description?: string | null
          duration?: number
          duration_minutes?: number
          id?: string
          key?: string
          name?: string
          prerequisites?: string[] | null
          requirements?: string | null
          slot_count?: number
          sort_order?: number
        }
        Relationships: []
      }
      judge_score_audit: {
        Row: {
          admin_id: string
          changed_at: string | null
          id: string
          new_comment: string | null
          new_judge_id: string | null
          new_score: number | null
          old_comment: string | null
          old_judge_id: string | null
          old_score: number | null
          score_id: string
        }
        Insert: {
          admin_id: string
          changed_at?: string | null
          id?: string
          new_comment?: string | null
          new_judge_id?: string | null
          new_score?: number | null
          old_comment?: string | null
          old_judge_id?: string | null
          old_score?: number | null
          score_id: string
        }
        Update: {
          admin_id?: string
          changed_at?: string | null
          id?: string
          new_comment?: string | null
          new_judge_id?: string | null
          new_score?: number | null
          old_comment?: string | null
          old_judge_id?: string | null
          old_score?: number | null
          score_id?: string
        }
        Relationships: []
      }
      judged_event_bookings: {
        Row: {
          event_id: string | null
          id: string
          scheduled_time: string | null
          status: string | null
          team_id: string | null
        }
        Insert: {
          event_id?: string | null
          id?: string
          scheduled_time?: string | null
          status?: string | null
          team_id?: string | null
        }
        Update: {
          event_id?: string | null
          id?: string
          scheduled_time?: string | null
          status?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "judged_event_bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "judged_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judged_event_bookings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judged_event_bookings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "unified_overall_results"
            referencedColumns: ["team_id"]
          },
        ]
      }
      judged_event_criteria: {
        Row: {
          criterion_index: number
          event_id: string | null
          id: string
          max_score: number
          title: string
        }
        Insert: {
          criterion_index: number
          event_id?: string | null
          id?: string
          max_score?: number
          title: string
        }
        Update: {
          criterion_index?: number
          event_id?: string | null
          id?: string
          max_score?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "judged_event_criteria_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "judged_events"
            referencedColumns: ["id"]
          },
        ]
      }
      judged_event_scores: {
        Row: {
          booking_id: string | null
          comment: string | null
          criterion_id: string | null
          id: string
          judge_id: string | null
          score: number | null
          status: Database["public"]["Enums"]["score_status"]
          submitted_at: string | null
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          criterion_id?: string | null
          id?: string
          judge_id?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["score_status"]
          submitted_at?: string | null
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          criterion_id?: string | null
          id?: string
          judge_id?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["score_status"]
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "judged_event_scores_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "judged_event_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judged_event_scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "judged_event_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judged_event_scores_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      judged_events: {
        Row: {
          description: string | null
          event_time: string | null
          id: string
          location: string | null
          name: string
          status: string | null
        }
        Insert: {
          description?: string | null
          event_time?: string | null
          id?: string
          location?: string | null
          name: string
          status?: string | null
        }
        Update: {
          description?: string | null
          event_time?: string | null
          id?: string
          location?: string | null
          name?: string
          status?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          read_at?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      penalty_rules: {
        Row: {
          active: boolean | null
          condition: Json
          created_at: string | null
          event_type: Database["public"]["Enums"]["dynamic_event_type"]
          id: string
          penalty_unit: Database["public"]["Enums"]["penalty_unit"]
          penalty_value: number
          rule_type: Database["public"]["Enums"]["penalty_type"]
        }
        Insert: {
          active?: boolean | null
          condition: Json
          created_at?: string | null
          event_type: Database["public"]["Enums"]["dynamic_event_type"]
          id?: string
          penalty_unit: Database["public"]["Enums"]["penalty_unit"]
          penalty_value: number
          rule_type: Database["public"]["Enums"]["penalty_type"]
        }
        Update: {
          active?: boolean | null
          condition?: Json
          created_at?: string | null
          event_type?: Database["public"]["Enums"]["dynamic_event_type"]
          id?: string
          penalty_unit?: Database["public"]["Enums"]["penalty_unit"]
          penalty_value?: number
          rule_type?: Database["public"]["Enums"]["penalty_type"]
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      team_uploads: {
        Row: {
          document_key: string
          file_name: string
          id: string
          storage_path: string
          team_id: string
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          document_key: string
          file_name: string
          id?: string
          storage_path: string
          team_id: string
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          document_key?: string
          file_name?: string
          id?: string
          storage_path?: string
          team_id?: string
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_uploads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_uploads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "unified_overall_results"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          code: string
          created_at: string | null
          drivers: Json | null
          id: string
          name: string
          university: string
          updated_at: string | null
          vehicle_class: Database["public"]["Enums"]["vehicle_class"]
          vehicle_number: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          drivers?: Json | null
          id?: string
          name: string
          university: string
          updated_at?: string | null
          vehicle_class: Database["public"]["Enums"]["vehicle_class"]
          vehicle_number?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          drivers?: Json | null
          id?: string
          name?: string
          university?: string
          updated_at?: string | null
          vehicle_class?: Database["public"]["Enums"]["vehicle_class"]
          vehicle_number?: number | null
        }
        Relationships: []
      }
      track_activity_log: {
        Row: {
          action: string
          event: string
          id: string
          marshal_id: string | null
          sector: string
          team_id: string | null
          timestamp: string | null
        }
        Insert: {
          action: string
          event: string
          id?: string
          marshal_id?: string | null
          sector: string
          team_id?: string | null
          timestamp?: string | null
        }
        Update: {
          action?: string
          event?: string
          id?: string
          marshal_id?: string | null
          sector?: string
          team_id?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "track_activity_log_marshal_id_fkey"
            columns: ["marshal_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_activity_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_activity_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "unified_overall_results"
            referencedColumns: ["team_id"]
          },
        ]
      }
      track_incidents: {
        Row: {
          action_taken: string | null
          coordinates: unknown
          created_at: string | null
          description: string
          id: string
          incident_type: Database["public"]["Enums"]["incident_type"]
          marshal_id: string
          occurred_at: string | null
          run_number: number | null
          sector: string
          session_id: string | null
          severity: Database["public"]["Enums"]["severity_level"] | null
          team_id: string
          weather_impact: boolean | null
        }
        Insert: {
          action_taken?: string | null
          coordinates?: unknown
          created_at?: string | null
          description: string
          id?: string
          incident_type: Database["public"]["Enums"]["incident_type"]
          marshal_id: string
          occurred_at?: string | null
          run_number?: number | null
          sector: string
          session_id?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          team_id: string
          weather_impact?: boolean | null
        }
        Update: {
          action_taken?: string | null
          coordinates?: unknown
          created_at?: string | null
          description?: string
          id?: string
          incident_type?: Database["public"]["Enums"]["incident_type"]
          marshal_id?: string
          occurred_at?: string | null
          run_number?: number | null
          sector?: string
          session_id?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          team_id?: string
          weather_impact?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "track_incidents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "track_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_incidents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_incidents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "unified_overall_results"
            referencedColumns: ["team_id"]
          },
        ]
      }
      track_sessions: {
        Row: {
          created_at: string | null
          entry_time: string | null
          exit_time: string | null
          id: string
          marshal_id: string
          notes: string | null
          sector: string
          status: Database["public"]["Enums"]["session_status"] | null
          team_id: string
          track_conditions: string | null
          updated_at: string | null
          weather_conditions: string | null
        }
        Insert: {
          created_at?: string | null
          entry_time?: string | null
          exit_time?: string | null
          id?: string
          marshal_id: string
          notes?: string | null
          sector: string
          status?: Database["public"]["Enums"]["session_status"] | null
          team_id: string
          track_conditions?: string | null
          updated_at?: string | null
          weather_conditions?: string | null
        }
        Update: {
          created_at?: string | null
          entry_time?: string | null
          exit_time?: string | null
          id?: string
          marshal_id?: string
          notes?: string | null
          sector?: string
          status?: Database["public"]["Enums"]["session_status"] | null
          team_id?: string
          track_conditions?: string | null
          updated_at?: string | null
          weather_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "track_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "unified_overall_results"
            referencedColumns: ["team_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          app_role: Database["public"]["Enums"]["user_role"]
          billing_address: string | null
          campsite_staying: boolean | null
          created_at: string | null
          ehic_number: string | null
          email: string
          emergency_contact: string
          faculty_advisor_name: string | null
          faculty_advisor_position: string | null
          father_name: string
          first_name: string
          id: string
          last_name: string
          login_approved: boolean
          phone: string
          profile_completed: boolean | null
          team_id: string | null
          team_lead: boolean | null
          university_name: string | null
          updated_at: string | null
          vat_id: string | null
        }
        Insert: {
          app_role?: Database["public"]["Enums"]["user_role"]
          billing_address?: string | null
          campsite_staying?: boolean | null
          created_at?: string | null
          ehic_number?: string | null
          email: string
          emergency_contact: string
          faculty_advisor_name?: string | null
          faculty_advisor_position?: string | null
          father_name: string
          first_name: string
          id: string
          last_name: string
          login_approved?: boolean
          phone: string
          profile_completed?: boolean | null
          team_id?: string | null
          team_lead?: boolean | null
          university_name?: string | null
          updated_at?: string | null
          vat_id?: string | null
        }
        Update: {
          app_role?: Database["public"]["Enums"]["user_role"]
          billing_address?: string | null
          campsite_staying?: boolean | null
          created_at?: string | null
          ehic_number?: string | null
          email?: string
          emergency_contact?: string
          faculty_advisor_name?: string | null
          faculty_advisor_position?: string | null
          father_name?: string
          first_name?: string
          id?: string
          last_name?: string
          login_approved?: boolean
          phone?: string
          profile_completed?: boolean | null
          team_id?: string | null
          team_lead?: boolean | null
          university_name?: string | null
          updated_at?: string | null
          vat_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "unified_overall_results"
            referencedColumns: ["team_id"]
          },
        ]
      }
    }
    Views: {
      best_dynamic_event_results: {
        Row: {
          best_corrected_time: number | null
          best_raw_time: number | null
          event_type: Database["public"]["Enums"]["dynamic_event_type"] | null
          team_id: string | null
          vehicle_class: Database["public"]["Enums"]["vehicle_class"] | null
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_event_runs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamic_event_runs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "unified_overall_results"
            referencedColumns: ["team_id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      static_event_aggregate: {
        Row: {
          static_event: string | null
          team_code: string | null
          team_id: string | null
          team_name: string | null
          total_score: number | null
          vehicle_class: Database["public"]["Enums"]["vehicle_class"] | null
        }
        Relationships: [
          {
            foreignKeyName: "judged_event_bookings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judged_event_bookings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "unified_overall_results"
            referencedColumns: ["team_id"]
          },
        ]
      }
      unified_overall_results: {
        Row: {
          acceleration_points: number | null
          autocross_points: number | null
          business_points: number | null
          cost_points: number | null
          design_points: number | null
          efficiency_points: number | null
          endurance_points: number | null
          skidpad_points: number | null
          team_id: string | null
          total_points: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      apply_penalties_and_score_run: {
        Args: { run_id: string }
        Returns: undefined
      }
      apply_penalties_to_runs: {
        Args: never
        Returns: {
          error_message: string
          updated_count: number
        }[]
      }
      create_notification: {
        Args: {
          notification_link?: string
          notification_message: string
          notification_title: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          target_user_id: string
        }
        Returns: string
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      fetch_approved_events_for_team: {
        Args: { team_id_input: string }
        Returns: {
          description: string
          event_time: string
          id: string
          location: string
          name: string
          status: string
        }[]
      }
      fetch_approved_judged_scores: {
        Args: never
        Returns: {
          booking_id: string
          comment: string
          event_name: string
          id: string
          score: number
          status: Database["public"]["Enums"]["score_status"]
          team_code: string
          team_id: string
          team_name: string
        }[]
      }
      fetch_approved_scores: {
        Args: never
        Returns: {
          booking_id: string
          comment: string
          event_name: string
          id: string
          score: number
          status: Database["public"]["Enums"]["score_status"]
          team_code: string
          team_id: string
          team_name: string
          vehicle_class: Database["public"]["Enums"]["vehicle_class"]
        }[]
      }
      fetch_event_leaderboard: {
        Args: { event_type: string; vehicle_class: string }
        Returns: {
          best_corrected_time: number
          best_raw_time: number
          points: number
          team_code: string
          team_id: string
          team_name: string
        }[]
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_checklist_completion: {
        Args: { booking_uuid: string }
        Returns: {
          can_pass: boolean
          completed_items: number
          completion_percentage: number
          total_items: number
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      initialize_inspection_progress: {
        Args: { booking_uuid: string }
        Returns: undefined
      }
      insert_checklist_items_by_id: {
        Args: { p_inspection_type_id: string; p_items: Json; p_section: string }
        Returns: number
      }
      insert_checklist_items_by_name: {
        Args: { p_items: Json; p_name: string; p_section: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_team_leader: { Args: never; Returns: boolean }
      is_team_leader_of_user: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      user_role_cached: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      user_team: { Args: never; Returns: string }
    }
    Enums: {
      booking_status:
        | "upcoming"
        | "ongoing"
        | "completed"
        | "cancelled"
        | "no_show"
      dynamic_event_type: "acceleration" | "skidpad" | "autocross" | "endurance"
      efficiency_status: "provisional" | "final"
      incident_type: "DOO" | "OOC" | "OTHER"
      inspection_progress_status: "passed" | "failed"
      inspection_type_enum:
        | "pre_inspection"
        | "mechanical"
        | "accumulator"
        | "electrical"
        | "noise_test"
        | "brake_test"
        | "tilt_test"
        | "rain_test"
      notification_type: "info" | "success" | "warning" | "error" | "critical"
      penalty_type: "time_penalty" | "points_deduction" | "dsq"
      penalty_unit: "seconds" | "points" | "percentage"
      result_status:
        | "ongoing"
        | "passed"
        | "failed"
        | "conditional_pass"
        | "provisional"
      run_status: "completed" | "dsq" | "dnf" | "cancelled"
      score_status: "pending" | "approved" | "rejected"
      session_status: "active" | "completed" | "cancelled"
      severity_level: "minor" | "major" | "critical"
      user_role:
        | "admin"
        | "scrutineer"
        | "team_leader"
        | "inspection_responsible"
        | "team_member"
        | "design_judge_software"
        | "design_judge_mechanical"
        | "design_judge_electronics"
        | "design_judge_overall"
        | "bp_judge"
        | "cm_judge"
        | "track_marshal"
        | "viewer"
      vehicle_class: "EV" | "CV"
      vehicle_status:
        | "pending"
        | "ready"
        | "under_maintenance"
        | "failed_inspection"
        | "passed_inspection"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status: [
        "upcoming",
        "ongoing",
        "completed",
        "cancelled",
        "no_show",
      ],
      dynamic_event_type: ["acceleration", "skidpad", "autocross", "endurance"],
      efficiency_status: ["provisional", "final"],
      incident_type: ["DOO", "OOC", "OTHER"],
      inspection_progress_status: ["passed", "failed"],
      inspection_type_enum: [
        "pre_inspection",
        "mechanical",
        "accumulator",
        "electrical",
        "noise_test",
        "brake_test",
        "tilt_test",
        "rain_test",
      ],
      notification_type: ["info", "success", "warning", "error", "critical"],
      penalty_type: ["time_penalty", "points_deduction", "dsq"],
      penalty_unit: ["seconds", "points", "percentage"],
      result_status: [
        "ongoing",
        "passed",
        "failed",
        "conditional_pass",
        "provisional",
      ],
      run_status: ["completed", "dsq", "dnf", "cancelled"],
      score_status: ["pending", "approved", "rejected"],
      session_status: ["active", "completed", "cancelled"],
      severity_level: ["minor", "major", "critical"],
      user_role: [
        "admin",
        "scrutineer",
        "team_leader",
        "inspection_responsible",
        "team_member",
        "design_judge_software",
        "design_judge_mechanical",
        "design_judge_electronics",
        "design_judge_overall",
        "bp_judge",
        "cm_judge",
        "track_marshal",
        "viewer",
      ],
      vehicle_class: ["EV", "CV"],
      vehicle_status: [
        "pending",
        "ready",
        "under_maintenance",
        "failed_inspection",
        "passed_inspection",
      ],
    },
  },
} as const

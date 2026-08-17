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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          booking_id: string | null
          created_at: string
          customer_id: string | null
          event: string
          id: string
          props: Json
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          customer_id?: string | null
          event: string
          id?: string
          props?: Json
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          customer_id?: string | null
          event?: string
          id?: string
          props?: Json
        }
        Relationships: []
      }
      bookings: {
        Row: {
          agreement_accepted_at: string | null
          booking_code: string
          checked_in_at: string | null
          created_at: string
          customer_id: string
          handover_confirmed_at: string | null
          hub_id: string
          id: string
          model_id: string
          plan_id: string
          rapido_coupon: string | null
          rejection_reason: string | null
          reservation_expires_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          travel_mode: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          agreement_accepted_at?: string | null
          booking_code?: string
          checked_in_at?: string | null
          created_at?: string
          customer_id: string
          handover_confirmed_at?: string | null
          hub_id: string
          id?: string
          model_id: string
          plan_id: string
          rapido_coupon?: string | null
          rejection_reason?: string | null
          reservation_expires_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          travel_mode?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          agreement_accepted_at?: string | null
          booking_code?: string
          checked_in_at?: string | null
          created_at?: string
          customer_id?: string
          handover_confirmed_at?: string | null
          hub_id?: string
          id?: string
          model_id?: string
          plan_id?: string
          rapido_coupon?: string | null
          rejection_reason?: string | null
          reservation_expires_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          travel_mode?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      challans: {
        Row: {
          amount: number
          challan_date: string
          challan_no: string
          created_at: string
          customer_id: string
          id: string
          location: string | null
          rental_id: string | null
          status: string
          vehicle_id: string
          violation: string
        }
        Insert: {
          amount: number
          challan_date?: string
          challan_no: string
          created_at?: string
          customer_id: string
          id?: string
          location?: string | null
          rental_id?: string | null
          status?: string
          vehicle_id: string
          violation: string
        }
        Update: {
          amount?: number
          challan_date?: string
          challan_no?: string
          created_at?: string
          customer_id?: string
          id?: string
          location?: string | null
          rental_id?: string | null
          status?: string
          vehicle_id?: string
          violation?: string
        }
        Relationships: [
          {
            foreignKeyName: "challans_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challans_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          locality: string | null
          phone: string
          pin_code: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          locality?: string | null
          phone: string
          pin_code?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          locality?: string | null
          phone?: string
          pin_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hubs: {
        Row: {
          address: string
          city: string
          closes_at: string
          created_at: string
          id: string
          is_active: boolean
          latitude: number
          locality: string
          longitude: number
          name: string
          opens_at: string
          phone: string | null
        }
        Insert: {
          address: string
          city?: string
          closes_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude: number
          locality: string
          longitude: number
          name: string
          opens_at?: string
          phone?: string | null
        }
        Update: {
          address?: string
          city?: string
          closes_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number
          locality?: string
          longitude?: number
          name?: string
          opens_at?: string
          phone?: string | null
        }
        Relationships: []
      }
      inspections: {
        Row: {
          accessories: string[]
          booking_id: string | null
          created_at: string
          customer_id: string
          damages: Json
          fuel_percent: number
          id: string
          inspection_type: string
          notes: string | null
          odometer: number
          photos: Json
          rental_id: string | null
          vehicle_id: string
        }
        Insert: {
          accessories?: string[]
          booking_id?: string | null
          created_at?: string
          customer_id: string
          damages?: Json
          fuel_percent?: number
          id?: string
          inspection_type?: string
          notes?: string | null
          odometer?: number
          photos?: Json
          rental_id?: string | null
          vehicle_id: string
        }
        Update: {
          accessories?: string[]
          booking_id?: string | null
          created_at?: string
          customer_id?: string
          damages?: Json
          fuel_percent?: number
          id?: string
          inspection_type?: string
          notes?: string | null
          odometer?: number
          photos?: Json
          rental_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_cases: {
        Row: {
          action_required_reason: string | null
          address_proof_status: string
          booking_id: string
          consent_at: string | null
          consent_device: string | null
          consent_text: string | null
          consent_version: string | null
          created_at: string
          customer_id: string
          dl_class: string | null
          dl_dob: string | null
          dl_name: string | null
          dl_number: string | null
          dl_state: string | null
          dl_valid_until: string | null
          dl_verified: boolean
          eligibility_result: string | null
          id: string
          rejection_reason: string | null
          selfie_captured: boolean
          status: Database["public"]["Enums"]["kyc_status"]
          updated_at: string
        }
        Insert: {
          action_required_reason?: string | null
          address_proof_status?: string
          booking_id: string
          consent_at?: string | null
          consent_device?: string | null
          consent_text?: string | null
          consent_version?: string | null
          created_at?: string
          customer_id: string
          dl_class?: string | null
          dl_dob?: string | null
          dl_name?: string | null
          dl_number?: string | null
          dl_state?: string | null
          dl_valid_until?: string | null
          dl_verified?: boolean
          eligibility_result?: string | null
          id?: string
          rejection_reason?: string | null
          selfie_captured?: boolean
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
        }
        Update: {
          action_required_reason?: string | null
          address_proof_status?: string
          booking_id?: string
          consent_at?: string | null
          consent_device?: string | null
          consent_text?: string | null
          consent_version?: string | null
          created_at?: string
          customer_id?: string
          dl_class?: string | null
          dl_dob?: string | null
          dl_name?: string | null
          dl_number?: string | null
          dl_state?: string | null
          dl_valid_until?: string | null
          dl_verified?: boolean
          eligibility_result?: string | null
          id?: string
          rejection_reason?: string | null
          selfie_captured?: boolean
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_cases_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_requests: {
        Row: {
          code: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          code: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          code?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      payment_ledger: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          customer_id: string
          direction: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id: string
          note: string | null
          payment_id: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          customer_id: string
          direction?: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          note?: string | null
          payment_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          customer_id?: string
          direction?: string
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          note?: string | null
          payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_ledger_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          customer_id: string
          id: string
          method: string
          paid_at: string | null
          purpose: string
          receipt_no: string | null
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          method?: string
          paid_at?: string | null
          purpose: string
          receipt_no?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          method?: string
          paid_at?: string | null
          purpose?: string
          receipt_no?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_period: string
          created_at: string
          deposit_amount: number
          downpayment_amount: number
          extra_km_rate: number
          id: string
          included_km: number
          is_active: boolean
          late_fee_per_day: number
          maximum_duration_days: number | null
          minimum_duration_days: number
          model_id: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          processing_fee: number
          rental_amount: number
          reservation_amount: number
          rto_total_months: number | null
          vehicle_condition: Database["public"]["Enums"]["vehicle_condition"]
        }
        Insert: {
          billing_period: string
          created_at?: string
          deposit_amount?: number
          downpayment_amount?: number
          extra_km_rate?: number
          id?: string
          included_km?: number
          is_active?: boolean
          late_fee_per_day?: number
          maximum_duration_days?: number | null
          minimum_duration_days?: number
          model_id?: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          processing_fee?: number
          rental_amount?: number
          reservation_amount?: number
          rto_total_months?: number | null
          vehicle_condition?: Database["public"]["Enums"]["vehicle_condition"]
        }
        Update: {
          billing_period?: string
          created_at?: string
          deposit_amount?: number
          downpayment_amount?: number
          extra_km_rate?: number
          id?: string
          included_km?: number
          is_active?: boolean
          late_fee_per_day?: number
          maximum_duration_days?: number | null
          minimum_duration_days?: number
          model_id?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          processing_fee?: number
          rental_amount?: number
          reservation_amount?: number
          rto_total_months?: number | null
          vehicle_condition?: Database["public"]["Enums"]["vehicle_condition"]
        }
        Relationships: [
          {
            foreignKeyName: "plans_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
        ]
      }
      rentals: {
        Row: {
          booking_id: string
          created_at: string
          customer_id: string
          ended_at: string | null
          id: string
          next_payment_amount: number
          next_payment_due_on: string | null
          payments_completed: number
          period_resets_on: string | null
          period_start_odometer: number
          period_started_on: string
          plan_id: string
          return_hub_id: string | null
          return_slot: string | null
          started_at: string
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          customer_id: string
          ended_at?: string | null
          id?: string
          next_payment_amount?: number
          next_payment_due_on?: string | null
          payments_completed?: number
          period_resets_on?: string | null
          period_start_odometer?: number
          period_started_on?: string
          plan_id: string
          return_hub_id?: string | null
          return_slot?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          customer_id?: string
          ended_at?: string | null
          id?: string
          next_payment_amount?: number
          next_payment_due_on?: string | null
          payments_completed?: number
          period_resets_on?: string | null
          period_start_odometer?: number
          period_started_on?: string
          plan_id?: string
          return_hub_id?: string | null
          return_slot?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rentals_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_return_hub_id_fkey"
            columns: ["return_hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bookings: {
        Row: {
          completed_at: string | null
          created_at: string
          customer_id: string
          hub_id: string
          id: string
          next_service_odometer: number | null
          next_service_on: string | null
          odometer: number | null
          rental_id: string
          scheduled_on: string
          slot: string
          status: Database["public"]["Enums"]["service_status"]
          work_done: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          customer_id: string
          hub_id: string
          id?: string
          next_service_odometer?: number | null
          next_service_on?: string | null
          odometer?: number | null
          rental_id: string
          scheduled_on: string
          slot: string
          status?: Database["public"]["Enums"]["service_status"]
          work_done?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          hub_id?: string
          id?: string
          next_service_odometer?: number | null
          next_service_on?: string | null
          odometer?: number | null
          rental_id?: string
          scheduled_on?: string
          slot?: string
          status?: Database["public"]["Enums"]["service_status"]
          work_done?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          challan_amount: number
          created_at: string
          customer_id: string
          damage_amount: number
          damages: Json
          deposit_amount: number
          id: string
          km_overage_amount: number
          outstanding_rent: number
          refund_amount: number
          rental_id: string
          status: string
        }
        Insert: {
          challan_amount?: number
          created_at?: string
          customer_id: string
          damage_amount?: number
          damages?: Json
          deposit_amount?: number
          id?: string
          km_overage_amount?: number
          outstanding_rent?: number
          refund_amount?: number
          rental_id: string
          status?: string
        }
        Update: {
          challan_amount?: number
          created_at?: string
          customer_id?: string
          damage_amount?: number
          damages?: Json
          deposit_amount?: number
          id?: string
          km_overage_amount?: number
          outstanding_rent?: number
          refund_amount?: number
          rental_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_models: {
        Row: {
          brand: string
          created_at: string
          engine: string | null
          features: string[]
          fuel_type: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          transmission: string
        }
        Insert: {
          brand?: string
          created_at?: string
          engine?: string | null
          features?: string[]
          fuel_type?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          transmission?: string
        }
        Update: {
          brand?: string
          created_at?: string
          engine?: string | null
          features?: string[]
          fuel_type?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          transmission?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          condition: Database["public"]["Enums"]["vehicle_condition"]
          created_at: string
          fuel_percent: number
          hub_id: string
          id: string
          last_service_date: string | null
          last_service_odometer: number
          model_id: string
          odometer_km: number
          registration_number: string
          status: Database["public"]["Enums"]["vehicle_status"]
          telemetry_updated_at: string | null
          updated_at: string
        }
        Insert: {
          condition?: Database["public"]["Enums"]["vehicle_condition"]
          created_at?: string
          fuel_percent?: number
          hub_id: string
          id?: string
          last_service_date?: string | null
          last_service_odometer?: number
          model_id: string
          odometer_km?: number
          registration_number: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          telemetry_updated_at?: string | null
          updated_at?: string
        }
        Update: {
          condition?: Database["public"]["Enums"]["vehicle_condition"]
          created_at?: string
          fuel_percent?: number
          hub_id?: string
          id?: string
          last_service_date?: string | null
          last_service_odometer?: number
          model_id?: string
          odometer_km?: number
          registration_number?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          telemetry_updated_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "hub_staff" | "rider"
      booking_status:
        | "DISCOVERY"
        | "BIKE_SELECTED"
        | "OTP_VERIFIED"
        | "ELIGIBILITY_STARTED"
        | "ELIGIBILITY_COMPLETED"
        | "ELIGIBILITY_SKIPPED"
        | "PAYMENT_PENDING"
        | "RESERVED"
        | "TRAVEL_TO_HUB"
        | "AT_HUB"
        | "KYC_IN_PROGRESS"
        | "APPROVED"
        | "REJECTED"
        | "FINAL_PAYMENT_PENDING"
        | "PAID"
        | "AGREEMENT_ACCEPTED"
        | "VEHICLE_ASSIGNED"
        | "HANDOVER_PENDING"
        | "ACTIVE"
        | "RETURN_REQUESTED"
        | "RETURN_INSPECTION"
        | "SETTLEMENT_PENDING"
        | "CLOSED"
      kyc_status:
        | "NOT_STARTED"
        | "SUBMITTED"
        | "IN_REVIEW"
        | "ACTION_REQUIRED"
        | "APPROVED"
        | "REJECTED"
      ledger_entry_type:
        | "RESERVATION"
        | "RENT"
        | "SECURITY_DEPOSIT"
        | "RTO_DOWNPAYMENT"
        | "PROCESSING_FEE"
        | "LATE_FEE"
        | "KM_OVERAGE"
        | "CHALLAN"
        | "DAMAGE"
        | "REFUND"
      payment_status:
        | "CREATED"
        | "INITIATED"
        | "PENDING"
        | "SUCCESS"
        | "FAILED"
        | "CANCELLED"
        | "REFUND_PENDING"
        | "REFUNDED"
      plan_type: "WEEKLY" | "MONTHLY" | "RTO"
      service_status:
        | "DUE"
        | "BOOKED"
        | "CHECKED_IN"
        | "IN_PROGRESS"
        | "READY"
        | "COMPLETED"
        | "MISSED"
      vehicle_condition: "NEW" | "REFURBISHED"
      vehicle_status:
        | "AVAILABLE"
        | "RESERVED"
        | "ASSIGNED"
        | "ACTIVE"
        | "SERVICE_DUE"
        | "IN_SERVICE"
        | "REPAIR"
        | "BLOCKED"
        | "RETURN_INSPECTION"
        | "READY_FOR_RENT"
    }
    CompositeTypes: {
      [_ in never]: never
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
      app_role: ["admin", "hub_staff", "rider"],
      booking_status: [
        "DISCOVERY",
        "BIKE_SELECTED",
        "OTP_VERIFIED",
        "ELIGIBILITY_STARTED",
        "ELIGIBILITY_COMPLETED",
        "ELIGIBILITY_SKIPPED",
        "PAYMENT_PENDING",
        "RESERVED",
        "TRAVEL_TO_HUB",
        "AT_HUB",
        "KYC_IN_PROGRESS",
        "APPROVED",
        "REJECTED",
        "FINAL_PAYMENT_PENDING",
        "PAID",
        "AGREEMENT_ACCEPTED",
        "VEHICLE_ASSIGNED",
        "HANDOVER_PENDING",
        "ACTIVE",
        "RETURN_REQUESTED",
        "RETURN_INSPECTION",
        "SETTLEMENT_PENDING",
        "CLOSED",
      ],
      kyc_status: [
        "NOT_STARTED",
        "SUBMITTED",
        "IN_REVIEW",
        "ACTION_REQUIRED",
        "APPROVED",
        "REJECTED",
      ],
      ledger_entry_type: [
        "RESERVATION",
        "RENT",
        "SECURITY_DEPOSIT",
        "RTO_DOWNPAYMENT",
        "PROCESSING_FEE",
        "LATE_FEE",
        "KM_OVERAGE",
        "CHALLAN",
        "DAMAGE",
        "REFUND",
      ],
      payment_status: [
        "CREATED",
        "INITIATED",
        "PENDING",
        "SUCCESS",
        "FAILED",
        "CANCELLED",
        "REFUND_PENDING",
        "REFUNDED",
      ],
      plan_type: ["WEEKLY", "MONTHLY", "RTO"],
      service_status: [
        "DUE",
        "BOOKED",
        "CHECKED_IN",
        "IN_PROGRESS",
        "READY",
        "COMPLETED",
        "MISSED",
      ],
      vehicle_condition: ["NEW", "REFURBISHED"],
      vehicle_status: [
        "AVAILABLE",
        "RESERVED",
        "ASSIGNED",
        "ACTIVE",
        "SERVICE_DUE",
        "IN_SERVICE",
        "REPAIR",
        "BLOCKED",
        "RETURN_INSPECTION",
        "READY_FOR_RENT",
      ],
    },
  },
} as const

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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          barcode: string | null
          contact: string | null
          course: string | null
          created_at: string
          id: string
          level: string | null
          library: string | null
          method: string
          purpose: string | null
          student_id: string
          student_name: string
          student_type: string | null
          timestamp: string
          type: string
          user_type: string | null
          year: string | null
        }
        Insert: {
          barcode?: string | null
          contact?: string | null
          course?: string | null
          created_at?: string
          id?: string
          level?: string | null
          library?: string | null
          method: string
          purpose?: string | null
          student_id: string
          student_name: string
          student_type?: string | null
          timestamp?: string
          type?: string
          user_type?: string | null
          year?: string | null
        }
        Update: {
          barcode?: string | null
          contact?: string | null
          course?: string | null
          created_at?: string
          id?: string
          level?: string | null
          library?: string | null
          method?: string
          purpose?: string | null
          student_id?: string
          student_name?: string
          student_type?: string | null
          timestamp?: string
          type?: string
          user_type?: string | null
          year?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      document_links: {
        Row: {
          created_at: string
          description: string | null
          education_level: string | null
          file_type: string | null
          file_url: string
          id: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          education_level?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          education_level?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          biometric_data: string | null
          contact_number: string | null
          course: string | null
          created_at: string
          email: string | null
          id: string
          level: string | null
          library: string | null
          name: string
          qr_code: string | null
          rfid: string | null
          student_id: string
          student_type: string | null
          updated_at: string
          user_type: string | null
          year: string | null
        }
        Insert: {
          biometric_data?: string | null
          contact_number?: string | null
          course?: string | null
          created_at?: string
          email?: string | null
          id?: string
          level?: string | null
          library?: string | null
          name: string
          qr_code?: string | null
          rfid?: string | null
          student_id: string
          student_type?: string | null
          updated_at?: string
          user_type?: string | null
          year?: string | null
        }
        Update: {
          biometric_data?: string | null
          contact_number?: string | null
          course?: string | null
          created_at?: string
          email?: string | null
          id?: string
          level?: string | null
          library?: string | null
          name?: string
          qr_code?: string | null
          rfid?: string | null
          student_id?: string
          student_type?: string | null
          updated_at?: string
          user_type?: string | null
          year?: string | null
        }
        Relationships: []
      }
      totp_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip_address: string
          role: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip_address: string
          role: string
          success?: boolean
        }
        Update: {
          attempted_at?: string
          id?: string
          ip_address?: string
          role?: string
          success?: boolean
        }
        Relationships: []
      }
      totp_secrets: {
        Row: {
          created_at: string
          id: string
          role: string
          secret: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          secret: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          secret?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role1"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role1"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role1"]
          user_id?: string
        }
        Relationships: []
      }
      verification_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          role: string
          session_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          role: string
          session_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          role?: string
          session_id?: string
          verified?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clean_expired_verification_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role1"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role1: "admin" | "librarian" | "student"
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
      app_role1: ["admin", "librarian", "student"],
    },
  },
} as const

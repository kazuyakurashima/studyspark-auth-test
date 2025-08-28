export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          family_id: string
          display_name: string | null
          avatar_id: string | null
          role: 'admin' | 'parent' | 'teacher' | 'student'
          login_id: string | null
          last_name: string | null
          first_name: string | null
          last_name_kana: string | null
          first_name_kana: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          family_id?: string
          display_name?: string | null
          avatar_id?: string | null
          role: 'admin' | 'parent' | 'teacher' | 'student'
          login_id?: string | null
          last_name?: string | null
          first_name?: string | null
          last_name_kana?: string | null
          first_name_kana?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          display_name?: string | null
          avatar_id?: string | null
          role?: 'admin' | 'parent' | 'teacher' | 'student'
          login_id?: string | null
          last_name?: string | null
          first_name?: string | null
          last_name_kana?: string | null
          first_name_kana?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      parent_student_relations: {
        Row: {
          id: string
          parent_id: string
          student_id: string
          relation_type: string
          created_at: string
        }
        Insert: {
          id?: string
          parent_id: string
          student_id: string
          relation_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          parent_id?: string
          student_id?: string
          relation_type?: string
          created_at?: string
        }
      }
      email_migration_logs: {
        Row: {
          id: string
          user_id: string
          old_email: string
          new_email: string
          status: 'requested' | 'approved' | 'completed' | 'failed'
          requested_at: string
          approved_at: string | null
          completed_at: string | null
          approved_by: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          old_email: string
          new_email: string
          status: 'requested' | 'approved' | 'completed' | 'failed'
          requested_at?: string
          approved_at?: string | null
          completed_at?: string | null
          approved_by?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          old_email?: string
          new_email?: string
          status?: 'requested' | 'approved' | 'completed' | 'failed'
          requested_at?: string
          approved_at?: string | null
          completed_at?: string | null
          approved_by?: string | null
          notes?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'parent' | 'teacher' | 'student'
      migration_status: 'requested' | 'approved' | 'completed' | 'failed'
    }
  }
}
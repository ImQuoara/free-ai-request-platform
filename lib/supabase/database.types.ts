export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type RequestStatus = 'NEW' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PUBLISHED';
export type MessageRole = 'requester' | 'owner';
export type NotificationType = 'NEW_REQUEST' | 'REQUESTER_REPLY' | 'ACCEPTED_ACTION' | 'COMPLETED_UNPUBLISHED' | 'ABUSE_FLAG' | 'ACCESS_ISSUE';
export type RequestType = 'Song' | 'Landing Page' | 'Other';
export type ShowcaseMediaType = 'audio' | 'video' | 'image' | 'website' | 'other';
export type DeliveryLink = { label: string; url: string };

export type RequestRow = {
  id: string;
  public_id: string;
  requester_id: string;
  requester_email: string;
  name: string;
  discord: string | null;
  request_type: string;
  description: string;
  reference_links: Json;
  review_confirmed: boolean;
  rights_confirmed: boolean;
  scope_confirmed: boolean;
  showcase_consent: boolean;
  credit_consent: boolean;
  status: RequestStatus;
  public_activity_enabled: boolean;
  owner_notes: string | null;
  risk_flags: Json;
  source_context: Json;
  delivery_links: DeliveryLink[];
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  published_at: string | null;
};

export interface Database {
  public: {
    Tables: {
      site_settings: {
        Row: {
          id: string;
          requests_open: boolean;
          spots_available: number;
          reopens_at: string | null;
          cooldown_minutes: number;
          per_person_daily_cap: number | null;
          auto_decrement_on_accept: boolean;
          public_activity_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requests_open?: boolean;
          spots_available?: number;
          reopens_at?: string | null;
          cooldown_minutes?: number;
          per_person_daily_cap?: number | null;
          auto_decrement_on_accept?: boolean;
          public_activity_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requests_open?: boolean;
          spots_available?: number;
          reopens_at?: string | null;
          cooldown_minutes?: number;
          per_person_daily_cap?: number | null;
          auto_decrement_on_accept?: boolean;
          public_activity_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      requests: {
        Row: RequestRow;
        Insert: {
          id?: string;
          public_id?: string;
          requester_id: string;
          requester_email: string;
          name: string;
          discord?: string | null;
          request_type: string;
          description: string;
          reference_links?: Json;
          review_confirmed: boolean;
          rights_confirmed: boolean;
          scope_confirmed: boolean;
          showcase_consent: boolean;
          credit_consent: boolean;
          status?: RequestStatus;
          public_activity_enabled?: boolean;
          owner_notes?: string | null;
          risk_flags?: Json;
          source_context?: Json;
          delivery_links?: DeliveryLink[];
          created_at?: string;
          updated_at?: string;
          accepted_at?: string | null;
          completed_at?: string | null;
          published_at?: string | null;
        };
        Update: Partial<RequestRow>;
        Relationships: [];
      };

      request_messages: {
        Row: {
          id: string;
          request_id: string;
          sender_id: string;
          sender_role: MessageRole;
          body: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          request_id: string;
          sender_id: string;
          sender_role: MessageRole;
          body: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          request_id?: string;
          sender_id?: string;
          sender_role?: MessageRole;
          body?: string;
          created_at?: string;
          read_at?: string | null;
        };
        Relationships: [];
      };

      notifications: {
        Row: {
          id: string;
          type: NotificationType;
          request_public_id: string | null;
          title: string;
          detail: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: NotificationType;
          request_public_id?: string | null;
          title: string;
          detail?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: NotificationType;
          request_public_id?: string | null;
          title?: string;
          detail?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      public_request_activity: {
        Row: {
          public_id: string;
          request_type: string;
          public_status: RequestStatus;
          created_date: string;
          safe_title: string | null;
          updated_at: string;
        };
        Insert: {
          public_id: string;
          request_type: string;
          public_status: RequestStatus;
          created_date: string;
          safe_title?: string | null;
          updated_at?: string;
        };
        Update: {
          public_id?: string;
          request_type?: string;
          public_status?: RequestStatus;
          created_date?: string;
          safe_title?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      analytics_events: {
        Row: {
          id: string;
          event_name: string;
          path: string;
          source: string | null;
          campaign: string | null;
          referrer_host: string | null;
          session_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_name: string;
          path: string;
          source?: string | null;
          campaign?: string | null;
          referrer_host?: string | null;
          session_hash: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_name?: string;
          path?: string;
          source?: string | null;
          campaign?: string | null;
          referrer_host?: string | null;
          session_hash?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      submission_attempts: {
        Row: {
          id: string;
          requester_id: string | null;
          email_hash: string;
          network_hash: string | null;
          session_hash: string | null;
          content_hash: string | null;
          reference_hash: string | null;
          outcome: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          requester_id?: string | null;
          email_hash: string;
          network_hash?: string | null;
          session_hash?: string | null;
          content_hash?: string | null;
          reference_hash?: string | null;
          outcome: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string | null;
          email_hash?: string;
          network_hash?: string | null;
          session_hash?: string | null;
          content_hash?: string | null;
          reference_hash?: string | null;
          outcome?: string;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      public_showcase_items: {
        Row: {
          request_public_id: string;
          title: string;
          description: string;
          media_type: ShowcaseMediaType;
          asset_url: string | null;
          page_url: string | null;
          published_at: string;
          updated_at: string;
        };
        Insert: {
          request_public_id: string;
          title: string;
          description?: string;
          media_type: ShowcaseMediaType;
          asset_url?: string | null;
          page_url?: string | null;
          published_at?: string;
          updated_at?: string;
        };
        Update: {
          request_public_id?: string;
          title?: string;
          description?: string;
          media_type?: ShowcaseMediaType;
          asset_url?: string | null;
          page_url?: string | null;
          published_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      owner_analytics_summary: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };

      set_request_publication: {
        Args: {
          p_request_id: string;
          p_activity_enabled: boolean;
          p_safe_title: string | null;
          p_showcase_published: boolean;
          p_showcase_title: string | null;
          p_showcase_description: string | null;
          p_showcase_media_type: string | null;
          p_asset_url: string | null;
          p_page_url: string | null;
        };
        Returns: RequestRow;
      };

      submit_request_guarded: {
        Args: {
          p_requester_id: string;
          p_name: string;
          p_email: string;
          p_discord: string | null;
          p_type: RequestType;
          p_description: string;
          p_reference_links: Json;
          p_consents: Json;
          p_source: Json;
          p_risk_flags: Json;
        };
        Returns: RequestRow;
      };

      transition_request_status_atomic: {
        Args: {
          p_request_id: string;
          p_target_status: RequestStatus;
        };
        Returns: RequestRow;
      };
    };

    Enums: {
      request_status: RequestStatus;
      message_role: MessageRole;
      notification_type: NotificationType;
      request_type: RequestType;
    };

    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

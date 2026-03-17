"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type UserRole = "superadmin" | "collaborator" | "member" | "event_customer";

export interface UserProfile {
  full_name:    string | null;
  avatar_url:   string | null;
  bio:          string | null;
  social_links: Record<string, string>;
  role:         UserRole;
}

export interface UseUserReturn {
  user:           User | null;
  profile:        UserProfile | null;
  role:           UserRole | null;
  loading:        boolean;
  /** Full platform admin */
  isSuperadmin:   boolean;
  /** isCollaborator OR isSuperadmin */
  isCollaborator: boolean;
  /** isMember OR isCollaborator OR isSuperadmin */
  isMember:       boolean;
  /** Default role — registered but no active membership */
  isEventCustomer: boolean;
}

export function useUser(): UseUserReturn {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const loadProfile = async (userId: string | null) => {
      if (!userId) {
        setProfile(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, bio, social_links, role")
        .eq("id", userId)
        .single();
      setProfile(data as UserProfile | null);
    };

    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      loadProfile(session?.user?.id ?? null).finally(() => setLoading(false));
    });

    // Stay in sync with auth changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        loadProfile(session?.user?.id ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const role = profile?.role ?? null;

  return {
    user,
    profile,
    role,
    loading,
    isSuperadmin:    role === "superadmin",
    isCollaborator:  role === "collaborator" || role === "superadmin",
    isMember:        role === "member" || role === "collaborator" || role === "superadmin",
    isEventCustomer: role === "event_customer",
  };
}

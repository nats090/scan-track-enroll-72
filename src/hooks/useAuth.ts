import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'librarian' | 'student';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    loading: true
  });

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null
        }));

        // Fetch user role when logged in
        if (session?.user) {
          setTimeout(async () => {
            await fetchUserRole(session.user.id);
          }, 0);
        } else {
          setAuthState(prev => ({ ...prev, role: null, loading: false }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null
      }));

      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        setAuthState(prev => ({ ...prev, role: null, loading: false }));
        return;
      }

      setAuthState(prev => ({ 
        ...prev, 
        role: data?.role as UserRole ?? null,
        loading: false 
      }));
    } catch (error) {
      console.error('Error fetching user role:', error);
      setAuthState(prev => ({ ...prev, role: null, loading: false }));
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signUp = async (email: string, password: string, requestedRole?: UserRole) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          requested_role: requestedRole // Store requested role in user metadata
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const hasRole = (requiredRole: UserRole | UserRole[]) => {
    if (!authState.role) return false;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(authState.role);
    }
    
    return authState.role === requiredRole;
  };

  const isAdmin = () => hasRole('admin');
  const isStaff = () => hasRole(['admin', 'librarian']);

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    hasRole,
    isAdmin,
    isStaff
  };
};

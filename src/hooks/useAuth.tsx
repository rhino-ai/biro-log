import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loadingResolved = useRef(false);

  const resolveLoading = useCallback(() => {
    if (!loadingResolved.current) {
      loadingResolved.current = true;
      setIsLoading(false);
      console.log('[Auth] Loading resolved, user:', user ? 'exists' : 'null');
    }
  }, []);

  const checkAdminRole = useCallback(async (userId: string) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      clearTimeout(timeout);
      
      if (error) {
        console.warn('[Auth] Admin check failed:', error.message);
        return false;
      }
      return !!data;
    } catch (err) {
      console.warn('[Auth] Admin check error (non-blocking):', err);
      return false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Hard safety timeout - ALWAYS exit loading after 4 seconds
    const safetyTimeout = setTimeout(() => {
      if (mounted && !loadingResolved.current) {
        console.warn('[Auth] Safety timeout fired at 4s - forcing load complete');
        loadingResolved.current = true;
        setIsLoading(false);
      }
    }, 4000);

    const initializeAuth = async () => {
      console.log('[Auth] Starting initialization...');
      
      try {
        // Race getSession against a 3s timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
        
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (!mounted) return;
        
        if (result === null) {
          // Timeout - no session available
          console.warn('[Auth] getSession timed out after 3s');
          setUser(null);
          setSession(null);
          loadingResolved.current = true;
          setIsLoading(false);
          return;
        }

        const { data: { session }, error } = result;
        
        if (error) {
          console.error('[Auth] getSession error:', error.message);
          setUser(null);
          setSession(null);
          loadingResolved.current = true;
          setIsLoading(false);
          return;
        }

        console.log('[Auth] Session loaded:', session ? 'active' : 'none');
        setSession(session);
        setUser(session?.user ?? null);
        
        // Admin check is non-blocking
        if (session?.user) {
          checkAdminRole(session.user.id).then((adminStatus) => {
            if (mounted) setIsAdmin(adminStatus);
          }).catch(() => {});
        }
        
        loadingResolved.current = true;
        setIsLoading(false);
      } catch (err) {
        console.error('[Auth] Init error:', err);
        if (mounted) {
          setUser(null);
          setSession(null);
          loadingResolved.current = true;
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Auth state listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log('[Auth] State change:', event);

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fire-and-forget admin check
        setTimeout(() => {
          if (mounted) {
            checkAdminRole(session.user.id).then((adminStatus) => {
              if (mounted) setIsAdmin(adminStatus);
            }).catch(() => {});
          }
        }, 0);
      } else {
        setIsAdmin(false);
      }
      
      // Always resolve loading on any auth event
      if (!loadingResolved.current) {
        loadingResolved.current = true;
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [checkAdminRole]);

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name || 'Student' },
          emailRedirectTo: window.location.origin,
        },
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setIsAdmin(false);
    } catch (err) {
      console.error('[Auth] Sign out error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isLoading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

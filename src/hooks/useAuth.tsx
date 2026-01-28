import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  nick: string;
  birth_year: number;
  age_group: string;
  avatar_data: Record<string, unknown>;
  avatar_snapshot_url: string | null;
  tutor_email: string;
  account_status: string;
  language_infractions_count: number;
  parent_approved: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  canInteract: boolean; // New: determines if user can chat, comment, add friends
  signUp: (nick: string, password: string, birthYear: number, tutorEmail: string) => Promise<{ error: Error | null }>;
  signIn: (nick: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Normalize nick for consistent lookups
function normalizeNick(nick: string): string {
  return nick
    .trim()
    .toLowerCase()
    .replace(/^@/, ''); // Remove @ prefix if present
}

// Create deterministic technical email from nick
function createTechnicalEmail(nick: string): string {
  return `${normalizeNick(nick)}@vfc.app`;
}

function calculateAgeGroup(birthYear: number): '6-8' | '9-12' | '13-16' {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  
  if (age >= 6 && age <= 8) return '6-8';
  if (age >= 9 && age <= 12) return '9-12';
  return '13-16';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // User can interact if parent_approved = true and account_status = 'active'
  const canInteract = profile?.parent_approved === true && profile?.account_status === 'active';

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      return data as Profile | null;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  };

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }
      
      return !!data;
    } catch (err) {
      console.error('Error checking admin:', err);
      return false;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetching with setTimeout
        if (session?.user) {
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
            const adminStatus = await checkAdminRole(session.user.id);
            setIsAdmin(adminStatus);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        Promise.all([
          fetchProfile(session.user.id),
          checkAdminRole(session.user.id)
        ]).then(([profileData, adminStatus]) => {
          setProfile(profileData);
          setIsAdmin(adminStatus);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    nick: string, 
    password: string, 
    birthYear: number, 
    tutorEmail: string
  ): Promise<{ error: Error | null }> => {
    try {
      const normalizedNick = normalizeNick(nick);
      const technicalEmail = createTechnicalEmail(nick);
      const redirectUrl = `${window.location.origin}/`;
      
      // Create user in Supabase Auth with technical email
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: technicalEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nick: normalizedNick,
            birth_year: birthYear,
            tutor_email: tutorEmail
          }
        }
      });

      if (signUpError) {
        // Handle "already registered" error
        if (signUpError.message.includes('already registered')) {
          return { error: new Error('Nick ya usado. Elige otro.') };
        }
        return { error: signUpError };
      }

      if (data.user) {
        // Create profile with pending approval
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            nick: normalizedNick,
            birth_year: birthYear,
            tutor_email: tutorEmail,
            age_group: calculateAgeGroup(birthYear),
            account_status: 'pending_approval', // Pending parental approval
            parent_approved: false // Requires parental approval
          });

        if (profileError) {
          // If nick already exists (unique constraint), show clear error
          if (profileError.code === '23505') {
            return { error: new Error('Nick ya usado. Elige otro.') };
          }
          console.error('Error creating profile:', profileError);
          return { error: new Error(profileError.message) };
        }

        // Create user role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: 'user'
          });

        if (roleError) {
          console.error('Error creating user role:', roleError);
        }

        // Fetch the created profile
        const profileData = await fetchProfile(data.user.id);
        setProfile(profileData);
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (nick: string, password: string): Promise<{ error: Error | null }> => {
    try {
      // Admin bypass for development
      if (nick === 'Admin' && password === '1234') {
        const adminEmail = 'admin@vfc.local';
        const adminPassword = 'admin1234';
        
        // Try to sign in first
        const { error } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword
        });
        
        if (error) {
          // If admin doesn't exist, create it
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: adminEmail,
            password: adminPassword
          });
          
          if (signUpError) {
            console.error('Could not create admin:', signUpError);
            return { error: new Error('Error de administrador') };
          }
          
          if (signUpData.user) {
            // Create admin profile and role
            await supabase.from('profiles').insert({
              id: signUpData.user.id,
              nick: 'admin',
              birth_year: 2010,
              tutor_email: 'admin@vfc.local',
              age_group: '13-16',
              account_status: 'active',
              parent_approved: true
            });
            
            await supabase.from('user_roles').insert({
              user_id: signUpData.user.id,
              role: 'admin'
            });
            
            setIsAdmin(true);
          }
        } else {
          setIsAdmin(true);
        }
        
        return { error: null };
      }

      // Regular login using technical email derived from nick
      const technicalEmail = createTechnicalEmail(nick);
      
      const { error } = await supabase.auth.signInWithPassword({
        email: technicalEmail,
        password
      });

      if (error) {
        // Provide user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          return { error: new Error('Usuario o contraseña incorrectos') };
        }
        return { error: new Error('Error al iniciar sesión') };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isLoading,
      isAdmin,
      canInteract,
      signUp,
      signIn,
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

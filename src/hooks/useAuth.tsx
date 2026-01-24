import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  nick: string;
  birth_year: number;
  age_group: string;
  avatar_data: Record<string, unknown>;
  tutor_email: string;
  account_status: string;
  language_infractions_count: number;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, nick: string, birthYear: number, tutorEmail: string) => Promise<{ error: Error | null }>;
  signIn: (nick: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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
    email: string, 
    password: string, 
    nick: string, 
    birthYear: number, 
    tutorEmail: string
  ): Promise<{ error: Error | null }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nick,
            birth_year: birthYear,
            tutor_email: tutorEmail
          }
        }
      });

      if (signUpError) {
        return { error: signUpError };
      }

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            nick,
            birth_year: birthYear,
            tutor_email: tutorEmail,
            age_group: calculateAgeGroup(birthYear),
            account_status: 'active' // For development - in production would be 'pending_approval'
          });

        if (profileError) {
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
        // For admin, sign in with a special admin email
        const { error } = await supabase.auth.signInWithPassword({
          email: 'admin@vfc.local',
          password: 'admin1234'
        });
        
        if (error) {
          // If admin doesn't exist, create it
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'admin@vfc.local',
            password: 'admin1234'
          });
          
          if (signUpError) {
            console.error('Could not create admin:', signUpError);
          } else if (signUpData.user) {
            // Create admin profile and role
            await supabase.from('profiles').insert({
              id: signUpData.user.id,
              nick: 'Admin',
              birth_year: 2010,
              tutor_email: 'admin@vfc.local',
              age_group: '13-16',
              account_status: 'active'
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

      // Regular login - find user by nick first
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('nick', nick)
        .maybeSingle();

      if (profileError || !profileData) {
        return { error: new Error('Usuario no encontrado') };
      }

      // Get user email from auth
      const { data: userData } = await supabase.auth.admin?.getUserById(profileData.id) ?? { data: null };
      
      // Since we can't get email from admin API in client, use nick as email for now
      // In production, you'd store email separately or use a different approach
      const { error } = await supabase.auth.signInWithPassword({
        email: `${nick.toLowerCase()}@vfc.app`,
        password
      });

      if (error) {
        return { error: new Error('Contraseña incorrecta') };
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

function calculateAgeGroup(birthYear: number): '6-8' | '9-12' | '13-16' {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  
  if (age >= 6 && age <= 8) return '6-8';
  if (age >= 9 && age <= 12) return '9-12';
  return '13-16';
}

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth, type User, type LoginRequest, type RegisterRequest } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<any>;
  verify: (email: string, code: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  useEffect(() => {
    if (currentUser && typeof currentUser === 'object' && 'user' in currentUser) {
      setUser((currentUser as any).user);
    }
  }, [currentUser]);

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => auth.login(data),
    onSuccess: (response) => {
      if (response.user) {
        setUser(response.user);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) => 
      auth.verify({ email, code }),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => auth.register(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => auth.logout(),
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
    },
  });

  const value = {
    user,
    isLoading,
    login: (data: LoginRequest) => loginMutation.mutateAsync(data),
    verify: (email: string, code: string) => verifyMutation.mutateAsync({ email, code }),
    register: (data: RegisterRequest) => registerMutation.mutateAsync(data),
    logout: () => logoutMutation.mutateAsync(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

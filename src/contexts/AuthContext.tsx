import { createContext, useState, useEffect, type ReactNode } from 'react';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { websocketService } from '../services/websocketService';
import type { User } from '../types/user.types';
import type { AuthContextType, LoginCredentials, RegisterData } from '../types/auth.types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    const email = localStorage.getItem('email');
    const authToken = localStorage.getItem('accessToken');

    if (userId && username && authToken) {
      setCurrentUser({
        id: userId,
        username,
        name: username,
        email: email || '',
      });
      setIsAuthenticated(true);
      websocketService.connect(userId);
    }

    const handleLogoutEvent = () => {
      logout();
    };

    window.addEventListener('auth:logout', handleLogoutEvent);

    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const data = await authService.login(credentials);

    // Save access token temporarily to fetch profile
    localStorage.setItem('accessToken', data.accessToken);

    // Fetch full profile to get email
    const userProfile = await profileService.getProfile();

    localStorage.setItem('userId', data.userId);
    localStorage.setItem('username', data.username);
    localStorage.setItem('email', userProfile.email); // Use email from profile

    setCurrentUser({
      id: data.userId,
      username: data.username,
      name: userProfile.name, // Use name from profile
      email: userProfile.email,
    });
    setIsAuthenticated(true);
    websocketService.connect(data.userId);
  };

  const register = async (data: RegisterData) => {
    await authService.register(data);
  };

  const logout = async () => {
    await authService.logout();
    localStorage.clear();
    setIsAuthenticated(false);
    setCurrentUser(null);
    websocketService.disconnect();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, currentUser, login, register, logout, setCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

import { createContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
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
    const authToken = localStorage.getItem('authToken');

    if (userId && username && authToken) {
      setCurrentUser({
        id: userId,
        username,
        name: username,
        email: '',
      });
      setIsAuthenticated(true);
      websocketService.connect(userId);
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const data = await authService.login(credentials);

    localStorage.setItem('userId', data.userId);
    localStorage.setItem('username', data.username);
    localStorage.setItem('authToken', data.authToken);

    setCurrentUser({
      id: data.userId,
      username: data.username,
      name: data.username,
      email: '',
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
    <AuthContext.Provider value={{ isAuthenticated, currentUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

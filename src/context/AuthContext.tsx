import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { disconnectSocket } from '../services/socket';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    phone: string,
    password: string,
    fullName: string,
    additionalDetails?: {
      birthdate?: string;
      gender?: string;
      dobPrivacy?: string;
      genderPrivacy?: string;
    }
  ) => Promise<void>;
  logout: () => void;
  updateUser: (updated: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  claimDailyBonus: () => Promise<number>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('nixo_token') || localStorage.getItem('nixo_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async (jwtToken: string, retryCount = 0) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else if (res.status === 401 || res.status === 403 || res.status === 404) {
        // Token is definitively invalid or expired, clear it
        localStorage.removeItem('nixo_token');
        localStorage.removeItem('nixo_token');
        setToken(null);
        setUser(null);
      }
    } catch (err: any) {
      // If initial fetch failed due to server boot / connection warm-up, retry once after 800ms
      if (retryCount < 2) {
        setTimeout(() => {
          fetchCurrentUser(jwtToken, retryCount + 1);
        }, 800 * (retryCount + 1));
        return;
      }
      console.warn('Network offline or backend warm-up in progress:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (identifier: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    localStorage.setItem('nixo_token', data.token);
    localStorage.setItem('nixo_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (
    username: string,
    email: string,
    phone: string,
    password: string,
    fullName: string,
    additionalDetails?: {
      birthdate?: string;
      gender?: string;
      dobPrivacy?: string;
      genderPrivacy?: string;
    }
  ) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        phone,
        password,
        fullName,
        birthdate: additionalDetails?.birthdate,
        gender: additionalDetails?.gender,
        dobPrivacy: additionalDetails?.dobPrivacy || 'public',
        genderPrivacy: additionalDetails?.genderPrivacy || 'public',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    localStorage.setItem('nixo_token', data.token);
    localStorage.setItem('nixo_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('nixo_token');
    localStorage.removeItem('nixo_token');
    localStorage.removeItem('token');
    localStorage.removeItem('nixo_user');
    localStorage.removeItem('nixo_user');
    setToken(null);
    setUser(null);
    try {
      disconnectSocket();
    } catch (e) {
      console.warn('Socket disconnect error on logout:', e);
    }
  };

  const updateUser = (updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  };

  const refreshUser = async () => {
    if (token) await fetchCurrentUser(token);
  };

  const claimDailyBonus = async () => {
    if (!token) throw new Error('Unauthenticated');
    const res = await fetch('/api/wallet/claim-daily', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to claim bonus');
    updateUser({ coinsBalance: data.coinsBalance });
    return data.bonusClaimed;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        refreshUser,
        claimDailyBonus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('digibank_token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
  }, [token]);

  const loadUser = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await authService.me();
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error loading user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (userData, userToken, accountData = null) => {
    if (!userData || !userToken) {
      throw new Error("Invalid auth response");
    }

    localStorage.setItem('digibank_token', userToken);
    localStorage.setItem('digibank_user', JSON.stringify(userData));
    if (accountData) {
      localStorage.setItem('digibank_account', JSON.stringify(accountData));
    }

    setToken(userToken);
    setUser(userData);
    setIsAuthenticated(true);
    
    // Role-based redirection safely
    if (userData?.role === 'admin') {
      navigate('/admin/dashboard');
    } else if (userData?.role === 'employee') {
      navigate('/employee/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const login = async (email, password) => {
    const response = await authService.login({ email, password });
    const authData = response.data?.data;
    const user = authData?.user;
    const token = authData?.token;
    const account = authData?.account;

    handleAuthSuccess(user, token, account);
    return response.data;
  };

  const register = async (formData) => {
    const response = await authService.register(formData);
    const authData = response.data?.data;
    const user = authData?.user;
    const token = authData?.token;
    const account = authData?.account;

    handleAuthSuccess(user, token, account);
    return response.data;
  };

  const logout = async () => {
    try {
      if (token) {
        await authService.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('digibank_token');
      localStorage.removeItem('digibank_user');
      localStorage.removeItem('digibank_account');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isAuthenticated, 
      loading, 
      login, 
      register, 
      logout,
      loadUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

import { useAuth } from '../../context/AuthContext';

const LoginPage = ({ addToast }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    setError: setFormFieldError,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError(null);

    try {
      await login(data.email, data.password);
      addToast('Welcome back to DigiBank!');
    } catch (err) {
      console.error('Login error:', err);
      const backendError = err.response?.data;
      
      if (backendError?.errors) {
        // Show validation errors from Laravel
        Object.keys(backendError.errors).forEach((key) => {
          setFormFieldError(key, { message: backendError.errors[key][0] });
        });
      } else {
        setError(backendError?.message || 'Invalid credentials. Please check your email and password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="p-8 border-white/10 shadow-2xl bg-bg-card/50 backdrop-blur-sm">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Welcome back</h2>
          <p className="text-slate-400 mt-1 text-sm">Sign in to your DigiBank account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-500 text-sm">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            leftIcon={Mail}
            error={errors.email?.message}
            disabled={isLoading}
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address"
              }
            })}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              leftIcon={Lock}
              error={errors.password?.message}
              disabled={isLoading}
              {...register('password', { 
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' }
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-[38px] text-slate-500 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500/20 transition-all cursor-pointer"
              />
              <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Remember me</span>
            </label>
            <Link to="/forgot-password" size="sm" className="text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
            variant="primary"
          >
            Sign in
          </Button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-bg-card px-2 text-slate-500">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={isLoading}
          >
            Continue as guest
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-400">
          New to DigiBank?{' '}
          <Link to="/register" className="font-semibold text-emerald-500 hover:text-emerald-400 transition-colors">
            Create an account
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
};

export default LoginPage;

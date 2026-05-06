import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

import { useAuth } from '../../context/AuthContext';

const RegisterPage = ({ addToast }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: 'Weak', color: 'bg-rose-500' });
  const { register: registerUser } = useAuth();

  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    setError: setFormFieldError,
    formState: { errors },
  } = useForm();

  const password = watch('password', '');

  useEffect(() => {
    // Basic password strength logic
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) setPasswordStrength({ score: 25, label: 'Weak', color: 'bg-rose-500' });
    else if (score === 2) setPasswordStrength({ score: 50, label: 'Medium', color: 'bg-amber-500' });
    else if (score >= 3) setPasswordStrength({ score: 100, label: 'Strong', color: 'bg-emerald-500' });
    else setPasswordStrength({ score: 0, label: 'Too short', color: 'bg-slate-700' });
  }, [password]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError(null);

    // Map frontend data to Laravel backend expectations
    const payload = {
      name: data.fullName,
      email: data.email,
      password: data.password,
      password_confirmation: data.confirmPassword
    };

    try {
      await registerUser(payload);
      addToast('Account created successfully. Please login.');
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      const backendError = err.response?.data;

      if (backendError?.errors) {
        // Map backend error keys back to frontend form fields
        const keyMap = {
          name: 'fullName',
          password_confirmation: 'confirmPassword'
        };

        Object.keys(backendError.errors).forEach((key) => {
          const fieldName = keyMap[key] || key;
          setFormFieldError(fieldName, { message: backendError.errors[key][0] });
        });
      } else {
        setError(backendError?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Build your future.">
      <Card className="p-8 border-white/10 shadow-2xl bg-bg-card/50 backdrop-blur-sm">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Create an account</h2>
          <p className="text-slate-400 mt-1 text-sm">Join thousands of Moroccans banking better</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-500 text-sm">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Mohamed Alami"
            leftIcon={User}
            error={errors.fullName?.message}
            disabled={isLoading}
            {...register('fullName', { required: 'Full name is required' })}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="mohamed@alami.ma"
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

          {/* Phone input temporarily hidden as backend doesn't support it yet */}
          {/* 
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">Phone Number</label>
            <div className="flex gap-2">
              <div className="flex items-center px-3 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-sm">
                +212
              </div>
              <Input
                placeholder="6XX XXXXXX"
                leftIcon={Phone}
                error={errors.phone?.message}
                disabled={isLoading}
                className="flex-1"
                {...register('phone', { required: 'Phone is required' })}
              />
            </div>
          </div> 
          */}

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
                minLength: { value: 8, message: 'Password must be at least 8 characters' }
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-[38px] text-slate-500 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {/* Password Strength Meter */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full transition-all duration-500", passwordStrength.color)}
                    style={{ width: `${passwordStrength.score}%` }}
                  />
                </div>
                <p className="text-[10px] text-right font-medium text-slate-500 uppercase tracking-wider">
                  Strength: <span className={cn(passwordStrength.color.replace('bg-', 'text-'))}>{passwordStrength.label}</span>
                </p>
              </div>
            )}
          </div>

          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            leftIcon={Lock}
            error={errors.confirmPassword?.message}
            disabled={isLoading}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (val) => {
                if (watch('password') !== val) {
                  return "Your passwords do not match";
                }
              },
            })}
          />

          <label className="flex items-start gap-2 cursor-pointer group pt-2">
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500/20 transition-all cursor-pointer"
              {...register('terms', { required: 'You must agree to the terms' })}
            />
            <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
              I agree to the <Link to="/terms" className="text-emerald-500">Terms of Service</Link> and <Link to="/privacy" className="text-emerald-500">Privacy Policy</Link>
            </span>
          </label>
          {errors.terms && <p className="text-[10px] text-rose-500">{errors.terms.message}</p>}

          <Button
            type="submit"
            className="w-full mt-4"
            isLoading={isLoading}
            variant="primary"
          >
            Create account
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-emerald-500 hover:text-emerald-400 transition-colors">
            Sign in
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
};

export default RegisterPage;

// Helper to use cn in this file if needed (imported from utils)
import { cn } from '../../utils/cn';

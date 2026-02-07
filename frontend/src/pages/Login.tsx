import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { login as loginRequest, setAuthToken } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address'
  }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters long' })
    .max(100, { message: 'Password must be less than 100 characters' })
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const response = await loginRequest(values);
      const { token, user } = response.data;
      setAuthToken(token);
      login(token, user);
      const fallback =
        user.role === 'ADMIN'
          ? '/dashboard'
          : user.role === 'PROFESSOR'
            ? '/professor/dashboard'
            : '/student/dashboard';
      const redirectTo =
        (location.state as { from?: Location })?.from?.pathname ?? fallback;
      navigate(redirectTo, { replace: true });
    } catch (error: unknown) {
      if (error instanceof Error) {
        setServerError(error.message);
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        setServerError(axiosError.response?.data?.message ?? 'Login failed');
      } else {
        setServerError('Login failed. Please try again.');
      }
    }
  };

  return (
    <div className="login-page">
      <div className="login-card card">
        <div className="login-card__header">
          <h1>Sign in</h1>
          <p>Access the University Assignment Approval Platform</p>
        </div>

        <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form__group">
            <label htmlFor="email" className="form__label">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="form__input"
              placeholder="example@gmail.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && <span className="form__error">{errors.email.message}</span>}
          </div>

          <div className="form__group">
            <label htmlFor="password" className="form__label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form__input"
              placeholder="Enter your password"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <span className="form__error">{errors.password.message}</span>
            )}
          </div>

          {serverError && <div className="form__error">{serverError}</div>}

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;



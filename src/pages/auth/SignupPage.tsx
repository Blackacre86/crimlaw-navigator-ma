import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Scale, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/app');
    }
  }, [user, navigate]);

  const validateForm = () => {
    if (!fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password, fullName);
      
      if (error) {
        if (error.message.includes('User already registered')) {
          setError('An account with this email already exists. Try signing in instead.');
        } else if (error.message.includes('Password should be at least')) {
          setError('Password must be at least 6 characters long');
        } else {
          setError(error.message);
        }
      } else {
        toast({
          title: "Account Created Successfully!",
          description: "Please check your email for a confirmation link before signing in.",
        });
        navigate('/login');
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = password.length >= 6 ? 'strong' : password.length >= 3 ? 'medium' : 'weak';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-accent-blue flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 text-primary-foreground">
            <Scale className="h-8 w-8" />
            <span className="text-2xl font-bold">LexInnova</span>
          </Link>
          <p className="text-primary-foreground/80 mt-2">AI-Powered Legal Research</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Create Your Account</CardTitle>
            <CardDescription className="text-center">
              Join thousands of legal professionals using LexInnova for smarter research
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {password && (
                  <div className="flex items-center space-x-2 text-xs">
                    <div className={`h-1 w-full rounded ${
                      passwordStrength === 'strong' ? 'bg-green-500' :
                      passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className={`text-xs ${
                      passwordStrength === 'strong' ? 'text-green-600' :
                      passwordStrength === 'medium' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {passwordStrength === 'strong' ? 'Strong' :
                       passwordStrength === 'medium' ? 'Medium' : 'Weak'}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-600">Passwords do not match</p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-green-600 flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Passwords match</span>
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !fullName || !email || !password || password !== confirmPassword}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in here
                </Link>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                By creating an account, you agree to our{' '}
                <Link to="/terms-of-service" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy-policy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-primary-foreground/60 text-sm">
          <Link to="/" className="hover:text-primary-foreground/80 transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";

export function Header() {
  const { user, profile, signOut } = useAuth();
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <Logo size="md" />
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/profile">Profile</Link>
              </Button>
              {profile?.role === 'admin' && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin">Admin</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={signOut}>
                Log Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Log In</Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link to="/auth">Sign Up</Link>
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </header>
  );
}
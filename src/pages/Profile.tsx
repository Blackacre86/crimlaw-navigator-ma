import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar, 
  Save, 
  Shield, 
  Trash2,
  History,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Profile() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullName: profile?.full_name || "",
    email: user?.email || "",
    phone: "(617) 555-0123",
    title: "Police Officer",
    department: "Boston Police Department",
    badgeNumber: "12345"
  });
  const [isSaving, setIsSaving] = useState(false);

  // Mock saved searches - would come from localStorage/Supabase
  const savedSearches = [
    { id: 1, query: "Massachusetts DUI penalties first offense", timestamp: "2024-01-15", results: 12 },
    { id: 2, query: "Fourth Amendment search warrant requirements", timestamp: "2024-01-12", results: 8 },
    { id: 3, query: "Miranda rights juvenile suspects Massachusetts", timestamp: "2024-01-10", results: 15 }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    
    try {
      // Update profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName
        })
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      toast({
        title: "Profile updated",
        description: "Your information has been saved successfully."
      });
      
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message || "An error occurred while saving your profile",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full p-6 space-y-8">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <Card className="p-8 bg-gradient-card">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src="" alt="Profile" />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {profile?.full_name?.split(' ').map(n => n[0]).join('') || user?.email?.[0].toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {profile?.full_name || user?.email || 'User'}
              </h1>
              <p className="text-lg text-muted-foreground mb-4">
                {profile?.role === 'admin' ? 'Administrator' : 'Legal Professional'}
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{user?.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span>Massachusetts Law Enforcement</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Member since 2024</span>
                </div>
              </div>
            </div>
            
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {profile?.role === 'admin' ? 'Administrator' : 'Officer'}
            </Badge>
          </div>
        </Card>

        {/* Profile Tabs */}
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="searches" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Saved Searches
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            <Card className="p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      value={formData.fullName} 
                      onChange={handleChange}
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={handleChange}
                      className="mt-1" 
                      disabled 
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      value={formData.phone} 
                      onChange={handleChange}
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="title">Job Title</Label>
                    <Input 
                      id="title" 
                      value={formData.title} 
                      onChange={handleChange}
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input 
                      id="department" 
                      value={formData.department} 
                      onChange={handleChange}
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="badgeNumber">Badge Number</Label>
                    <Input 
                      id="badgeNumber" 
                      value={formData.badgeNumber} 
                      onChange={handleChange}
                      className="mt-1" 
                    />
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleSaveProfile} 
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Profile Information'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="searches" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Saved Legal Searches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {savedSearches.map((search) => (
                    <div key={search.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{search.query}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>Searched on {new Date(search.timestamp).toLocaleDateString()}</span>
                          <Badge variant="outline" className="text-xs">
                            {search.results} results
                          </Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">View Results</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground">Receive updates about new documents and features</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">Search History</h3>
                    <p className="text-sm text-muted-foreground">Save your search queries for future reference</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Legal Disclaimer:</strong> This platform provides research tools for Massachusetts criminal law but does not constitute legal advice. Always consult with qualified legal counsel for specific cases.
                  </AlertDescription>
                </Alert>

                <div className="pt-4 border-t">
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
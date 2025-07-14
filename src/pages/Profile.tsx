import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Phone, MapPin, Building, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Profile() {
  const { profile, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <Card className="p-8 mb-8">
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
                    <span>Doe & Associates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Member since 2024</span>
                  </div>
                </div>
              </div>
              
              <Button variant="outline">
                Edit Profile
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Account Information */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="John" className="mt-1" />
                </div>
                
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Doe" className="mt-1" />
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue="john.doe@lawfirm.com" className="mt-1" />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" defaultValue="(617) 555-0123" className="mt-1" />
                </div>
                
                <Button variant="professional" className="w-full">
                  Update Information
                </Button>
              </div>
            </Card>

            {/* Professional Information */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <Building className="h-5 w-5" />
                Professional Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Job Title</Label>
                  <Input id="title" defaultValue="Criminal Defense Attorney" className="mt-1" />
                </div>
                
                <div>
                  <Label htmlFor="organization">Organization</Label>
                  <Input id="organization" defaultValue="Doe & Associates" className="mt-1" />
                </div>
                
                <div>
                  <Label htmlFor="barNumber">Bar Number</Label>
                  <Input id="barNumber" defaultValue="123456" className="mt-1" />
                </div>
                
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" defaultValue="Boston, MA" className="mt-1" />
                </div>
                
                <Button variant="professional" className="w-full">
                  Update Professional Info
                </Button>
              </div>
            </Card>
          </div>

          {/* Account Settings */}
          <Card className="p-6 mt-8">
            <h2 className="text-xl font-semibold text-foreground mb-6">Account Settings</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                  <h3 className="font-medium text-foreground">Email Notifications</h3>
                  <p className="text-sm text-muted-foreground">Receive updates about new legal documents and features</p>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              
              <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                  <h3 className="font-medium text-foreground">Search History</h3>
                  <p className="text-sm text-muted-foreground">Manage your search history and saved documents</p>
                </div>
                <Button variant="outline" size="sm">Manage</Button>
              </div>
              
              <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                  <h3 className="font-medium text-foreground">Privacy Settings</h3>
                  <p className="text-sm text-muted-foreground">Control how your data is used and shared</p>
                </div>
                <Button variant="outline" size="sm">Review</Button>
              </div>
              
              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="font-medium text-destructive">Delete Account</h3>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data</p>
                </div>
                <Button variant="destructive" size="sm">Delete</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
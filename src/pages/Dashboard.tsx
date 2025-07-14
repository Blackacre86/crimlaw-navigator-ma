import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { CategoryFilter } from "@/components/CategoryFilter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, FileText, TrendingUp } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={true} />
      
      {/* Hero Section with Search */}
      <section className="py-12 px-4 bg-gradient-to-br from-primary/5 to-primary-light/5">
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Research Massachusetts Criminal Law
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Access comprehensive legal documents, jury instructions, and procedural rules
            </p>
          </div>
          
          <SearchBar />
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-8 px-4 border-b border-border">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-foreground">390+</span>
              </div>
              <p className="text-sm text-muted-foreground">Total Documents</p>
            </Card>
            
            <Card className="p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-foreground">12</span>
              </div>
              <p className="text-sm text-muted-foreground">Recent Searches</p>
            </Card>
            
            <Card className="p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-foreground">95%</span>
              </div>
              <p className="text-sm text-muted-foreground">Search Accuracy</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <CategoryFilter />
        </div>
      </section>

      {/* Recent Activity */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold text-foreground">Recent Activity</h2>
            <Button variant="outline">View All</Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    MGL Ch. 265, § 13 - Assault and Battery
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Massachusetts General Laws - Criminal Code
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">2 hours ago</span>
              </div>
              <Button variant="subtle" size="sm">View Document</Button>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Model Jury Instruction 6.120 - Larceny
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Model Jury Instructions
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">1 day ago</span>
              </div>
              <Button variant="subtle" size="sm">View Document</Button>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
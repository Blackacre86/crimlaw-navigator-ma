import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Gavel, BookOpen } from "lucide-react";

const categories = [
  {
    id: "jury-instructions",
    title: "Model Jury Instructions",
    description: "Standard jury instructions for criminal cases",
    icon: Gavel,
    count: "150+ Instructions"
  },
  {
    id: "criminal-procedure",
    title: "Rules of Criminal Procedure",
    description: "Massachusetts Rules of Criminal Procedure",
    icon: FileText,
    count: "40+ Rules"
  },
  {
    id: "general-laws",
    title: "MA General Laws",
    description: "Massachusetts General Laws - Criminal Code",
    icon: BookOpen,
    count: "200+ Statutes"
  }
];

export function CategoryFilter() {
  return (
    <div className="w-full">
      <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">
        Browse by Category
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((category) => {
          const IconComponent = category.icon;
          return (
            <Card key={category.id} className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-primary/30">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-gradient-to-br from-primary/10 to-primary-light/10 rounded-full group-hover:from-primary/20 group-hover:to-primary-light/20 transition-colors">
                  <IconComponent className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {category.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {category.description}
                  </p>
                  <p className="text-xs font-medium text-primary">
                    {category.count}
                  </p>
                </div>
                <Button variant="subtle" className="w-full">
                  Browse {category.title.split(' ')[0]}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
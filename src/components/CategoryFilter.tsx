import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Gavel, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  title: string;
  description: string;
  icon: any;
  count: string;
}

const categoryMapping: { [key: string]: Category } = {
  "Model Jury Instructions": {
    id: "jury-instructions",
    title: "Model Jury Instructions",
    description: "Standard jury instructions for criminal cases",
    icon: Gavel,
    count: "0"
  },
  "general": {
    id: "general-laws",
    title: "MA General Laws",
    description: "Massachusetts General Laws - Criminal Code",
    icon: BookOpen,
    count: "0"
  }
};

export function CategoryFilter() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('category')
        .neq('category', null);
      
      if (data && !error) {
        const categoryCounts: { [key: string]: number } = {};
        data.forEach(doc => {
          categoryCounts[doc.category] = (categoryCounts[doc.category] || 0) + 1;
        });
        
        const categoryList = Object.entries(categoryCounts).map(([category, count]) => {
          const mappedCategory = categoryMapping[category];
          if (mappedCategory) {
            return {
              ...mappedCategory,
              count: `${count} Documents`
            };
          }
          return {
            id: category.toLowerCase().replace(/\s+/g, '-'),
            title: category,
            description: `${category} documents`,
            icon: FileText,
            count: `${count} Documents`
          };
        });
        
        setCategories(categoryList);
      }
    };

    fetchCategories();
  }, []);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
    
    // Create a search query for the category
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      // Trigger a search with category-specific query
      const searchQuery = `category:${category.title}`;
      
      // Store the search in localStorage
      const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      const newSearch = {
        query: searchQuery,
        timestamp: new Date().toISOString(),
        id: Date.now()
      };
      
      const updatedHistory = [newSearch, ...searchHistory.slice(0, 49)];
      localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
      
      // You can emit an event or use a callback to trigger search
      window.dispatchEvent(new CustomEvent('categorySearch', { 
        detail: { query: searchQuery, category: category.title } 
      }));
    }
  };
  return (
    <div className="w-full">
      <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">
        Browse by Category
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((category) => {
          const IconComponent = category.icon;
          return (
            <Card 
              key={category.id} 
              className={`p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 ${
                selectedCategory === category.id ? 'border-primary bg-primary/5' : 'hover:border-primary/30'
              }`}
              onClick={() => handleCategoryClick(category.id)}
            >
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
                  {selectedCategory === category.id ? 'Selected' : `Browse ${category.title.split(' ')[0]}`}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
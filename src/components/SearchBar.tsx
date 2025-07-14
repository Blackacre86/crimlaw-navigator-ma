import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchBar() {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <Input
          type="text"
          placeholder="Search Massachusetts criminal law documents, statutes, and procedures..."
          className="pl-12 pr-20 h-14 text-lg border-2 border-border focus:border-primary transition-colors shadow-sm"
        />
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
          <Button variant="professional" size="sm" className="h-10">
            Search
          </Button>
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground mt-2">
        Search across Model Jury Instructions, Rules of Criminal Procedure, and MA General Laws
      </p>
    </div>
  );
}
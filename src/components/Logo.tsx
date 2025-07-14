import { cn } from "@/lib/utils";
import logoImage from "@/assets/logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showText?: boolean;
}

export function Logo({ size = "md", className, showText = true }: LogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-2xl"
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img 
        src={logoImage} 
        alt="MA Crim Law Navigator Logo" 
        className={cn(sizeClasses[size], "object-contain")}
      />
      {showText && (
        <div>
          <h1 className={cn("font-bold text-foreground", textSizeClasses[size])}>
            MA Crim Law Navigator
          </h1>
          <p className="text-xs text-muted-foreground">Legal Research Tool</p>
        </div>
      )}
    </div>
  );
}
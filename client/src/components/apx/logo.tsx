import { Link } from '@tanstack/react-router';

interface LogoProps {
  to?: string;
  className?: string;
  showText?: boolean;
}

export function Logo({ to = '/', className = '', showText = true }: LogoProps) {
  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src="/pbl-logo.svg" alt="logo" className="h-6 w-6 rounded-sm" />
      {showText && <span className="font-semibold text-lg">PBL cluster validation</span>}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

export default Logo;

import Link from 'next/link';
import { Github, Linkedin, Mail } from 'lucide-react';
import { personalInfo, navLinks, socialLinks } from '@/lib/constants';
import { Button } from './ui/button';

export function Footer() {
  const quickLinks = navLinks.filter(link => ['Home', 'Projects', 'Contact'].includes(link.label));

  return (
    <footer className="w-full border-t bg-card text-card-foreground">
      <div className="container grid items-center gap-8 px-4 py-12 md:grid-cols-3 md:px-6">
        <div className="flex flex-col items-start gap-2">
          <p className="font-headline text-lg font-semibold">{personalInfo.name}</p>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} AshishIshwar. All rights reserved.</p>
        </div>
        
        <nav className="flex flex-col gap-2 sm:flex-row sm:gap-4 md:justify-center">
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
        
        <div className="flex items-center justify-start gap-2 md:justify-end">
          <Button variant="ghost" size="icon" asChild>
            <a href={socialLinks.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <Github className="h-5 w-5" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <Linkedin className="h-5 w-5" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <a href={socialLinks.email} aria-label="Email">
              <Mail className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
    </footer>
  );
}

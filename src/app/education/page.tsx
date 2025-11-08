import type { Metadata } from 'next';
import { GraduationCap } from 'lucide-react';
import { personalInfo, education } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Education',
  description: `Academic background and qualifications of ${personalInfo.name}.`,
};

export default function EducationPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <header className="mb-16 text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl">
          My Education
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground md:text-xl">
          My academic journey and milestones.
        </p>
      </header>
      
      <div className="relative">
        <div className="absolute left-5 top-0 h-full w-0.5 bg-border" aria-hidden="true"></div>
        <ul className="space-y-8">
          {education.map((edu, index) => (
            <li key={index} className="flex items-start gap-6">
              <div className="z-10 mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-muted-foreground">{edu.period}</p>
                <h3 className="font-headline text-xl font-bold text-foreground">{edu.degree}</h3>
                <p className="font-medium text-foreground/90">{edu.institution}</p>
                <p className="mt-2 text-sm text-muted-foreground">{edu.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

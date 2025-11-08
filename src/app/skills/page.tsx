import type { Metadata } from 'next';
import { Code, Cloud, BrainCircuit, Users } from 'lucide-react';
import { personalInfo, skills } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Skills',
  description: `A showcase of technical and soft skills possessed by ${personalInfo.name}.`,
};

const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <Card>
    <CardHeader className="flex flex-row items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <CardTitle className="font-headline text-2xl">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {children}
    </CardContent>
  </Card>
);

export default function SkillsPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <header className="mb-16 text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl">
          My Skillset
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground md:text-xl">
          A collection of the tools, technologies, and competencies I've developed.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-12">
        <Section title="Primary Competencies" icon={<Cloud className="h-6 w-6" />}>
          <div className="flex flex-wrap gap-4">
            {skills.primary.map((skill, index) => (
              <Badge key={index} className="px-4 py-2 text-base">{skill}</Badge>
            ))}
          </div>
        </Section>
        
        <Section title="Technical Skills" icon={<Code className="h-6 w-6" />}>
          <div className="flex flex-wrap gap-2">
            {skills.technical.map((skill, index) => (
              <Badge key={index} variant="secondary" className="px-3 py-1">{skill}</Badge>
            ))}
          </div>
        </Section>

        <Section title="Soft Skills" icon={<Users className="h-6 w-6" />}>
          <ul className="space-y-3">
            {skills.soft.map((skill, index) => (
               <li key={index} className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span>{skill}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}

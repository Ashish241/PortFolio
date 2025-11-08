import type { Metadata } from 'next';
import Image from 'next/image';
import { projects, personalInfo } from '@/lib/constants';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, Target, Wrench, BarChart } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Projects',
  description: `Explore projects by ${personalInfo.name}, including SquadSync, a team collaboration platform.`,
};

export default function ProjectsPage() {
  const project = projects[0];
  const screenshots = project.imageIds
    .map(id => PlaceHolderImages.find(p => p.id === id))
    .filter(Boolean);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <header className="mb-16 text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl">
          Project Showcase
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground md:text-xl">
          A deep dive into my work, showcasing my technical skills and problem-solving abilities.
        </p>
      </header>

      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="p-6">
          <CardTitle className="font-headline text-3xl">{project.title}</CardTitle>
          <p className="text-muted-foreground">{project.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {project.techStack.map(tech => (
              <Badge key={tech} variant="secondary">{tech}</Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-8 mb-12">
            {screenshots.map((img, index) => img && (
              <div key={index} className={`rounded-lg overflow-hidden border shadow-md ${index === 0 ? 'lg:col-span-2' : ''}`}>
                 <Image
                    src={img.imageUrl}
                    alt={img.description}
                    data-ai-hint={img.imageHint}
                    width={800}
                    height={600}
                    className="aspect-video w-full object-cover"
                />
              </div>
            ))}
          </div>

          <div className="space-y-12">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div>
                <h3 className="flex items-center gap-2 font-headline text-2xl font-semibold mb-4"><Target className="h-6 w-6 text-primary"/>The Problem</h3>
                <p className="text-muted-foreground">{project.problem}</p>
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-headline text-2xl font-semibold mb-4"><CheckCircle className="h-6 w-6 text-primary"/>The Solution</h3>
                <p className="text-muted-foreground">{project.solution}</p>
              </div>
            </div>

            <div>
              <h3 className="font-headline text-2xl font-semibold mb-4">Key Features</h3>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {project.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500 mt-1" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div>
                <h3 className="flex items-center gap-2 font-headline text-2xl font-semibold mb-4"><Wrench className="h-6 w-6 text-primary"/>Tech Approach</h3>
                <p className="text-muted-foreground">{project.techApproach}</p>
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-headline text-2xl font-semibold mb-4"><BarChart className="h-6 w-6 text-primary"/>Results</h3>
                <p className="text-muted-foreground">{project.results}</p>
              </div>
            </div>

            <div className="text-center pt-8">
              <Button asChild size="lg">
                <Link href={project.link} target="_blank" rel="noopener noreferrer">
                  View Live Project (Placeholder) <ArrowRight className="ml-2 h-5 w-5"/>
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

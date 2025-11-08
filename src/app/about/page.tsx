import type { Metadata } from 'next';
import Image from 'next/image';
import { Target, BrainCircuit, Code, Rocket, GraduationCap } from 'lucide-react';
import { personalInfo, skills, careerGoals, education } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'About',
  description: `Learn more about ${personalInfo.name}, his skills, background, and career aspirations.`,
};

export default function AboutPage() {

  return (
    <div className="container mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <header className="mb-16 text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl">
          About Me
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground md:text-xl">
          A glimpse into my journey, skills, and aspirations in the world of technology.
        </p>
      </header>
      
      <section className="mb-24 grid grid-cols-1 items-center gap-12 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card className="overflow-hidden rounded-lg shadow-lg">
            <CardContent className="p-0">
              <Image
                src="/profile-new.jpg"
                alt="A portrait of Ashish Kumar Ishwar."
                data-ai-hint="professional portrait"
                width={400}
                height={400}
                className="aspect-square w-full object-cover"
              />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4 md:col-span-2">
            <div className="prose prose-lg dark:prose-invert max-w-none text-foreground/80" dangerouslySetInnerHTML={{ __html: personalInfo.extendedBio }} />
        </div>
      </section>

      <section className="mb-24">
        <h2 className="mb-8 text-center font-headline text-3xl font-bold">What I'm Currently Learning</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {skills.learning.map((skill, index) => (
            <Card key={index} className="flex flex-col items-center p-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <p className="font-semibold">{skill}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-24">
        <h2 className="mb-8 text-center font-headline text-3xl font-bold">Strengths</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {skills.soft.map((skill, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Code className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{skill}</h3>
                  <p className="text-sm text-muted-foreground">
                    {index === 0 && "Approaching problems with a logical and structured mindset to find effective solutions."}
                    {index === 1 && "Adhering to best practices to write readable, maintainable, and efficient code."}
                    {index === 2 && "Working effectively within teams to achieve common goals and deliver high-quality software."}
                    {index === 3 && "Quickly grasping new concepts, technologies, and tools to stay current in a fast-paced industry."}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-8 text-center font-headline text-3xl font-bold">Career Goals</h2>
        <div className="grid grid-cols-1 gap-6">
          {careerGoals.map((goal, index) => (
            <Card key={index} className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Rocket className="h-5 w-5" />
                  </div>
                  <p className="font-medium text-foreground/90">{goal}</p>
                </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

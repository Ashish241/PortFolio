import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Cloud, Code, Cpu, HardDrive } from 'lucide-react';
import { personalInfo, skills } from '@/lib/constants';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  const profileImage = PlaceHolderImages.find(p => p.id === 'profile-photo');
  const skillBadges = ['Java', 'Python', 'C', 'C++', 'React', 'Cloud', 'Full-Stack'];

  return (
    <div className="flex flex-col">
      <section className="w-full py-20 md:py-32 lg:py-40 bg-background">
        <div className="container px-4 md:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col justify-center space-y-6">
              <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                {personalInfo.name}
              </h1>
              <p className="max-w-[700px] text-muted-foreground md:text-xl">
                {personalInfo.tagline}
              </p>
              <p className="max-w-[700px] text-foreground/80 md:text-lg">
                {personalInfo.shortBio}
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/projects">
                    View Projects <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/contact">Hire Me</Link>
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <Card className="overflow-hidden rounded-full w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 shadow-2xl">
                <CardContent className="p-0">
                  {profileImage && (
                    <Image
                      src={profileImage.imageUrl}
                      alt={profileImage.description}
                      data-ai-hint={profileImage.imageHint}
                      width={400}
                      height={400}
                      className="aspect-square object-cover"
                      priority
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-20 md:py-24 lg:py-32 border-t">
        <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Core Competencies
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                A quick look at my primary technical skills and the technologies I excel in.
              </p>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl items-center gap-6 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="grid gap-1">
                  <h3 className="text-xl font-bold font-headline">Full-Stack & Cloud Development</h3>
                  <p className="text-muted-foreground">
                    Building robust, scalable applications from front to back, and deploying them on modern cloud infrastructure.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.technical.slice(0, 7).map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                  <Badge variant="secondary">...and more</Badge>
                </div>
              </div>
               <div className="grid gap-6">
                <div className="flex items-start gap-4">
                  <Code className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
                  <div>
                    <h4 className="font-bold">Frontend Development</h4>
                    <p className="text-sm text-muted-foreground">Crafting responsive and interactive user interfaces with React.js and modern web standards.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <HardDrive className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
                  <div>
                    <h4 className="font-bold">Backend & Core Logic</h4>
                    <p className="text-sm text-muted-foreground">Developing efficient server-side logic and APIs using languages like Java, Python, and C++.</p>
                  </div>
                </div>
                 <div className="flex items-start gap-4">
                  <Cloud className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
                  <div>
                    <h4 className="font-bold">Cloud Fundamentals</h4>
                    <p className="text-sm text-muted-foreground">Experience with cloud services and principles for deploying and managing applications.</p>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </section>
    </div>
  );
}

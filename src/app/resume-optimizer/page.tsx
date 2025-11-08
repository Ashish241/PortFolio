import type { Metadata } from 'next';
import { personalInfo } from '@/lib/constants';
import ResumeForm from './resume-form';

export const metadata: Metadata = {
  title: 'Resume Optimizer AI',
  description: `Leverage AI to optimize your resume for any job description, powered by ${personalInfo.name}'s portfolio tool.`,
};

export default function ResumeOptimizerPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <header className="mb-12 text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl">
          Resume Optimizer AI
        </h1>
        <p className="mx-auto mt-4 max-w-3xl text-muted-foreground md:text-xl">
          Paste a job description, and let AI provide tailored suggestions to make your resume stand out.
        </p>
      </header>
      
      <ResumeForm />
    </div>
  );
}

'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Sparkles, Loader2, Clipboard, Download, Check } from 'lucide-react';

import { getResumeSuggestions, type State } from './actions';
import { personalInfo, projects } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useRef } from 'react';

const profileInfoForAI = `
Name: ${personalInfo.name}
Bio: ${personalInfo.shortBio}
---
${personalInfo.extendedBio.replace(/<p>|<\/p>/g, '')}
`;

const projectDetailsForAI = projects.map(p => `
Project: ${p.title}
Role: ${p.role}
Description: ${p.description}
Tech Stack: ${p.techStack.join(', ')}
Problem: ${p.problem}
Solution: ${p.solution}
Features: ${p.features.join('. ')}
`).join('\n---\n');


function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Optimizing...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Get Suggestions
        </>
      )}
    </Button>
  );
}

export default function ResumeForm() {
  const initialState: State = { message: '' };
  const [state, dispatch] = useFormState(getResumeSuggestions, initialState);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if(state.message === 'Success!') {
        toast({
            title: "Suggestions Ready!",
            description: "AI has generated resume optimization suggestions.",
        });
    } else if (state.message && state.message !== 'Validation failed. Please check the fields.') {
        toast({
            variant: "destructive",
            title: "An error occurred",
            description: state.message || "Failed to get suggestions.",
        });
    }
  }, [state, toast]);

  const handleCopy = () => {
    if (state.suggestions) {
      navigator.clipboard.writeText(state.suggestions);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (state.suggestions) {
      const blob = new Blob([state.suggestions], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'resume-suggestions.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Input Details</CardTitle>
          <CardDescription>Provide the job description you're targeting.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={dispatch} ref={formRef} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="jobDescription">Job Description</Label>
              <Textarea
                id="jobDescription"
                name="jobDescription"
                placeholder="Paste the full job description here..."
                rows={10}
                required
              />
              {state.errors?.jobDescription && <p className="text-sm text-destructive">{state.errors.jobDescription}</p>}
            </div>

            <input type="hidden" id="profileInformation" name="profileInformation" defaultValue={profileInfoForAI} />
            <input type="hidden" id="projectDetails" name="projectDetails" defaultValue={projectDetailsForAI} />
            
            {state.errors?._form && (
                <Alert variant="destructive">
                    <AlertDescription>{state.errors._form}</AlertDescription>
                </Alert>
            )}

            <SubmitButton />
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>AI-Powered Suggestions</CardTitle>
          <CardDescription>Here are the suggestions to enhance your resume.</CardDescription>
        </CardHeader>
        <CardContent>
            {state.suggestions ? (
                <div className="relative">
                     <div className="absolute top-2 right-2 flex gap-2">
                        <Button variant="ghost" size="icon" onClick={handleCopy}>
                            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                            <span className="sr-only">Copy</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleDownload}>
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download</span>
                        </Button>
                    </div>
                    <Alert>
                        <AlertTitle>Optimized Resume Suggestions</AlertTitle>
                        <AlertDescription className="prose prose-sm dark:prose-invert mt-2 whitespace-pre-wrap max-w-none">
                            {state.suggestions}
                        </AlertDescription>
                    </Alert>
                </div>
            ) : (
                <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-8 text-center">
                    <p className="text-muted-foreground">Your suggestions will appear here once generated.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

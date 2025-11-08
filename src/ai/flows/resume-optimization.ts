'use server';
/**
 * @fileOverview A resume optimization AI agent.
 *
 * - optimizeResume - A function that handles the resume optimization process.
 * - OptimizeResumeInput - The input type for the optimizeResume function.
 * - OptimizeResumeOutput - The return type for the optimizeResume function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeResumeInputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The job description to optimize the resume for.'),
  profileInformation: z.string().describe('The user profile information.'),
  projectDetails: z.string().describe('The project details of the user.'),
});
export type OptimizeResumeInput = z.infer<typeof OptimizeResumeInputSchema>;

const OptimizeResumeOutputSchema = z.object({
  optimizedResumeSuggestions: z
    .string()
    .describe('Suggestions for optimizing the resume based on the job description, profile information, and project details.'),
});
export type OptimizeResumeOutput = z.infer<typeof OptimizeResumeOutputSchema>;

export async function optimizeResume(input: OptimizeResumeInput): Promise<OptimizeResumeOutput> {
  return optimizeResumeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeResumePrompt',
  input: {schema: OptimizeResumeInputSchema},
  output: {schema: OptimizeResumeOutputSchema},
  prompt: `You are an expert resume optimizer. You will be given a job description, profile information, and project details. You will provide suggestions for optimizing the resume based on the job description, profile information, and project details.\n\nJob Description: {{{jobDescription}}}\n\nProfile Information: {{{profileInformation}}}\n\nProject Details: {{{projectDetails}}}`,
});

const optimizeResumeFlow = ai.defineFlow(
  {
    name: 'optimizeResumeFlow',
    inputSchema: OptimizeResumeInputSchema,
    outputSchema: OptimizeResumeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

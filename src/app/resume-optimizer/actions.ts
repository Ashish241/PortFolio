'use server';
import { z } from 'zod';
import { optimizeResume } from '@/ai/flows/resume-optimization';

const schema = z.object({
  jobDescription: z.string().min(50, 'Job description must be at least 50 characters.'),
  profileInformation: z.string().min(1, 'Profile information is required.'),
  projectDetails: z.string().min(1, 'Project details are required.'),
});

export type State = {
  message?: string;
  suggestions?: string;
  errors?: {
    jobDescription?: string[];
    profileInformation?: string[];
    projectDetails?: string[];
    _form?: string[];
  };
};

export async function getResumeSuggestions(prevState: State, formData: FormData): Promise<State> {
  const validatedFields = schema.safeParse({
    jobDescription: formData.get('jobDescription'),
    profileInformation: formData.get('profileInformation'),
    projectDetails: formData.get('projectDetails'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Validation failed. Please check the fields.',
    };
  }

  try {
    const result = await optimizeResume(validatedFields.data);
    if (result.optimizedResumeSuggestions) {
        return { message: 'Success!', suggestions: result.optimizedResumeSuggestions };
    }
    return { message: 'AI failed to generate suggestions.', errors: { _form: ['The AI returned an empty response. Please try again.']}};
  } catch (error) {
    console.error('AI Flow Error:', error);
    return {
        errors: { _form: ['An unexpected error occurred while contacting the AI. Please try again later.'] },
        message: 'An unexpected error occurred.',
    };
  }
}

'use server';

import { z } from 'zod';
import { saveMessage } from '@/services/messages';

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  message: z.string().min(10, "Message must be at least 10 characters."),
  budget: z.string().optional(),
});

export type State = {
  message: string;
  success?: boolean;
  errors?: {
    name?: string[];
    email?: string[];
    message?: string[];
    budget?: string[];
    _form?: string[];
  };
};

export async function submitContactForm(prevState: State, formData: FormData): Promise<State> {
  const validatedFields = formSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
    budget: formData.get('budget'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check the fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  try {
    await saveMessage(validatedFields.data);
    return {
      message: "Thank you for your message! I'll get back to you soon.",
      success: true,
    };
  } catch (error) {
    console.error('Error saving message:', error);
    return {
      message: 'An unexpected error occurred. Please try again later.',
      errors: { _form: ['Could not save message to the database.'] },
      success: false,
    };
  }
}

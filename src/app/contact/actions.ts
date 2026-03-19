'use server';

import { z } from 'zod';
import { saveMessage } from '@/services/messages';

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  message: z.string().min(10, "Message must be at least 10 characters."),
});

export type State = {
  message: string;
  success?: boolean;
  errors?: {
    name?: string[];
    email?: string[];
    message?: string[];
    _form?: string[];
  };
};

export async function submitContactForm(prevState: State, formData: FormData): Promise<State> {
  const validatedFields = formSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check the fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  try {
    // Check for Firebase environment variables
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.error('Firebase environment variables are not set.');
      return {
        message: 'Server configuration error. The contact form is not set up correctly.',
        errors: { _form: ['The application is not connected to a backend service.'] },
        success: false,
      };
    }
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

'use client'

import { useFormState, useFormStatus } from "react-dom";
import { Mail, Calendar, Send, Loader2 } from 'lucide-react'
import Link from "next/link"
import React, { useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { personalInfo } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { submitContactForm, type State } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending...
        </>
      ) : (
        <>
          Send Message <Send className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}

export default function ContactPage() {
  const { toast } = useToast()
  const formRef = useRef<HTMLFormElement>(null);
  
  const initialState: State = { message: '' };
  const [state, dispatch] = useFormState(submitContactForm, initialState);

  useEffect(() => {
    if (state.success) {
      toast({
        title: "Message Sent!",
        description: state.message,
      });
      formRef.current?.reset();
    } else if (state.message) {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-16 sm:py-24">
      <header className="mb-12 text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl">Get in Touch</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground md:text-xl">
          Have a project in mind, an internship opportunity, or just want to connect?
        </p>
      </header>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Send a Message</CardTitle>
            <CardDescription>Fill out the form and I'll get back to you.</CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={formRef} action={dispatch} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" placeholder="Your Name" />
                  {state.errors?.name && <p className="text-sm text-destructive">{state.errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="your.email@example.com" />
                  {state.errors?.email && <p className="text-sm text-destructive">{state.errors.email}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" name="message" placeholder="How can I help you?" />
                  {state.errors?.message && <p className="text-sm text-destructive">{state.errors.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Budget (Optional)</Label>
                  <Input id="budget" name="budget" placeholder="e.g., $1000 - $2000" />
                   {state.errors?.budget && <p className="text-sm text-destructive">{state.errors.budget}</p>}
                </div>

                {state.errors?._form && (
                    <Alert variant="destructive">
                        <AlertDescription>{state.errors._form.join(', ')}</AlertDescription>
                    </Alert>
                )}

                <SubmitButton />
              </form>
          </CardContent>
        </Card>
        
        <div className="space-y-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Direct Contact</CardTitle>
                    <CardDescription>For urgent matters or direct communication.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Button variant="outline" className="w-full justify-start gap-3" asChild>
                       <Link href={`mailto:${personalInfo.email}`}>
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <span>{personalInfo.email}</span>
                       </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-3" asChild>
                       <Link href={personalInfo.bookingLink} target="_blank" rel="noopener noreferrer">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <span>Book a 30-min Call</span>
                       </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}

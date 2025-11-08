'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center text-center">
      <h1 className="mt-4 font-headline text-3xl font-bold tracking-tight sm:text-5xl">Something went wrong</h1>
      <p className="mt-6 text-base leading-7 text-muted-foreground">
        We're sorry, but an unexpected error has occurred.
      </p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <Button onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  )
}

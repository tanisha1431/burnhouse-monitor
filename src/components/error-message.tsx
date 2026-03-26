interface ErrorMessageProps {
  message?: string;
}

export function ErrorMessage({ message = "Something went wrong." }: ErrorMessageProps) {
  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}

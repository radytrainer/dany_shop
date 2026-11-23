"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useI18n } from "@/i18n/client";
import { translateLoose } from "@/i18n/translator";
import { cn } from "@/lib/utils";

type FieldProps = { label: string; error?: string; optional?: boolean; hint?: string };

const control =
  "w-full border border-input bg-background px-3.5 text-[15px] outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground aria-[invalid=true]:border-destructive";

export const TextField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(function TextField(
  { label, error, optional, hint, id, className, ...props },
  ref,
) {
  const { t } = useI18n();
  const fieldId = id ?? props.name;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-xs font-medium">
        {label} {optional && <span className="font-normal text-muted-foreground">({t("common.optional")})</span>}
      </label>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={cn(control, "h-12")}
        {...props}
      />
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${fieldId}-error`} className="mt-1.5 text-xs text-destructive" role="alert">
          {translateLoose(t, error, error)}
        </p>
      )}
    </div>
  );
});

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps>(function TextAreaField(
  { label, error, optional, id, className, ...props },
  ref,
) {
  const { t } = useI18n();
  const fieldId = id ?? props.name;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-xs font-medium">
        {label} {optional && <span className="font-normal text-muted-foreground">({t("common.optional")})</span>}
      </label>
      <textarea ref={ref} id={fieldId} rows={3} aria-invalid={!!error} className={cn(control, "py-3")} {...props} />
      {error && (
        <p className="mt-1.5 text-xs text-destructive" role="alert">
          {translateLoose(t, error, error)}
        </p>
      )}
    </div>
  );
});

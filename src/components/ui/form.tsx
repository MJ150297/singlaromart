"use client";

import * as React from "react";
import {
  type FieldValues,
  type FormState,
  type UseFormHandleSubmit,
  type UseFormRegister,
  type UseFormReset,
  type UseFormWatch,
  type UseFormSetValue,
  type UseFormTrigger,
  type UseFormReturn,
} from "react-hook-form";

export type FormProps<TFormValues extends FieldValues> = Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  form: UseFormReturn<TFormValues>;
  onSubmit: (values: TFormValues) => void | Promise<void>;
};

export function Form<TFormValues extends FieldValues>({ children, form, onSubmit, ...props }: FormProps<TFormValues>) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} {...props}>
      {children}
    </form>
  );
}

import * as React from "react";
import { type ControllerRenderProps, type Control, type FieldPath, type FieldValues, Controller } from "react-hook-form";
import { FormItem } from "./form-item";

export interface FormFieldProps<TFormValues extends FieldValues, TName extends FieldPath<TFormValues>> {
  control: Control<TFormValues>;
  name: TName;
  render: (props: { field: ControllerRenderProps<TFormValues, TName> }) => React.ReactNode;
}

export function FormField<TFormValues extends FieldValues, TName extends FieldPath<TFormValues>>({ control, name, render }: FormFieldProps<TFormValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => <FormItem>{render({ field })}</FormItem>}
    />
  );
}

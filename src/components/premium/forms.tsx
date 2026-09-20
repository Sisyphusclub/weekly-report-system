"use client";

import {
  type ComponentType,
  type ChangeEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
  useId,
  useState,
} from "react";
import { Checkbox as BeuiCheckbox } from "@/components/motion/checkbox";
import { Input as BeuiInput, type InputProps as BeuiInputProps } from "@/components/motion/input";
import {
  Select as BeuiSelect,
  SelectContent,
  SelectItem as BeuiSelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select";
import { cn } from "@/lib/utils";

export interface InputProps
  extends Omit<BeuiInputProps, "disabled" | "label" | "required" | "readOnly" | "size"> {
  label?: ReactNode;
  hint?: ReactNode;
  isDisabled?: boolean;
  isRequired?: boolean;
  isReadOnly?: boolean;
  size?: "small" | "medium";
  leadingIcon?: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}

export function Input({
  label,
  hint,
  isDisabled,
  isRequired,
  isReadOnly,
  size = "medium",
  leadingIcon: LeadingIcon,
  className,
  ...props
}: InputProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <BeuiInput
        {...props}
        label={typeof label === "string" ? label : undefined}
        disabled={isDisabled}
        required={isRequired}
        readOnly={isReadOnly}
        leftIcon={LeadingIcon ? <LeadingIcon className="size-4" aria-hidden /> : props.leftIcon}
        classNames={{
          field: cn("rounded-xl bg-card", size === "small" && "h-9"),
          input: size === "small" ? "text-sm" : undefined,
        }}
      />
      {hint ? <p className="px-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export interface TextareaProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "onChange" | "value" | "defaultValue"
  > {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  label?: ReactNode;
  hint?: ReactNode;
  isDisabled?: boolean;
  isRequired?: boolean;
  isReadOnly?: boolean;
}

export function Textarea({
  value,
  defaultValue,
  onChange,
  label,
  hint,
  isDisabled,
  isRequired,
  isReadOnly,
  className,
  id: idProp,
  rows = 4,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={id} className="px-1 text-sm font-medium text-foreground">
          {label}
          {isRequired ? <span className="ml-1 text-destructive">*</span> : null}
        </label>
      ) : null}
      <textarea
        {...props}
        id={id}
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        disabled={isDisabled}
        required={isRequired}
        readOnly={isReadOnly}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange?.(event.target.value)}
        className={cn(
          "min-h-28 w-full resize-y rounded-xl border border-border bg-card px-3.5 py-3 text-sm leading-6 text-foreground outline-none transition-colors",
          "placeholder:text-muted-foreground/70 focus:border-foreground/40 focus:ring-2 focus:ring-ring/40",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      />
      {hint ? <p className="px-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export interface SelectProps {
  children: ReactNode;
  selectedKey?: string | number | null;
  defaultSelectedKey?: string | number | null;
  onSelectionChange?: (key: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  name?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}

export function Select({
  children,
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  isDisabled,
  placeholder,
  className,
  triggerClassName,
  name,
  "aria-labelledby": ariaLabelledBy,
  "aria-label": ariaLabel,
}: SelectProps) {
  const [internalValue, setInternalValue] = useState(
    defaultSelectedKey == null ? undefined : String(defaultSelectedKey),
  );
  const value = selectedKey == null ? internalValue : String(selectedKey);
  return (
    <BeuiSelect
      value={value}
      onValueChange={(next) => {
        if (selectedKey == null) setInternalValue(next);
        onSelectionChange?.(next);
      }}
      disabled={isDisabled}
      className={className}
    >
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      <SelectTrigger
        className={cn("min-h-11 bg-card", triggerClassName)}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
      >
        <SelectValue placeholder={placeholder ?? ariaLabel ?? "请选择"} />
      </SelectTrigger>
      <SelectContent className="max-h-64 overflow-auto bg-card">{children}</SelectContent>
    </BeuiSelect>
  );
}

export function SelectItem({
  id,
  children,
  textValue: _textValue,
  isDisabled,
}: {
  id: string;
  children: ReactNode;
  textValue?: string;
  isDisabled?: boolean;
}) {
  return (
    <BeuiSelectItem value={id} disabled={isDisabled}>
      {children}
    </BeuiSelectItem>
  );
}

export function Checkbox({
  isSelected,
  defaultSelected,
  onChange,
  isDisabled,
  children,
  className,
  isIndeterminate,
  "aria-label": ariaLabel,
}: {
  isSelected?: boolean;
  defaultSelected?: boolean;
  onChange?: (selected: boolean) => void;
  isDisabled?: boolean;
  children?: ReactNode;
  className?: string;
  isIndeterminate?: boolean;
  "aria-label"?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 text-sm text-foreground", isDisabled && "opacity-60", className)}>
      <BeuiCheckbox
        checked={isSelected ?? defaultSelected ?? false}
        onCheckedChange={(checked) => onChange?.(checked)}
        disabled={isDisabled}
        indeterminate={isIndeterminate}
        aria-label={ariaLabel ?? (typeof children === "string" ? children : "选项")}
      />
      {children ? <span>{children}</span> : null}
    </div>
  );
}

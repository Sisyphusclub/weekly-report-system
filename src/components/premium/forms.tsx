"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Upload,
} from "lucide-react";
import {
  type ComponentType,
  type ChangeEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
  useId,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/motion/button/base";
import { Checkbox as BeuiCheckbox } from "@/components/motion/checkbox";
import {
  Input as BeuiInput,
  type InputProps as BeuiInputProps,
} from "@/components/motion/input";
import {
  Select as BeuiSelect,
  SelectContent,
  SelectItem as BeuiSelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select";
import { cn } from "@/lib/utils";

export interface InputProps extends Omit<
  BeuiInputProps,
  "disabled" | "label" | "required" | "readOnly" | "size"
> {
  label?: ReactNode;
  hint?: ReactNode;
  isDisabled?: boolean;
  isRequired?: boolean;
  isReadOnly?: boolean;
  size?: "small" | "medium";
  leadingIcon?: ComponentType<{
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
}

export interface DatePickerProps {
  label?: ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  min?: string;
  max?: string;
  placeholder?: string;
  isDisabled?: boolean;
  isRequired?: boolean;
  size?: "small" | "medium";
  formatValue?: (value: string) => string;
  className?: string;
  triggerClassName?: string;
  "aria-label"?: string;
}

export interface FileUploadButtonProps {
  onFileChange: (file: File | null) => void;
  accept?: string;
  disabled?: boolean;
  label?: ReactNode;
  className?: string;
}

/** Shared BEUI file trigger. The native file input stays inside the design-system component. */
export function FileUploadButton({
  onFileChange,
  accept,
  disabled = false,
  label = "选择文件",
  className,
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          onFileChange(event.target.files?.[0] ?? null);
          event.currentTarget.value = "";
        }}
      />
      <Button
        type="button"
        variant="secondary"
        size="small"
        leadingIcon={Upload}
        disabled={disabled}
        className={className}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
    </>
  );
}

function formatDateValue(value: string, placeholder: string) {
  if (!value) return placeholder;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${year}年${month}月${day}日`;
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return year && month && day ? new Date(Date.UTC(year, month - 1, day)) : null;
}

function dateValue(date: Date) {
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]
    .map((part, index) =>
      index === 0 ? String(part) : String(part).padStart(2, "0"),
    )
    .join("-");
}

function localDateValue(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) =>
      index === 0 ? String(part) : String(part).padStart(2, "0"),
    )
    .join("-");
}

function addMonths(date: Date, amount: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1),
  );
}

function isDateInRange(value: string, min?: string, max?: string) {
  return (!min || value >= min) && (!max || value <= max);
}

export function DatePicker({
  label,
  value: valueProp,
  defaultValue,
  onChange,
  name,
  min,
  max,
  placeholder = "选择日期",
  isDisabled,
  isRequired,
  size = "medium",
  formatValue,
  className,
  triggerClassName,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const controlled = valueProp !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial =
      parseDateValue(valueProp ?? defaultValue ?? "") ?? new Date();
    return new Date(
      Date.UTC(initial.getUTCFullYear(), initial.getUTCMonth(), 1),
    );
  });
  const value = controlled ? (valueProp ?? "") : internalValue;

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const calendarDays = useMemo(() => {
    const first = visibleMonth.getUTCDay();
    const offset = (first + 6) % 7;
    return Array.from(
      { length: 42 },
      (_, index) =>
        new Date(
          Date.UTC(
            visibleMonth.getUTCFullYear(),
            visibleMonth.getUTCMonth(),
            index - offset + 1,
          ),
        ),
    );
  }, [visibleMonth]);

  const openPicker = () => {
    if (isDisabled) return;
    setOpen((current) => !current);
  };

  const handleChange = (next: string) => {
    if (!controlled) setInternalValue(next);
    onChange?.(next);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label
          htmlFor={`${id}-trigger`}
          className="px-1 text-sm font-medium text-foreground"
        >
          {label}
          {isRequired ? <span className="ml-1 text-destructive">*</span> : null}
        </label>
      ) : null}
      <div ref={rootRef} className="relative">
        <button
          type="button"
          id={`${id}-trigger`}
          aria-label={
            ariaLabel ?? (typeof label === "string" ? label : placeholder)
          }
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={isDisabled}
          onClick={openPicker}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 text-left text-sm text-foreground outline-none transition-colors",
            "hover:border-border-strong focus-visible:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/40",
            "disabled:cursor-not-allowed disabled:opacity-60",
            size === "small" && "h-9 rounded-lg px-3",
            triggerClassName,
          )}
        >
          <span
            className={cn(
              "flex min-w-0 items-center gap-2 truncate",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarDays
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="truncate">
              {formatValue
                ? value
                  ? formatValue(value)
                  : placeholder
                : formatDateValue(value, placeholder)}
            </span>
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </button>
        {open ? (
          <div
            role="dialog"
            aria-label="选择日期"
            className="absolute left-0 top-[calc(100%+8px)] z-40 w-[min(320px,calc(100vw-32px))] rounded-xl border border-border bg-card p-3 shadow-lg"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
              <button
                type="button"
                aria-label="上个月"
                onClick={() =>
                  setVisibleMonth((current) => addMonths(current, -1))
                }
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <p className="text-sm font-semibold text-foreground">
                {visibleMonth.getUTCFullYear()}年
                {visibleMonth.getUTCMonth() + 1}月
              </p>
              <button
                type="button"
                aria-label="下个月"
                onClick={() =>
                  setVisibleMonth((current) => addMonths(current, 1))
                }
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 pt-3 text-center text-[11px] font-medium text-muted-foreground">
              {["一", "二", "三", "四", "五", "六", "日"].map((weekday) => (
                <span key={weekday} className="py-1">
                  {weekday}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 pt-1">
              {calendarDays.map((day) => {
                const currentValue = dateValue(day);
                const inMonth =
                  day.getUTCFullYear() === visibleMonth.getUTCFullYear() &&
                  day.getUTCMonth() === visibleMonth.getUTCMonth();
                const selected = currentValue === value;
                const today = currentValue === localDateValue(new Date());
                const available =
                  inMonth && isDateInRange(currentValue, min, max);
                return (
                  <button
                    type="button"
                    key={currentValue}
                    disabled={!available}
                    aria-label={currentValue}
                    aria-pressed={selected}
                    onClick={() => {
                      handleChange(currentValue);
                      setOpen(false);
                    }}
                    className={cn(
                      "relative grid size-9 place-items-center rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      !inMonth && "text-muted-foreground/35",
                      available &&
                        !selected &&
                        "text-foreground hover:bg-primary/10 hover:text-primary",
                      selected &&
                        "bg-primary font-semibold text-primary-foreground hover:bg-primary",
                      today &&
                        !selected &&
                        "font-semibold text-primary after:absolute after:bottom-1 after:size-1 after:rounded-full after:bg-primary",
                      !available && "cursor-not-allowed",
                    )}
                  >
                    {day.getUTCDate()}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <button
                type="button"
                className="text-xs font-medium text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  const today = localDateValue(new Date());
                  if (!isDateInRange(today, min, max)) return;
                  handleChange(today);
                  setVisibleMonth(
                    new Date(
                      Date.UTC(
                        new Date().getFullYear(),
                        new Date().getMonth(),
                        1,
                      ),
                    ),
                  );
                  setOpen(false);
                }}
              >
                今天
              </button>
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  handleChange("");
                  setOpen(false);
                }}
              >
                清除
              </button>
            </div>
          </div>
        ) : null}
        <input
          id={`${id}-input`}
          type="hidden"
          name={name}
          value={value}
          disabled={isDisabled}
        />
      </div>
    </div>
  );
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
        leftIcon={
          LeadingIcon ? (
            <LeadingIcon className="size-4" aria-hidden />
          ) : (
            props.leftIcon
          )
        }
        classNames={{
          field: cn("rounded-xl bg-card", size === "small" && "h-9"),
          input: size === "small" ? "text-sm" : undefined,
        }}
      />
      {hint ? (
        <p className="px-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export interface TextareaProps extends Omit<
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
        <label
          htmlFor={id}
          className="px-1 text-sm font-medium text-foreground"
        >
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
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
          onChange?.(event.target.value)
        }
        className={cn(
          "min-h-28 w-full resize-y rounded-xl border border-border bg-card px-3.5 py-3 text-sm leading-6 text-foreground outline-none transition-colors",
          "placeholder:text-muted-foreground/70 focus:border-foreground/40 focus:ring-2 focus:ring-ring/40",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      />
      {hint ? (
        <p className="px-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
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
      <SelectContent className="max-h-64 overflow-auto bg-card">
        {children}
      </SelectContent>
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
    <div
      className={cn(
        "flex items-center gap-3 text-sm text-foreground",
        isDisabled && "opacity-60",
        className,
      )}
    >
      <BeuiCheckbox
        checked={isSelected ?? defaultSelected ?? false}
        onCheckedChange={(checked) => onChange?.(checked)}
        disabled={isDisabled}
        indeterminate={isIndeterminate}
        aria-label={
          ariaLabel ?? (typeof children === "string" ? children : "选项")
        }
      />
      {children ? <span>{children}</span> : null}
    </div>
  );
}

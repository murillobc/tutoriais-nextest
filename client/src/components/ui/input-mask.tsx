import { forwardRef, useState } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

type MaskType = 'cpf' | 'cnpj' | 'phone';

interface InputMaskProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mask: MaskType;
}

export const InputMask = forwardRef<HTMLInputElement, InputMaskProps>(
  ({ mask, onChange, value, className, ...props }, ref) => {
    const [maskedValue, setMaskedValue] = useState(value || "");

    const masks = {
      cpf: (value: string) => {
        return value
          .replace(/\D/g, '')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})/, '$1-$2')
          .replace(/(-\d{2})\d+?$/, '$1');
      },
      cnpj: (value: string) => {
        return value
          .replace(/\D/g, '')
          .replace(/(\d{2})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1/$2')
          .replace(/(\d{4})(\d{1,2})/, '$1-$2')
          .replace(/(-\d{2})\d+?$/, '$1');
      },
      phone: (value: string) => {
        return value
          .replace(/\D/g, '')
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{4})(\d)/, '$1-$2')
          .replace(/(\d{4})-(\d)(\d{4})/, '$1$2-$3')
          .replace(/(-\d{4})\d+?$/, '$1');
      },
    };

    const applyMask = (inputValue: string, maskType: MaskType) => {
      return masks[maskType](inputValue);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = applyMask(e.target.value, mask);
      setMaskedValue(newValue);

      if (onChange) {
        const event = { ...e, target: { ...e.target, value: newValue } };
        onChange(event);
      }
    };

    return (
      <Input
        {...props}
        ref={ref}
        value={maskedValue}
        onChange={handleChange}
        className={cn(className)}
      />
    );
  }
);

InputMask.displayName = "InputMask";
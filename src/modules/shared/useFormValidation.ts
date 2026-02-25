import { useMemo } from 'react'

export type Validator<T> = (values: T) => Partial<Record<keyof T, string>>

export function useFormValidation<T extends Record<string, unknown>>(values: T, validator: Validator<T>) {
  return useMemo(() => validator(values), [values, validator])
}

export interface SpringPage<T> {
  content: T[]
  pageable?: unknown
  totalPages: number
  totalElements: number
  size: number
  number: number
  first: boolean
  last: boolean
  numberOfElements: number
  empty: boolean
}

export interface PaginationState {
  page: number
  size: number
}

export interface OptionItem {
  value: string
  label: string
}

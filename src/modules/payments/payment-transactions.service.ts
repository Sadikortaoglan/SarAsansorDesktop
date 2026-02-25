import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export interface PaymentTransaction {
  id?: number
  currentAccountId?: number
  buildingId?: number
  paymentType: string
  amount: number
  description?: string
  paymentDate: string
  cashAccountId?: number
  bankAccountId?: number
}

export interface CashAccount {
  id?: number
  name: string
  currency?: string
  totalIn?: number
  totalOut?: number
  balance?: number
}

export interface BankAccount {
  id?: number
  name: string
  currency?: string
  totalIn?: number
  totalOut?: number
  balance?: number
}

export const paymentTransactionsService = {
  list(page: number, size: number, from?: string, to?: string): Promise<SpringPage<PaymentTransaction>> {
    return getPage<PaymentTransaction>('/payment-transactions', { page, size, from, to })
  },
  create(payload: PaymentTransaction) {
    return apiClient.post<ApiResponse<PaymentTransaction>>('/payment-transactions', payload).then((r) => unwrapResponse(r.data))
  },
  update(id: number, payload: PaymentTransaction) {
    return apiClient.put<ApiResponse<PaymentTransaction>>(`/payment-transactions/${id}`, payload).then((r) => unwrapResponse(r.data))
  },
  delete(id: number) {
    return apiClient.delete(`/payment-transactions/${id}`).then(() => undefined)
  },
  getCashAccounts() {
    return apiClient.get<ApiResponse<CashAccount[]>>('/payment-transactions/cash-accounts').then((r) => unwrapResponse(r.data))
  },
  saveCashAccount(payload: CashAccount) {
    return apiClient.post<ApiResponse<CashAccount>>('/payment-transactions/cash-accounts', payload).then((r) => unwrapResponse(r.data))
  },
  deleteCashAccount(id: number) {
    return apiClient.delete(`/payment-transactions/cash-accounts/${id}`).then(() => undefined)
  },
  getBankAccounts() {
    return apiClient.get<ApiResponse<BankAccount[]>>('/payment-transactions/bank-accounts').then((r) => unwrapResponse(r.data))
  },
  saveBankAccount(payload: BankAccount) {
    return apiClient.post<ApiResponse<BankAccount>>('/payment-transactions/bank-accounts', payload).then((r) => unwrapResponse(r.data))
  },
  deleteBankAccount(id: number) {
    return apiClient.delete(`/payment-transactions/bank-accounts/${id}`).then(() => undefined)
  },
}

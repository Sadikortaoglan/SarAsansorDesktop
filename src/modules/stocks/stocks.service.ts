import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export interface StockItem {
  id?: number
  productName: string
  stockGroup?: string
  modelName?: string
  unit?: string
  vatRate: number
  purchasePrice: number
  salePrice: number
  stockIn: number
  stockOut: number
  currentStock?: number
  totalPurchaseValue?: number
  totalSaleValue?: number
}

export interface StockTransfer {
  id?: number
  fromStockId: number
  toStockId: number
  quantity: number
  transferDate: string
  note?: string
}

export const stocksService = {
  list(page: number, size: number, q?: string): Promise<SpringPage<StockItem>> {
    return getPage<StockItem>('/stocks', { page, size, q })
  },
  create(payload: StockItem) {
    return apiClient.post<ApiResponse<StockItem>>('/stocks', payload).then((r) => unwrapResponse(r.data))
  },
  update(id: number, payload: StockItem) {
    return apiClient.put<ApiResponse<StockItem>>(`/stocks/${id}`, payload).then((r) => unwrapResponse(r.data))
  },
  delete(id: number) {
    return apiClient.delete(`/stocks/${id}`).then(() => undefined)
  },
  listTransfers(page: number, size: number): Promise<SpringPage<StockTransfer>> {
    return getPage<StockTransfer>('/stocks/transfers', { page, size })
  },
  transfer(payload: StockTransfer) {
    return apiClient.post<ApiResponse<StockTransfer>>('/stocks/transfers', payload).then((r) => unwrapResponse(r.data))
  },
  models() {
    return apiClient.get<ApiResponse<string[]>>('/stocks/models').then((r) => unwrapResponse(r.data))
  },
  vatRates() {
    return apiClient.get<ApiResponse<number[]>>('/stocks/vat-rates').then((r) => unwrapResponse(r.data))
  },
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import {
  cariService,
  type B2BUnitDetailMenuItem,
  type B2BUnitDetailMenuKey,
} from './cari.service'
import {
  B2BUnitBankCollectionPanel,
  B2BUnitCashCollectionPanel,
  B2BUnitCheckCollectionPanel,
  B2BUnitDetailFilterPanel,
  B2BUnitCreditCardCollectionPanel,
  B2BUnitManualCreditPanel,
  B2BUnitManualDebitPanel,
  B2BUnitPaytrCollectionPanel,
  B2BUnitPromissoryNoteCollectionPanel,
  B2BUnitPurchaseInvoicePanel,
  B2BUnitDetailPaymentPanel,
  B2BUnitDetailReportingPanel,
  B2BUnitSalesInvoicePanel,
} from './B2BUnitDetailPanels'

const FALLBACK_MENUS: B2BUnitDetailMenuItem[] = [
  { key: 'filter', label: 'Filtrele' },
  { key: 'invoice', label: 'Fatura' },
  { key: 'accountTransactions', label: 'Cari İşlemler' },
  { key: 'collection', label: 'Tahsilat' },
  { key: 'payment', label: 'Ödeme' },
  { key: 'reporting', label: 'Raporlama' },
]

type DetailPanelKey =
  | B2BUnitDetailMenuKey
  | 'purchaseInvoice'
  | 'salesInvoice'
  | 'manualDebit'
  | 'manualCredit'
  | 'cashCollection'
  | 'paytrCollection'
  | 'creditCardCollection'
  | 'bankCollection'
  | 'checkCollection'
  | 'promissoryNoteCollection'

const INVOICE_SUBMENU_LABELS: Record<'purchaseInvoice' | 'salesInvoice', string> = {
  purchaseInvoice: 'Alış Yap',
  salesInvoice: 'Satış Yap',
}

const ACCOUNT_SUBMENU_LABELS: Record<'manualDebit' | 'manualCredit', string> = {
  manualDebit: 'Cari Borçlandır',
  manualCredit: 'Cari Alacaklandır',
}

const COLLECTION_SUBMENU_LABELS: Record<
  | 'cashCollection'
  | 'paytrCollection'
  | 'creditCardCollection'
  | 'bankCollection'
  | 'checkCollection'
  | 'promissoryNoteCollection',
  string
> = {
  cashCollection: 'Nakit Tahsilat',
  paytrCollection: 'PayTR Tahsilat',
  creditCardCollection: 'Kredi Kartı Tahsilat',
  bankCollection: 'Banka Tahsilat',
  checkCollection: 'Çek Tahsilat',
  promissoryNoteCollection: 'Senet Tahsilat',
}

function formatAmount(value: number): string {
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function renderPanel(menu: DetailPanelKey, b2bUnitId: number) {
  if (menu === 'filter') return <B2BUnitDetailFilterPanel b2bUnitId={b2bUnitId} />
  if (menu === 'invoice') return <B2BUnitPurchaseInvoicePanel b2bUnitId={b2bUnitId} />
  if (menu === 'purchaseInvoice') return <B2BUnitPurchaseInvoicePanel b2bUnitId={b2bUnitId} />
  if (menu === 'salesInvoice') return <B2BUnitSalesInvoicePanel b2bUnitId={b2bUnitId} />
  if (menu === 'accountTransactions') return <B2BUnitManualDebitPanel b2bUnitId={b2bUnitId} />
  if (menu === 'manualDebit') return <B2BUnitManualDebitPanel b2bUnitId={b2bUnitId} />
  if (menu === 'manualCredit') return <B2BUnitManualCreditPanel b2bUnitId={b2bUnitId} />
  if (menu === 'collection') return <B2BUnitCashCollectionPanel b2bUnitId={b2bUnitId} />
  if (menu === 'cashCollection') return <B2BUnitCashCollectionPanel b2bUnitId={b2bUnitId} />
  if (menu === 'paytrCollection') return <B2BUnitPaytrCollectionPanel b2bUnitId={b2bUnitId} />
  if (menu === 'creditCardCollection') return <B2BUnitCreditCardCollectionPanel b2bUnitId={b2bUnitId} />
  if (menu === 'bankCollection') return <B2BUnitBankCollectionPanel b2bUnitId={b2bUnitId} />
  if (menu === 'checkCollection') return <B2BUnitCheckCollectionPanel b2bUnitId={b2bUnitId} />
  if (menu === 'promissoryNoteCollection') return <B2BUnitPromissoryNoteCollectionPanel b2bUnitId={b2bUnitId} />
  if (menu === 'payment') return <B2BUnitDetailPaymentPanel />
  return <B2BUnitDetailReportingPanel />
}

export function B2BUnitDetailPage() {
  const { hasAnyRole } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const parsedId = Number(id)
  const isValidId = Number.isFinite(parsedId) && parsedId > 0
  const canUseFinancePanels = hasAnyRole(['STAFF_USER'])

  const detailQuery = useQuery({
    queryKey: ['b2bunits', 'detail', parsedId],
    queryFn: () => cariService.getUnitDetail(parsedId),
    enabled: isValidId,
  })

  const menus = useMemo(() => {
    if (detailQuery.data?.menus && detailQuery.data.menus.length > 0) {
      return detailQuery.data.menus
    }
    return FALLBACK_MENUS
  }, [detailQuery.data?.menus])

  const visibleMenus = useMemo(() => {
    return menus.filter((menu) => {
      if (menu.key === 'invoice') return canUseFinancePanels
      if (menu.key === 'accountTransactions') return canUseFinancePanels
      if (menu.key === 'collection') return canUseFinancePanels
      return true
    })
  }, [canUseFinancePanels, menus])

  const [activeMenu, setActiveMenu] = useState<DetailPanelKey>('filter')
  const [invoiceExpanded, setInvoiceExpanded] = useState(false)
  const [accountExpanded, setAccountExpanded] = useState(false)
  const [collectionExpanded, setCollectionExpanded] = useState(false)

  useEffect(() => {
    const validKeys: DetailPanelKey[] = [
      ...(visibleMenus.map((menu) => menu.key) as B2BUnitDetailMenuKey[]),
      ...(canUseFinancePanels
        ? ([
            'purchaseInvoice',
            'salesInvoice',
            'manualDebit',
            'manualCredit',
            'cashCollection',
            'paytrCollection',
            'creditCardCollection',
            'bankCollection',
            'checkCollection',
            'promissoryNoteCollection',
          ] as const)
        : []),
    ]

    if (!validKeys.includes(activeMenu)) {
      const firstVisibleMenu = visibleMenus[0]?.key
      if (firstVisibleMenu === 'invoice' && canUseFinancePanels) {
        setInvoiceExpanded(true)
        setActiveMenu('purchaseInvoice')
      } else if (firstVisibleMenu === 'accountTransactions' && canUseFinancePanels) {
        setAccountExpanded(true)
        setActiveMenu('manualDebit')
      } else if (firstVisibleMenu === 'collection' && canUseFinancePanels) {
        setCollectionExpanded(true)
        setActiveMenu('cashCollection')
      } else {
        setActiveMenu((firstVisibleMenu || 'filter') as DetailPanelKey)
      }
    }
  }, [activeMenu, canUseFinancePanels, visibleMenus])

  const isInvoiceChildActive = activeMenu === 'purchaseInvoice' || activeMenu === 'salesInvoice'
  const isAccountChildActive = activeMenu === 'manualDebit' || activeMenu === 'manualCredit'
  const isCollectionChildActive =
    activeMenu === 'cashCollection' ||
    activeMenu === 'paytrCollection' ||
    activeMenu === 'creditCardCollection' ||
    activeMenu === 'bankCollection' ||
    activeMenu === 'checkCollection' ||
    activeMenu === 'promissoryNoteCollection'
  const showInvoiceChildren = canUseFinancePanels && (invoiceExpanded || isInvoiceChildActive)
  const showAccountChildren = canUseFinancePanels && (accountExpanded || isAccountChildActive)
  const showCollectionChildren = canUseFinancePanels && (collectionExpanded || isCollectionChildActive)

  const activeMenuLabel = useMemo(() => {
    if (activeMenu === 'purchaseInvoice' || activeMenu === 'salesInvoice') {
      return INVOICE_SUBMENU_LABELS[activeMenu]
    }
    if (activeMenu === 'manualDebit' || activeMenu === 'manualCredit') {
      return ACCOUNT_SUBMENU_LABELS[activeMenu]
    }
    if (
      activeMenu === 'cashCollection' ||
      activeMenu === 'paytrCollection' ||
      activeMenu === 'creditCardCollection' ||
      activeMenu === 'bankCollection' ||
      activeMenu === 'checkCollection' ||
      activeMenu === 'promissoryNoteCollection'
    ) {
      return COLLECTION_SUBMENU_LABELS[activeMenu]
    }
    return visibleMenus.find((item) => item.key === activeMenu)?.label || 'Detay'
  }, [activeMenu, visibleMenus])

  if (!isValidId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Geçersiz cari ID.</p>
        </CardContent>
      </Card>
    )
  }

  if (detailQuery.isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">Yükleniyor...</CardContent>
      </Card>
    )
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cari Detay</CardTitle>
          <Button variant="outline" onClick={() => navigate('/b2bunits')}>
            Listeye Dön
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{getUserFriendlyErrorMessage(detailQuery.error)}</p>
        </CardContent>
      </Card>
    )
  }

  const detail = detailQuery.data

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>{detail.name || 'Cari Detay'}</CardTitle>
            {detail.code ? <p className="mt-1 text-sm text-muted-foreground">{detail.code}</p> : null}
          </div>
          <Button variant="outline" onClick={() => navigate('/b2bunits')}>
            Listeye Dön
          </Button>
        </CardHeader>
      </Card>

      {detail.summary ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{formatAmount(detail.summary.totalIncome)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Toplam Gider</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{formatAmount(detail.summary.totalExpense)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Bakiye</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{formatAmount(detail.summary.totalBalance)}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Menü</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {visibleMenus.map((menu) => {
              if (menu.key === 'invoice') {
                return (
                  <div key={menu.key} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceExpanded(true)
                        if (!isInvoiceChildActive) {
                          setActiveMenu('purchaseInvoice')
                        }
                      }}
                      className={cn(
                        'w-full rounded-md px-3 py-2 text-left text-sm transition',
                        isInvoiceChildActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground',
                      )}
                    >
                      {menu.label}
                    </button>

                    {showInvoiceChildren ? (
                      <div className="space-y-1 pl-3">
                        <button
                          type="button"
                          onClick={() => setActiveMenu('purchaseInvoice')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'purchaseInvoice'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Alış Yap
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('salesInvoice')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'salesInvoice'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Satış Yap
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              }

              if (menu.key === 'accountTransactions') {
                return (
                  <div key={menu.key} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountExpanded(true)
                        if (!isAccountChildActive) {
                          setActiveMenu('manualDebit')
                        }
                      }}
                      className={cn(
                        'w-full rounded-md px-3 py-2 text-left text-sm transition',
                        isAccountChildActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground',
                      )}
                    >
                      {menu.label}
                    </button>

                    {showAccountChildren ? (
                      <div className="space-y-1 pl-3">
                        <button
                          type="button"
                          onClick={() => setActiveMenu('manualDebit')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'manualDebit'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Cari Borçlandır
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('manualCredit')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'manualCredit'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Cari Alacaklandır
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              }

              if (menu.key === 'collection') {
                return (
                  <div key={menu.key} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCollectionExpanded(true)
                        if (!isCollectionChildActive) {
                          setActiveMenu('cashCollection')
                        }
                      }}
                      className={cn(
                        'w-full rounded-md px-3 py-2 text-left text-sm transition',
                        isCollectionChildActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground',
                      )}
                    >
                      {menu.label}
                    </button>

                    {showCollectionChildren ? (
                      <div className="space-y-1 pl-3">
                        <button
                          type="button"
                          onClick={() => setActiveMenu('cashCollection')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'cashCollection'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Nakit Tahsilat
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('paytrCollection')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'paytrCollection'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          PayTR Tahsilat
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('creditCardCollection')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'creditCardCollection'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Kredi Kartı Tahsilat
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('bankCollection')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'bankCollection'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Banka Tahsilat
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('checkCollection')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'checkCollection'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Çek Tahsilat
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('promissoryNoteCollection')}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition',
                            activeMenu === 'promissoryNoteCollection'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          Senet Tahsilat
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              }

              return (
                <button
                  key={menu.key}
                  type="button"
                  onClick={() => setActiveMenu(menu.key)}
                  className={cn(
                    'w-full rounded-md px-3 py-2 text-left text-sm transition',
                    activeMenu === menu.key
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-foreground',
                  )}
                >
                  {menu.label}
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{activeMenuLabel}</CardTitle>
          </CardHeader>
          <CardContent>{renderPanel(activeMenu, detail.id || parsedId)}</CardContent>
        </Card>
      </div>
    </div>
  )
}

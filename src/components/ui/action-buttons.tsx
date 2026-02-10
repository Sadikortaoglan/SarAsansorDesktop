import * as React from 'react'
import { Wrench, Eye, Edit, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionButtonsProps {
  onMaintenance?: () => void
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  className?: string
}

export function ActionButtons({
  onMaintenance,
  onView,
  onEdit,
  onDelete,
  className,
}: ActionButtonsProps) {
  const [hoveredTooltip, setHoveredTooltip] = React.useState<string | null>(null)

  return (
    <div
      className={cn(
        'relative inline-flex items-center gap-0 rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-1',
        className
      )}
    >
      {onMaintenance && (
        <div
          className="relative"
          onMouseEnter={() => setHoveredTooltip('maintenance')}
          onMouseLeave={() => setHoveredTooltip(null)}
        >
          <button
            onClick={onMaintenance}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#EEF2FF]"
            style={{ color: '#2563EB' }}
          >
            <Wrench className="h-4 w-4" />
          </button>
          {hoveredTooltip === 'maintenance' && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap">
              Bakım Geçmişi
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
            </div>
          )}
        </div>
      )}
      {onView && (
        <div
          className="relative"
          onMouseEnter={() => setHoveredTooltip('view')}
          onMouseLeave={() => setHoveredTooltip(null)}
        >
          <button
            onClick={onView}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#EEF2FF]"
            style={{ color: '#0EA5E9' }}
          >
            <Eye className="h-4 w-4" />
          </button>
          {hoveredTooltip === 'view' && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap">
              Detay
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
            </div>
          )}
        </div>
      )}
      {onEdit && (
        <div
          className="relative"
          onMouseEnter={() => setHoveredTooltip('edit')}
          onMouseLeave={() => setHoveredTooltip(null)}
        >
          <button
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#EEF2FF]"
            style={{ color: '#F59E0B' }}
          >
            <Edit className="h-4 w-4" />
          </button>
          {hoveredTooltip === 'edit' && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap">
              Düzenle
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
            </div>
          )}
        </div>
      )}
      {onDelete && (
        <div
          className="relative"
          onMouseEnter={() => setHoveredTooltip('delete')}
          onMouseLeave={() => setHoveredTooltip(null)}
        >
          <button
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#EEF2FF]"
            style={{ color: '#EF4444' }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {hoveredTooltip === 'delete' && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap">
              Sil
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

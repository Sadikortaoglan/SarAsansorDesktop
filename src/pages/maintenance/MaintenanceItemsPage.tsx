import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Settings, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TableResponsive } from '@/components/ui/table-responsive'
import { ActionButtons } from '@/components/ui/action-buttons'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileText } from 'lucide-react'

// Placeholder service - replace with actual API
const maintenanceTemplateService = {
  getAll: async () => {
    // Mock data - replace with actual API call
    return [
      {
        id: 1,
        name: 'Aylık Bakım',
        status: 'ACTIVE',
        sectionCount: 4,
      },
      {
        id: 2,
        name: 'Yıllık Bakım',
        status: 'ACTIVE',
        sectionCount: 6,
      },
    ]
  },
  getById: async (id: number) => {
    // Mock data
    return {
      id,
      name: 'Aylık Bakım',
      status: 'ACTIVE',
      sections: [
        {
          id: 1,
          name: 'Makine Dairesi',
          order: 1,
          items: [
            {
              id: 1,
              title: 'Motor kontrolü',
              mandatory: true,
              photo: false,
              note: 'Motor sıcaklığı kontrol edilmeli',
              active: true,
              order: 1,
            },
            {
              id: 2,
              title: 'Yağ seviyesi',
              mandatory: true,
              photo: true,
              note: '',
              active: true,
              order: 2,
            },
          ],
        },
        {
          id: 2,
          name: 'Kabin',
          order: 2,
          items: [
            {
              id: 3,
              title: 'Kapı mekanizması',
              mandatory: false,
              photo: true,
              note: 'Kapı açılma/kapanma testi',
              active: true,
              order: 1,
            },
          ],
        },
      ],
    }
  },
}

export function MaintenanceItemsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['maintenance-templates'],
    queryFn: () => maintenanceTemplateService.getAll(),
  })

  const { data: templateDetail } = useQuery({
    queryKey: ['maintenance-template', selectedTemplate],
    queryFn: () => maintenanceTemplateService.getById(selectedTemplate!),
    enabled: !!selectedTemplate,
  })

  const toggleSection = (sectionId: number) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  if (selectedTemplate && templateDetail) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => setSelectedTemplate(null)}
              className="mb-4"
            >
              ← Geri
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">{templateDetail.name}</h1>
            <p className="text-muted-foreground mt-1">Bakım maddelerini yönetin</p>
          </div>
          <Button className="bg-gradient-to-r from-indigo-500 to-indigo-600">
            <Plus className="h-4 w-4 mr-2" />
            Bölüm Ekle
          </Button>
        </div>

        {templateDetail.sections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-1">Henüz bölüm eklenmemiş</p>
              <p className="text-sm text-muted-foreground mb-4">
                İlk bakım bölümünü ekleyerek başlayın.
              </p>
              <Button className="bg-gradient-to-r from-indigo-500 to-indigo-600">
                <Plus className="h-4 w-4 mr-2" />
                Bölüm Ekle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {templateDetail.sections.map((section: any) => (
              <Card key={section.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedSections.has(section.id) ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <CardTitle className="text-lg">{section.name}</CardTitle>
                      <Badge variant="secondary">{section.items.length} madde</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {expandedSections.has(section.id) && (
                  <CardContent>
                    <div className="mb-4 flex justify-end">
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Madde Ekle
                      </Button>
                    </div>
                    <TableResponsive
                      data={section.items}
                      columns={[
                        {
                          key: 'order',
                          header: '',
                          mobileLabel: '',
                          mobilePriority: 0,
                          render: () => (
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                          ),
                        },
                        {
                          key: 'title',
                          header: 'Madde Başlığı',
                          mobileLabel: 'Başlık',
                          mobilePriority: 1,
                          render: (item: any) => <span className="font-medium">{item.title}</span>,
                        },
                        {
                          key: 'mandatory',
                          header: 'Zorunlu',
                          mobileLabel: 'Zorunlu',
                          mobilePriority: 2,
                          render: (item: any) =>
                            item.mandatory ? (
                              <Badge variant="destructive">Zorunlu</Badge>
                            ) : (
                              <Badge variant="secondary">Opsiyonel</Badge>
                            ),
                        },
                        {
                          key: 'photo',
                          header: 'Fotoğraf',
                          mobileLabel: 'Foto',
                          mobilePriority: 3,
                          render: (item: any) =>
                            item.photo ? (
                              <Badge variant="active">Gerekli</Badge>
                            ) : (
                              <Badge variant="secondary">Gerekli Değil</Badge>
                            ),
                        },
                        {
                          key: 'note',
                          header: 'Not',
                          mobileLabel: 'Not',
                          mobilePriority: 4,
                          render: (item: any) => (
                            <span className="text-sm text-muted-foreground">
                              {item.note || '-'}
                            </span>
                          ),
                        },
                        {
                          key: 'active',
                          header: 'Aktif',
                          mobileLabel: 'Aktif',
                          mobilePriority: 5,
                          render: (item: any) =>
                            item.active ? (
                              <Badge variant="active">Aktif</Badge>
                            ) : (
                              <Badge variant="secondary">Pasif</Badge>
                            ),
                        },
                        {
                          key: 'actions',
                          header: 'İşlemler',
                          mobileLabel: '',
                          mobilePriority: 1,
                          hideOnMobile: false,
                          render: (item: any) => (
                            <ActionButtons
                              onEdit={() => {
                                toast({
                                  title: 'Düzenle',
                                  description: `Madde ID: ${item.id}`,
                                })
                              }}
                              onDelete={() => {
                                toast({
                                  title: 'Sil',
                                  description: `Madde ID: ${item.id}`,
                                })
                              }}
                            />
                          ),
                        },
                      ]}
                      keyExtractor={(item) => String(item.id)}
                    />
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  const columns = [
    {
      key: 'name',
      header: 'Şablon Adı',
      mobileLabel: 'Şablon',
      mobilePriority: 1,
      render: (template: any) => (
        <span className="font-medium">{template.name}</span>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      mobileLabel: 'Durum',
      mobilePriority: 2,
      render: (template: any) =>
        template.status === 'ACTIVE' ? (
          <Badge variant="active">Aktif</Badge>
        ) : (
          <Badge variant="secondary">Pasif</Badge>
        ),
    },
    {
      key: 'sectionCount',
      header: 'Bölüm Sayısı',
      mobileLabel: 'Bölüm',
      mobilePriority: 3,
      render: (template: any) => (
        <span className="text-sm text-muted-foreground">{template.sectionCount} bölüm</span>
      ),
    },
    {
      key: 'actions',
      header: 'İşlemler',
      mobileLabel: '',
      mobilePriority: 1,
      hideOnMobile: false,
      render: (template: any) => (
        <ActionButtons
          onMaintenance={() => setSelectedTemplate(template.id)}
          onEdit={() => {
            toast({
              title: 'Düzenle',
              description: `Şablon ID: ${template.id}`,
            })
          }}
          onDelete={() => {
            toast({
              title: 'Sil',
              description: `Şablon ID: ${template.id}`,
            })
          }}
        />
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bakım Maddeleri Yönet</h1>
          <p className="text-muted-foreground mt-1">
            Bakım şablonlarını oluşturun ve maddelerini yönetin
          </p>
        </div>
        <Button className="bg-gradient-to-r from-indigo-500 to-indigo-600">
          <Plus className="h-4 w-4 mr-2" />
          Bakım Şablonu Ekle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bakım Şablonları</CardTitle>
          <CardDescription>Mevcut bakım şablonlarını görüntüleyin ve yönetin</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Yükleniyor...</div>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-1">Henüz şablon eklenmemiş</p>
              <p className="text-sm text-muted-foreground mb-4">
                İlk bakım şablonunu ekleyerek başlayın.
              </p>
              <Button className="bg-gradient-to-r from-indigo-500 to-indigo-600">
                <Plus className="h-4 w-4 mr-2" />
                Bakım Şablonu Ekle
              </Button>
            </div>
          ) : (
            <TableResponsive
              data={templates}
              columns={columns}
              keyExtractor={(item) => String(item.id)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

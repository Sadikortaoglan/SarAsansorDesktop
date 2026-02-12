# Backend Hibernate MultipleBagFetchException Fix

## Problem
```
org.hibernate.loader.MultipleBagFetchException: cannot simultaneously fetch multiple bags: 
[com.saraasansor.api.model.MaintenanceSection.items, 
 com.saraasansor.api.model.MaintenanceTemplate.sections]
```

## Cause
Hibernate, aynı anda birden fazla `@OneToMany` collection'ı fetch edemez. 
`MaintenanceTemplate` entity'sinde hem `sections` hem de `sections.items` aynı query'de fetch edilmeye çalışılıyor.

## Solution Options

### Option 1: Use @BatchSize (Recommended)
```java
@Entity
public class MaintenanceTemplate {
    @OneToMany(mappedBy = "template", fetch = FetchType.LAZY)
    @BatchSize(size = 20)
    private List<MaintenanceSection> sections;
}

@Entity
public class MaintenanceSection {
    @OneToMany(mappedBy = "section", fetch = FetchType.LAZY)
    @BatchSize(size = 20)
    private List<MaintenanceItem> items;
}
```

### Option 2: Use Separate Queries
```java
@Query("SELECT t FROM MaintenanceTemplate t WHERE t.id = :id")
MaintenanceTemplate findById(@Param("id") Long id);

@Query("SELECT s FROM MaintenanceSection s WHERE s.templateId = :templateId")
List<MaintenanceSection> findSectionsByTemplateId(@Param("templateId") Long templateId);

@Query("SELECT i FROM MaintenanceItem i WHERE i.sectionId = :sectionId")
List<MaintenanceItem> findItemsBySectionId(@Param("sectionId") Long sectionId);
```

### Option 3: Use DTO Projection
```java
@Query("SELECT new com.saraasansor.api.dto.MaintenanceTemplateDTO(" +
       "t.id, t.name, t.status) " +
       "FROM MaintenanceTemplate t WHERE t.id = :id")
MaintenanceTemplateDTO findTemplateDTO(@Param("id") Long id);
```

### Option 4: Use @EntityGraph with Separate Attributes
```java
@EntityGraph(attributePaths = {"sections"})
@Query("SELECT t FROM MaintenanceTemplate t WHERE t.id = :id")
MaintenanceTemplate findByIdWithSections(@Param("id") Long id);

@EntityGraph(attributePaths = {"items"})
@Query("SELECT s FROM MaintenanceSection s WHERE s.id = :id")
MaintenanceSection findByIdWithItems(@Param("id") Long id);
```

## Recommended Approach
**Use Option 1 (@BatchSize)** - En performanslı ve temiz çözüm.

## Frontend Workaround
Frontend'de geçici olarak ayrı ayrı fetch ediyoruz:
1. Template fetch
2. Sections ayrı fetch
3. Her section için items ayrı fetch

Bu geçici bir çözüm. Backend düzeltildiğinde tek query ile çalışacak.

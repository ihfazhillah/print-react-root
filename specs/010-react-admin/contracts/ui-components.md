# Contract: UI Components

Reusable components for the admin dashboard. Each CRUD section follows the same pattern.

## Page Layout

```
/admin                    → Pages list (default view)
/admin/tags               → Tags list
/admin/devices            → Devices list
/admin/insights           → Insights overview
/admin/insights/:deviceId → Device timeline detail
```

## Shared Components

### DataTable
Wraps TanStack Table. Used by pages, tags, and devices.

Props: `columns`, `data`, `pagination`, `onPaginationChange`

### Modal
Generic modal dialog for create/edit forms and confirmations.

Props: `open`, `onClose`, `title`, `children`

### Toast
Notification system for success/error feedback.

API: `useToast()` → `{ success(msg), error(msg) }`

### ConfirmDialog
Delete/merge confirmation with destructive action styling.

Props: `open`, `onConfirm`, `onCancel`, `title`, `message`

## Section Pattern

Each admin section (pages, tags, devices) follows:

1. **List page** — DataTable with TanStack Table, pagination, optional filters
2. **Create/Edit modal** — Form with validation, submits via mutation
3. **Delete confirmation** — ConfirmDialog, invalidates query on success
4. **TanStack Query hooks** — `usePages()`, `useTags()`, `useDevices()` wrapping the API client

## Hook Pattern (mirrors kids-app)

```typescript
// Example: useTags hook
function useTags(skip: number, limit: number) {
  const client = useAdminApiClient();
  return useQuery({
    queryKey: ['admin', 'tags', skip, limit],
    queryFn: () => client.getAllTags(skip, limit),
  });
}

function useCreateTag() {
  const client = useAdminApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TagCreate) => client.createTag(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'tags'] }),
  });
}
```

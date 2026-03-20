import { useState, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichBilder } from '@/lib/enrich';
import type { EnrichedBilder } from '@/types/enriched';
import type { Standorte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { BilderDialog } from '@/components/dialogs/BilderDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatCard } from '@/components/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  IconAlertCircle, IconPlus, IconPhoto, IconMapPin, IconCalendar,
  IconPencil, IconTrash, IconX, IconSearch, IconLayoutGrid, IconLayoutList
} from '@tabler/icons-react';
import { Input } from '@/components/ui/input';

export default function DashboardOverview() {
  const {
    bilder, standorte,
    standorteMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedBilder = enrichBilder(bilder, { standorteMap });

  // All hooks before early returns
  const [selectedStandort, setSelectedStandort] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedBilder | null>(null);
  const [previewRecord, setPreviewRecord] = useState<EnrichedBilder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedBilder | null>(null);
  const [createWithStandort, setCreateWithStandort] = useState<string | null>(null);

  const filteredBilder = useMemo(() => {
    let result = enrichedBilder;
    if (selectedStandort !== 'all') {
      result = result.filter(b => {
        if (selectedStandort === 'none') return !b.fields.bild_standort;
        const url = b.fields.bild_standort;
        if (!url) return false;
        return url.endsWith(selectedStandort);
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(b =>
        (b.fields.bild_titel ?? '').toLowerCase().includes(q) ||
        (b.fields.bild_beschreibung ?? '').toLowerCase().includes(q) ||
        (b.bild_standortName ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [enrichedBilder, selectedStandort, search]);

  const standortGroups = useMemo(() => {
    const groups: Record<string, { standort: Standorte | null; bilder: EnrichedBilder[] }> = {};
    for (const b of enrichedBilder) {
      const url = b.fields.bild_standort;
      let key = 'none';
      let standort: Standorte | null = null;
      if (url) {
        const match = url.match(/([a-f0-9]{24})$/i);
        if (match) {
          key = match[1];
          standort = standorteMap.get(key) ?? null;
        }
      }
      if (!groups[key]) groups[key] = { standort, bilder: [] };
      groups[key].bilder.push(b);
    }
    return groups;
  }, [enrichedBilder, standorteMap]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const totalBilder = bilder.length;
  const totalStandorte = standorte.length;
  const withLocation = bilder.filter(b => b.fields.bild_standort).length;
  const recentCount = bilder.filter(b => {
    if (!b.fields.bild_aufnahmedatum) return false;
    const d = new Date(b.fields.bild_aufnahmedatum);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  }).length;

  const handleCreateSubmit = async (fields: EnrichedBilder['fields']) => {
    if (createWithStandort) {
      (fields as Record<string, unknown>).bild_standort = createRecordUrl(APP_IDS.STANDORTE, createWithStandort);
    }
    await LivingAppsService.createBilderEntry(fields);
    fetchAll();
    setCreateOpen(false);
    setCreateWithStandort(null);
  };

  const handleEditSubmit = async (fields: EnrichedBilder['fields']) => {
    if (!editRecord) return;
    await LivingAppsService.updateBilderEntry(editRecord.record_id, fields);
    fetchAll();
    setEditRecord(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteBilderEntry(deleteTarget.record_id);
    fetchAll();
    setDeleteTarget(null);
    if (previewRecord?.record_id === deleteTarget.record_id) setPreviewRecord(null);
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Bilder gesamt"
          value={String(totalBilder)}
          description="Alle Aufnahmen"
          icon={<IconPhoto size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Standorte"
          value={String(totalStandorte)}
          description="Aufnahmeorte"
          icon={<IconMapPin size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Mit Ort"
          value={String(withLocation)}
          description="Bilder mit Standort"
          icon={<IconMapPin size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Letzte 30 Tage"
          value={String(recentCount)}
          description="Neue Aufnahmen"
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
          <Input
            placeholder="Bilder suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Standort filter chips */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedStandort('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedStandort === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Alle
          </button>
          {standorte.map(s => (
            <button
              key={s.record_id}
              onClick={() => setSelectedStandort(selectedStandort === s.record_id ? 'all' : s.record_id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedStandort === s.record_id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {s.fields.standort_name ?? 'Unbekannt'}
            </button>
          ))}
          <button
            onClick={() => setSelectedStandort(selectedStandort === 'none' ? 'all' : 'none')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedStandort === 'none'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Ohne Ort
          </button>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <IconLayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <IconLayoutList size={16} />
          </button>
          <Button onClick={() => { setCreateWithStandort(null); setCreateOpen(true); }} size="sm" className="ml-2 gap-1.5">
            <IconPlus size={16} className="shrink-0" />
            <span className="hidden sm:inline">Bild hinzufügen</span>
          </Button>
        </div>
      </div>

      {/* Main content */}
      {filteredBilder.length === 0 ? (
        <EmptyState onAdd={() => setCreateOpen(true)} hasSearch={!!search || selectedStandort !== 'all'} />
      ) : viewMode === 'grid' ? (
        <PhotoGrid
          bilder={filteredBilder}
          onEdit={setEditRecord}
          onDelete={setDeleteTarget}
          onPreview={setPreviewRecord}
        />
      ) : (
        <PhotoList
          bilder={filteredBilder}
          onEdit={setEditRecord}
          onDelete={setDeleteTarget}
          onPreview={setPreviewRecord}
        />
      )}

      {/* Location sections when no filter active */}
      {selectedStandort === 'all' && !search && viewMode === 'grid' && standorte.length > 0 && (
        <div className="space-y-6 pt-2">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-foreground">Nach Standort</h2>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {standorte.map(s => {
              const group = standortGroups[s.record_id];
              const count = group?.bilder.length ?? 0;
              const preview = group?.bilder.find(b => b.fields.bild_datei);
              return (
                <div
                  key={s.record_id}
                  className="group relative rounded-2xl overflow-hidden bg-card border border-border cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedStandort(s.record_id)}
                >
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {preview?.fields.bild_datei ? (
                      <img
                        src={preview.fields.bild_datei}
                        alt={preview.fields.bild_titel ?? ''}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <IconPhoto size={32} className="text-muted-foreground/40" stroke={1.5} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white font-semibold text-sm truncate">{s.fields.standort_name}</p>
                      {s.fields.standort_position?.info && (
                        <p className="text-white/70 text-xs truncate">{s.fields.standort_position.info}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                      <IconMapPin size={14} className="shrink-0" />
                      <span className="text-xs truncate">{s.fields.standort_beschreibung ?? s.fields.standort_name ?? '—'}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">{count} Bild{count !== 1 ? 'er' : ''}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <BilderDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateWithStandort(null); }}
        onSubmit={handleCreateSubmit}
        defaultValues={createWithStandort ? { bild_standort: createRecordUrl(APP_IDS.STANDORTE, createWithStandort) } : undefined}
        standorteList={standorte}
        enablePhotoScan={AI_PHOTO_SCAN['Bilder']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Bilder']}
      />

      {editRecord && (
        <BilderDialog
          open={!!editRecord}
          onClose={() => setEditRecord(null)}
          onSubmit={handleEditSubmit}
          defaultValues={editRecord.fields}
          standorteList={standorte}
          enablePhotoScan={AI_PHOTO_SCAN['Bilder']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Bilder']}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Bild löschen"
        description={`Soll "${deleteTarget?.fields.bild_titel ?? 'dieses Bild'}" wirklich gelöscht werden?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Lightbox preview */}
      {previewRecord && (
        <PhotoPreview
          record={previewRecord}
          onClose={() => setPreviewRecord(null)}
          onEdit={() => { setEditRecord(previewRecord); setPreviewRecord(null); }}
          onDelete={() => { setDeleteTarget(previewRecord); setPreviewRecord(null); }}
        />
      )}
    </div>
  );
}

// Photo Grid
function PhotoGrid({
  bilder, onEdit, onDelete, onPreview
}: {
  bilder: EnrichedBilder[];
  onEdit: (b: EnrichedBilder) => void;
  onDelete: (b: EnrichedBilder) => void;
  onPreview: (b: EnrichedBilder) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {bilder.map(b => (
        <div
          key={b.record_id}
          className="group relative rounded-2xl overflow-hidden bg-card border border-border cursor-pointer hover:shadow-lg transition-all duration-200"
          onClick={() => onPreview(b)}
        >
          <div className="aspect-square bg-muted relative overflow-hidden">
            {b.fields.bild_datei ? (
              <img
                src={b.fields.bild_datei}
                alt={b.fields.bild_titel ?? ''}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <IconPhoto size={32} className="text-muted-foreground/40" stroke={1.5} />
              </div>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                onClick={e => { e.stopPropagation(); onEdit(b); }}
              >
                <IconPencil size={14} className="text-foreground" />
              </button>
              <button
                className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                onClick={e => { e.stopPropagation(); onDelete(b); }}
              >
                <IconTrash size={14} className="text-destructive" />
              </button>
            </div>
          </div>
          <div className="p-2.5">
            <p className="text-xs font-medium text-foreground truncate">{b.fields.bild_titel ?? '—'}</p>
            {b.bild_standortName && (
              <div className="flex items-center gap-1 mt-0.5">
                <IconMapPin size={10} className="text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate">{b.bild_standortName}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Photo List
function PhotoList({
  bilder, onEdit, onDelete, onPreview
}: {
  bilder: EnrichedBilder[];
  onEdit: (b: EnrichedBilder) => void;
  onDelete: (b: EnrichedBilder) => void;
  onPreview: (b: EnrichedBilder) => void;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="divide-y divide-border">
        {bilder.map(b => (
          <div
            key={b.record_id}
            className="flex items-center gap-4 p-3 hover:bg-muted/40 transition-colors cursor-pointer"
            onClick={() => onPreview(b)}
          >
            <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0">
              {b.fields.bild_datei ? (
                <img src={b.fields.bild_datei} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <IconPhoto size={20} className="text-muted-foreground/40" stroke={1.5} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">{b.fields.bild_titel ?? '—'}</p>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                {b.bild_standortName && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <IconMapPin size={11} className="shrink-0" />{b.bild_standortName}
                  </span>
                )}
                {b.fields.bild_aufnahmedatum && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <IconCalendar size={11} className="shrink-0" />{formatDate(b.fields.bild_aufnahmedatum)}
                  </span>
                )}
              </div>
              {b.fields.bild_beschreibung && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.fields.bild_beschreibung}</p>
              )}
            </div>
            <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
              <button
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => onEdit(b)}
              >
                <IconPencil size={14} className="text-muted-foreground" />
              </button>
              <button
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => onDelete(b)}
              >
                <IconTrash size={14} className="text-destructive" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Lightbox preview
function PhotoPreview({
  record, onClose, onEdit, onDelete
}: {
  record: EnrichedBilder;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative bg-black aspect-video overflow-hidden">
          {record.fields.bild_datei ? (
            <img
              src={record.fields.bild_datei}
              alt={record.fields.bild_titel ?? ''}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <IconPhoto size={48} className="text-muted-foreground/40" stroke={1.5} />
            </div>
          )}
          <button
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            onClick={onClose}
          >
            <IconX size={16} />
          </button>
        </div>
        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{record.fields.bild_titel ?? '—'}</h3>
              <div className="flex flex-wrap gap-3 mt-1">
                {record.bild_standortName && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <IconMapPin size={13} className="shrink-0" />{record.bild_standortName}
                  </span>
                )}
                {record.fields.bild_aufnahmedatum && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <IconCalendar size={13} className="shrink-0" />{formatDate(record.fields.bild_aufnahmedatum)}
                  </span>
                )}
              </div>
              {record.fields.bild_beschreibung && (
                <p className="text-sm text-muted-foreground mt-2">{record.fields.bild_beschreibung}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
                <IconPencil size={14} className="shrink-0" />
                <span className="hidden sm:inline">Bearbeiten</span>
              </Button>
              <Button variant="outline" size="sm" onClick={onDelete} className="gap-1.5 text-destructive hover:text-destructive">
                <IconTrash size={14} className="shrink-0" />
                <span className="hidden sm:inline">Löschen</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state
function EmptyState({ onAdd, hasSearch }: { onAdd: () => void; hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <IconPhoto size={32} className="text-muted-foreground/60" stroke={1.5} />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">
          {hasSearch ? 'Keine Bilder gefunden' : 'Noch keine Bilder'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {hasSearch
            ? 'Keine Bilder entsprechen Ihrer Suche oder dem gewählten Filter.'
            : 'Fügen Sie Ihr erstes Bild hinzu, um loszulegen.'}
        </p>
      </div>
      {!hasSearch && (
        <Button onClick={onAdd} className="gap-1.5">
          <IconPlus size={16} className="shrink-0" />
          Bild hinzufügen
        </Button>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-48 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}

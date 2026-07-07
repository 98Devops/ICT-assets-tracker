import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Paperclip, Pencil, RotateCcw, UserPlus, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthContext';
import { can } from '@/features/auth/roles';
import { useAsset } from './api';
import { AssetForm } from './AssetForm';
import { AssignForm } from '@/features/assignments/AssignForm';
import { ReturnForm } from '@/features/assignments/ReturnForm';
import { useAssetAssignments } from '@/features/assignments/api';
import { MaintenanceForm } from '@/features/maintenance/MaintenanceForm';
import { MAINTENANCE_LABELS, useAssetMaintenance } from '@/features/maintenance/api';
import { getAttachmentUrl, useAssetAttachments, useUploadAttachment } from '@/features/attachments/api';
import { AssetQr } from '@/features/qr/QrCode';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { CATEGORY_LABELS, type AttachmentKind } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

type ModalKind = null | 'edit' | 'assign' | 'return' | 'maintenance';

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const asset = useAsset(id);
  const assignments = useAssetAssignments(id);
  const maintenance = useAssetMaintenance(id);
  const attachments = useAssetAttachments(id);
  const upload = useUploadAttachment(profile!.organization_id, profile!.id);
  const [modal, setModal] = useState<ModalKind>(null);
  const [attachKind, setAttachKind] = useState<AttachmentKind>('other');

  if (asset.isLoading) return <PageSkeleton />;
  if (asset.isError)
    return <ErrorState message={(asset.error as Error).message} onRetry={() => void asset.refetch()} />;

  const a = asset.data!;
  const open = (assignments.data ?? []).find((x) => !x.returned_date);
  const writer = profile && can.assetWrite(profile.role);
  const assigner = profile && can.assign(profile.role);
  const repairs = (maintenance.data ?? []).filter((m) => m.type === 'repair').length;

  const meta: [string, React.ReactNode][] = [
    ['Category', CATEGORY_LABELS[a.category]],
    ['Serial number', <span key="s" className="font-mono">{a.serial_number ?? '—'}</span>],
    ['Model', a.model ?? '—'],
    ['Supplier', a.suppliers?.name ?? '—'],
    ['Department', a.departments?.name ?? '—'],
    ['Location', a.location ?? '—'],
    ['Purchase date', formatDate(a.purchase_date)],
    ['Cost', <span key="c" className="font-mono">{formatMoney(a.cost)}</span>],
    ['Warranty expiry', formatDate(a.warranty_expiry)],
    ['Condition', a.condition ?? '—'],
  ];

  return (
    <div className="space-y-6">
      <Link to="/assets" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition">
        <ArrowLeft size={15} /> Assets
      </Link>

      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-xs text-ember">{a.asset_tag}</div>
          <h1 className="text-2xl font-semibold">{a.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={a.status} />
            {repairs >= 3 && (
              <span className="badge bg-status-repair/10 text-status-repair">
                ⚠ {repairs} repairs — review
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {writer && (
            <button className="btn-secondary" onClick={() => setModal('edit')}>
              <Pencil size={15} /> Edit
            </button>
          )}
          {assigner &&
            (open ? (
              <button className="btn-secondary" onClick={() => setModal('return')}>
                <RotateCcw size={15} /> Record return
              </button>
            ) : (
              <button className="btn-primary" onClick={() => setModal('assign')}>
                <UserPlus size={15} /> Assign
              </button>
            ))}
          {assigner && (
            <button className="btn-secondary" onClick={() => setModal('maintenance')}>
              <Wrench size={15} /> Log maintenance
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* metadata */}
        <div className="lg:col-span-2 space-y-6">
          <section className="card p-6">
            <h2 className="text-base font-semibold mb-4">Details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {meta.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-hairline/50 pb-2">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
            {a.notes && <p className="mt-4 text-sm text-ink-muted">{a.notes}</p>}
          </section>

          {/* custody timeline */}
          <section className="card p-6">
            <h2 className="text-base font-semibold mb-4">Chain of custody</h2>
            {(assignments.data ?? []).length === 0 ? (
              <p className="text-sm text-ink-muted">Never assigned.</p>
            ) : (
              <ol className="relative border-l border-hairline ml-2 space-y-5">
                {(assignments.data ?? []).map((asg) => (
                  <li key={asg.id} className="ml-5">
                    <span
                      className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ${asg.returned_date ? 'bg-hairline' : 'bg-ember'}`}
                    />
                    <div className="text-sm font-medium">
                      {asg.assigned_to_profile?.full_name ?? 'Unknown'}
                      {!asg.returned_date && <span className="ml-2 badge bg-ember-soft text-ember">in custody</span>}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {formatDate(asg.assigned_date)} → {asg.returned_date ? formatDate(asg.returned_date) : 'present'}
                      {asg.assigned_by_profile && ` · issued by ${asg.assigned_by_profile.full_name}`}
                    </div>
                    {asg.return_condition && (
                      <div className="text-xs text-ink-muted mt-0.5">Returned: {asg.return_condition}</div>
                    )}
                    {asg.notes && <div className="text-xs text-ink-muted mt-0.5">{asg.notes}</div>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* maintenance history */}
          <section className="card p-6">
            <h2 className="text-base font-semibold mb-4">Maintenance history</h2>
            {(maintenance.data ?? []).length === 0 ? (
              <p className="text-sm text-ink-muted">No maintenance recorded.</p>
            ) : (
              <ul className="space-y-4">
                {(maintenance.data ?? []).map((m) => (
                  <li key={m.id} className="flex gap-4 text-sm border-b border-hairline/50 pb-3 last:border-0">
                    <div className="shrink-0 w-24 text-xs text-ink-muted">{formatDate(m.date)}</div>
                    <div className="flex-1">
                      <span className="badge bg-surface-panel text-ink mr-2">{MAINTENANCE_LABELS[m.type]}</span>
                      {m.description}
                      {m.parts_replaced && (
                        <div className="text-xs text-ink-muted mt-1">Parts: {m.parts_replaced}</div>
                      )}
                      {m.performed_by && (
                        <div className="text-xs text-ink-muted">By: {m.performed_by}</div>
                      )}
                    </div>
                    <div className="shrink-0 font-mono text-xs">{formatMoney(m.cost)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* sidebar: QR + attachments */}
        <div className="space-y-6">
          <section className="card p-6 flex flex-col items-center gap-3">
            <h2 className="text-base font-semibold self-start">QR tag</h2>
            <AssetQr assetId={a.id} size={160} />
            <div className="font-mono text-sm">{a.asset_tag}</div>
            <Link to={`/reports?tab=labels`} className="text-xs text-ember hover:underline">
              Print label sheet →
            </Link>
          </section>

          <section className="card p-6">
            <h2 className="text-base font-semibold mb-3">Attachments</h2>
            {(attachments.data ?? []).length === 0 ? (
              <p className="text-sm text-ink-muted mb-3">No documents yet.</p>
            ) : (
              <ul className="space-y-2 mb-4">
                {(attachments.data ?? []).map((f) => (
                  <li key={f.id}>
                    <button
                      className="flex items-center gap-2 text-sm text-ember hover:underline"
                      onClick={() =>
                        void getAttachmentUrl(f.storage_path)
                          .then((url) => window.open(url, '_blank'))
                          .catch((e: Error) => toast.error(e.message))
                      }
                    >
                      <FileText size={14} /> {f.file_name}
                      <span className="badge bg-surface-panel text-ink-muted">{f.kind}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {writer && (
              <div className="space-y-2">
                <select
                  aria-label="Attachment type"
                  className="input"
                  value={attachKind}
                  onChange={(e) => setAttachKind(e.target.value as AttachmentKind)}
                >
                  <option value="invoice">Invoice</option>
                  <option value="warranty">Warranty</option>
                  <option value="photo">Photo</option>
                  <option value="other">Other</option>
                </select>
                <label className="btn-secondary w-full cursor-pointer">
                  <Paperclip size={15} /> {upload.isPending ? 'Uploading…' : 'Upload file'}
                  <input
                    type="file"
                    className="sr-only"
                    disabled={upload.isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      upload
                        .mutateAsync({ assetId: a.id, file, kind: attachKind })
                        .then(() => toast.success('File attached'))
                        .catch((err: Error) => toast.error(err.message));
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            )}
          </section>
        </div>
      </div>

      <Modal title="Edit asset" open={modal === 'edit'} onClose={() => setModal(null)} wide>
        <AssetForm asset={a} onDone={() => setModal(null)} />
      </Modal>
      <Modal title={`Assign ${a.asset_tag}`} open={modal === 'assign'} onClose={() => setModal(null)}>
        <AssignForm assetId={a.id} onDone={() => setModal(null)} />
      </Modal>
      <Modal title={`Return ${a.asset_tag}`} open={modal === 'return'} onClose={() => setModal(null)}>
        {open && <ReturnForm assignmentId={open.id} onDone={() => setModal(null)} />}
      </Modal>
      <Modal title={`Log maintenance — ${a.asset_tag}`} open={modal === 'maintenance'} onClose={() => setModal(null)}>
        <MaintenanceForm assetId={a.id} onDone={() => setModal(null)} />
      </Modal>
    </div>
  );
}

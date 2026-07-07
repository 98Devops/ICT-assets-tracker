import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Attachment, AttachmentKind } from '@/lib/types';

const BUCKET = 'asset-attachments';
const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = /^(image\/(png|jpe?g|webp|gif|svg\+xml)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|text\/(csv|plain))$/;

/** Validate a file before upload; returns a human error or null if OK. */
export function validateAttachment(file: File): string | null {
  if (file.size > MAX_SIZE_MB * 1024 * 1024)
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_SIZE_MB} MB.`;
  if (file.size === 0) return 'That file is empty.';
  if (file.type && !ALLOWED_TYPES.test(file.type))
    return 'Unsupported file type. Use images, PDF, Word, Excel, CSV or plain text.';
  return null;
}

export function useAssetAttachments(assetId: string | undefined) {
  return useQuery({
    queryKey: ['attachments', assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('asset_id', assetId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error('Could not load attachments.');
      return (data ?? []) as Attachment[];
    },
  });
}

export function useUploadAttachment(organizationId: string, uploadedBy: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assetId,
      file,
      kind,
    }: {
      assetId: string;
      file: File;
      kind: AttachmentKind;
    }) => {
      const invalid = validateAttachment(file);
      if (invalid) throw new Error(invalid);
      const path = `${organizationId}/${assetId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) throw new Error('Upload failed. Check the file size and try again.');
      const { error } = await supabase.from('attachments').insert({
        organization_id: organizationId,
        asset_id: assetId,
        storage_path: path,
        file_name: file.name,
        kind,
        uploaded_by: uploadedBy,
      });
      if (error) throw new Error('Could not save the attachment record.');
    },
    onSuccess: (_d, { assetId }) => qc.invalidateQueries({ queryKey: ['attachments', assetId] }),
  });
}

export async function getAttachmentUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 300);
  if (error || !data) throw new Error('Could not open the file.');
  return data.signedUrl;
}

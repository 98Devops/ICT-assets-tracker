import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Attachment, AttachmentKind } from '@/lib/types';

const BUCKET = 'asset-attachments';

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

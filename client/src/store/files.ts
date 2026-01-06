import { atomFamily } from 'recoil';

/**
 * Direct Attach state per conversation
 * When enabled, files are sent directly to the model without RAG/indexing
 */
export const directAttachByConvoId = atomFamily<boolean, string>({
  key: 'directAttachByConvoId',
  default: false, // Default OFF - uses existing RAG flow
});


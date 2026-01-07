import React, { useRef } from 'react';
import { useRecoilValue } from 'recoil';
import { Upload } from 'lucide-react';
import { TooltipAnchor, FileUpload } from '@librechat/client';
import { directAttachByConvoId } from '~/store';
import { Constants } from 'librechat-data-provider';
import { useLocalize, useFileHandling } from '~/hooks';
import { cn } from '~/utils';

interface DirectAttachIndicatorProps {
  conversationId: string;
}

const DirectAttachIndicator: React.FC<DirectAttachIndicatorProps> = ({ conversationId }) => {
  const localize = useLocalize();
  const convoId = conversationId || Constants.NEW_CONVO;
  const directAttachEnabled = useRecoilValue(directAttachByConvoId(convoId));
  const inputRef = useRef<HTMLInputElement>(null);
  const { handleFileChange } = useFileHandling();

  if (!directAttachEnabled) {
    return null;
  }

  const handleClick = () => {
    if (!inputRef.current) {
      return;
    }
    inputRef.current.value = '';
    // Accept all file types for Direct Attach
    inputRef.current.accept = '';
    inputRef.current.click();
  };

  return (
    <FileUpload ref={inputRef} handleFileChange={handleFileChange}>
      <TooltipAnchor
        description={localize('com_ui_direct_attach_upload') || 'Upload File (Direct Attach)'}
        id="direct-attach-indicator"
        render={
          <button
            type="button"
            onClick={handleClick}
            className={cn(
              'flex size-9 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-50',
            )}
            aria-label={localize('com_ui_direct_attach_upload') || 'Upload File (Direct Attach)'}
          >
            <Upload className="icon-md text-text-secondary" />
          </button>
        }
      />
    </FileUpload>
  );
};

export default React.memo(DirectAttachIndicator);


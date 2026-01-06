import React from 'react';
import { useRecoilValue } from 'recoil';
import { Upload } from 'lucide-react';
import { TooltipAnchor } from '@librechat/client';
import { directAttachByConvoId } from '~/store';
import { Constants } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface DirectAttachIndicatorProps {
  conversationId: string;
}

const DirectAttachIndicator: React.FC<DirectAttachIndicatorProps> = ({ conversationId }) => {
  const localize = useLocalize();
  const convoId = conversationId || Constants.NEW_CONVO;
  const directAttachEnabled = useRecoilValue(directAttachByConvoId(convoId));

  if (!directAttachEnabled) {
    return null;
  }

  return (
    <TooltipAnchor
      description={localize('com_ui_direct_attach') + ': ' + localize('com_ui_on')}
      id="direct-attach-indicator"
      render={
        <div
          className={cn(
            'flex size-9 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors',
          )}
          aria-label={localize('com_ui_direct_attach') + ': ' + localize('com_ui_on')}
        >
          <Upload className="icon-md text-text-secondary" />
        </div>
      }
    />
  );
};

export default React.memo(DirectAttachIndicator);


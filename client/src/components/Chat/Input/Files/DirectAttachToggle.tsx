import React from 'react';
import { useRecoilState } from 'recoil';
import { Switch } from '@librechat/client';
import { directAttachByConvoId } from '~/store';
import { Constants } from 'librechat-data-provider';
import { cn } from '~/utils';

interface DirectAttachToggleProps {
  conversationId: string;
  className?: string;
  [key: string]: any; // For spread props from menu item
}

const DirectAttachToggle: React.FC<DirectAttachToggleProps> = ({
  conversationId,
  className,
  ...props
}) => {
  const convoId = conversationId || Constants.NEW_CONVO;
  const [directAttachEnabled, setDirectAttachEnabled] = useRecoilState(
    directAttachByConvoId(convoId),
  );

  const handleToggle = (checked: boolean) => {
    setDirectAttachEnabled(checked);
  };

  return (
    <div
      {...props}
      className={cn(
        'flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-surface-hover',
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        handleToggle(!directAttachEnabled);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          handleToggle(!directAttachEnabled);
        }
      }}
    >
      <div className="flex items-center gap-2.5">
        {/* Green indicator circle when ON */}
        {directAttachEnabled ? (
          <div className="flex h-2.5 w-2.5 flex-shrink-0 items-center justify-center">
            <div className="h-2.5 w-2.5 rounded-full bg-[#22c55e] shadow-sm" />
          </div>
        ) : (
          <div className="h-2.5 w-2.5 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-text-primary">
          Direct Attach: {directAttachEnabled ? 'ON' : 'OFF'}
        </span>
      </div>
      <Switch
        checked={directAttachEnabled}
        onCheckedChange={handleToggle}
        className="ml-auto"
        aria-label="Direct Attach"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default React.memo(DirectAttachToggle);


-- Add status tracking columns to messages table for post-send moderation
DO $$ 
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'messages' 
                 AND column_name = 'status') THEN
    ALTER TABLE public.messages 
    ADD COLUMN status text NOT NULL DEFAULT 'sent';
  END IF;

  -- Add moderation_reason column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'messages' 
                 AND column_name = 'moderation_reason') THEN
    ALTER TABLE public.messages 
    ADD COLUMN moderation_reason text NULL;
  END IF;

  -- Add moderation_checked_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'messages' 
                 AND column_name = 'moderation_checked_at') THEN
    ALTER TABLE public.messages 
    ADD COLUMN moderation_checked_at timestamptz NULL;
  END IF;

  -- Add client_temp_id column if it doesn't exist (for optimistic reconciliation)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'messages' 
                 AND column_name = 'client_temp_id') THEN
    ALTER TABLE public.messages 
    ADD COLUMN client_temp_id text NULL;
  END IF;
END $$;

-- Add index for status lookups
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);

-- Add constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_status_check') THEN
    ALTER TABLE public.messages 
    ADD CONSTRAINT messages_status_check 
    CHECK (status IN ('pending_moderation', 'sent', 'blocked', 'failed'));
  END IF;
EXCEPTION WHEN others THEN
  -- Ignore if already exists
  NULL;
END $$;
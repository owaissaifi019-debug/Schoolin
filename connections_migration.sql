-- ============================================================
-- CONNECTION SYSTEM: LINKEDIN-STYLE MUTUAL CONNECTIONS
-- ============================================================

-- Create connections table (user-to-user only, requires accept/reject)
CREATE TABLE IF NOT EXISTS public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT connections_unique UNIQUE (requester_id, receiver_id),
  CONSTRAINT connections_no_self CHECK (requester_id != receiver_id)
);

-- Enable RLS on connections
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Connections Policies
CREATE POLICY "Connections are viewable by everyone"
  ON public.connections FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can send connection requests"
  ON public.connections FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Receiver can update connection status"
  ON public.connections FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "Either party can delete a connection"
  ON public.connections FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

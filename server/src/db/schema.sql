CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🙂',
  coins INTEGER NOT NULL DEFAULT 50,
  target_score INTEGER NOT NULL DEFAULT 500,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id <> addressee_id),
  CHECK (status IN ('pending', 'accepted'))
);

CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id, status);

ALTER TABLE users ADD COLUMN IF NOT EXISTS games_played INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS games_won INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id),
  CHECK (char_length(body) BETWEEN 1 AND 500)
);
CREATE INDEX IF NOT EXISTS idx_messages_pair_a ON messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_pair_b ON messages(recipient_id, sender_id, created_at);

-- Real-money coin purchases (Stripe). status: pending -> paid, driven by
-- the webhook (never trust the client-side redirect alone). Unique session
-- id makes webhook handling idempotent if Stripe retries delivery.
CREATE TABLE IF NOT EXISTS coin_purchases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE NOT NULL,
  coins INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('pending', 'paid'))
);
CREATE INDEX IF NOT EXISTS idx_coin_purchases_user ON coin_purchases(user_id);

-- Cosmetic avatars bought with coins (not real money) — array of emoji this
-- account owns beyond the free default set.
ALTER TABLE users ADD COLUMN IF NOT EXISTS unlocked_avatars TEXT[] NOT NULL DEFAULT '{}';

-- New accounts start with a one-time 50-coin signup bonus, not 500 — the
-- 500 default was only ever a placeholder from before real payments existed.
-- Only changes the default applied to future signups; existing balances
-- (including whatever a prior 500-coin default already granted) are untouched.
ALTER TABLE users ALTER COLUMN coins SET DEFAULT 50;

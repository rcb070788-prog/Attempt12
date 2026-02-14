-- Ensure user_id/created_by columns reference profiles(id) with ON DELETE CASCADE
-- so 5-year cleanup can delete profiles and cascade to dependent rows.
-- Uses DO blocks to skip tables that don't exist or already have the constraint.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'polls') THEN
    ALTER TABLE polls DROP CONSTRAINT IF EXISTS polls_created_by_fkey;
    ALTER TABLE polls DROP CONSTRAINT IF EXISTS polls_created_by_profiles_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'polls' AND column_name = 'created_by') THEN
      ALTER TABLE polls ADD CONSTRAINT polls_created_by_profiles_fkey
        FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'polls created_by: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'poll_votes') THEN
    ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_user_id_fkey;
    ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_user_id_profiles_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'poll_votes' AND column_name = 'user_id') THEN
      ALTER TABLE poll_votes ADD CONSTRAINT poll_votes_user_id_profiles_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'poll_votes user_id: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'poll_comments') THEN
    ALTER TABLE poll_comments DROP CONSTRAINT IF EXISTS poll_comments_user_id_fkey;
    ALTER TABLE poll_comments DROP CONSTRAINT IF EXISTS poll_comments_user_id_profiles_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'poll_comments' AND column_name = 'user_id') THEN
      ALTER TABLE poll_comments ADD CONSTRAINT poll_comments_user_id_profiles_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'poll_comments user_id: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comment_reactions') THEN
    ALTER TABLE comment_reactions DROP CONSTRAINT IF EXISTS comment_reactions_user_id_fkey;
    ALTER TABLE comment_reactions DROP CONSTRAINT IF EXISTS comment_reactions_user_id_profiles_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comment_reactions' AND column_name = 'user_id') THEN
      ALTER TABLE comment_reactions ADD CONSTRAINT comment_reactions_user_id_profiles_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'comment_reactions user_id: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'board_messages') THEN
    ALTER TABLE board_messages DROP CONSTRAINT IF EXISTS board_messages_user_id_fkey;
    ALTER TABLE board_messages DROP CONSTRAINT IF EXISTS board_messages_user_id_profiles_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'board_messages' AND column_name = 'user_id') THEN
      ALTER TABLE board_messages ADD CONSTRAINT board_messages_user_id_profiles_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'board_messages user_id: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suggestions') THEN
    ALTER TABLE suggestions DROP CONSTRAINT IF EXISTS suggestions_user_id_fkey;
    ALTER TABLE suggestions DROP CONSTRAINT IF EXISTS suggestions_user_id_profiles_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suggestions' AND column_name = 'user_id') THEN
      ALTER TABLE suggestions ADD CONSTRAINT suggestions_user_id_profiles_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'suggestions user_id: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suggestion_comments') THEN
    ALTER TABLE suggestion_comments DROP CONSTRAINT IF EXISTS suggestion_comments_user_id_fkey;
    ALTER TABLE suggestion_comments DROP CONSTRAINT IF EXISTS suggestion_comments_user_id_profiles_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suggestion_comments' AND column_name = 'user_id') THEN
      ALTER TABLE suggestion_comments ADD CONSTRAINT suggestion_comments_user_id_profiles_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'suggestion_comments user_id: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suggestion_reactions') THEN
    ALTER TABLE suggestion_reactions DROP CONSTRAINT IF EXISTS suggestion_reactions_user_id_fkey;
    ALTER TABLE suggestion_reactions DROP CONSTRAINT IF EXISTS suggestion_reactions_user_id_profiles_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suggestion_reactions' AND column_name = 'user_id') THEN
      ALTER TABLE suggestion_reactions ADD CONSTRAINT suggestion_reactions_user_id_profiles_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'suggestion_reactions user_id: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suggestion_post_reactions') THEN
    ALTER TABLE suggestion_post_reactions DROP CONSTRAINT IF EXISTS suggestion_post_reactions_user_id_fkey;
    ALTER TABLE suggestion_post_reactions DROP CONSTRAINT IF EXISTS suggestion_post_reactions_user_id_profiles_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suggestion_post_reactions' AND column_name = 'user_id') THEN
      ALTER TABLE suggestion_post_reactions ADD CONSTRAINT suggestion_post_reactions_user_id_profiles_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'suggestion_post_reactions user_id: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suggestion_shares') THEN
    ALTER TABLE suggestion_shares DROP CONSTRAINT IF EXISTS suggestion_shares_user_id_fkey;
    ALTER TABLE suggestion_shares DROP CONSTRAINT IF EXISTS suggestion_shares_user_id_profiles_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suggestion_shares' AND column_name = 'user_id') THEN
      ALTER TABLE suggestion_shares ADD CONSTRAINT suggestion_shares_user_id_profiles_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'suggestion_shares user_id: %', SQLERRM;
END $$;

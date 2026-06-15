-- Fix RLS Policies for Cascading Deletion of Posts
-- Using a BEFORE DELETE trigger with SECURITY DEFINER to bypass RLS on child tables
-- (post_likes and comments) so that when a Post Owner or Super Admin deletes a post,
-- the child records are successfully removed without foreign key constraint violations.

-- Drop the broken policies introduced previously
DROP POLICY IF EXISTS "Super admins and post owners can delete post likes on cascade" ON public.post_likes;
DROP POLICY IF EXISTS "Super admins and post owners can delete comments on cascade" ON public.comments;

-- Create a SECURITY DEFINER function to manually delete child records before post deletion
CREATE OR REPLACE FUNCTION public.cascade_delete_post_dependencies()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete all post_likes and comments associated with the post being deleted
  DELETE FROM public.post_likes WHERE post_id = OLD.id;
  DELETE FROM public.comments WHERE post_id = OLD.id;
  RETURN OLD;
END;
$$;

-- Create the trigger on posts table
DROP TRIGGER IF EXISTS tr_cascade_delete_post_dependencies ON public.posts;
CREATE TRIGGER tr_cascade_delete_post_dependencies
BEFORE DELETE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.cascade_delete_post_dependencies();

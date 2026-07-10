# Post Feed Audit Report

This document audits the main feed post query implementation, filtering capabilities, and data exposure levels across institutional boundaries.

---

## 1. Exact JavaScript File That Loads Posts
* **File**: `app.js` (and the synchronized deployment build at `www/app.js`).
* **Function**: `loadFeed()` starting at line `1944` in `app.js` and line `1959` in `www/app.js`.

---

## 2. Exact Supabase Query
The Supabase JavaScript SDK query executed by `loadFeed()` is:

```javascript
const { data: posts, error } = await supabase
  .from('posts')
  .select(`
    *,
    schools (
      name,
      verification_badge,
      logo_url,
      logo_letter,
      color_class
    ),
    profiles:profiles!posts_user_id_fkey (
      full_name,
      user_type,
      platform_role,
      avatar_url,
      school_id,
      is_verified,
      username,
      schools (
        name,
        verification_badge,
        logo_url,
        logo_letter,
        color_class
      )
    ),
    post_likes (
      user_id
    ),
    mentions (
      id,
      post_id,
      comment_id,
      mentioned_user_id,
      mentioned_school_id,
      mentioned_by,
      profiles:profiles!mentions_mentioned_user_id_fkey (
        id,
        full_name
      ),
      schools:schools!mentions_mentioned_school_id_fkey (
        id,
        name
      )
    ),
    comments (
      id,
      content,
      created_at,
      user_id,
      profiles:profiles!comments_user_id_fkey (
        full_name,
        user_type,
        avatar_url,
        is_verified,
        school_id,
        username,
        schools (
          name,
          verification_badge,
          logo_url,
          logo_letter,
          color_class
        )
      ),
      mentions (
        id,
        post_id,
        comment_id,
        mentioned_user_id,
        mentioned_school_id,
        mentioned_by,
        profiles:profiles!mentions_mentioned_user_id_fkey (
          id,
          full_name
        ),
        schools:schools!mentions_mentioned_school_id_fkey (
          id,
          name
        )
      )
    )
  `)
  .order('created_at', { ascending: false });
```

---

## 3. Database-Level Filtering Criteria Audit
The query **does not** perform any database-level filtering. Specifically:

* **school_id**: **No filtering** (not filtered in the query).
* **institution_id**: **No filtering** (institution IDs do not exist in the posts table schema).
* **visibility**: **No filtering** (no visibility column or constraints exist in the query).
* **followers**: **No filtering** (unfiltered in the Supabase query; all posts are fetched from the database, and only filtered client-side if the active tab filter is set to `'following'`).

---

## 4. RLS & Exposure Analysis
### Report: Every authenticated user currently receives all posts.
There is **no** database or RLS restriction limiting visibility. 

* **Select Policy**: In `supabase_schema.sql` (line 572), the RLS SELECT policy is defined as:
  ```sql
  CREATE POLICY "Posts are viewable by everyone"
    ON public.posts FOR SELECT
    USING (true);
  ```
* Because `USING (true)` allows all select commands to pass RLS checks unconditionally, any user (authenticated or unauthenticated guest) can access all posts stored in the table.

---

## 5. Line Responsible for Unfiltered Fetching
* **File**: `app.js` (line `1966` to `2050`).
* **Line**: The execution of `.from('posts').select(...)` without any query modifiers (like `.eq('school_id', ...)` or `.in('user_id', ...)`) means the client requests the entire `posts` dataset.

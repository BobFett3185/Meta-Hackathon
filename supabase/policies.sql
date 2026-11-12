-- Write access for the mock app (anon key). Run once in the Supabase SQL editor.
-- Mock-only: lets the app like posts and join groups. Tighten when real auth is added.

create policy "anon like"        on fb_reactions     for insert with check (true);
create policy "anon update like" on fb_reactions     for update using (true) with check (true);
create policy "anon unlike"      on fb_reactions     for delete using (true);

create policy "anon join group"  on fb_group_members for insert with check (true);
create policy "anon update group member" on fb_group_members for update using (true) with check (true);

-- =====================================================================
-- 招待リンク機能の後片付け（任意）
--
-- 合言葉（0006_join_code.sql）での参加に一本化したため、
-- 招待リンク用のテーブルと関数はもう使われない。
-- 残しておいても害はないので、片付けたい時だけ実行すればよい。
-- =====================================================================

drop function if exists public.accept_group_invite(text);
drop function if exists public.peek_group_invite(text);
drop table if exists public.group_invites;

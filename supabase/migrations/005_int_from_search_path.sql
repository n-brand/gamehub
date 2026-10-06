-- GameHub: fester, leerer search_path für die Hilfsfunktion public.int_from
-- (Supabase-Sicherheitshinweis „Function Search Path Mutable“). Vom Nutzer am 2026-10-06 im SQL-Editor
-- ausgeführt und hier festgehalten. 001_economy.sql legt int_from inzwischen gleich so an.
--
-- Reihenfolge: nach 001 (bis 004) ausführen (SQL Editor → New query → einfügen → Run).
-- Kann gefahrlos erneut ausgeführt werden.

alter function public.int_from(jsonb, text) set search_path = '';

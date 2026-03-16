-- Phase 2a — Part 2: Update event_capacity view
-- Run this as a SEPARATE query AFTER 002_phase2a.sql has been executed.
-- PostgreSQL requires the 'pending' enum value to be committed before it
-- can be referenced here.

DROP VIEW IF EXISTS event_capacity;

CREATE VIEW public.event_capacity
WITH (security_invoker = true)
AS
SELECT
  e.id AS event_id,
  e.slug,
  e.capacity,
  COALESCE(
    SUM(r.quantity) FILTER (WHERE r.status IN ('confirmed', 'pending')), 0
  ) AS tickets_sold,
  CASE
    WHEN e.capacity IS NULL THEN NULL
    ELSE e.capacity - COALESCE(
      SUM(r.quantity) FILTER (WHERE r.status IN ('confirmed', 'pending')), 0
    )
  END AS spots_remaining
FROM events e
LEFT JOIN event_registrations r ON r.event_id = e.id
GROUP BY e.id, e.slug, e.capacity;

INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'cal-ai-voice-agents',
    false,
    'Enable Cal AI Voice Agents - Allow AI-powered voice agents to make phone calls.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
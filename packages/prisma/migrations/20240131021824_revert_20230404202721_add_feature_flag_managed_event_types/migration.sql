-- revert 20230404202721_add_feature_flag_managed_event_types 

DELETE FROM "Feature" WHERE slug = 'managed-event-types';
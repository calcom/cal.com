# CHANGELOG - Conditional Booking Fields

## [Feature] Conditional Booking Fields (Follow-up Questions)

**Date:** December 22, 2024  
**Type:** Feature Addition  
**Status:** ✅ Complete

### What's New

Added support for conditional/follow-up questions in booking forms. Fields can now be configured to only appear when a parent field has specific values, creating dynamic and context-aware booking experiences.

### Features

- ✅ **Conditional Field Configuration**: New `conditionalOn` property for booking fields
- ✅ **Single or Multiple Triggers**: Support for showing fields based on one or multiple parent values
- ✅ **Real-time Updates**: Fields appear/disappear instantly as users change selections
- ✅ **Automatic Validation**: Dependency validation catches configuration errors
- ✅ **Full Type Safety**: TypeScript and Zod schema support
- ✅ **Platform API Support**: Available in v2024-06-14 API endpoints

### Use Cases

1. **Source Attribution**: Ask "How did you hear about us?" then conditionally ask for specific details
2. **Service Selection**: Show different questions based on selected service type
3. **Contact Preferences**: Request phone number only when user selects phone-based contact
4. **Tiered Information**: Collect company details only for enterprise customers
5. **Emergency Handling**: Show urgent fields based on priority level

### API Changes

#### New Schema Property

```typescript
{
  conditionalOn?: {
    parentFieldName: string;
    showWhenParentValues: string | string[];
  }
}
```

#### Supported Field Types

All custom booking field types support `conditionalOn`:
- text, textarea, number
- select, multiselect, radio, checkbox
- phone, address, url, multiemail
- boolean

### Examples

#### Basic Example
```json
{
  "type": "text",
  "slug": "website-source",
  "conditionalOn": {
    "parentFieldName": "how-did-you-hear",
    "showWhenParentValues": "Web"
  }
}
```

#### Multiple Triggers
```json
{
  "type": "phone",
  "slug": "phone-number",
  "conditionalOn": {
    "parentFieldName": "contact-method",
    "showWhenParentValues": ["Phone", "SMS", "WhatsApp"]
  }
}
```

### Files Added

**Core Implementation:**
- `packages/features/bookings/lib/isFieldConditionallyVisible.ts` - Visibility logic
- `packages/features/bookings/lib/isFieldConditionallyVisible.test.ts` - Unit tests

**Documentation:**
- `docs/developing/conditional-booking-fields.mdx` - Full documentation
- `examples/conditional-booking-fields-examples.ts` - Usage examples
- `CONDITIONAL_FIELDS_IMPLEMENTATION.md` - Technical details
- `CONDITIONAL_FIELDS_QUICKSTART.md` - Quick start guide
- `CONDITIONAL_FIELDS_DIAGRAM.md` - Visual diagrams
- `CONDITIONAL_FIELDS_CHANGELOG.md` - This file

### Files Modified

**Schema:**
- `packages/prisma/zod-utils.ts`
  - Added `conditionalOn` to `fieldSchema`

**UI:**
- `packages/features/bookings/Booker/components/BookEventForm/BookingFields.tsx`
  - Import `isFieldConditionallyVisible`
  - Watch all form responses
  - Check visibility before rendering fields

**Platform API:**
- `packages/platform/types/event-types/event-types_2024_06_14/inputs/booking-fields.input.ts`
  - Added `ConditionalFieldConfig_2024_06_14` class
  - Added `conditionalOn` to field input classes

### Validation

The system validates:
- ✅ Parent field exists
- ✅ No self-referencing
- ✅ No circular dependencies
- ✅ Non-empty trigger values

### Testing

**Unit Tests:**
```bash
npm run test -- isFieldConditionallyVisible.test.ts
```

**Test Coverage:**
- ✅ Basic visibility logic
- ✅ Single and multiple trigger values
- ✅ Type coercion (number → string)
- ✅ Dependency validation
- ✅ Error detection

**Manual Testing:**
1. Create event type with conditional fields
2. Open booking page
3. Verify fields appear/disappear correctly
4. Submit form and verify data

### Performance

- ✅ O(1) visibility check per field
- ✅ No additional API calls
- ✅ React Hook Form's optimized watching
- ✅ Minimal re-render overhead

### Backward Compatibility

✅ **100% Backward Compatible**
- Existing forms work without changes
- `conditionalOn` is optional
- No database migration required
- No breaking API changes

### Migration Guide

**No migration needed!**

Existing booking fields continue to work as-is. To use conditional fields:

1. Add `conditionalOn` to desired fields
2. Test on booking page
3. Deploy

### Breaking Changes

None.

### Deprecations

None.

### Known Limitations

1. No multi-level dependencies (field conditional on conditional field)
2. Parent must be placed before child in fields array
3. System fields cannot be conditional
4. No visual grouping (yet)

### Future Enhancements

Planned improvements:
- [ ] Multi-level dependencies
- [ ] AND/OR logic for multiple parents
- [ ] Complex expressions (>, <, contains)
- [ ] Visual grouping in UI
- [ ] Form builder with conditional logic
- [ ] Template library

### Documentation

📖 **Full Documentation:**
- Quick Start: `CONDITIONAL_FIELDS_QUICKSTART.md`
- Implementation: `CONDITIONAL_FIELDS_IMPLEMENTATION.md`
- Diagrams: `CONDITIONAL_FIELDS_DIAGRAM.md`
- Developer Docs: `docs/developing/conditional-booking-fields.mdx`
- Examples: `examples/conditional-booking-fields-examples.ts`

### Contributors

- Implementation: [Your Team/Name]
- Requested by: Cal.com Community

### Related Issues

- Original Request: #[Issue Number]
- Related PRs: #[PR Number]

### Rollout Plan

1. ✅ **Phase 1**: Implementation complete
2. ⏳ **Phase 2**: Internal testing
3. ⏳ **Phase 3**: Beta testing with select users
4. ⏳ **Phase 4**: Documentation review
5. ⏳ **Phase 5**: Production release
6. ⏳ **Phase 6**: Monitor & iterate

### Support

For questions or issues:
- 📖 Documentation: See files listed above
- 🐛 Bug reports: GitHub Issues
- 💡 Feature requests: GitHub Discussions
- 💬 Community: Cal.com Slack/Discord

---

**Release Version:** TBD  
**Feature Flag:** None required (opt-in via configuration)  
**Monitoring:** Standard application monitoring  
**Rollback Plan:** Remove `conditionalOn` from affected event types

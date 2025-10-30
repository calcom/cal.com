# Before/After Demo: Team Members Can View Hidden Fields

## Setup Required:
1. Create a team with multiple members (admin + regular member)
2. Create a team event type with hidden fields
3. Create a booking with data in the hidden fields
4. Login as different team members to verify access

## Before Fix:
- Only team admins could see hidden field answers
- Regular team members saw empty responses for hidden fields
- UTM tracking data was hidden from regular team members

## After Fix:
- ALL team members can see hidden field answers
- ALL team members can see UTM tracking parameters
- Host/organizers still see everything (unchanged)

## Test Steps:
1. Create team with admin and member
2. Create event type with hidden fields (like 'Internal Notes')
3. Make a booking with data in hidden fields
4. Login as team member (not admin) → Should see hidden data
5. Login as team admin → Should see hidden data (same as before)
6. Login as host/organizer → Should see hidden data (same as before)

This provides better team transparency while maintaining security for non-team members.

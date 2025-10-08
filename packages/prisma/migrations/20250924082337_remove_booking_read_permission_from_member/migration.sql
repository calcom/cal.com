-- Do not allow members to read others' bookings in the team
delete from "RolePermission" where "roleId" = 'member_role' and resource = 'booking' and action = 'read';

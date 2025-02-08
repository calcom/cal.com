TODO:
- [ ] Typo fix. Rename app/settings/organizations/new/sucess -> app/settings/organizations/new/success. Fix all imports as well
- [ ] Make sure that we pass creationSource to createTeamsMutation.mutate
- [ ] Verify that if a team can have same slug as an organization. I think it can't.
- [ ] Platform organization creation flow has to be working in the same way

Bugs:
- [ ] When teams are added(in AddNewTeamsForm), they are persisted but aren't shown in the UI after refresh.
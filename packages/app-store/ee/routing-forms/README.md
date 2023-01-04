## Documentation for reusable Routers
- Terminology
    - **Router** : A form that has been picked as a route.
	- **F1 ← F2 :** F2 is using F1 as a Router. We can call F1 a router in this context. Fields in F2 coming from F1 are called _Router Linked Fields_.
	- **Connected Forms:** For a relationship F1 ← F2, F2 is Connected Form

- **Restrictions**
    - You can’t delete fields connected to a Router. To delete, you can remove the connection(by removing the Router from routes list). That would make all the Router fields local. After that you can delete them.
    - A multi-level relationship like F1<-F2<-F3 is not allowed only one level like F1<-F2 is allowed. This is to prevent creation of circular dependencies like F3<-F1<-F2<-F3


- **Actions**
    - [ ] **Disconnect** → [Not yet Implemented]You can disconnect a router. When a Router is disconnected, the Router fields would become local and won’t get removed. The routing would also become local.
    - [x] **Removing a Router →** Deleting a router removes the routing logic and corresponding fields of that Router from the connected form.
    - [x] **Adding after Removing** → Adding after removing would re-add the fields. It simply marks the fields as non-delet
    - [x] **Updating Field →** Modifying **Type/Label/Required** options of a field in a Router, updates them in the connected forms.
    - [x] **Delete Field →** For a relationship **F1 ← F2**, if a field is deleted in F1, it won’t be deleted from F2 but become local in F2, so that it can be modified in F2.

- **Behaviours**
	- [x] If a form F2 picks F1 as a Router - F1’s deleted fields won’t appear in F2 anywhere.
	- [x] If a relationship like F1 ← F2 exists, then F1 can’t have F2 in ‘Add a new Route’ listing. This is to avoid a circular relationship.
	- [x] A form can be picked as a router only once in a given form.


 ## Running Tests   
 `yarn e2e:app-store`
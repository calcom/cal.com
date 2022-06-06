insert into "App" ("slug", "dirName", "updatedAt", "categories") 
values ('daily-video', 'dailyvideo', CURRENT_TIMESTAMP, '{video}') 
on conflict do nothing
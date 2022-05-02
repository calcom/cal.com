-- Connects each saved Credential to their respective App
UPDATE "Credential" SET "appId" = 'metamask' WHERE "type" = 'metamask_web3';
UPDATE "Credential" SET "appId" = 'giphy' WHERE "type" = 'giphy_other';

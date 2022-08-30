# SAML Registration with Identity Providers

This guide explains the settings you need to use to configure SAML with your Identity Provider. Once this is set up you should get an XML metadata file that should then be uploaded on your Cal.com self-hosted instance.

> **Note:** Please do not add a trailing slash at the end of the URLs. Create them exactly as shown below.

**Assertion consumer service URL / Single Sign-On URL / Destination URL:** [http://localhost:3000/api/auth/saml/callback](http://localhost:3000/api/auth/saml/callback) [Replace this with the URL for your self-hosted Cal instance]

**Entity ID / Identifier / Audience URI / Audience Restriction:** https://saml.cal.com

**Response:** Signed

**Assertion Signature:** Signed

**Signature Algorithm:** RSA-SHA256

**Assertion Encryption:** Unencrypted

**Mapping Attributes / Attribute Statements:**

http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier -> id

http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress -> email

http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname -> firstName

http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname -> lastName

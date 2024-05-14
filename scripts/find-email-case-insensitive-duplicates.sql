-- Find users with uppercase characters in email
SELECT * FROM users u WHERE u.email ~ '[[:upper:]]';

-- Find emails with case insensitive duplicates
SELECT lower(email) FROM users GROUP BY lower(email) HAVING count(*) > 1;

-- List emails with their case insensitive duplicates
SELECT * FROM users u WHERE LOWER(u.email) IN (
  SELECT lower(email) FROM users GROUP BY lower(email) HAVING count(*) > 1
);

-- Lowercase all user emails (This will fail if there are case insensitive duplicates)
UPDATE users SET email = lower(email) WHERE email ~ '[[:upper:]]';

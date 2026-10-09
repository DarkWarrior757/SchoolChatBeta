/*
# Ensure admin email is confirmed for password login

1. Auth changes
- Ensure avirajprashar10@gmail.com has email_confirmed_at set (required for password login)
2. Notes
- The password was already set on this account previously
- The frontend now uses signInWithPassword instead of OTP
*/

UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'avirajprashar10@gmail.com';

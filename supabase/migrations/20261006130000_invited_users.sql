-- Invited accounts while public sign-up is closed (SIGNUP_OPEN=false).
-- Passwords are stored only as bcrypt hashes. Accounts that already exist (same email) are left untouched.
-- Each person should change their password from Profile > Account after first login.
DO $$
DECLARE
  u RECORD;
  uid UUID;
BEGIN
  FOR u IN
    SELECT * FROM (VALUES
    ('iamaramche@gmail.com', '$2a$10$AgLN.OvnyoSXqpkOUSwrretMfJFBmgnvNldR8wZm/OwUp7qHdZ.gW', 'آرام'),
    ('sanaz.sh1997@gmail.com', '$2a$10$9yf9.vZ7UzJTzwNrbJK93OTaj90w7g34BaqjBnYuVGLZIe.RTbpR.', 'ساناز'),
    ('amirmoa76@gmail.com', '$2a$10$guS9SGGVuGEfjfpO7Bj/XebHUEn3flsDBAuZJcl2sponQmEKYoIIS', 'امیرحسین'),
    ('zahrabehnambakhsh97@gmail.com', '$2a$10$CAIWTpTfrpNiGpLb2qkHWO6qGgiSJhT98BZF3E8rsE/KrDZOp2C0q', 'زهرا'),
    ('maryamramezanian046@gmail.com', '$2a$10$WsczM783waB0H.rQJjCH4.0Vbi6RZ3f7cAri0cjOomiIOna8WCcVa', 'مریم')
    ) AS t(email, password_hash, name)
  LOOP
    IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(u.email)) THEN
      CONTINUE;
    END IF;

    uid := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      lower(u.email), u.password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', u.name),
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), uid, uid::text, 'email',
      jsonb_build_object('sub', uid::text, 'email', lower(u.email), 'email_verified', true),
      now(), now(), now()
    );
  END LOOP;
END;
$$;

-- Substitua o email abaixo pelo email do utilizador que quer apagar
DELETE FROM auth.identities WHERE user_id = (SELECT id FROM auth.users WHERE email = 'email_do_utilizador_aqui@gmail.com');
DELETE FROM auth.users WHERE email = 'email_do_utilizador_aqui@gmail.com';

-- Add profile image support for X accounts and tweets
ALTER TABLE twitter_accounts ADD COLUMN profile_image_url TEXT;

ALTER TABLE tr_tweets ADD COLUMN profile_image_url TEXT;
ALTER TABLE de_tweets ADD COLUMN profile_image_url TEXT;
ALTER TABLE us_tweets ADD COLUMN profile_image_url TEXT;
ALTER TABLE uk_tweets ADD COLUMN profile_image_url TEXT;
ALTER TABLE fr_tweets ADD COLUMN profile_image_url TEXT;
ALTER TABLE es_tweets ADD COLUMN profile_image_url TEXT;
ALTER TABLE it_tweets ADD COLUMN profile_image_url TEXT;
ALTER TABLE ru_tweets ADD COLUMN profile_image_url TEXT;

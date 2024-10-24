-- This is an empty migration.
ALTER TABLE "mqtt" 
ALTER COLUMN "value" TYPE JSON USING "value"::JSON;
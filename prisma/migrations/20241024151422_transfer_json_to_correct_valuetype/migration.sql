-- This is an empty migration.
UPDATE "mqtt"
SET "value" = to_jsonb(("value"::text)::numeric),
    "valueType" = 'FLOAT'::"MqttValueType"
WHERE "valueType" = 'STRING'::"MqttValueType"
  AND ("value"::text ~ '^-?\d+(\.\d+)?$');


  

UPDATE "mqtt"
SET "value" = 'true'::jsonb,
    "valueType" = 'BOOLEAN'::"MqttValueType"
WHERE "valueType" = 'FLOAT'::"MqttValueType"
  AND ("value"::text = '1' OR "value"::text = '1.0');

UPDATE "mqtt"
SET "value" = 'false'::jsonb,
    "valueType" = 'BOOLEAN'::"MqttValueType"
WHERE "valueType" = 'FLOAT'::"MqttValueType"
  AND ("value"::text = '0' OR "value"::text = '0.0');